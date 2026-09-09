"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsList, TabsTrigger, TabsIndicator, TabsContent } from "@/components/ui/tabs"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Loader2Icon } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
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
  questionnaires: "Questionnaires",
}

const RESOURCES: PermissionResource[] = ["leads", "contacts", "guides", "authors", "media", "questionnaires"]
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

export default function PermissionsPage() {
  const router = useRouter()
  const { user: me } = useAuth()

  const [matrix, setMatrix] = useState<Matrix>({})
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)

  useEffect(() => {
    if (me && me.role !== "superadmin") router.replace("/dashboard")
  }, [me, router])

  useEffect(() => {
    listPermissions()
      .then((rows) => setMatrix(buildMatrix(rows)))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function toggle(role: UserRole, resource: PermissionResource, action: PermissionAction, next: boolean) {
    const key = `${role}:${resource}:${action}`
    setSavingKey(key)
    // Optimistic — the CRM's own request to this page is already gated by
    // require_superadmin, so a failure here is a network blip, not an
    // expected permission denial.
    setMatrix((prev) => ({
      ...prev,
      [role]: { ...prev[role], [resource]: { ...prev[role]?.[resource], [action]: next } },
    }))
    try {
      await updatePermission(role, resource, action, next)
    } catch (err) {
      console.error(err)
      setMatrix((prev) => ({
        ...prev,
        [role]: { ...prev[role], [resource]: { ...prev[role]?.[resource], [action]: !next } },
      }))
    } finally {
      setSavingKey((k) => (k === key ? null : k))
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
        <p className="text-sm text-muted-foreground">
          Ce que chaque rôle peut faire, par section du CRM. Le super-administrateur a toujours accès à tout et n&apos;apparaît pas ici.
        </p>

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
                          const key = `${role}:${resource}:${action}`
                          const allowed = !!matrix[role]?.[resource]?.[action]
                          return (
                            <TableCell key={action} className="text-center">
                              <Checkbox
                                checked={allowed}
                                disabled={savingKey === key}
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
