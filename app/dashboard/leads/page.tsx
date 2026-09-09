"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import { useToastManager } from "@/components/ui/toast"
import { Skeleton } from "@/components/ui/skeleton"
import { MoreHorizontalIcon, PencilIcon, Trash2Icon, Loader2Icon, PlusIcon } from "lucide-react"
import {
  listLeadsPage, deleteLead, createLead, listAssignableUsers, updateLead,
  type LeadListItem, type LeadStatus, type LeadType, type LeadCreate, type LeadAssignee,
} from "@/lib/api"
import { CATEGORIES } from "@/lib/categories"
import { useAuth } from "@/components/auth-provider"

const STATUSES: LeadStatus[] = ["new", "contacted", "qualified", "converted", "lost"]

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Nouveau",
  contacted: "Contacté",
  qualified: "Qualifié",
  converted: "Converti",
  lost: "Perdu",
}

const STATUS_STYLES: Record<LeadStatus, string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-amber-100 text-amber-700",
  qualified: "bg-purple-100 text-purple-700",
  converted: "bg-green-100 text-green-700",
  lost: "bg-red-100 text-red-700",
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
}

// base-ui's Select.Value doesn't auto-resolve a SelectItem's label from its
// children (unlike Radix) — it needs an explicit value->label mapper, hence
// this everywhere a Select's value isn't already its own display string.
function assigneeLabel(value: string, users: LeadAssignee[], allLabel?: string): string {
  if (allLabel && value === "Tous") return allLabel
  if (value === "unassigned") return "Non assigné"
  return users.find((u) => String(u.id) === value)?.name ?? value
}

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50]

type NewLead = {
  type: LeadType
  name: string
  phone: string
  email: string
  immat: string
  naissance: string
  permis: string
  siret: string
  activite: string
}

const EMPTY_NEW_LEAD: NewLead = {
  type: CATEGORIES[0], name: "", phone: "", email: "",
  immat: "", naissance: "", permis: "", siret: "", activite: "",
}

export default function LeadsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user: me } = useAuth()
  const canAssign = me?.role === "superadmin" || me?.role === "admin"
  const [leads, setLeads] = useState<LeadListItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<LeadListItem | null>(null)
  const [deleting, setDeleting] = useState(false)
  const toastManager = useToastManager()

  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newLead, setNewLead] = useState<NewLead>(EMPTY_NEW_LEAD)
  const [newLeadAssigneeId, setNewLeadAssigneeId] = useState<string>("unassigned")

  const [assignableUsers, setAssignableUsers] = useState<LeadAssignee[]>([])
  const [reassigningId, setReassigningId] = useState<number | null>(null)

  const [search, setSearch] = useState("")
  // Debounced separately from `search` so every keystroke doesn't fire a
  // request — only once typing pauses.
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [filterType, setFilterType] = useState<"Tous" | LeadType>("Tous")
  const [filterStatus, setFilterStatus] = useState<"Tous" | LeadStatus>("Tous")
  const [filterAssignee, setFilterAssignee] = useState<"Tous" | string>("Tous")

  // Page/page-size live in the URL (?page=…&pageSize=…), not local state —
  // that way a refresh, a shared link, or the browser's back/forward button
  // lands back on the same page instead of resetting to page 1.
  const pageParam = Number(searchParams.get("page"))
  const page = pageParam > 0 ? pageParam : 1
  const pageSizeParam = Number(searchParams.get("pageSize"))
  const pageSize = PAGE_SIZE_OPTIONS.includes(pageSizeParam) ? pageSizeParam : 10

  function updateParams(updates: Record<string, string | number | undefined>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined) params.delete(key)
      else params.set(key, String(value))
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  function setPage(value: number) {
    // Always write pageSize alongside page so a shared/bookmarked URL is
    // self-contained instead of silently depending on the default.
    updateParams({ page: value, pageSize })
  }

  // Bumped to force a re-fetch of the current page after a mutation
  // (create/delete) instead of trying to patch server-side pagination state
  // by hand.
  const [refreshKey, setRefreshKey] = useState(0)
  const refetch = () => setRefreshKey((k) => k + 1)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(t)
  }, [search])

  // Server-side pagination — with thousands of leads, fetching everything
  // up front and slicing client-side doesn't scale, so only the current
  // page's rows (plus a total count for the pager) ever cross the wire.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listLeadsPage({
      page,
      pageSize,
      status: filterStatus === "Tous" ? undefined : filterStatus,
      type: filterType === "Tous" ? undefined : filterType,
      unassigned: filterAssignee === "unassigned" ? true : undefined,
      assignedToId: filterAssignee !== "Tous" && filterAssignee !== "unassigned" ? Number(filterAssignee) : undefined,
      search: debouncedSearch.trim() || undefined,
    })
      .then(({ leads, total }) => {
        if (cancelled) return
        setLeads(leads)
        setTotal(total)
      })
      .catch((err) => {
        if (!cancelled) {
          console.error(err)
          toastManager.add({ title: "Impossible de charger les leads", type: "error" })
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, debouncedSearch, filterType, filterStatus, filterAssignee, refreshKey])

  // Consultants can't assign anyway (the backend already scopes their list
  // to their own leads), so this list — and the filter/picker it feeds —
  // is only fetched for roles that can actually do something with it.
  useEffect(() => {
    if (canAssign) listAssignableUsers().then(setAssignableUsers).catch(console.error)
  }, [canAssign])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  // If a delete (or a filter change) leaves the current page past the end,
  // snap back instead of showing an empty page with a live "next" disabled
  // on a page number that no longer exists. Gated on `!loading` — `total`
  // starts at 0 before the first fetch resolves, which would otherwise make
  // totalPages briefly look like 1 and immediately kick a URL-restored
  // ?page=3 back down to 1 before the real count ever arrives.
  useEffect(() => {
    if (!loading && page > totalPages) setPage(totalPages)
  }, [loading, page, totalPages])

  function changePageSize(value: string) {
    updateParams({ pageSize: value, page: 1 })
  }

  async function handleInlineReassign(lead: LeadListItem, value: string) {
    setReassigningId(lead.id)
    try {
      const updated = value === "unassigned"
        ? await updateLead(lead.id, { unassign: true })
        : await updateLead(lead.id, { assigned_to_id: Number(value) })
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? updated : l)))
    } catch (err) {
      console.error(err)
      toastManager.add({ title: "Impossible de réassigner ce lead", type: "error" })
    } finally {
      setReassigningId(null)
    }
  }

  function openLead(l: LeadListItem) {
    router.push(`/dashboard/leads/${l.id}`)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteLead(deleteTarget.id)
      setDeleteTarget(null)
      refetch()
    } catch (err) {
      console.error(err)
      toastManager.add({ title: "Impossible de supprimer ce lead", type: "error" })
    } finally {
      setDeleting(false)
    }
  }

  function openCreate() {
    setNewLead(EMPTY_NEW_LEAD)
    setNewLeadAssigneeId("unassigned")
    setCreateOpen(true)
  }

  async function handleCreate() {
    if (!newLead.name.trim() || !newLead.phone.trim()) return
    setCreating(true)
    try {
      // A consultant creating a lead manually auto-assigns it to themselves
      // — otherwise they'd immediately lose visibility on the lead they
      // just made, since consultants only ever see their own assignments.
      // Superadmin/admin get an explicit picker instead (openCreate/dialog
      // below), defaulting to unassigned.
      const assignedToId =
        me?.role === "consultant" ? me.id
        : newLeadAssigneeId !== "unassigned" ? Number(newLeadAssigneeId)
        : undefined
      const payload: LeadCreate = {
        type: newLead.type,
        name: newLead.name.trim(),
        phone: newLead.phone.trim(),
        email: newLead.email.trim() || undefined,
        source: "CRM (saisie manuelle)",
        immat: newLead.immat.trim() || undefined,
        naissance: newLead.naissance.trim() || undefined,
        permis: newLead.permis.trim() || undefined,
        siret: newLead.siret.trim() || undefined,
        activite: newLead.activite.trim() || undefined,
        assigned_to_id: assignedToId,
      }
      const created = await createLead(payload)
      setCreateOpen(false)
      toastManager.add({ title: "Lead créé", description: created.name, type: "success" })
      // Newest-first sort means a freshly created lead lands on page 1 —
      // jump there and re-fetch so it actually shows up.
      if (page === 1) refetch()
      else setPage(1)
    } catch (err) {
      console.error(err)
      toastManager.add({ title: "Impossible de créer le lead", type: "error" })
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-vertical:h-4 data-vertical:self-auto"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard">Tableau de bord</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Leads</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Rechercher un lead…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-64"
          />
          <Select value={filterType} onValueChange={(v) => { if (v != null) { setFilterType(v as typeof filterType); setPage(1) } }}>
            <SelectTrigger className="w-48" aria-label="Filtrer par catégorie">
              <SelectValue>{(v: string) => (v === "Tous" ? "Toutes les catégories" : v)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Tous">Toutes les catégories</SelectItem>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={(v) => { if (v != null) { setFilterStatus(v as typeof filterStatus); setPage(1) } }}>
            <SelectTrigger className="w-40" aria-label="Filtrer par statut">
              <SelectValue>{(v: string) => (v === "Tous" ? "Tous les statuts" : STATUS_LABELS[v as LeadStatus] ?? v)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Tous">Tous les statuts</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          {canAssign && (
            <Select value={filterAssignee} onValueChange={(v) => { if (v != null) { setFilterAssignee(v); setPage(1) } }}>
              <SelectTrigger className="w-44" aria-label="Filtrer par assigné">
                <SelectValue>{(v: string) => assigneeLabel(v, assignableUsers, "Tous les assignés")}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Tous">Tous les assignés</SelectItem>
                <SelectItem value="unassigned">Non assigné</SelectItem>
                {assignableUsers.map((u) => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Button className="ml-auto" onClick={openCreate}>
            <PlusIcon />
            Nouveau lead
          </Button>
        </div>

        <Table containerClassName="max-h-[70vh] overflow-y-auto rounded-xl border">
          <TableHeader>
            <TableRow>
              <TableHead className="sticky top-0 z-10 bg-background">Client</TableHead>
              <TableHead className="sticky top-0 z-10 bg-background">Contact</TableHead>
              <TableHead className="sticky top-0 z-10 bg-background">Catégorie</TableHead>
              <TableHead className="sticky top-0 z-10 bg-background">Statut</TableHead>
              {canAssign && <TableHead className="sticky top-0 z-10 bg-background">Assigné à</TableHead>}
              <TableHead className="sticky top-0 z-10 bg-background">Créé le</TableHead>
              <TableHead className="sticky top-0 z-10 w-10 bg-background" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              // Skeleton rows reserve the same height a full page of real
              // rows would take, so the table doesn't collapse then snap
              // back open on every page/filter change.
              Array.from({ length: pageSize }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell>
                    <Skeleton className="h-3 w-24 mb-1.5" />
                    <Skeleton className="h-3 w-32" />
                  </TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                  {canAssign && <TableCell><Skeleton className="h-8 w-40" /></TableCell>}
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
                </TableRow>
              ))
            ) : leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canAssign ? 7 : 6} className="text-center text-muted-foreground py-10">
                  Aucun lead trouvé.
                </TableCell>
              </TableRow>
            ) : leads.map((l) => (
              <TableRow key={l.id} className="cursor-pointer" onClick={() => openLead(l)}>
                <TableCell className="font-medium">{l.name}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  <div>{l.phone}</div>
                  {l.email && <div>{l.email}</div>}
                </TableCell>
                <TableCell>{l.type}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className={STATUS_STYLES[l.status]}>
                    {STATUS_LABELS[l.status]}
                  </Badge>
                </TableCell>
                {canAssign && (
                  <TableCell className="text-sm" onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={l.assigned_to ? String(l.assigned_to.id) : "unassigned"}
                      onValueChange={(v) => v != null && handleInlineReassign(l, v)}
                    >
                      <SelectTrigger size="sm" className="w-40" disabled={reassigningId === l.id} aria-label="Assigné à">
                        {reassigningId === l.id ? (
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Loader2Icon size={13} className="animate-spin" />
                            Enregistrement…
                          </span>
                        ) : (
                          <SelectValue>
                            {(v: string) => assigneeLabel(v, assignableUsers)}
                          </SelectValue>
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Non assigné</SelectItem>
                        {assignableUsers.map((u) => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                )}
                <TableCell>{formatDate(l.created_at)}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontalIcon />
                          <span className="sr-only">Actions</span>
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openLead(l)}>
                        <PencilIcon />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setDeleteTarget(l)}
                      >
                        <Trash2Icon />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Lignes par page</span>
            <Select value={String(pageSize)} onValueChange={(v) => v != null && changePageSize(v)}>
              <SelectTrigger size="sm" className="w-18">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {total} lead{total > 1 ? "s" : ""} · page {page} sur {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1 || loading}
              >
                Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages || loading}
              >
                Suivant
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => !open && setCreateOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau lead</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nl-type">Catégorie</Label>
              <Select
                value={newLead.type}
                onValueChange={(v) => v != null && setNewLead((p) => ({ ...p, type: v as LeadType }))}
              >
                <SelectTrigger id="nl-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {canAssign && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nl-assignee">Assigner à (optionnel)</Label>
                <Select value={newLeadAssigneeId} onValueChange={(v) => v != null && setNewLeadAssigneeId(v)}>
                  <SelectTrigger id="nl-assignee" className="w-full">
                    <SelectValue>{(v: string) => assigneeLabel(v, assignableUsers)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Non assigné</SelectItem>
                    {assignableUsers.map((u) => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nl-name">Nom</Label>
                <Input
                  id="nl-name"
                  value={newLead.name}
                  onChange={(e) => setNewLead((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Karim Belkacem"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nl-phone">Téléphone</Label>
                <Input
                  id="nl-phone"
                  value={newLead.phone}
                  onChange={(e) => setNewLead((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="06 12 34 56 78"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nl-email">Email (optionnel)</Label>
              <Input
                id="nl-email"
                value={newLead.email}
                onChange={(e) => setNewLead((p) => ({ ...p, email: e.target.value }))}
                placeholder="client@email.com"
              />
            </div>

            {/* Optional, freeform — relevant fields vary by category so both
                groups stay available rather than guessing from the category. */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-muted-foreground">Détails véhicule (optionnel)</span>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="nl-immat">Immatriculation</Label>
                  <Input
                    id="nl-immat"
                    value={newLead.immat}
                    onChange={(e) => setNewLead((p) => ({ ...p, immat: e.target.value }))}
                    placeholder="AB-123-CD"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="nl-naissance">Naissance</Label>
                  <Input
                    id="nl-naissance"
                    value={newLead.naissance}
                    onChange={(e) => setNewLead((p) => ({ ...p, naissance: e.target.value }))}
                    placeholder="MM/AAAA"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="nl-permis">Permis</Label>
                  <Input
                    id="nl-permis"
                    value={newLead.permis}
                    onChange={(e) => setNewLead((p) => ({ ...p, permis: e.target.value }))}
                    placeholder="MM/AAAA"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-muted-foreground">Détails entreprise (optionnel)</span>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="nl-siret">SIRET</Label>
                  <Input
                    id="nl-siret"
                    value={newLead.siret}
                    onChange={(e) => setNewLead((p) => ({ ...p, siret: e.target.value }))}
                    placeholder="123 456 789 00012"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="nl-activite">Activité</Label>
                  <Input
                    id="nl-activite"
                    value={newLead.activite}
                    onChange={(e) => setNewLead((p) => ({ ...p, activite: e.target.value }))}
                    placeholder="Construction"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              Annuler
            </Button>
            <Button onClick={handleCreate} disabled={!newLead.name.trim() || !newLead.phone.trim() || creating}>
              {creating ? <><Loader2Icon size={14} className="animate-spin" /> Création…</> : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer {deleteTarget?.name} ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est définitive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? <><Loader2Icon size={14} className="animate-spin" /> Suppression…</> : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
