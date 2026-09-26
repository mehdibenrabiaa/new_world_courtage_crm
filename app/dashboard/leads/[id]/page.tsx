"use client"

import { use, useEffect, useState } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
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
import { TableSkeleton } from "@/components/table-skeleton"
import { Tabs, TabsList, TabsTrigger, TabsIndicator, TabsContent } from "@/components/ui/tabs"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { useToastManager } from "@/components/ui/toast"
import { Trash2Icon, Loader2Icon, FileQuestionIcon, StickyNoteIcon, ListTodoIcon, HistoryIcon, CopyIcon } from "lucide-react"
import { getLead, updateLead, deleteLead, listAssignableUsers, type Lead, type LeadStatus, type LeadAssignee } from "@/lib/api"
import { GarageLeadFields, GarageLeadFieldsTriggers, garageDraftFrom, type GarageDraft, STATUS_LABELS } from "@/components/leads/garage-lead-fields"
import { LeadNotesTab } from "@/components/leads/lead-notes-tab"
import { LeadTasksTab } from "@/components/leads/lead-tasks-tab"
import { LeadActivityTab } from "@/components/leads/lead-activity-tab"
import { useAuth } from "@/components/auth-provider"
import { useIsMobile } from "@/hooks/use-mobile"

// Dispatches on `lead.type` (see `isGarage` below): "Assurance Garage" gets
// its own dedicated field set (GarageLeadFields); any other type falls back
// to a plain Aperçu recap until it gets its own sibling component the same
// way GarageLeadFields did. Notes/Tâches stay as-is either way, since
// LeadNotesTab/LeadTasksTab only need a lead id and are reused unchanged —
// the reusable Réponses viewer itself (lead-answers-viewer.tsx) already
// works for any questionnaire, it just isn't wired into the Aperçu fallback
// yet since that needs a lead.type → questionnaire-slug mapping that
// doesn't exist until a second questionnaire actually has its own CRM tabs.

const STATUS_STYLES: Record<LeadStatus, string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-amber-100 text-amber-700",
  qualified: "bg-purple-100 text-purple-700",
  converted: "bg-green-100 text-green-700",
  lost: "bg-red-100 text-red-700",
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

const TAB_VALUES = ["contact", "entreprise", "reponses", "documents", "statut", "apercu", "notes", "taches", "activite"]

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const toastManager = useToastManager()
  const { user: me } = useAuth()
  const canAssign = me?.role === "superadmin" || me?.role === "admin"
  // Same 768px breakpoint as the app's own Sidebar (useIsMobile) — the tab
  // list switches to a normal horizontal row below it instead of staying a
  // fixed-width vertical sidebar, which left barely any room for content on
  // a phone-width screen.
  const isMobile = useIsMobile()

  const [lead, setLead] = useState<Lead | null>(null)
  // Only "Assurance Garage" has its own dedicated field set today
  // (GarageLeadFields) — everything else falls back to a plain read-only
  // recap (Aperçu) + Notes/Tâches until that type gets its own sibling
  // component, the same seam this file's own comment above has called for
  // since before any of this existed.
  const isGarage = lead?.type === "Assurance Garage"
  // The activity timeline shows who did what (reassignments, other staff's
  // edits) — hidden from consultants entirely, not just gated by the
  // ordinary "leads" view/edit permission (the backend 403s them on the
  // endpoint too, see routers/leads.py's list_lead_activity).
  const canSeeActivity = me?.role !== "consultant"

  // Keep the selected tab in the URL (?tab=…) so a refresh (or a shared
  // link) lands back on the same tab instead of resetting to Contact/Aperçu.
  const tabParam = searchParams.get("tab")
  const validTabs = canSeeActivity ? TAB_VALUES : TAB_VALUES.filter((t) => t !== "activite")
  const activeTab = tabParam && validTabs.includes(tabParam) ? tabParam : (isGarage ? "contact" : "apercu")

  function handleTabChange(value: unknown) {
    if (typeof value !== "string") return
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", value)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<GarageDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [assignableUsers, setAssignableUsers] = useState<LeadAssignee[]>([])
  const [reassigning, setReassigning] = useState(false)

  useEffect(() => {
    getLead(Number(id))
      .then((l) => {
        setLead(l)
        setDraft(garageDraftFrom(l))
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (canAssign) listAssignableUsers().then(setAssignableUsers).catch(console.error)
  }, [canAssign])

  async function handleReassign(value: string) {
    if (!lead) return
    setReassigning(true)
    try {
      const updated = value === "unassigned"
        ? await updateLead(lead.id, { unassign: true })
        : await updateLead(lead.id, { assigned_to_id: Number(value) })
      setLead(updated)
      toastManager.add({ title: "Lead réassigné", type: "success" })
    } catch (err) {
      console.error(err)
      toastManager.add({ title: "Impossible de réassigner ce lead", type: "error" })
    } finally {
      setReassigning(false)
    }
  }

  const dirty = lead && draft && JSON.stringify(draft) !== JSON.stringify(garageDraftFrom(lead))

  async function handleSave() {
    if (!lead || !draft) return
    setSaving(true)
    try {
      const updated = await updateLead(lead.id, {
        status: draft.status,
        type: draft.type,
        name: draft.name.trim() || undefined,
        phone: draft.phone.trim() || undefined,
        email: draft.email.trim() || undefined,
        immat: draft.immat.trim() || undefined,
        naissance: draft.naissance.trim() || undefined,
        permis: draft.permis.trim() || undefined,
        siret: draft.siret.trim() || undefined,
        activite: draft.activite.trim() || undefined,
        deal_value: draft.dealValue.trim() ? Number(draft.dealValue) : undefined,
      })
      setLead(updated)
      setDraft(garageDraftFrom(updated))
      toastManager.add({ title: "Lead mis à jour", type: "success" })
    } catch (err) {
      console.error(err)
      toastManager.add({ title: "Impossible de mettre à jour ce lead", type: "error" })
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!lead) return
    setDeleting(true)
    try {
      await deleteLead(lead.id)
      router.push("/dashboard/leads")
    } catch (err) {
      console.error(err)
      toastManager.add({ title: "Impossible de supprimer ce lead", type: "error" })
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
                <BreadcrumbLink href="/dashboard/leads">Leads</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>{lead?.name || `#${id}`}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          {lead && (
            <Badge variant="secondary" className={`ml-2 ${STATUS_STYLES[lead.status]}`}>
              {STATUS_LABELS[lead.status]}
            </Badge>
          )}
        </div>
      </header>

      {/* lg:h-[…] + overflow-hidden clips this region to exactly the
          viewport space below the h-16 header above — combined with the
          Tabs row below being lg:flex-1 lg:min-h-0 and only its
          TabsContent scrolling internally, the tab sidebar (and this
          Créé le/actions row) then simply aren't part of anything that
          scrolls, instead of relying on position:sticky. */}
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0 md:h-[calc(100svh-4rem)] md:overflow-hidden">
        {error && <p className="text-sm text-destructive">Erreur : {error}</p>}
        {loading && <TableSkeleton rows={8} cols={2} />}

        {lead && draft && (
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 md:h-full md:min-h-0">
            {lead.duplicate_of && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 shrink-0">
                <CopyIcon size={14} className="shrink-0" />
                Doublon possible de{" "}
                <Link href={`/dashboard/leads/${lead.duplicate_of.id}`} className="font-medium underline hover:text-amber-900">
                  {lead.duplicate_of.name}
                </Link>
              </div>
            )}
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between shrink-0">
              <p className="text-sm text-muted-foreground">
                Créé le {formatDateTime(lead.created_at)} · Mis à jour le {formatDateTime(lead.updated_at)}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <Input
                  type="number"
                  min="0"
                  placeholder="Valeur estimée €"
                  value={draft.dealValue}
                  onChange={(e) => setDraft((d) => d && { ...d, dealValue: e.target.value })}
                  disabled={saving}
                  className="w-40"
                />
                {canAssign && (
                  <Select
                    value={lead.assigned_to ? String(lead.assigned_to.id) : "unassigned"}
                    onValueChange={(v) => v != null && handleReassign(v)}
                  >
                    <SelectTrigger className="w-48" disabled={reassigning} aria-label="Assigné à">
                      {reassigning ? (
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Loader2Icon size={13} className="animate-spin" />
                          Enregistrement…
                        </span>
                      ) : (
                        <SelectValue>
                          {(v: string) => (v === "unassigned" ? "Non assigné" : assignableUsers.find((u) => String(u.id) === v)?.name ?? v)}
                        </SelectValue>
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Non assigné</SelectItem>
                      {assignableUsers.map((u) => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
                  <Trash2Icon />
                  Supprimer
                </Button>
                <Button onClick={handleSave} disabled={!dirty || saving}>
                  {saving ? <><Loader2Icon size={14} className="animate-spin" /> Enregistrement…</> : "Enregistrer"}
                </Button>
              </div>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={handleTabChange}
              orientation={isMobile ? "horizontal" : "vertical"}
              className="w-full flex-col md:flex-row-reverse md:items-stretch gap-6 md:min-h-0 md:flex-1"
            >
              <TabsList className="shrink-0 rounded-none">
                <TabsIndicator />
                {isGarage ? (
                  <GarageLeadFieldsTriggers hasAnswers={lead.answers.length > 0} hasDocuments={lead.documents.length > 0} />
                ) : (
                  <TabsTrigger value="apercu">
                    <FileQuestionIcon size={16} /><span className="hidden md:inline">Aperçu</span>
                  </TabsTrigger>
                )}
                <TabsTrigger value="notes">
                  <StickyNoteIcon size={16} /><span className="hidden md:inline">Notes</span>
                </TabsTrigger>
                <TabsTrigger value="taches">
                  <ListTodoIcon size={16} /><span className="hidden md:inline">Tâches</span>
                </TabsTrigger>
                {canSeeActivity && (
                  <TabsTrigger value="activite">
                    <HistoryIcon size={16} /><span className="hidden md:inline">Activité</span>
                  </TabsTrigger>
                )}
              </TabsList>

              {isGarage ? (
                <GarageLeadFields lead={lead} draft={draft} setDraft={setDraft} />
              ) : (
                <TabsContent value="apercu" className="rounded-xl border p-5 flex flex-col gap-4">
                  <p className="text-sm text-muted-foreground">
                    Il n&apos;existe pas encore de formulaire dédié pour les leads « {lead.type} » — seul Assurance Garage en a un pour l&apos;instant. Réponses reçues ci-dessous.
                  </p>
                  {lead.answers.length > 0 && (
                    <table className="border-separate border-spacing-y-1.5 pb-1 text-sm">
                      <tbody>
                        {lead.answers.map((a) => (
                          <tr key={a.id}>
                            <td className="pr-16 text-gray-400 align-top whitespace-nowrap">{a.question}</td>
                            <td className="font-medium text-black align-top">{a.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </TabsContent>
              )}
              <LeadNotesTab leadId={lead.id} initialNotes={lead.sticky_notes} />
              <LeadTasksTab leadId={lead.id} initialTasks={lead.tasks} />
              {canSeeActivity && <LeadActivityTab leadId={lead.id} />}
            </Tabs>
          </div>
        )}
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer {lead?.name} ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est définitive.</AlertDialogDescription>
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
