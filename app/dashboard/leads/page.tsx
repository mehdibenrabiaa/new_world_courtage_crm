"use client"

import { useEffect, useState } from "react"
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
import { Textarea } from "@/components/ui/textarea"
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
import { MoreHorizontalIcon, PencilIcon, Trash2Icon, Loader2Icon, PlusIcon } from "lucide-react"
import {
  listLeads, updateLead, deleteLead, createLead,
  type Lead, type LeadStatus, type LeadType, type LeadCreate,
} from "@/lib/api"
import { CATEGORIES } from "@/lib/categories"

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

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50]

type Draft = {
  status: LeadStatus
  name: string
  phone: string
  email: string
  type: LeadType
  immat: string
  naissance: string
  permis: string
  siret: string
  activite: string
  notes: string
}

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
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Lead | null>(null)
  const [draft, setDraft] = useState<Draft>({ status: "new", name: "", phone: "", email: "", type: CATEGORIES[0], immat: "", naissance: "", permis: "", siret: "", activite: "", notes: "" })
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null)
  const [deleting, setDeleting] = useState(false)
  const toastManager = useToastManager()

  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newLead, setNewLead] = useState<NewLead>(EMPTY_NEW_LEAD)

  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState<"Tous" | LeadType>("Tous")
  const [filterStatus, setFilterStatus] = useState<"Tous" | LeadStatus>("Tous")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    listLeads()
      .then(setLeads)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = leads.filter((l) => {
    const q = search.toLowerCase()
    const matchSearch = !q || l.name.toLowerCase().includes(q) || (l.email ?? "").toLowerCase().includes(q) || l.phone.includes(q)
    const matchType = filterType === "Tous" || l.type === filterType
    const matchStatus = filterStatus === "Tous" || l.status === filterStatus
    return matchSearch && matchType && matchStatus
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  function changePageSize(value: string) {
    setPageSize(Number(value))
    setPage(1)
  }

  function openEdit(l: Lead) {
    setEditing(l)
    setDraft({
      status: l.status,
      name: l.name,
      phone: l.phone,
      email: l.email ?? "",
      type: l.type,
      immat: l.immat ?? "",
      naissance: l.naissance ?? "",
      permis: l.permis ?? "",
      siret: l.siret ?? "",
      activite: l.activite ?? "",
      notes: l.notes ?? "",
    })
  }

  async function handleSave() {
    if (!editing) return
    setSaving(true)
    try {
      const updated = await updateLead(editing.id, {
        status: draft.status,
        name: draft.name.trim() || undefined,
        phone: draft.phone.trim() || undefined,
        email: draft.email.trim() || undefined,
        type: draft.type,
        immat: draft.immat.trim() || undefined,
        naissance: draft.naissance.trim() || undefined,
        permis: draft.permis.trim() || undefined,
        siret: draft.siret.trim() || undefined,
        activite: draft.activite.trim() || undefined,
        notes: draft.notes.trim() || undefined,
      })
      setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
      setEditing(null)
      toastManager.add({ title: "Lead mis à jour", type: "success" })
    } catch (err) {
      console.error(err)
      toastManager.add({ title: "Impossible de mettre à jour ce lead", type: "error" })
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteLead(deleteTarget.id)
      setLeads((prev) => prev.filter((l) => l.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err) {
      console.error(err)
      toastManager.add({ title: "Impossible de supprimer ce lead", type: "error" })
    } finally {
      setDeleting(false)
    }
  }

  function openCreate() {
    setNewLead(EMPTY_NEW_LEAD)
    setCreateOpen(true)
  }

  async function handleCreate() {
    if (!newLead.name.trim() || !newLead.phone.trim()) return
    setCreating(true)
    try {
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
      }
      const created = await createLead(payload)
      setLeads((prev) => [created, ...prev])
      setCreateOpen(false)
      toastManager.add({ title: "Lead créé", description: created.name, type: "success" })
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
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Tous">Toutes les catégories</SelectItem>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={(v) => { if (v != null) { setFilterStatus(v as typeof filterStatus); setPage(1) } }}>
            <SelectTrigger className="w-40" aria-label="Filtrer par statut">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Tous">Tous les statuts</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
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
              <TableHead className="sticky top-0 z-10 bg-background">Source</TableHead>
              <TableHead className="sticky top-0 z-10 bg-background">Créé le</TableHead>
              <TableHead className="sticky top-0 z-10 w-10 bg-background" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                  <Loader2Icon className="inline animate-spin mr-2" size={16} />
                  Chargement…
                </TableCell>
              </TableRow>
            ) : paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                  Aucun lead trouvé.
                </TableCell>
              </TableRow>
            ) : paginated.map((l) => (
              <TableRow key={l.id} className="cursor-pointer" onClick={() => openEdit(l)}>
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
                <TableCell className="max-w-[160px] truncate text-xs text-muted-foreground" title={l.source ?? ""}>
                  {l.source ?? "—"}
                </TableCell>
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
                      <DropdownMenuItem onClick={() => openEdit(l)}>
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
              Page {currentPage} sur {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Suivant
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.name}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="l-status">Statut</Label>
              <Select value={draft.status} onValueChange={(v) => v != null && setDraft((p) => ({ ...p, status: v as LeadStatus }))}>
                <SelectTrigger id="l-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="l-type">Catégorie</Label>
              <Select value={draft.type} onValueChange={(v) => v != null && setDraft((p) => ({ ...p, type: v as LeadType }))}>
                <SelectTrigger id="l-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="l-name">Nom</Label>
                <Input
                  id="l-name"
                  value={draft.name}
                  onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Karim Belkacem"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="l-phone">Téléphone</Label>
                <Input
                  id="l-phone"
                  value={draft.phone}
                  onChange={(e) => setDraft((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="06 12 34 56 78"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="l-email">Email</Label>
              <Input
                id="l-email"
                value={draft.email}
                onChange={(e) => setDraft((p) => ({ ...p, email: e.target.value }))}
                placeholder="client@email.com"
              />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-muted-foreground">Détails véhicule</span>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="l-immat">Immatriculation</Label>
                  <Input
                    id="l-immat"
                    value={draft.immat}
                    onChange={(e) => setDraft((p) => ({ ...p, immat: e.target.value }))}
                    placeholder="AB-123-CD"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="l-naissance">Naissance</Label>
                  <Input
                    id="l-naissance"
                    value={draft.naissance}
                    onChange={(e) => setDraft((p) => ({ ...p, naissance: e.target.value }))}
                    placeholder="MM/AAAA"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="l-permis">Permis</Label>
                  <Input
                    id="l-permis"
                    value={draft.permis}
                    onChange={(e) => setDraft((p) => ({ ...p, permis: e.target.value }))}
                    placeholder="MM/AAAA"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-muted-foreground">Détails entreprise</span>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="l-siret">SIRET</Label>
                  <Input
                    id="l-siret"
                    value={draft.siret}
                    onChange={(e) => setDraft((p) => ({ ...p, siret: e.target.value }))}
                    placeholder="123 456 789 00012"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="l-activite">Activité</Label>
                  <Input
                    id="l-activite"
                    value={draft.activite}
                    onChange={(e) => setDraft((p) => ({ ...p, activite: e.target.value }))}
                    placeholder="Construction"
                  />
                </div>
              </div>
            </div>

            {editing?.source && (
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">Source :</span> {editing.source}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="l-notes">Notes</Label>
              <Textarea
                id="l-notes"
                value={draft.notes}
                onChange={(e) => setDraft((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Notes internes sur ce lead…"
                className="resize-none min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2Icon size={14} className="animate-spin" /> Enregistrement…</> : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
