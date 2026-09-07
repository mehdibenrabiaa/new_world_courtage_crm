"use client"

import { Fragment, useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Field, FieldLabel, FieldTitle } from "@/components/ui/field"
import { Label } from "@/components/ui/label"
import { TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { fetchQuestionnaireQuestions, type Lead, type LeadAnswer, type LeadStatus, type LeadType, type PublishedQuestion } from "@/lib/api"
import { CATEGORIES } from "@/lib/categories"

// A checkbox question's value is a comma-joined list of the checked option
// labels (see garagiste/devis's handleSubmit: `labels.join(", ")`) — split
// it back apart to render as separate tags instead of one long string.
type DisplayAnswer = LeadAnswer & { isMultiChoice: boolean; unit: string | null; isDate: boolean; isVehicleList: boolean }

// "Immatriculations (carte grise) des véhicules" is submitted as a JSON
// array of vehicles, each a list of {label, value} fields (see
// garagiste/devis's handleSubmit) — parsed here into one nested bullet per
// field per vehicle.
type VehicleField = { label: string; value: string }

// Leads submitted before that JSON format existed stored a flattened
// "Véhicule 1 : A — B — C — D ; Véhicule 2 : …" string instead, always in
// this fixed field order (formatFlotteRow only ever omitted a *trailing*
// field, never a middle one) — split it back into the same labeled shape on
// a best-effort basis so old leads get the same nested-bullet display.
const LEGACY_FIELD_LABELS = ["Véhicule", "Immatriculation", "Mode d'achat", "Usage"]

function parseVehicleList(value: string): { fields: VehicleField[] }[] {
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed) && parsed.every((v) => v && Array.isArray(v.fields))) {
      return parsed
    }
  } catch {
    // not JSON — legacy flattened string, fall through
  }
  return value
    .split(";")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const withoutPrefix = line.replace(/^Véhicule\s*\d+\s*:\s*/, "")
      const parts = withoutPrefix.split("—").map((p) => p.trim()).filter(Boolean)
      return { fields: parts.map((v, i) => ({ label: LEGACY_FIELD_LABELS[i] ?? `Champ ${i + 1}`, value: v })) }
    })
}

// Shared between the Réponses tab and the Véhicule tab — the fleet list is
// shown in both places (per user request), so this is the one place its
// nested "Véhicule N" / field bullets are rendered.
function FleetVehicleList({ vehicles }: { vehicles: { fields: VehicleField[] }[] }) {
  return (
    <div className="flex flex-col gap-3">
      {vehicles.map((vehicle, i) => (
        <div key={i} className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted-foreground">Véhicule {i + 1}</span>
          <ul className="flex flex-col gap-1 pl-4 list-disc marker:text-muted-foreground">
            {vehicle.fields.map((f, j) => (
              <li key={j} className="font-medium">
                <span className="text-muted-foreground font-normal">{f.label} : </span>
                {f.value}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

const EUR_FORMATTER = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 })

// A date-type answer is saved as a plain "YYYY-MM-DD" string (the public
// site's <input type="date"> value) — parse it as local calendar values
// (not `new Date(isoString)`, which reads it as UTC and can roll the day
// back once formatted in a negative-offset timezone) and print it the same
// French style used everywhere else in the CRM.
function formatDateValue(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return value
  const [, y, m, d] = match
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

// Some answers (e.g. "% détention du capital") carry one number per
// associate/vehicle in a comma-joined string, same shape as a checkbox
// answer but not a checkbox — format each number with its unit and keep it
// as plain text (a currency/percent list doesn't read well as tag pills).
function formatUnitValue(value: string, unit: string) {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const num = Number(part.replace(/[^\d.-]/g, ""))
      if (Number.isNaN(num)) return part
      if (unit === "eur") return EUR_FORMATTER.format(num)
      if (unit === "percent") return `${num}%`
      if (unit === "m2") return `${num} m²`
      return part
    })
    .join(", ")
}

// A handful of leads submitted before garagiste/devis's handleSubmit learned
// to stringify the "Immatriculations" field's per-vehicle rows ended up with
// this saved literally — the real per-vehicle data was never captured
// correctly, so there's nothing to recover; just say so instead of showing
// the raw garbage.
function isCorruptedLegacyValue(value: string) {
  return value.includes("[object Object]")
}

// Groups a lead's saved answers by section and orders both the sections and
// the answers within each one to match the published questionnaire's own
// order — the same order the public site's form asks them in — instead of
// whatever order they happened to land in lead.answers.
function groupAnswersBySection(answers: LeadAnswer[], questions: PublishedQuestion[]) {
  const byKey = new Map(questions.map((q) => [q.key, q]))
  const sectionOrder: string[] = []
  for (const q of questions) {
    const section = q.section ?? "Autres"
    if (!sectionOrder.includes(section)) sectionOrder.push(section)
  }
  if (answers.some((a) => !byKey.has(a.catalog_key))) sectionOrder.push("Autres")

  const bySection = new Map<string, DisplayAnswer[]>()
  for (const a of answers) {
    const question = byKey.get(a.catalog_key)
    const section = question?.section ?? "Autres"
    if (!bySection.has(section)) bySection.set(section, [])
    bySection.get(section)!.push({
      ...a,
      isMultiChoice: question?.type === "checkbox",
      unit: question?.unit ?? null,
      isDate: question?.input_type === "date",
      isVehicleList: a.catalog_key === "flotte_immatriculations",
    })
  }
  for (const list of bySection.values()) {
    list.sort((a, b) => (byKey.get(a.catalog_key)?.order ?? Infinity) - (byKey.get(b.catalog_key)?.order ?? Infinity))
  }

  return sectionOrder
    .filter((section) => bySection.has(section))
    .map((section) => ({ section, answers: bySection.get(section)! }))
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
// <TabsList> alongside the Notes/Tâches triggers.
export function GarageLeadFieldsTriggers({ hasAnswers }: { hasAnswers: boolean }) {
  return (
    <Fragment>
      <TabsTrigger value="contact">Contact</TabsTrigger>
      <TabsTrigger value="vehicule">Véhicule</TabsTrigger>
      <TabsTrigger value="entreprise">Entreprise</TabsTrigger>
      {hasAnswers && <TabsTrigger value="reponses">Réponses</TabsTrigger>}
      <TabsTrigger value="statut">Statut</TabsTrigger>
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

  useEffect(() => {
    fetchQuestionnaireQuestions("garage").then(setQuestions).catch(console.error)
  }, [])

  const sections = groupAnswersBySection(lead.answers, questions)
  const fleetAnswer = lead.answers.find((a) => a.catalog_key === "flotte_immatriculations")

  return (
    <Fragment>
      <TabsContent value="contact" className="rounded-xl border p-5 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel>Nom</FieldLabel>
            <FieldTitle>{draft.name || "—"}</FieldTitle>
          </Field>
          <Field>
            <FieldLabel>Téléphone</FieldLabel>
            <FieldTitle>{draft.phone || "—"}</FieldTitle>
          </Field>
        </div>
        <Field>
          <FieldLabel>Email</FieldLabel>
          <FieldTitle>{draft.email || "—"}</FieldTitle>
        </Field>
      </TabsContent>

      <TabsContent value="vehicule" className="rounded-xl border p-5">
        {fleetAnswer && !isCorruptedLegacyValue(fleetAnswer.value) ? (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-black">{fleetAnswer.question}</span>
            <FleetVehicleList vehicles={parseVehicleList(fleetAnswer.value)} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Aucune information véhicule pour ce lead.</p>
        )}
      </TabsContent>

      <TabsContent value="entreprise" className="rounded-xl border p-5">
        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel>SIRET</FieldLabel>
            <FieldTitle>{draft.siret || "—"}</FieldTitle>
          </Field>
          <Field>
            <FieldLabel>Activité</FieldLabel>
            <FieldTitle>{draft.activite || "—"}</FieldTitle>
          </Field>
        </div>
      </TabsContent>

      {lead.answers.length > 0 && (
        <TabsContent value="reponses" className="rounded-xl border p-5 flex flex-col gap-5">
          {sections.map(({ section, answers }) => (
            <div key={section} className="flex flex-col gap-1.5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-black">{section}</h3>
              <div className="flex flex-col divide-y">
                {answers.map((a) => (
                  <div key={a.id} className={`flex gap-4 py-2.5 text-sm ${a.isVehicleList && !isCorruptedLegacyValue(a.value) ? "flex-col" : "items-center justify-between"}`}>
                    <span className="text-muted-foreground">{a.question}</span>
                    {isCorruptedLegacyValue(a.value) ? (
                      <span className="text-muted-foreground italic text-right">Donnée non disponible</span>
                    ) : a.isVehicleList ? (
                      <FleetVehicleList vehicles={parseVehicleList(a.value)} />
                    ) : a.isMultiChoice || a.unit === "percent" ? (
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {a.value.split(",").map((v) => v.trim()).filter(Boolean).map((v, i) => (
                          <Badge key={`${v}-${i}`} variant="secondary">{a.unit ? formatUnitValue(v, a.unit) : v}</Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="font-medium text-right">
                        {a.isDate ? formatDateValue(a.value) : a.unit ? formatUnitValue(a.value, a.unit) : a.value}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
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
