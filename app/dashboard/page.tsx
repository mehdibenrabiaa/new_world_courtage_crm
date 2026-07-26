"use client"

import { useEffect, useState } from "react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { listLeads, listContacts, type Lead, type Contact } from "@/lib/api"
import { ReceiptTextIcon, CheckCircleIcon, UsersIcon, TrendingUpIcon } from "lucide-react"

type KPI = {
  label: string
  value: string | number
  sub: string
  icon: React.ReactNode
  color: string
}

function KpiCard({ label, value, sub, icon, color }: KPI) {
  return (
    <div className="rounded-xl border bg-card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
      </div>
      <div>
        <p className="text-3xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      listLeads().catch(() => [] as Lead[]),
      listContacts().catch(() => [] as Contact[]),
    ]).then(([l, c]) => {
      setLeads(l)
      setContacts(c)
    }).finally(() => setLoading(false))
  }, [])

  const total = leads.length
  const signed = leads.filter((l) => l.status === "signed").length
  const conversion = total > 0 ? Math.round((signed / total) * 100) : 0
  const unread = contacts.filter((c) => !c.read).length

  const kpis: KPI[] = [
    {
      label: "Total devis",
      value: loading ? "—" : total,
      sub: "leads enregistrés",
      icon: <ReceiptTextIcon size={16} />,
      color: "bg-blue-100 text-blue-600",
    },
    {
      label: "Signés",
      value: loading ? "—" : signed,
      sub: "contrats conclus",
      icon: <CheckCircleIcon size={16} />,
      color: "bg-green-100 text-green-600",
    },
    {
      label: "Taux de conversion",
      value: loading ? "—" : `${conversion}%`,
      sub: "devis → signé",
      icon: <TrendingUpIcon size={16} />,
      color: "bg-purple-100 text-purple-600",
    },
    {
      label: "Messages non lus",
      value: loading ? "—" : unread,
      sub: "contacts en attente",
      icon: <UsersIcon size={16} />,
      color: "bg-amber-100 text-amber-600",
    },
  ]

  const recent = leads.slice(0, 5)

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-vertical:h-4 data-vertical:self-auto" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Tableau de bord</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => <KpiCard key={kpi.label} {...kpi} />)}
        </div>

        <div className="rounded-xl border bg-card p-5 flex flex-col gap-4">
          <h2 className="text-sm font-semibold">Derniers leads</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun lead pour le moment.</p>
          ) : (
            <div className="divide-y">
              {recent.map((l) => (
                <div key={l.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium">{l.first_name} {l.last_name}</p>
                    <p className="text-muted-foreground text-xs">{l.lead_type} · {l.email}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(l.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
