"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import { useToastManager } from "@/components/ui/toast"
import { Trash2Icon, Loader2Icon, ImageOffIcon } from "lucide-react"
import { listMedia, deleteMedia, type MediaFile } from "@/lib/media-store"

const CATEGORY_LABELS: Record<string, string> = {
  guides: "Guides",
  authors: "Auteurs",
  autre: "Autre",
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
}

export default function MediaPage() {
  const [files, setFiles] = useState<MediaFile[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCategory, setFilterCategory] = useState("Tous")
  const [filterUsage, setFilterUsage] = useState<"Tous" | "used" | "unused">("Tous")
  const [deleteTarget, setDeleteTarget] = useState<MediaFile | null>(null)
  const [deleting, setDeleting] = useState(false)
  const toastManager = useToastManager()

  useEffect(() => {
    load()
  }, [])

  function load() {
    setLoading(true)
    listMedia()
      .then(setFiles)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  const categories = useMemo(
    () => Array.from(new Set(files.map((f) => f.category))),
    [files]
  )

  const filtered = files.filter((f) => {
    const matchCategory = filterCategory === "Tous" || f.category === filterCategory
    const matchUsage = filterUsage === "Tous" || (filterUsage === "used" ? f.inUse : !f.inUse)
    return matchCategory && matchUsage
  })

  const unusedCount = files.filter((f) => !f.inUse).length
  const totalSize = files.reduce((sum, f) => sum + f.size, 0)

  async function confirmDelete(force: boolean) {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteMedia(deleteTarget.path, force)
      setFiles((prev) => prev.filter((f) => f.path !== deleteTarget.path))
      setDeleteTarget(null)
      toastManager.add({ title: "Fichier supprimé", type: "success" })
    } catch (err) {
      if (err instanceof Error && err.message === "in-use" && !force) {
        // Leave the dialog open — it already shows the usage warning with a "force" option.
        return
      }
      console.error(err)
      toastManager.add({ title: "Impossible de supprimer ce fichier", type: "error" })
    } finally {
      setDeleting(false)
    }
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
                <BreadcrumbPage>Média</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {loading ? "Chargement…" : (
              <>{files.length} fichier{files.length !== 1 ? "s" : ""} · {formatSize(totalSize)}
                {unusedCount > 0 && <> · <span className="text-amber-600 font-medium">{unusedCount} non utilisé{unusedCount !== 1 ? "s" : ""}</span></>}
              </>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={filterCategory} onValueChange={(v) => v != null && setFilterCategory(v)}>
              <SelectTrigger className="w-36" aria-label="Filtrer par dossier">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Tous">Tous les dossiers</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterUsage} onValueChange={(v) => v != null && setFilterUsage(v as typeof filterUsage)}>
              <SelectTrigger className="w-44" aria-label="Filtrer par utilisation">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Tous">Tous les fichiers</SelectItem>
                <SelectItem value="used">Utilisés</SelectItem>
                <SelectItem value="unused">Non utilisés</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center text-muted-foreground gap-2 py-16">
            <Loader2Icon size={18} className="animate-spin" />
            <span className="text-sm">Chargement…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="border-2 border-dashed rounded-xl py-16 flex flex-col items-center gap-2 text-muted-foreground">
            <ImageOffIcon size={20} />
            <p className="text-sm">Aucun fichier trouvé.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {filtered.map((f) => (
              <div key={f.path} className="group/media border rounded-xl overflow-hidden flex flex-col bg-card">
                <div className="relative aspect-square bg-muted">
                  <img src={f.url} alt={f.path} className="w-full h-full object-cover" />
                  <Badge
                    variant="secondary"
                    className={
                      "absolute top-1.5 left-1.5 text-[10px] " +
                      (f.inUse ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")
                    }
                  >
                    {f.inUse ? "Utilisé" : "Non utilisé"}
                  </Badge>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(f)}
                    className="absolute top-1.5 right-1.5 rounded-full bg-black/50 p-1.5 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/70 group-hover/media:opacity-100"
                    aria-label="Supprimer"
                  >
                    <Trash2Icon size={13} />
                  </button>
                </div>
                <div className="p-2.5 flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {CATEGORY_LABELS[f.category] ?? f.category}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground shrink-0">{formatSize(f.size)}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground truncate" title={f.path}>
                    {f.path.split("/").pop()}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{formatDate(f.modifiedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce fichier ?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.inUse ? (
                <>
                  Ce fichier est actuellement utilisé par : <strong>{deleteTarget.usedBy.join(", ")}</strong>.
                  Le supprimer cassera cette image à cet endroit. Cette action est définitive.
                </>
              ) : (
                "Cette action est définitive."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteTarget && (
            <img
              src={deleteTarget.url}
              alt={deleteTarget.path}
              className="max-h-40 w-full rounded-lg border object-contain bg-muted"
            />
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => confirmDelete(Boolean(deleteTarget?.inUse))}
              disabled={deleting}
            >
              {deleting
                ? <><Loader2Icon size={14} className="animate-spin" /> Suppression…</>
                : deleteTarget?.inUse ? "Supprimer quand même" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
