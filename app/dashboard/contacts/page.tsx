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
import { Checkbox } from "@/components/ui/checkbox"
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import { useToastManager } from "@/components/ui/toast"
import { Loader2Icon, Trash2Icon } from "lucide-react"
import { listLeadContacts, deleteLeadContact, type LeadContact } from "@/lib/api"

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
}

export default function ContactsPage() {
  const router = useRouter()
  const toastManager = useToastManager()
  const [contacts, setContacts] = useState<LeadContact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [deleteTarget, setDeleteTarget] = useState<LeadContact | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  useEffect(() => {
    listLeadContacts()
      .then(setContacts)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteLeadContact(deleteTarget.id)
      setContacts((prev) => prev.filter((c) => c.id !== deleteTarget.id))
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(deleteTarget.id)
        return next
      })
      setDeleteTarget(null)
    } catch (err) {
      toastManager.add({
        title: "Impossible de supprimer ce contact",
        description: err instanceof Error ? err.message : "Une erreur est survenue.",
        type: "error",
      })
    } finally {
      setDeleting(false)
    }
  }

  function toggleSelected(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function confirmBulkDelete() {
    const ids = [...selected]
    if (ids.length === 0) return
    setBulkDeleting(true)
    const failed: number[] = []
    await Promise.all(
      ids.map((id) =>
        deleteLeadContact(id).catch(() => {
          failed.push(id)
        })
      )
    )
    const succeeded = ids.filter((id) => !failed.includes(id))
    setContacts((prev) => prev.filter((c) => !succeeded.includes(c.id)))
    setSelected(new Set(failed))
    setBulkDeleting(false)
    setBulkDeleteOpen(false)
    if (failed.length > 0) {
      toastManager.add({
        title: `${failed.length} contact${failed.length > 1 ? "s" : ""} n'ont pas pu être supprimés`,
        type: "error",
      })
    }
  }

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
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <Input
            placeholder="Rechercher un contact…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-64"
          />
          {selected.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selected.size} sélectionné{selected.size > 1 ? "s" : ""}
              </span>
              <Button variant="outline" size="sm" onClick={() => setSelected(new Set())}>
                Désélectionner
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}>
                <Trash2Icon size={14} />
                Supprimer
              </Button>
            </div>
          )}
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
                  <TableHead className="sticky top-0 z-10 bg-background w-10">
                    <Checkbox
                      checked={paginated.length > 0 && paginated.every((c) => selected.has(c.id))}
                      onCheckedChange={() => {
                        setSelected((prev) => {
                          const allChecked = paginated.every((c) => prev.has(c.id))
                          const next = new Set(prev)
                          for (const c of paginated) {
                            if (allChecked) next.delete(c.id)
                            else next.add(c.id)
                          }
                          return next
                        })
                      }}
                    />
                  </TableHead>
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
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggleSelected(c.id)} />
                    </TableCell>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.phone}</TableCell>
                    <TableCell>{c.email ?? "—"}</TableCell>
                    <TableCell className="max-w-[220px] truncate" title={c.address ?? ""}>
                      {c.address ?? "—"}
                    </TableCell>
                    <TableCell>{formatDate(c.created_at)}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()} className="flex items-center gap-2">
                      {c.lead_deleted && (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-500">
                          Lead supprimé
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="ml-auto text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteTarget(c)}
                      >
                        <Trash2Icon size={14} />
                      </Button>
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

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le contact de {deleteTarget?.name} ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est définitive et ne supprime pas le lead associé, seulement cette fiche de contact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? <><Loader2Icon size={14} className="animate-spin" /> Suppression…</> : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={(open) => !open && setBulkDeleteOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer {selected.size} contact{selected.size > 1 ? "s" : ""} ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est définitive et ne supprime pas les leads associés, seulement ces fiches de contact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={confirmBulkDelete}
              disabled={bulkDeleting}
            >
              {bulkDeleting ? <><Loader2Icon size={14} className="animate-spin" /> Suppression…</> : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
