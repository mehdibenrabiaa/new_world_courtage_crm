"use client"

import { Fragment, useEffect, useState } from "react"
import { Field, FieldLabel, FieldTitle } from "@/components/ui/field"
import { Label } from "@/components/ui/label"
import { TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  PaperclipIcon, DownloadIcon, Loader2Icon, UserIcon, Building2Icon, ListChecksIcon, FlagIcon,
} from "lucide-react"
import {
  downloadLeadDocument, fetchQuestionnaireQuestions,
  type Lead, type LeadStatus, type LeadType, type PublishedQuestion,
} from "@/lib/api"
import { CATEGORIES } from "@/lib/categories"
import { ReponsesStepViewer } from "@/components/leads/lead-answers-viewer"

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

const STATUSES: LeadStatus[] = ["new", "contacted", "qualified", "converted", "lost"]

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Nouveau",
  contacted: "Contacté",
  qualified: "Qualifié",
  converted: "Converti",
  lost: "Perdu",
}

// The editable field set for a "garage" lead (Assurance Garage) — a driver's
// license/vehicle profile plus a SIRET-based business profile. Other
// questionnaire types (taxi, ambulance, immobilier, …) will need a different
// field set and get their own sibling component; only the reusable pieces
// (LeadNotesTab, LeadTasksTab) are shared as-is.
export type GarageDraft = {
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
}

export function garageDraftFrom(l: Lead): GarageDraft {
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
  }
}

// Tab triggers for this field set, rendered by the parent's shared
// <TabsList> alongside the Notes/Tâches triggers. The label is hidden below
// md (768px, same breakpoint the tab list itself switches orientation at —
// see page.tsx's isMobile) so a cramped phone-width horizontal tab row
// shows just the icons instead of overflowing into a scrollable text strip.
export function GarageLeadFieldsTriggers({ hasAnswers, hasDocuments }: { hasAnswers: boolean; hasDocuments: boolean }) {
  return (
    <Fragment>
      <TabsTrigger value="contact">
        <UserIcon size={16} /><span className="hidden md:inline">Coordonnées</span>
      </TabsTrigger>
      <TabsTrigger value="entreprise">
        <Building2Icon size={16} /><span className="hidden md:inline">Entreprise</span>
      </TabsTrigger>
      {hasAnswers && (
        <TabsTrigger value="reponses">
          <ListChecksIcon size={16} /><span className="hidden md:inline">Réponses</span>
        </TabsTrigger>
      )}
      {hasDocuments && (
        <TabsTrigger value="documents">
          <PaperclipIcon size={16} /><span className="hidden md:inline">Documents</span>
        </TabsTrigger>
      )}
      <TabsTrigger value="statut">
        <FlagIcon size={16} /><span className="hidden md:inline">Statut</span>
      </TabsTrigger>
    </Fragment>
  )
}

export function GarageLeadFields({
  lead,
  draft,
  setDraft,
}: {
  lead: Lead
  draft: GarageDraft
  setDraft: (update: (d: GarageDraft | null) => GarageDraft | null) => void
}) {
  const [questions, setQuestions] = useState<PublishedQuestion[]>([])
  const [downloadingId, setDownloadingId] = useState<number | null>(null)

  useEffect(() => {
    fetchQuestionnaireQuestions("garage").then(setQuestions).catch(console.error)
  }, [])

  async function handleDownload(documentId: number, filename: string) {
    setDownloadingId(documentId)
    try {
      await downloadLeadDocument(lead.id, documentId, filename)
    } catch (err) {
      console.error(err)
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <Fragment>
      {/* representant_legal/mobile/email_principal are real "Coordonnées"
          questions on the public form (type: input) — they just end up on
          dedicated Lead columns (name/phone/email) instead of a generic
          LeadAnswer row (see garagiste/devis's IDENTITY_KEYS). Shown the
          same way the public form itself displays already-known answers —
          its own "prefilledFields" recap table (label muted, value bold),
          not a live input box. */}
      <TabsContent value="contact" className="rounded-xl border p-5">
        <table className="border-separate border-spacing-y-1.5 pb-1 text-sm">
          <tbody>
            <tr>
              <td className="pr-16 text-gray-400 align-top whitespace-nowrap">Nom et prénom</td>
              <td className="font-medium text-black align-top">{draft.name || "—"}</td>
            </tr>
            <tr>
              <td className="pr-16 text-gray-400 align-top whitespace-nowrap">Mobile</td>
              <td className="font-medium text-black align-top">{draft.phone || "—"}</td>
            </tr>
            <tr>
              <td className="pr-16 text-gray-400 align-top whitespace-nowrap">Email principal</td>
              <td className="font-medium text-black align-top">{draft.email || "—"}</td>
            </tr>
          </tbody>
        </table>
      </TabsContent>

      <TabsContent value="entreprise" className="rounded-xl border p-5">
        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel className="font-normal text-muted-foreground">SIRET</FieldLabel>
            <FieldTitle>{draft.siret || "—"}</FieldTitle>
          </Field>
          <Field>
            <FieldLabel className="font-normal text-muted-foreground">Activité</FieldLabel>
            <FieldTitle>{draft.activite || "—"}</FieldTitle>
          </Field>
        </div>
      </TabsContent>

      {/* The public form itself, reproduced whole (CarInsuranceForm.js) —
          same step tabs bar, same Précédent/Suivant navigation, same field
          components — frozen read-only on the client's actual submission
          instead of a live, editable wizard. */}
      {lead.answers.length > 0 && (
        <TabsContent value="reponses" className="rounded-xl border p-5">
          <ReponsesStepViewer answers={lead.answers} questions={questions} />
        </TabsContent>
      )}

      {lead.documents.length > 0 && (
        <TabsContent value="documents" className="rounded-xl border p-5">
          <div className="flex flex-col divide-y">
            {lead.documents.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 py-3">
                <PaperclipIcon size={16} className="shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.original_filename}</p>
                  <p className="text-xs text-muted-foreground">
                    {doc.document_label} · {formatFileSize(doc.size_bytes)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownload(doc.id, doc.original_filename)}
                  disabled={downloadingId === doc.id}
                  className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-primary hover:underline disabled:opacity-50"
                >
                  {downloadingId === doc.id ? <Loader2Icon size={14} className="animate-spin" /> : <DownloadIcon size={14} />}
                  Télécharger
                </button>
              </div>
            ))}
          </div>
        </TabsContent>
      )}

      <TabsContent value="statut" className="rounded-xl border p-5 flex flex-col gap-4">
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
      </TabsContent>
    </Fragment>
  )
}

export { STATUS_LABELS, STATUSES }
