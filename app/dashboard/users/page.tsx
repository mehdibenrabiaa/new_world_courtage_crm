"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import { useToastManager } from "@/components/ui/toast"
import { PlusIcon, Loader2Icon, Trash2Icon } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import type { UserRole } from "@/lib/auth"
import { listUsers, createUser, updateUser, deleteUser, type ManagedUser } from "@/lib/api"

const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: "Super-administrateur",
  admin: "Administrateur",
  supervisor: "Superviseur",
  consultant: "Consultant",
}

const ASSIGNABLE_ROLES: UserRole[] = ["admin", "supervisor", "consultant", "superadmin"]

export default function UsersPage() {
  const router = useRouter()
  const { user: me } = useAuth()
  const toastManager = useToastManager()

  // savedUsers mirrors the backend; users is the working copy that role/
  // active edits touch locally until "Enregistrer" actually sends them.
  const [savedUsers, setSavedUsers] = useState<ManagedUser[]>([])
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState("")
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "consultant" as UserRole })

  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (me && me.role !== "superadmin") router.replace("/dashboard")
  }, [me, router])

  useEffect(() => {
    listUsers()
      .then((data) => { setSavedUsers(data); setUsers(data) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const dirtyIds = useMemo(() => {
    const savedById = new Map(savedUsers.map((u) => [u.id, u]))
    return users.filter((u) => {
      const saved = savedById.get(u.id)
      return saved && (saved.role !== u.role || saved.active !== u.active)
    }).map((u) => u.id)
  }, [users, savedUsers])

  function setLocal(id: number, patch: Partial<Pick<ManagedUser, "role" | "active">>) {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)))
  }

  function discard() {
    setUsers(savedUsers)
  }

  async function save() {
    setSaving(true)
    const savedById = new Map(savedUsers.map((u) => [u.id, u]))
    const toSave = users.filter((u) => dirtyIds.includes(u.id))
    try {
      const results = await Promise.all(
        toSave.map((u) => {
          const saved = savedById.get(u.id)!
          const patch: { role?: UserRole; active?: boolean } = {}
          if (saved.role !== u.role) patch.role = u.role
          if (saved.active !== u.active) patch.active = u.active
          return updateUser(u.id, patch)
        })
      )
      setUsers((prev) => prev.map((u) => results.find((r) => r.id === u.id) ?? u))
      setSavedUsers((prev) => prev.map((u) => results.find((r) => r.id === u.id) ?? u))
      toastManager.add({ title: "Utilisateurs mis à jour.", type: "success" })
    } catch (err) {
      toastManager.add({
        title: "Échec de l'enregistrement",
        description: err instanceof Error ? err.message : "Une erreur est survenue.",
        type: "error",
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleCreate() {
    setFormError("")
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setFormError("Merci de remplir tous les champs.")
      return
    }
    if (form.password.length < 8) {
      setFormError("Le mot de passe doit contenir au moins 8 caractères.")
      return
    }
    setCreating(true)
    try {
      const created = await createUser({
        name: form.name.trim(), email: form.email.trim().toLowerCase(),
        password: form.password, role: form.role,
      })
      setUsers((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      setSavedUsers((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      setCreateOpen(false)
      setForm({ name: "", email: "", password: "", role: "consultant" })
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Une erreur est survenue.")
    } finally {
      setCreating(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteUser(deleteTarget.id)
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id))
      setSavedUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err) {
      toastManager.add({
        title: "Impossible de supprimer cet utilisateur",
        description: err instanceof Error ? err.message : "Une erreur est survenue.",
        type: "error",
      })
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
                <BreadcrumbPage>Utilisateurs</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Comptes CRM et rôles. Le détail des permissions par rôle se configure sur la page Permissions.
          </p>
          <div className="flex items-center gap-2 shrink-0">
            {dirtyIds.length > 0 && (
              <>
                <span className="text-xs text-muted-foreground">
                  {dirtyIds.length} modification{dirtyIds.length > 1 ? "s" : ""} non enregistrée{dirtyIds.length > 1 ? "s" : ""}
                </span>
                <Button variant="outline" size="sm" onClick={discard} disabled={saving}>
                  Annuler
                </Button>
                <Button size="sm" onClick={save} disabled={saving}>
                  {saving && <Loader2Icon size={14} className="animate-spin" />}
                  Enregistrer
                </Button>
              </>
            )}
            <Button onClick={() => { setForm({ name: "", email: "", password: "", role: "consultant" }); setFormError(""); setCreateOpen(true) }}>
              <PlusIcon />
              Nouvel utilisateur
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center text-muted-foreground gap-2 py-16">
            <Loader2Icon size={18} className="animate-spin" />
            <span className="text-sm">Chargement…</span>
          </div>
        ) : (
          <Table containerClassName="rounded-xl border">
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Actif</TableHead>
                <TableHead>Créé le</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
                const isDirty = dirtyIds.includes(u.id)
                return (
                  <TableRow key={u.id} className={isDirty ? "bg-amber-50" : undefined}>
                    <TableCell className="font-medium">
                      {u.name} {u.id === me?.id && <Badge variant="secondary" className="ml-1.5">vous</Badge>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Select
                        value={u.role}
                        onValueChange={(v) => v != null && setLocal(u.id, { role: v as UserRole })}
                      >
                        <SelectTrigger size="sm" className="w-56" disabled={saving}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ASSIGNABLE_ROLES.map((r) => (
                            <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={u.active}
                        disabled={saving}
                        onCheckedChange={() => setLocal(u.id, { active: !u.active })}
                      />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-destructive"
                        disabled={u.id === me?.id}
                        onClick={() => setDeleteTarget(u)}
                      >
                        <Trash2Icon size={14} />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={(open) => !open && setCreateOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvel utilisateur</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="u-name">Nom</Label>
              <Input id="u-name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="u-email">Email</Label>
              <Input id="u-email" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="u-password">Mot de passe</Label>
              <Input id="u-password" type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="u-role">Rôle</Label>
              <Select value={form.role} onValueChange={(v) => v != null && setForm((p) => ({ ...p, role: v as UserRole }))}>
                <SelectTrigger id="u-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              Annuler
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
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
              Cette action est définitive. Ce compte ne pourra plus se connecter au CRM.
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
