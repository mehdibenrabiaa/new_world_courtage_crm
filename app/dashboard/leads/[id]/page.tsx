"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
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
import { Textarea } from "@/components/ui/textarea"
import { TableSkeleton } from "@/components/table-skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import { useToastManager } from "@/components/ui/toast"
import { Trash2Icon, Loader2Icon } from "lucide-react"
import { getLead, updateLead, deleteLead, type Lead, type LeadStatus, type LeadType } from "@/lib/api"
import { CATEGORIES } from "@/lib/categories"

const STATUSES: LeadStatus[] = ["new", "contacted", "qualified", "converted", "lost"]

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Nouveau",
  contacted: "Contacté",
  qualified: "Qualifié",
  converted: "Converti",
  lost: "Perdu",
}

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

type Draft = {
  status: LeadStatus
  type: LeadType
  name: string
  phone: string
  email: string
  immat: string
  naissance: string
  permis: string
  siret: string
  activite: string
  notes: string
}

function draftFrom(l: Lead): Draft {
  return {
    status: l.status,
    type: l.type,
    name: l.name,
    phone: l.phone,
    email: l.email ?? "",
    immat: l.immat ?? "",
    naissance: l.naissance ?? "",
    permis: l.permis ?? "",
    siret: l.siret ?? "",
    activite: l.activite ?? "",
    notes: l.notes ?? "",
  }
}

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const toastManager = useToastManager()

  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    getLead(Number(id))
      .then((l) => {
        setLead(l)
        setDraft(draftFrom(l))
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  const dirty = lead && draft && JSON.stringify(draft) !== JSON.stringify(draftFrom(lead))

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
        notes: draft.notes.trim() || undefined,
      })
      setLead(updated)
      setDraft(draftFrom(updated))
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

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="flex flex-col gap-6 lg:col-span-2">
                <div className="rounded-xl border p-5 flex flex-col gap-4">
                  <span className="text-sm font-semibold">Contact</span>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="l-name">Nom</Label>
                      <Input id="l-name" value={draft.name} onChange={(e) => setDraft((d) => d && { ...d, name: e.target.value })} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="l-phone">Téléphone</Label>
                      <Input id="l-phone" value={draft.phone} onChange={(e) => setDraft((d) => d && { ...d, phone: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="l-email">Email</Label>
                    <Input id="l-email" value={draft.email} onChange={(e) => setDraft((d) => d && { ...d, email: e.target.value })} />
                  </div>
                </div>

                <div className="rounded-xl border p-5 flex flex-col gap-4">
                  <span className="text-sm font-semibold">Détails véhicule</span>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="l-immat">Immatriculation</Label>
                      <Input id="l-immat" value={draft.immat} onChange={(e) => setDraft((d) => d && { ...d, immat: e.target.value })} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="l-naissance">Naissance</Label>
                      <Input id="l-naissance" value={draft.naissance} onChange={(e) => setDraft((d) => d && { ...d, naissance: e.target.value })} placeholder="MM/AAAA" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="l-permis">Permis</Label>
                      <Input id="l-permis" value={draft.permis} onChange={(e) => setDraft((d) => d && { ...d, permis: e.target.value })} placeholder="MM/AAAA" />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border p-5 flex flex-col gap-4">
                  <span className="text-sm font-semibold">Détails entreprise</span>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="l-siret">SIRET</Label>
                      <Input id="l-siret" value={draft.siret} onChange={(e) => setDraft((d) => d && { ...d, siret: e.target.value })} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="l-activite">Activité</Label>
                      <Input id="l-activite" value={draft.activite} onChange={(e) => setDraft((d) => d && { ...d, activite: e.target.value })} />
                    </div>
                  </div>
                </div>

                {lead.answers.length > 0 && (
                  <div className="rounded-xl border p-5 flex flex-col gap-3">
                    <span className="text-sm font-semibold">Réponses au questionnaire</span>
                    <div className="flex flex-col divide-y">
                      {lead.answers.map((a) => (
                        <div key={a.id} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                          <span className="text-muted-foreground">{a.question}</span>
                          <span className="font-medium text-right">{a.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-6">
                <div className="rounded-xl border p-5 flex flex-col gap-4">
                  <span className="text-sm font-semibold">Statut</span>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="l-status">Statut</Label>
                    <Select value={draft.status} onValueChange={(v) => v != null && setDraft((d) => d && { ...d, status: v as LeadStatus })}>
                      <SelectTrigger id="l-status" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="l-type">Catégorie</Label>
                    <Select value={draft.type} onValueChange={(v) => v != null && setDraft((d) => d && { ...d, type: v as LeadType })}>
                      <SelectTrigger id="l-type" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {lead.source && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Source :</span> {lead.source}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border p-5 flex flex-col gap-1.5">
                  <Label htmlFor="l-notes">Notes internes</Label>
                  <Textarea
                    id="l-notes"
                    value={draft.notes}
                    onChange={(e) => setDraft((d) => d && { ...d, notes: e.target.value })}
                    placeholder="Notes internes sur ce lead…"
                    className="resize-none min-h-[140px]"
                  />
                </div>
              </div>
            </div>
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
