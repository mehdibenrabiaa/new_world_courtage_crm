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
import { Tabs, TabsList, TabsTrigger, TabsIndicator } from "@/components/ui/tabs"
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import { useToastManager } from "@/components/ui/toast"
import { Trash2Icon, Loader2Icon } from "lucide-react"
import { getLead, updateLead, deleteLead, type Lead, type LeadStatus } from "@/lib/api"
import { GarageLeadFields, GarageLeadFieldsTriggers, garageDraftFrom, type GarageDraft, STATUS_LABELS } from "@/components/leads/garage-lead-fields"
import { LeadNotesTab } from "@/components/leads/lead-notes-tab"
import { LeadTasksTab } from "@/components/leads/lead-tasks-tab"

// This page renders the "garage" (Assurance Garage) lead layout directly.
// Once other questionnaire types (taxi, immobilier, …) get their own field
// set, this should dispatch on `lead.type` to the matching sibling of
// GarageLeadFields — the Notes/Tâches tabs stay as-is either way, since
// LeadNotesTab/LeadTasksTab only need a lead id and are reused unchanged.

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

const TAB_VALUES = ["contact", "vehicule", "entreprise", "reponses", "statut", "notes", "taches"]

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const toastManager = useToastManager()

  // Keep the selected tab in the URL (?tab=…) so a refresh (or a shared
  // link) lands back on the same tab instead of resetting to Contact.
  const tabParam = searchParams.get("tab")
  const activeTab = tabParam && TAB_VALUES.includes(tabParam) ? tabParam : "contact"

  function handleTabChange(value: unknown) {
    if (typeof value !== "string") return
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", value)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<GarageDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    getLead(Number(id))
      .then((l) => {
        setLead(l)
        setDraft(garageDraftFrom(l))
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

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

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        {error && <p className="text-sm text-destructive">Erreur : {error}</p>}
        {loading && <TableSkeleton rows={8} cols={2} />}

        {lead && draft && (
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Créé le {formatDateTime(lead.created_at)} · Mis à jour le {formatDateTime(lead.updated_at)}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
                  <Trash2Icon />
                  Supprimer
                </Button>
                <Button onClick={handleSave} disabled={!dirty || saving}>
                  {saving ? <><Loader2Icon size={14} className="animate-spin" /> Enregistrement…</> : "Enregistrer"}
                </Button>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList>
                <TabsIndicator />
                <GarageLeadFieldsTriggers hasAnswers={lead.answers.length > 0} />
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="taches">Tâches</TabsTrigger>
              </TabsList>

              <GarageLeadFields lead={lead} draft={draft} setDraft={setDraft} />
              <LeadNotesTab leadId={lead.id} initialNotes={lead.sticky_notes} />
              <LeadTasksTab leadId={lead.id} initialTasks={lead.tasks} />
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
