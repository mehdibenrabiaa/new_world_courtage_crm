"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { useToastManager } from "@/components/ui/toast"
import { Loader2Icon, ChevronLeftIcon, ChevronRightIcon, CalendarClockIcon, PhoneCallIcon } from "lucide-react"
import { listAllBookings, listConsultants, type ConsultantBookingWithConsultant, type ManagedUser } from "@/lib/api"
import { useAuth } from "@/components/auth-provider"
import { can } from "@/lib/auth"

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function formatMonthLabel(date: Date) {
  const label = date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function formatDate(isoDate: string) {
  return new Date(isoDate).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" })
}

export default function BookingsPage() {
  const { user: me } = useAuth()
  const toastManager = useToastManager()
  // Mirrors the backend's own check (_has_permission on "consultants"/
  // "view") — whoever can see every consultant's calendar also sees every
  // consultant's bookings here; anyone else just gets their own list back
  // from the same endpoint, enforced server-side either way.
  const canSeeEveryone = can(me, "consultants", "view")

  const [month, setMonth] = useState(() => new Date())
  const [bookings, setBookings] = useState<ConsultantBookingWithConsultant[]>([])
  const [consultants, setConsultants] = useState<ManagedUser[]>([])
  const [consultantFilter, setConsultantFilter] = useState<"Tous" | string>("Tous")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (canSeeEveryone) listConsultants().then(setConsultants).catch(console.error)
  }, [canSeeEveryone])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listAllBookings(monthKey(month), consultantFilter !== "Tous" ? Number(consultantFilter) : undefined)
      .then((data) => { if (!cancelled) setBookings(data) })
      .catch((err) => {
        console.error(err)
        if (!cancelled) toastManager.add({ title: "Impossible de charger les rendez-vous", type: "error" })
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, consultantFilter])

  const sorted = [...bookings].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-vertical:h-4 data-vertical:self-auto" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Rendez-vous</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <p className="text-sm text-muted-foreground">
          {canSeeEveryone
            ? "Tous les rendez-vous réservés par les prospects, tous consultants confondus."
            : "Vos rendez-vous réservés par des prospects."}
        </p>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon-sm" onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}>
              <ChevronLeftIcon size={14} />
            </Button>
            <span className="text-sm font-medium w-36 text-center">{formatMonthLabel(month)}</span>
            <Button variant="outline" size="icon-sm" onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}>
              <ChevronRightIcon size={14} />
            </Button>
          </div>
          {canSeeEveryone && (
            <Select value={consultantFilter} onValueChange={(v) => v != null && setConsultantFilter(v)}>
              <SelectTrigger className="w-48" aria-label="Filtrer par consultant">
                <SelectValue>
                  {(v: string) => (v === "Tous" ? "Tous les consultants" : consultants.find((c) => String(c.id) === v)?.name ?? v)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Tous">Tous les consultants</SelectItem>
                {consultants.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center text-muted-foreground gap-2 py-16">
            <Loader2Icon size={18} className="animate-spin" />
            <span className="text-sm">Chargement…</span>
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
            <CalendarClockIcon size={24} />
            <p className="text-sm">Aucun rendez-vous ce mois-ci.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sorted.map((booking) => (
              <div key={booking.id} className="flex items-center gap-3 rounded-xl border p-3">
                <div className="flex size-9 shrink-0 items-center justify-center bg-primary/10 text-primary">
                  <PhoneCallIcon size={15} />
                </div>
                <div className="flex flex-col gap-0.5 w-32 shrink-0">
                  <span className="text-sm font-medium capitalize">{formatDate(booking.date)}</span>
                  <span className="text-xs text-muted-foreground">{booking.time}</span>
                </div>
                <div className="flex-1 min-w-0">
                  {booking.lead_id ? (
                    <Link href={`/dashboard/leads/${booking.lead_id}`} className="text-sm underline hover:text-foreground">
                      {booking.lead_name ?? "Lead"}
                    </Link>
                  ) : (
                    <span className="text-sm text-muted-foreground">{booking.lead_name ?? "Lead supprimé"}</span>
                  )}
                </div>
                {canSeeEveryone && (
                  <span className="text-xs text-muted-foreground shrink-0">{booking.consultant.name}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
