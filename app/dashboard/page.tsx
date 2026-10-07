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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { listLeads, getLeadStats, type LeadListItem, type LeadStats } from "@/lib/api"
import { ReceiptTextIcon, CheckCircleIcon, UsersIcon, TrendingUpIcon, WalletIcon, BadgeEuroIcon } from "lucide-react"

type KPI = {
  label: string
  value: string | number
  sub: string
  icon: React.ReactNode
  color: string
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value)
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
  const [recent, setRecent] = useState<LeadListItem[]>([])
  const [stats, setStats] = useState<LeadStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      listLeads({ limit: 5 }).catch(() => [] as LeadListItem[]),
      getLeadStats().catch(() => null),
    ]).then(([l, s]) => {
      setRecent(l)
      setStats(s)
    }).finally(() => setLoading(false))
  }, [])

  const kpis: KPI[] = [
    {
      label: "Total leads",
      value: loading || !stats ? "—" : stats.total_leads,
      sub: "leads enregistrés",
      icon: <ReceiptTextIcon size={16} />,
      color: "bg-[var(--brand)]/10 text-[var(--brand)]",
    },
    {
      label: "Convertis",
      value: loading || !stats ? "—" : stats.by_status.converted ?? 0,
      sub: "contrats conclus",
      icon: <CheckCircleIcon size={16} />,
      color: "bg-[var(--brand)]/10 text-[var(--brand)]",
    },
    {
      label: "Taux de conversion",
      value: loading || !stats ? "—" : `${stats.conversion_rate}%`,
      sub: "devis → signé",
      icon: <TrendingUpIcon size={16} />,
      color: "bg-[var(--brand)]/10 text-[var(--brand)]",
    },
    {
      label: "Messages non lus",
      value: loading || !stats ? "—" : stats.unread_contacts,
      sub: "contacts en attente",
      icon: <UsersIcon size={16} />,
      color: "bg-[var(--brand)]/10 text-[var(--brand)]",
    },
    {
      label: "Pipeline en cours",
      value: loading || !stats ? "—" : formatCurrency(stats.total_pipeline_value),
      sub: "valeur estimée, hors convertis/perdus",
      icon: <WalletIcon size={16} />,
      color: "bg-[var(--brand)]/10 text-[var(--brand)]",
    },
    {
      label: "Valeur convertie",
      value: loading || !stats ? "—" : formatCurrency(stats.converted_value),
      sub: "contrats signés",
      icon: <BadgeEuroIcon size={16} />,
      color: "bg-[var(--brand)]/10 text-[var(--brand)]",
    },
  ]

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
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {kpis.map((kpi) => <KpiCard key={kpi.label} {...kpi} />)}
        </div>

        {stats && stats.by_consultant.length > 0 && (
          <div className="rounded-xl border bg-card p-5 flex flex-col gap-4">
            <h2 className="text-sm font-semibold">Performance par personne assignée</h2>
            <Table containerClassName="rounded-lg border">
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Leads</TableHead>
                  <TableHead>Convertis</TableHead>
                  <TableHead>Taux</TableHead>
                  <TableHead>Valeur totale</TableHead>
                  <TableHead>Valeur convertie</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.by_consultant
                  .slice()
                  .sort((a, b) => b.total_leads - a.total_leads)
                  .map((c) => (
                    <TableRow key={c.consultant_id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.total_leads}</TableCell>
                      <TableCell>{c.converted_leads}</TableCell>
                      <TableCell>{c.conversion_rate}%</TableCell>
                      <TableCell>{formatCurrency(c.total_value)}</TableCell>
                      <TableCell>{formatCurrency(c.converted_value)}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        )}

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
                    <p className="font-medium">{l.name}</p>
                    <p className="text-muted-foreground text-xs">{l.type} · {l.email ?? l.phone}</p>
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
