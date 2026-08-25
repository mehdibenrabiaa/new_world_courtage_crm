"use client"

import { useEffect, useRef, useState } from "react"
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog, DialogContent, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import { useToastManager } from "@/components/ui/toast"
import { PlusIcon, Trash2Icon, Loader2Icon, UploadIcon, PencilIcon } from "lucide-react"
import {
  getAuthors, createAuthor, updateAuthor, deleteAuthor, uploadAuthorImage,
  type Author,
} from "@/lib/authors-store"

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()
}

export default function AuthorsPage() {
  const [authors, setAuthors] = useState<Author[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState("")
  const [formError, setFormError] = useState("")
  const [uploadingId, setUploadingId] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editValue, setEditValue] = useState("")
  const [savingId, setSavingId] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Author | null>(null)
  const [deleting, setDeleting] = useState(false)
  const fileInputs = useRef<Record<number, HTMLInputElement | null>>({})
  const toastManager = useToastManager()

  useEffect(() => {
    getAuthors()
      .then(setAuthors)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function handleCreate() {
    if (!name.trim()) return
    setCreating(true)
    setFormError("")
    try {
      const author = await createAuthor(name.trim())
      setAuthors((prev) => [...prev, author].sort((a, b) => a.name.localeCompare(b.name)))
      setCreateOpen(false)
      setName("")
    } catch (err) {
      setFormError(
        err instanceof Error && err.message === "name-conflict"
          ? "Un auteur avec ce nom existe déjà."
          : "Une erreur est survenue."
      )
    } finally {
      setCreating(false)
    }
  }

  function startEdit(author: Author) {
    setEditingId(author.id)
    setEditValue(author.name)
  }

  async function commitEdit(author: Author) {
    const trimmed = editValue.trim()
    if (!trimmed || trimmed === author.name) {
      setEditingId(null)
      return
    }
    setSavingId(author.id)
    try {
      const updated = await updateAuthor(author.id, trimmed)
      setAuthors((prev) =>
        prev.map((a) => (a.id === author.id ? updated : a)).sort((a, b) => a.name.localeCompare(b.name))
      )
      setEditingId(null)
    } catch (err) {
      if (err instanceof Error && err.message === "name-conflict") {
        toastManager.add({ title: "Un auteur avec ce nom existe déjà.", type: "error" })
      } else {
        console.error(err)
      }
    } finally {
      setSavingId(null)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteAuthor(deleteTarget.id)
      setAuthors((prev) => prev.filter((a) => a.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err) {
      if (err instanceof Error && err.message === "in-use") {
        toastManager.add({
          title: "Impossible de supprimer cet auteur",
          description: "Il est utilisé par au moins un guide. Changez leur auteur avant de le supprimer.",
          type: "error",
        })
        setDeleteTarget(null)
      } else {
        console.error(err)
      }
    } finally {
      setDeleting(false)
    }
  }

  async function handleUpload(id: number, file: File) {
    setUploadingId(id)
    try {
      const updated = await uploadAuthorImage(id, file)
      setAuthors((prev) => prev.map((a) => (a.id === id ? updated : a)))
    } catch (err) {
      console.error(err)
    } finally {
      setUploadingId(null)
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
                <BreadcrumbPage>Auteurs</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Ces auteurs apparaissent comme byline sur les guides publiés.
          </p>
          <Button onClick={() => { setName(""); setFormError(""); setCreateOpen(true) }}>
            <PlusIcon />
            Nouvel auteur
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center text-muted-foreground gap-2 py-16">
            <Loader2Icon size={18} className="animate-spin" />
            <span className="text-sm">Chargement…</span>
          </div>
        ) : authors.length === 0 ? (
          <div className="border-2 border-dashed rounded-xl py-16 flex flex-col items-center gap-2 text-muted-foreground">
            <p className="text-sm">Aucun auteur. Créez-en un pour l&apos;associer à vos guides.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {authors.map((a) => (
              <div key={a.id} className="border rounded-xl p-4 flex items-center gap-3">
                <Avatar size="lg">
                  <AvatarImage src={a.avatarUrl} alt={a.name} />
                  <AvatarFallback>{initials(a.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                  {editingId === a.id ? (
                    <Input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => commitEdit(a)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur()
                        if (e.key === "Escape") setEditingId(null)
                      }}
                      disabled={savingId === a.id}
                      className="h-7 text-sm"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEdit(a)}
                      className="group flex items-center gap-1.5 w-fit text-left min-w-0"
                    >
                      <span className="font-medium truncate">{a.name}</span>
                      <PencilIcon size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                  )}
                  <div className="flex items-center gap-1.5">
                    <input
                      ref={(el) => { fileInputs.current[a.id] = el }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleUpload(a.id, file)
                        e.target.value = ""
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={uploadingId === a.id}
                      onClick={() => fileInputs.current[a.id]?.click()}
                    >
                      {uploadingId === a.id
                        ? <Loader2Icon size={14} className="animate-spin" />
                        : <UploadIcon size={14} />}
                      Photo
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteTarget(a)}
                    >
                      <Trash2Icon size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={(open) => !open && setCreateOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvel auteur</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="a-name">Nom</Label>
            <Input
              id="a-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Loubna Moucharref"
            />
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              Annuler
            </Button>
            <Button onClick={handleCreate} disabled={!name.trim() || creating}>
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
              Cette action est définitive. Cet auteur ne pourra plus être sélectionné pour de nouveaux guides.
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
    </>
  )
}
