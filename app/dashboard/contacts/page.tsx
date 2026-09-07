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
import { Loader2Icon } from "lucide-react"
import { listLeadContacts, type LeadContact } from "@/lib/api"

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
}

export default function ContactsPage() {
  const router = useRouter()
  const [contacts, setContacts] = useState<LeadContact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    listLeadContacts()
      .then(setContacts)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = contacts.filter((c) => {
    const q = search.toLowerCase()
    if (!q) return true
    return (
      c.name.toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.address ?? "").toLowerCase().includes(q)
    )
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

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
                <BreadcrumbPage>Contacts</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Rechercher un contact…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-64"
          />
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">
            <Loader2Icon className="inline animate-spin mr-2" size={16} />
            Chargement…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-muted-foreground">Aucun contact pour le moment.</div>
        ) : (
          <>
            <Table containerClassName="max-h-[70vh] overflow-y-auto rounded-xl border">
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky top-0 z-10 bg-background">Nom</TableHead>
                  <TableHead className="sticky top-0 z-10 bg-background">Téléphone</TableHead>
                  <TableHead className="sticky top-0 z-10 bg-background">Email</TableHead>
                  <TableHead className="sticky top-0 z-10 bg-background">Adresse</TableHead>
                  <TableHead className="sticky top-0 z-10 bg-background">Ajouté le</TableHead>
                  <TableHead className="sticky top-0 z-10 bg-background" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((c) => (
                  <TableRow
                    key={c.id}
                    className={c.lead_id ? "cursor-pointer" : ""}
                    onClick={() => c.lead_id && router.push(`/dashboard/leads/${c.lead_id}`)}
                  >
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.phone}</TableCell>
                    <TableCell>{c.email ?? "—"}</TableCell>
                    <TableCell className="max-w-[220px] truncate" title={c.address ?? ""}>
                      {c.address ?? "—"}
                    </TableCell>
                    <TableCell>{formatDate(c.created_at)}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {c.lead_deleted && (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-500">
                          Lead supprimé
                        </Badge>
                      )}
                    </TableCell>
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
                <span className="text-sm text-muted-foreground">Page {currentPage} sur {totalPages}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>Précédent</Button>
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Suivant</Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
