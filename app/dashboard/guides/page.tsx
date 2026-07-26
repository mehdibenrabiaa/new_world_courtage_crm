"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
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
import {
  getGuides, createGuide, deleteGuide, saveGuide,
  type Guide, type Status,
} from "@/lib/guides-store"

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
  const router = useRouter()
  const [guides, setGuides] = useState<Guide[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [search, setSearch] = useState("")
  const [filterCat, setFilterCat] = useState("Tous")
  const [filterStatus, setFilterStatus] = useState<"Tous" | Status>("Tous")

  useEffect(() => { setGuides(getGuides()) }, [])

  const filtered = guides.filter((g) => {
    const matchSearch = g.title.toLowerCase().includes(search.toLowerCase())
    const matchCat = filterCat === "Tous" || g.category === filterCat
    const matchStatus = filterStatus === "Tous" || g.status === filterStatus
    return matchSearch && matchCat && matchStatus
  })

  function handleTitleChange(title: string) {
    setDraft((prev) => ({ ...prev, title, slug: toSlug(title) }))
  }

  function handleCreate() {
    if (!draft.title.trim()) return
    const guide = createGuide({
      title: draft.title,
      slug: draft.slug || toSlug(draft.title),
      category: draft.category,
      status: draft.status,
      categoryHref: "",
      intro: "",
      authorName: "Loubna Moucharref",
      authorAvatar: "/team/loubna-moucharref.jpeg",
      editorName: "",
      reviewerName: "",
      updatedDate: "",
      readingTime: "",
    })
    setCreateOpen(false)
    setDraft(EMPTY_DRAFT)
    router.push(`/dashboard/guides/${guide.id}`)
  }

  function handleDelete(id: number) {
    deleteGuide(id)
    setGuides((prev) => prev.filter((g) => g.id !== id))
  }

  function toggleStatus(g: Guide) {
    const next: Status = g.status === "Publié" ? "Brouillon" : "Publié"
    const updated = { ...g, status: next }
    saveGuide(updated)
    setGuides((prev) => prev.map((x) => x.id === g.id ? updated : x))
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
          <Select value={filterCat} onValueChange={(v) => v != null && setFilterCat(v)}>
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
          <Button className="ml-auto" onClick={() => { setDraft(EMPTY_DRAFT); setCreateOpen(true) }}>
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
              <TableRow
                key={g.id}
                className="cursor-pointer"
                onClick={() => router.push(`/dashboard/guides/${g.id}`)}
              >
                <TableCell className="font-medium max-w-xs truncate">{g.title}</TableCell>
                <TableCell className="text-muted-foreground text-xs font-mono">{g.slug}</TableCell>
                <TableCell>{g.category}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className={STATUS_STYLES[g.status]}>{g.status}</Badge>
                </TableCell>
                <TableCell>{formatDate(g.createdAt)}</TableCell>
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
                      <DropdownMenuItem onClick={() => router.push(`/dashboard/guides/${g.id}`)}>
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

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => !open && setCreateOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau guide</DialogTitle>
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
              <Select value={draft.category} onValueChange={(v) => v != null && setDraft((prev) => ({ ...prev, category: v }))}>
                <SelectTrigger id="g-cat" aria-label="Catégorie">
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
                <SelectTrigger id="g-status" aria-label="Statut">
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
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={!draft.title.trim()}>
              Créer &amp; éditer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
