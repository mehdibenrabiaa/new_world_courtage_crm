"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { IdCardIcon, Loader2Icon } from "lucide-react"
import { listAccountsPage, type AccountType, type AdminAccount } from "@/lib/api"

const PAGE_SIZE_OPTIONS = [10, 20, 50]

const TYPE_LABELS: Record<AccountType, string> = {
  client: "Client",
  partenaire: "Partenaire",
}

const TYPE_BADGE_CLASS: Record<AccountType, string> = {
  client: "bg-blue-100 text-blue-700",
  partenaire: "bg-purple-100 text-purple-700",
}

const PROVIDER_LABELS: Record<string, string> = {
  google: "Google",
  apple: "Apple",
  facebook: "Facebook",
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
}

export default function ComptesPage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<AdminAccount[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [type, setType] = useState<AccountType | "Tous">("Tous")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  useEffect(() => {
    setLoading(true)
    listAccountsPage({
      page,
      pageSize,
      type: type === "Tous" ? undefined : type,
      search: search || undefined,
    })
      .then(({ accounts, total }) => {
        setAccounts(accounts)
        setTotal(total)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [page, pageSize, type, search])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

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
                <BreadcrumbPage>Comptes</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              placeholder="Rechercher un compte…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="w-64"
            />
            <Select value={type} onValueChange={(v) => { if (v != null) { setType(v as AccountType | "Tous"); setPage(1) } }}>
              <SelectTrigger className="w-44" aria-label="Filtrer par type">
                <SelectValue>{(v: string) => (v === "Tous" ? "Tous les types" : TYPE_LABELS[v as AccountType])}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Tous">Tous les types</SelectItem>
                <SelectItem value="client">Client</SelectItem>
                <SelectItem value="partenaire">Partenaire</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">
            <Loader2Icon className="inline animate-spin mr-2" size={16} />
            Chargement…
          </div>
        ) : accounts.length === 0 ? (
          <div className="border-2 border-dashed rounded-xl py-16 flex flex-col items-center gap-2 text-muted-foreground">
            <IdCardIcon size={20} />
            <p className="text-sm">
              {search || type !== "Tous" ? "Aucun compte ne correspond à votre recherche." : "Aucun compte pour le moment."}
            </p>
          </div>
        ) : (
          <>
            <Table containerClassName="max-h-[70vh] overflow-y-auto rounded-xl border">
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky top-0 z-10 bg-background">Nom</TableHead>
                  <TableHead className="sticky top-0 z-10 bg-background">Email</TableHead>
                  <TableHead className="sticky top-0 z-10 bg-background">Type</TableHead>
                  <TableHead className="sticky top-0 z-10 bg-background">Connexion</TableHead>
                  <TableHead className="sticky top-0 z-10 bg-background">Devis</TableHead>
                  <TableHead className="sticky top-0 z-10 bg-background">Code parrainage</TableHead>
                  <TableHead className="sticky top-0 z-10 bg-background">Inscrit le</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((a) => (
                  <TableRow key={a.id} className="cursor-pointer" onClick={() => router.push(`/dashboard/comptes/${a.id}`)}>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell>{a.email}</TableCell>
                    <TableCell>
                      <Badge className={`border-transparent ${TYPE_BADGE_CLASS[a.type]}`}>{TYPE_LABELS[a.type]}</Badge>
                    </TableCell>
                    <TableCell>{a.oauth_provider ? PROVIDER_LABELS[a.oauth_provider] ?? a.oauth_provider : "Mot de passe"}</TableCell>
                    <TableCell>{a.type === "client" ? a.leads_count : "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{a.type === "partenaire" ? a.referral_code : "—"}</TableCell>
                    <TableCell>{formatDate(a.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Lignes par page</span>
                <Select value={String(pageSize)} onValueChange={(v) => { if (v != null) { setPageSize(Number(v)); setPage(1) } }}>
                  <SelectTrigger size="sm" className="w-18">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((s) => (
                      <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">Page {page} sur {totalPages}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Précédent</Button>
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Suivant</Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
