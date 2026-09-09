"use client"

import { useEffect, useState } from "react"
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
import { useToastManager } from "@/components/ui/toast"
import { PlusIcon, Loader2Icon } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import type { UserRole } from "@/lib/auth"
import { listUsers, createUser, updateUser, type ManagedUser } from "@/lib/api"

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

  const [users, setUsers] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<number | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState("")
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "consultant" as UserRole })

  // Only a superadmin can manage accounts — bounce anyone else back before
  // they see the page contents (the backend would 403 the data call anyway,
  // this just avoids the empty/broken flash).
  useEffect(() => {
    if (me && me.role !== "superadmin") router.replace("/dashboard")
  }, [me, router])

  useEffect(() => {
    listUsers()
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

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
      setCreateOpen(false)
      setForm({ name: "", email: "", password: "", role: "consultant" })
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Une erreur est survenue.")
    } finally {
      setCreating(false)
    }
  }

  async function handleRoleChange(u: ManagedUser, role: UserRole) {
    if (role === u.role) return
    setSavingId(u.id)
    try {
      const updated = await updateUser(u.id, { role })
      setUsers((prev) => prev.map((x) => (x.id === u.id ? updated : x)))
    } catch (err) {
      toastManager.add({ title: err instanceof Error ? err.message : "Une erreur est survenue.", type: "error" })
    } finally {
      setSavingId(null)
    }
  }

  async function handleActiveToggle(u: ManagedUser) {
    setSavingId(u.id)
    try {
      const updated = await updateUser(u.id, { active: !u.active })
      setUsers((prev) => prev.map((x) => (x.id === u.id ? updated : x)))
    } catch (err) {
      toastManager.add({ title: err instanceof Error ? err.message : "Une erreur est survenue.", type: "error" })
    } finally {
      setSavingId(null)
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
          <Button onClick={() => { setForm({ name: "", email: "", password: "", role: "consultant" }); setFormError(""); setCreateOpen(true) }}>
            <PlusIcon />
            Nouvel utilisateur
          </Button>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    {u.name} {u.id === me?.id && <Badge variant="secondary" className="ml-1.5">vous</Badge>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Select
                      value={u.role}
                      onValueChange={(v) => v != null && handleRoleChange(u, v as UserRole)}
                    >
                      <SelectTrigger size="sm" className="w-56" disabled={savingId === u.id}>
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
                      disabled={savingId === u.id}
                      onCheckedChange={() => handleActiveToggle(u)}
                    />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString("fr-FR")}
                  </TableCell>
                </TableRow>
              ))}
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
    </>
  )
}
