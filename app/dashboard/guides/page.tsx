"use client"

import { useState } from "react"
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog, DialogContent, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { MoreHorizontalIcon, PencilIcon, Trash2Icon, PlusIcon } from "lucide-react"

type Status = "Brouillon" | "Publié"

type Guide = {
  id: number
  title: string
  slug: string
  category: string
  status: Status
  createdAt: string
}

const CATEGORIES = [
  "Flotte & Transport",
  "Taxi",
  "Ambulance",
  "VTC",
  "Pro de l'auto",
  "Construction",
  "Immobilier",
  "Général",
]

const STATUS_STYLES: Record<Status, string> = {
  "Brouillon": "bg-gray-100 text-gray-600",
  "Publié": "bg-green-100 text-green-700",
}

const INITIAL_GUIDES: Guide[] = [
  { id: 1, title: "Comment souscrire une assurance taxi ?", slug: "comment-souscrire-assurance-taxi", category: "Taxi", status: "Publié", createdAt: "2026-06-01" },
  { id: 2, title: "De quelle couverture ai-je besoin pour mon taxi ?", slug: "quelle-couverture-assurance-taxi", category: "Taxi", status: "Publié", createdAt: "2026-06-03" },
  { id: 3, title: "Comment choisir son assurance taxi ?", slug: "comment-choisir-assurance-taxi", category: "Taxi", status: "Publié", createdAt: "2026-06-05" },
  { id: 4, title: "Comment souscrire une assurance ambulance ?", slug: "comment-souscrire-assurance-ambulance", category: "Ambulance", status: "Publié", createdAt: "2026-06-08" },
  { id: 5, title: "Quelle couverture pour une assurance ambulance ?", slug: "quelle-couverture-assurance-ambulance", category: "Ambulance", status: "Publié", createdAt: "2026-06-10" },
  { id: 6, title: "Comment choisir son assurance ambulance ?", slug: "comment-choisir-assurance-ambulance", category: "Ambulance", status: "Publié", createdAt: "2026-06-12" },
  { id: 7, title: "Les garanties indispensables pour une flotte de transport", slug: "garanties-flotte-transport", category: "Flotte & Transport", status: "Brouillon", createdAt: "2026-06-20" },
  { id: 8, title: "Assurance décennale : guide complet pour les artisans", slug: "assurance-decennale-guide", category: "Construction", status: "Brouillon", createdAt: "2026-07-01" },
]

function formatDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number)
  return new Date(year, month - 1, day).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
}

type Draft = { title: string; slug: string; category: string; status: Status }

const EMPTY_DRAFT: Draft = { title: "", slug: "", category: CATEGORIES[0], status: "Brouillon" }

function toSlug(title: string) {
  return title
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
}

export default function GuidesPage() {
  const [guides, setGuides] = useState<Guide[]>(INITIAL_GUIDES)
  const [dialog, setDialog] = useState<"create" | "edit" | null>(null)
  const [editing, setEditing] = useState<Guide | null>(null)
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [search, setSearch] = useState("")
  const [filterCat, setFilterCat] = useState("Tous")
  const [filterStatus, setFilterStatus] = useState<"Tous" | Status>("Tous")

  const filtered = guides.filter((g) => {
    const matchSearch = g.title.toLowerCase().includes(search.toLowerCase())
    const matchCat = filterCat === "Tous" || g.category === filterCat
    const matchStatus = filterStatus === "Tous" || g.status === filterStatus
    return matchSearch && matchCat && matchStatus
  })

  function openCreate() {
    setEditing(null)
    setDraft(EMPTY_DRAFT)
    setDialog("create")
  }

  function openEdit(g: Guide) {
    setEditing(g)
    setDraft({ title: g.title, slug: g.slug, category: g.category, status: g.status })
    setDialog("edit")
  }

  function handleTitleChange(title: string) {
    setDraft((prev) => ({
      ...prev,
      title,
      slug: dialog === "create" ? toSlug(title) : prev.slug,
    }))
  }

  function save() {
    if (!draft.title.trim()) return
    if (dialog === "create") {
      const newId = Math.max(0, ...guides.map((g) => g.id)) + 1
      setGuides((prev) => [
        { id: newId, ...draft, createdAt: new Date().toISOString().split("T")[0] },
        ...prev,
      ])
    } else if (editing) {
      setGuides((prev) => prev.map((g) => g.id === editing.id ? { ...g, ...draft } : g))
    }
    setDialog(null)
  }

  function handleDelete(id: number) {
    setGuides((prev) => prev.filter((g) => g.id !== id))
  }

  function toggleStatus(g: Guide) {
    const next: Status = g.status === "Publié" ? "Brouillon" : "Publié"
    setGuides((prev) => prev.map((x) => x.id === g.id ? { ...x, status: next } : x))
  }

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
                <BreadcrumbPage>Guides</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Rechercher un guide…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <Select value={filterCat} onValueChange={setFilterCat}>
            <SelectTrigger className="w-44" aria-label="Filtrer par catégorie">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Tous">Toutes les catégories</SelectItem>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}>
            <SelectTrigger className="w-36" aria-label="Filtrer par statut">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Tous">Tous les statuts</SelectItem>
              <SelectItem value="Publié">Publié</SelectItem>
              <SelectItem value="Brouillon">Brouillon</SelectItem>
            </SelectContent>
          </Select>
          <Button className="ml-auto" onClick={openCreate}>
            <PlusIcon />
            Nouveau guide
          </Button>
        </div>

        {/* Table */}
        <Table containerClassName="rounded-xl border overflow-hidden">
          <TableHeader>
            <TableRow>
              <TableHead>Titre</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Créé le</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                  Aucun guide trouvé.
                </TableCell>
              </TableRow>
            ) : filtered.map((g) => (
              <TableRow key={g.id}>
                <TableCell className="font-medium max-w-xs truncate">{g.title}</TableCell>
                <TableCell className="text-muted-foreground text-xs font-mono">{g.slug}</TableCell>
                <TableCell>{g.category}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className={STATUS_STYLES[g.status]}>{g.status}</Badge>
                </TableCell>
                <TableCell>{formatDate(g.createdAt)}</TableCell>
                <TableCell>
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
                      <DropdownMenuItem onClick={() => openEdit(g)}>
                        <PencilIcon />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleStatus(g)}>
                        {g.status === "Publié" ? "Dépublier" : "Publier"}
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onClick={() => handleDelete(g.id)}>
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
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={!!dialog} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog === "create" ? "Nouveau guide" : `Modifier — ${editing?.title}`}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="g-title">Titre</Label>
              <Input
                id="g-title"
                value={draft.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Comment choisir son assurance taxi ?"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="g-slug">Slug</Label>
              <Input
                id="g-slug"
                value={draft.slug}
                onChange={(e) => setDraft((prev) => ({ ...prev, slug: e.target.value }))}
                placeholder="comment-choisir-assurance-taxi"
                className="font-mono text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="g-cat">Catégorie</Label>
              <Select value={draft.category} onValueChange={(v) => setDraft((prev) => ({ ...prev, category: v }))}>
                <SelectTrigger id="g-cat" className="w-full" aria-label="Catégorie">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="g-status">Statut</Label>
              <Select value={draft.status} onValueChange={(v) => setDraft((prev) => ({ ...prev, status: v as Status }))}>
                <SelectTrigger id="g-status" className="w-full" aria-label="Statut">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Brouillon">Brouillon</SelectItem>
                  <SelectItem value="Publié">Publié</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Annuler</Button>
            <Button onClick={save} disabled={!draft.title.trim()}>
              {dialog === "create" ? "Créer" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
