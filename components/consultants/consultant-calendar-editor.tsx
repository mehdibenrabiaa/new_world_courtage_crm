"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { useToastManager } from "@/components/ui/toast"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useAuth } from "@/components/auth-provider"
import { can } from "@/lib/auth"
import { BanIcon, CalendarCheckIcon, Loader2Icon, ArrowRightLeftIcon } from "lucide-react"
import {
  listConsultantUnavailabilities, listConsultantBookings, listConsultants, blockConsultantTimeframe,
  unblockConsultantTimeframe, reallocateBooking,
  type ConsultantUnavailability, type ConsultantBooking, type ManagedUser,
} from "@/lib/api"

// Mirrors the public site's own SLOTS list (CarInsuranceForm.js) and the
// backend's (routers/consultants.py) — the fixed set of callback times a
// consultant can block off.
const SLOTS = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"]

function toISODate(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

// The calendar itself — used both by the admin-facing "Consultants" page
// (managing any consultant) and the self-service "Mon calendrier" page
// (managing your own); the backend enforces who's actually allowed to
// write to a given consultantId either way, so this component doesn't need
// to know or care which case it's in.
//
// Shows two things side by side: deliberate blocks (editable — this is what
// this component writes) and real confirmed bookings (read-only, except for
// reallocating one to a different consultant if you have the "consultants"
// edit permission — see routers/consultants.py's reallocate_booking).
// Without the bookings half, a consultant's calendar could look free here
// while they're actually already booked, which is exactly what happened
// before this was added.
export function ConsultantCalendarEditor({ consultantId }: { consultantId: number }) {
  const toastManager = useToastManager()
  const { user: me } = useAuth()
  const canReallocate = can(me, "consultants", "edit")

  const [month, setMonth] = useState(() => new Date())
  const [selected, setSelected] = useState(() => new Date())
  const [unavailabilities, setUnavailabilities] = useState<ConsultantUnavailability[]>([])
  const [bookings, setBookings] = useState<ConsultantBooking[]>([])
  const [otherConsultants, setOtherConsultants] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [reallocatingId, setReallocatingId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const key = monthKey(month)
    Promise.all([listConsultantUnavailabilities(consultantId, key), listConsultantBookings(consultantId, key)])
      .then(([u, b]) => { if (!cancelled) { setUnavailabilities(u); setBookings(b) } })
      .catch((err) => {
        console.error(err)
        if (!cancelled) toastManager.add({ title: "Impossible de charger le calendrier", type: "error" })
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultantId, month])

  // Only fetched for someone who can actually reallocate — listConsultants
  // itself requires the "consultants" view permission on the backend, which
  // someone with edit almost always also has, but no point risking a 403
  // for anyone who'd never see the button anyway.
  useEffect(() => {
    if (!canReallocate) return
    let cancelled = false
    listConsultants()
      .then((all) => { if (!cancelled) setOtherConsultants(all.filter((c) => c.id !== consultantId && c.active)) })
      .catch((err) => console.error(err))
    return () => { cancelled = true }
  }, [canReallocate, consultantId])

  const markedDates = new Set(unavailabilities.map((u) => u.date))
  const bookedDates = new Set(bookings.map((b) => b.date))
  const selectedISO = toISODate(selected)
  const dayEntries = unavailabilities.filter((u) => u.date === selectedISO)
  const dayBookings = bookings.filter((b) => b.date === selectedISO)
  const wholeDayBlock = dayEntries.find((u) => u.time === null)
  const blockedSlots = new Set(dayEntries.filter((u) => u.time !== null).map((u) => u.time as string))
  const bookedSlots = new Map(dayBookings.map((b) => [b.time, b]))

  async function handleToggleWholeDay() {
    setBusy(true)
    try {
      if (wholeDayBlock) {
        await unblockConsultantTimeframe(consultantId, wholeDayBlock.id)
        setUnavailabilities((prev) => prev.filter((u) => u.id !== wholeDayBlock.id))
      } else {
        const created = await blockConsultantTimeframe(consultantId, { date: selectedISO })
        // Blocking the whole day server-side also deletes that day's own
        // per-slot blocks (they'd be redundant) — mirror that locally
        // instead of re-fetching the whole month just for this.
        setUnavailabilities((prev) => [...prev.filter((u) => u.date !== selectedISO), created])
      }
    } catch (err) {
      console.error(err)
      toastManager.add({ title: "Impossible de mettre à jour le calendrier", type: "error" })
    } finally {
      setBusy(false)
    }
  }

  async function handleToggleSlot(time: string) {
    if (bookedSlots.has(time)) return // already a real appointment — nothing to toggle
    setBusy(true)
    try {
      const existing = dayEntries.find((u) => u.time === time)
      if (existing) {
        await unblockConsultantTimeframe(consultantId, existing.id)
        setUnavailabilities((prev) => prev.filter((u) => u.id !== existing.id))
      } else {
        const created = await blockConsultantTimeframe(consultantId, { date: selectedISO, time })
        setUnavailabilities((prev) => [...prev, created])
      }
    } catch (err) {
      console.error(err)
      toastManager.add({ title: "Impossible de mettre à jour le calendrier", type: "error" })
    } finally {
      setBusy(false)
    }
  }

  async function handleReallocate(booking: ConsultantBooking, newConsultantId: string) {
    setReallocatingId(booking.id)
    try {
      await reallocateBooking(consultantId, booking.id, Number(newConsultantId))
      setBookings((prev) => prev.filter((b) => b.id !== booking.id))
      toastManager.add({ title: "Rendez-vous réaffecté.", type: "success" })
    } catch (err) {
      console.error(err)
      toastManager.add({
        title: "Impossible de réaffecter ce rendez-vous",
        description: err instanceof Error ? err.message : undefined,
        type: "error",
      })
    } finally {
      setReallocatingId(null)
    }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-6">
      <div className="flex flex-col gap-2 shrink-0">
        <Calendar
          selected={selected}
          onSelect={setSelected}
          month={month}
          onMonthChange={setMonth}
          markedDates={markedDates}
          secondaryMarkedDates={bookedDates}
          className="border rounded-xl"
        />
        <div className="flex flex-col gap-1 px-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-destructive" /> Bloqué</span>
          <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-[var(--brand)]" /> Rendez-vous confirmé</span>
        </div>
      </div>
      <div className="flex-1 flex flex-col gap-4 min-w-[220px]">
        <div>
          <p className="text-sm font-medium capitalize">
            {selected.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
          {loading && <p className="text-xs text-muted-foreground mt-1">Chargement…</p>}
        </div>

        {dayBookings.length > 0 && (
          <div className="flex flex-col gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3">
            <span className="flex items-center gap-1.5 text-xs font-medium text-blue-700">
              <CalendarCheckIcon size={13} />
              {dayBookings.length} rendez-vous confirmé{dayBookings.length > 1 ? "s" : ""}
            </span>
            {dayBookings.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-2 text-xs text-blue-700">
                <span>
                  <span className="font-medium">{b.time}</span> —{" "}
                  {b.lead_id != null ? (
                    <Link href={`/dashboard/leads/${b.lead_id}`} className="underline hover:text-blue-900">
                      {b.lead_name ?? "Lead"}
                    </Link>
                  ) : (
                    b.lead_name ?? "Lead supprimé"
                  )}
                </span>
                {canReallocate && (
                  reallocatingId === b.id ? (
                    <Loader2Icon size={13} className="animate-spin shrink-0" />
                  ) : (
                    <Select value="" onValueChange={(v) => v != null && handleReallocate(b, v)}>
                      <SelectTrigger size="sm" className="h-6 w-auto gap-1 border-blue-200 bg-white px-1.5 text-blue-700 shrink-0" disabled={otherConsultants.length === 0}>
                        <ArrowRightLeftIcon size={11} />
                        <SelectValue>{() => "Réaffecter"}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {otherConsultants.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )
                )}
              </div>
            ))}
          </div>
        )}

        <Button
          type="button"
          variant={wholeDayBlock ? "destructive" : "outline"}
          disabled={busy || loading}
          onClick={handleToggleWholeDay}
          className="gap-2 justify-center"
        >
          <BanIcon size={14} />
          {wholeDayBlock ? "Débloquer toute la journée" : "Bloquer toute la journée"}
        </Button>

        {!wholeDayBlock && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Ou bloquer des créneaux précis</span>
            <div className="grid grid-cols-2 gap-2">
              {SLOTS.map((time) => {
                const booking = bookedSlots.get(time)
                if (booking) {
                  return (
                    <Tooltip key={time}>
                      <TooltipTrigger
                        render={
                          <Button
                            type="button"
                            size="sm"
                            // aria-disabled, not the native `disabled` attribute — a
                            // truly disabled button doesn't fire the pointer/focus
                            // events the tooltip needs to open on hover.
                            aria-disabled="true"
                            className="bg-blue-50 text-blue-700 border border-blue-200 opacity-100 cursor-not-allowed"
                          />
                        }
                      >
                        {time} · Réservé
                      </TooltipTrigger>
                      <TooltipContent>Rendez-vous avec {booking.lead_name ?? "lead supprimé"}</TooltipContent>
                    </Tooltip>
                  )
                }
                const isBlocked = blockedSlots.has(time)
                return (
                  <Button
                    key={time}
                    type="button"
                    size="sm"
                    variant={isBlocked ? "destructive" : "outline"}
                    disabled={busy || loading}
                    onClick={() => handleToggleSlot(time)}
                  >
                    {time}
                  </Button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
