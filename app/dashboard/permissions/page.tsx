"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsIndicator, TabsContent } from "@/components/ui/tabs"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Loader2Icon } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { useToastManager } from "@/components/ui/toast"
import type { PermissionAction, PermissionResource, UserRole } from "@/lib/auth"
import { listPermissions, updatePermission, type RolePermissionRow } from "@/lib/api"

const CONFIGURABLE_ROLES: UserRole[] = ["admin", "supervisor", "consultant"]

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrateur",
  supervisor: "Superviseur",
  consultant: "Consultant",
}

const RESOURCE_LABELS: Record<PermissionResource, string> = {
  leads: "Leads",
  contacts: "Contacts",
  guides: "Guides",
  authors: "Auteurs",
  media: "Média",
}

const RESOURCES: PermissionResource[] = ["leads", "contacts", "guides", "authors", "media"]
const ACTIONS: { action: PermissionAction; label: string }[] = [
  { action: "view", label: "Voir" },
  { action: "create", label: "Créer" },
  { action: "edit", label: "Modifier" },
  { action: "delete", label: "Supprimer" },
]

// role -> resource -> action -> allowed
type Matrix = Record<string, Record<string, Record<string, boolean>>>

function buildMatrix(rows: RolePermissionRow[]): Matrix {
  const matrix: Matrix = {}
  for (const row of rows) {
    matrix[row.role] ??= {}
    matrix[row.role][row.resource] ??= {}
    matrix[row.role][row.resource][row.action] = row.allowed
  }
  return matrix
}

function cellValue(matrix: Matrix, role: string, resource: string, action: string): boolean {
  return !!matrix[role]?.[resource]?.[action]
}

export default function PermissionsPage() {
  const router = useRouter()
  const { user: me } = useAuth()
  const toastManager = useToastManager()

  // savedMatrix mirrors the backend; matrix is the working copy checkboxes
  // edit locally until "Enregistrer" actually sends the changed cells.
  const [savedMatrix, setSavedMatrix] = useState<Matrix>({})
  const [matrix, setMatrix] = useState<Matrix>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (me && me.role !== "superadmin") router.replace("/dashboard")
  }, [me, router])

  useEffect(() => {
    listPermissions()
      .then((rows) => {
        const built = buildMatrix(rows)
        setSavedMatrix(built)
        setMatrix(built)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const dirtyKeys = useMemo(() => {
    const keys: { role: UserRole; resource: PermissionResource; action: PermissionAction }[] = []
    for (const role of CONFIGURABLE_ROLES) {
      for (const resource of RESOURCES) {
        for (const { action } of ACTIONS) {
          if (cellValue(matrix, role, resource, action) !== cellValue(savedMatrix, role, resource, action)) {
            keys.push({ role, resource, action })
          }
        }
      }
    }
    return keys
  }, [matrix, savedMatrix])

  function toggle(role: UserRole, resource: PermissionResource, action: PermissionAction, next: boolean) {
    setMatrix((prev) => ({
      ...prev,
      [role]: { ...prev[role], [resource]: { ...prev[role]?.[resource], [action]: next } },
    }))
  }

  function discard() {
    setMatrix(savedMatrix)
  }

  async function save() {
    setSaving(true)
    try {
      await Promise.all(
        dirtyKeys.map(({ role, resource, action }) =>
          updatePermission(role, resource, action, cellValue(matrix, role, resource, action))
        )
      )
      setSavedMatrix(matrix)
      toastManager.add({ title: "Permissions enregistrées.", type: "success" })
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
                <BreadcrumbPage>Permissions</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Ce que chaque rôle peut faire, par section du CRM. Le super-administrateur a toujours accès à tout et n&apos;apparaît pas ici.
          </p>
          <div className="flex items-center gap-2 shrink-0">
            {dirtyKeys.length > 0 && (
              <>
                <span className="text-xs text-muted-foreground">
                  {dirtyKeys.length} modification{dirtyKeys.length > 1 ? "s" : ""} non enregistrée{dirtyKeys.length > 1 ? "s" : ""}
                </span>
                <Button variant="outline" size="sm" onClick={discard} disabled={saving}>
                  Annuler
                </Button>
              </>
            )}
            <Button size="sm" onClick={save} disabled={saving || dirtyKeys.length === 0}>
              {saving && <Loader2Icon size={14} className="animate-spin" />}
              Enregistrer
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center text-muted-foreground gap-2 py-16">
            <Loader2Icon size={18} className="animate-spin" />
            <span className="text-sm">Chargement…</span>
          </div>
        ) : (
          <Tabs defaultValue="admin" className="w-full">
            <TabsList>
              <TabsIndicator />
              {CONFIGURABLE_ROLES.map((role) => (
                <TabsTrigger key={role} value={role}>{ROLE_LABELS[role]}</TabsTrigger>
              ))}
            </TabsList>

            {CONFIGURABLE_ROLES.map((role) => (
              <TabsContent key={role} value={role}>
                <Table containerClassName="rounded-xl border mt-4">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Section</TableHead>
                      {ACTIONS.map(({ action, label }) => (
                        <TableHead key={action} className="text-center">{label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {RESOURCES.map((resource) => (
                      <TableRow key={resource}>
                        <TableCell className="font-medium">{RESOURCE_LABELS[resource]}</TableCell>
                        {ACTIONS.map(({ action }) => {
                          const allowed = cellValue(matrix, role, resource, action)
                          const isDirty = allowed !== cellValue(savedMatrix, role, resource, action)
                          return (
                            <TableCell key={action} className={`text-center ${isDirty ? "bg-amber-50" : ""}`}>
                              <Checkbox
                                checked={allowed}
                                disabled={saving}
                                onCheckedChange={() => toggle(role, resource, action, !allowed)}
                              />
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </>
  )
}
