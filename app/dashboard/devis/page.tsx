"use client"

import { useState } from "react"
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
import { MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react"

type Devis = {
  ref: string
  client: string
  type: string
  stage: string
  createdAt: string
}

const TYPES = ["Flotte & Transport", "Pro de l'auto", "Construction", "Immobilier"]
const STAGES = ["Nouveau", "Contacté", "Devis envoyé", "Signé", "Perdu"]

const STAGE_STYLES: Record<string, string> = {
  "Nouveau": "bg-blue-100 text-blue-700",
  "Contacté": "bg-amber-100 text-amber-700",
  "Devis envoyé": "bg-purple-100 text-purple-700",
  "Signé": "bg-green-100 text-green-700",
  "Perdu": "bg-red-100 text-red-700",
}

const INITIAL_DEVIS: Devis[] = [
  { ref: "DV-2026-024", client: "Karim Belkacem", type: "Flotte & Transport", stage: "Nouveau", createdAt: "2026-07-14" },
  { ref: "DV-2026-023", client: "Sophie Marchand", type: "Pro de l'auto", stage: "Contacté", createdAt: "2026-07-13" },
  { ref: "DV-2026-022", client: "Entreprise Duval BTP", type: "Construction", stage: "Devis envoyé", createdAt: "2026-07-12" },
  { ref: "DV-2026-021", client: "Amélie Rousseau", type: "Immobilier", stage: "Signé", createdAt: "2026-07-10" },
  { ref: "DV-2026-020", client: "Yassine Taxi SARL", type: "Flotte & Transport", stage: "Devis envoyé", createdAt: "2026-07-09" },
  { ref: "DV-2026-019", client: "Marc Lefèvre", type: "Pro de l'auto", stage: "Perdu", createdAt: "2026-07-08" },
  { ref: "DV-2026-018", client: "SCI Le Provençal", type: "Immobilier", stage: "Contacté", createdAt: "2026-07-06" },
  { ref: "DV-2026-017", client: "Bâtiment Moreau & Fils", type: "Construction", stage: "Nouveau", createdAt: "2026-07-05" },
  { ref: "DV-2026-016", client: "Julien Fontaine", type: "Pro de l'auto", stage: "Devis envoyé", createdAt: "2026-07-04" },
  { ref: "DV-2026-015", client: "Nadia Cherif", type: "Immobilier", stage: "Nouveau", createdAt: "2026-07-03" },
  { ref: "DV-2026-014", client: "Transport Girard SAS", type: "Flotte & Transport", stage: "Signé", createdAt: "2026-07-02" },
  { ref: "DV-2026-013", client: "Léa Dubosc", type: "Construction", stage: "Contacté", createdAt: "2026-07-01" },
  { ref: "DV-2026-012", client: "Hakim Amrani", type: "Pro de l'auto", stage: "Nouveau", createdAt: "2026-06-30" },
  { ref: "DV-2026-011", client: "SCI Bellevue", type: "Immobilier", stage: "Devis envoyé", createdAt: "2026-06-28" },
  { ref: "DV-2026-010", client: "Chloé Renard", type: "Flotte & Transport", stage: "Perdu", createdAt: "2026-06-27" },
  { ref: "DV-2026-009", client: "Bâti Sud Construction", type: "Construction", stage: "Signé", createdAt: "2026-06-25" },
  { ref: "DV-2026-008", client: "Fatima Zahra", type: "Pro de l'auto", stage: "Contacté", createdAt: "2026-06-24" },
  { ref: "DV-2026-007", client: "Thomas Béranger", type: "Immobilier", stage: "Nouveau", createdAt: "2026-06-22" },
  { ref: "DV-2026-006", client: "Ambulances Réunies", type: "Flotte & Transport", stage: "Devis envoyé", createdAt: "2026-06-21" },
  { ref: "DV-2026-005", client: "Omar Idrissi", type: "Construction", stage: "Contacté", createdAt: "2026-06-19" },
  { ref: "DV-2026-004", client: "Camille Vasseur", type: "Pro de l'auto", stage: "Signé", createdAt: "2026-06-18" },
  { ref: "DV-2026-003", client: "SCI Horizon", type: "Immobilier", stage: "Perdu", createdAt: "2026-06-16" },
  { ref: "DV-2026-002", client: "VTC Excellence SARL", type: "Flotte & Transport", stage: "Nouveau", createdAt: "2026-06-15" },
  { ref: "DV-2026-001", client: "Rachid Benali", type: "Construction", stage: "Devis envoyé", createdAt: "2026-06-14" },
]

function formatLocalDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number)
  return new Date(year, month - 1, day).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50]

export default function DevisPage() {
  const [devis, setDevis] = useState<Devis[]>(INITIAL_DEVIS)
  const [editing, setEditing] = useState<Devis | null>(null)
  const [draft, setDraft] = useState<{ client: string; type: string; stage: string }>({
    client: "",
    type: "",
    stage: "",
  })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const totalPages = Math.max(1, Math.ceil(devis.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paginatedDevis = devis.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  function changePageSize(value: string) {
    setPageSize(Number(value))
    setPage(1)
  }

  function openEdit(d: Devis) {
    setEditing(d)
    setDraft({ client: d.client, type: d.type, stage: d.stage })
  }

  function saveEdit() {
    if (!editing) return
    setDevis((prev) =>
      prev.map((d) =>
        d.ref === editing.ref
          ? { ...d, client: draft.client, type: draft.type, stage: draft.stage }
          : d
      )
    )
    setEditing(null)
  }

  function deleteDevis(ref: string) {
    setDevis((prev) => prev.filter((d) => d.ref !== ref))
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
                <BreadcrumbLink href="#">Platform</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Devis</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <Table containerClassName="max-h-[70vh] overflow-y-auto rounded-xl border">
            <TableHeader>
                <TableRow>
                  <TableHead className="sticky top-0 z-10 bg-background">Référence</TableHead>
                  <TableHead className="sticky top-0 z-10 bg-background">Client</TableHead>
                  <TableHead className="sticky top-0 z-10 bg-background">Type</TableHead>
                  <TableHead className="sticky top-0 z-10 bg-background">Étape</TableHead>
                  <TableHead className="sticky top-0 z-10 bg-background">Créé le</TableHead>
                  <TableHead className="sticky top-0 z-10 w-10 bg-background" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedDevis.map((d) => (
                  <TableRow key={d.ref}>
                    <TableCell className="font-medium">{d.ref}</TableCell>
                    <TableCell>{d.client}</TableCell>
                    <TableCell>{d.type}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={STAGE_STYLES[d.stage]}>
                        {d.stage}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatLocalDate(d.createdAt)}</TableCell>
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
                          <DropdownMenuItem onClick={() => openEdit(d)}>
                            <PencilIcon />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => deleteDevis(d.ref)}
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
              <Select value={String(pageSize)} onValueChange={changePageSize}>
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
            <DialogTitle>Modifier le devis {editing?.ref}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-client">Client</Label>
              <Input
                id="edit-client"
                value={draft.client}
                onChange={(e) => setDraft((prev) => ({ ...prev, client: e.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-type">Type</Label>
              <Select
                value={draft.type}
                onValueChange={(value) => setDraft((prev) => ({ ...prev, type: value }))}
              >
                <SelectTrigger id="edit-type" className="w-full">
                  <SelectValue placeholder="Sélectionnez un type" />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-stage">Étape</Label>
              <Select
                value={draft.stage}
                onValueChange={(value) => setDraft((prev) => ({ ...prev, stage: value }))}
              >
                <SelectTrigger id="edit-stage" className="w-full">
                  <SelectValue placeholder="Sélectionnez une étape" />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {stage}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Annuler
            </Button>
            <Button onClick={saveEdit}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
