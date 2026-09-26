"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { useToastManager } from "@/components/ui/toast"
import { Loader2Icon, CalendarIcon, UsersIcon } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { listConsultants, type ManagedUser } from "@/lib/api"
import { ConsultantCalendarEditor } from "@/components/consultants/consultant-calendar-editor"

// A "consultant" is just a User with role === "consultant" now (see
// lib/api.ts) — profile fields (name/email/active) are managed from the
// Users page, not here. This page is only about picking one and viewing/
// editing their booking calendar.
export default function ConsultantsPage() {
  const router = useRouter()
  const { user: me } = useAuth()
  const toastManager = useToastManager()
  const canView = me?.role === "superadmin" || me?.role === "admin" || me?.role === "supervisor"

  const [consultants, setConsultants] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  useEffect(() => {
    if (me && !canView) router.replace("/dashboard")
  }, [me, canView, router])

  useEffect(() => {
    listConsultants()
      .then(setConsultants)
      .catch((err) => {
        console.error(err)
        toastManager.add({ title: "Impossible de charger les consultants", type: "error" })
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selected = consultants.find((c) => c.id === selectedId) ?? null

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-vertical:h-4 data-vertical:self-auto" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard">Tableau de bord</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Consultants</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex items-center justify-end gap-3">
          <Button
            variant="outline"
            className="shrink-0 gap-1.5"
            onClick={() => router.push("/dashboard/users")}
          >
            <UsersIcon size={14} />
            Utilisateurs
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center text-muted-foreground gap-2 py-16">
            <Loader2Icon size={18} className="animate-spin" />
            <span className="text-sm">Chargement…</span>
          </div>
        ) : (
          <Table containerClassName="rounded-xl border">
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {consultants.map((c) => (
                <TableRow key={c.id} className={selectedId === c.id ? "bg-muted/50" : undefined}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground">{c.email || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={c.active ? "default" : "secondary"}>{c.active ? "Actif" : "Inactif"}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant={selectedId === c.id ? "secondary" : "ghost"}
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setSelectedId(selectedId === c.id ? null : c.id)}
                    >
                      <CalendarIcon size={14} />
                      Calendrier
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {consultants.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                    Aucun consultant pour le moment.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}

        {selected && (
          <div className="rounded-xl border p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">Calendrier de {selected.name}</p>
              {!selected.active && <Badge variant="secondary">Inactif</Badge>}
            </div>
            <ConsultantCalendarEditor consultantId={selected.id} />
          </div>
        )}
      </div>
    </>
  )
}
