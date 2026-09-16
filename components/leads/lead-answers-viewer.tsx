"use client"

// A read-only, step-by-step reproduction of the public site's own
// questionnaire wizard (CarInsuranceForm.js) for whatever answers a lead
// actually submitted — same section tabs bar, same Précédent/Suivant
// navigation, same field components (see public-form-ui.tsx), same
// section/product/eyebrow grouping. Nothing here is specific to any one
// questionnaire: it's driven entirely by the `answers` + `questions` (from
// GET /questionnaires/{slug}/questions) passed in, so a future product
// (health insurance, …) reuses this unchanged — only the identity-field
// tabs around it (Coordonnées/Entreprise-equivalent) are product-specific
// and belong in that product's own sibling of garage-lead-fields.tsx.

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  ChevronLeftIcon, ChevronRightIcon, CircleIcon,
  CarIcon, UserIcon, ListChecksIcon, ShieldIcon, FileTextIcon, PhoneIcon, AlertTriangleIcon, WalletIcon, CalendarDaysIcon,
} from "lucide-react"
import { type LeadAnswer, type PublishedQuestion, type PublishedQuestionOption } from "@/lib/api"
import {
  Checkbox as PublicCheckbox, Field as PublicField, FieldContent as PublicFieldContent,
  FieldLabel as PublicFieldLabel, FieldTitle as PublicFieldTitle, PlainCheckboxSquare, PublicFormBrandScope,
  RadioGroupItem as PublicRadioGroupItem,
} from "@/components/leads/public-form-ui"

// Mirrors the public site's own field metadata (CarInsuranceForm.js) so a
// section can be laid out exactly like the form the client filled in —
// same section/eyebrow grouping, same option-pill radios/checkboxes, same
// table for a repeating-group answer — just grayed out and non-interactive.
type DisplayAnswer = LeadAnswer & {
  eyebrow: string | null
  rawType: string | null
  inputType: string | null
  card: boolean
  options: PublishedQuestionOption[]
  products: string[] | null
  unit: string | null
  isDate: boolean
  isVehicleList: boolean
}

// "Immatriculations (carte grise) des véhicules", "% détention du capital",
// sinistres, historique des contrats, conducteurs, … are all submitted as a
// JSON array of repeating rows, each a list of {label, value} fields (see
// garagiste/devis's handleSubmit) — detected generically from the value's
// own shape rather than a hardcoded list of catalog keys, so it keeps
// working as new repeating-table questions are added to any catalog.
type RepeatingField = { label: string; value: string }

function looksLikeRepeatingRows(value: string): boolean {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) && parsed.every((v) => v && Array.isArray(v.fields))
  } catch {
    return false
  }
}

// The garage catalog's two oldest repeating-table keys predate the JSON
// format above — they used to store a flattened "Véhicule 1 : A — B — C —
// D ; Véhicule 2 : …" string instead, always in this fixed field order
// (formatFlotteRow only ever omitted a *trailing* field, never a middle
// one) — split it back into the same shape on a best-effort basis so those
// old leads still render. Harmless for any other questionnaire: these two
// keys simply never occur there.
const LEGACY_FLAT_KEYS = new Set(["flotte_immatriculations", "w_garage_vehicules"])
const LEGACY_FIELD_LABELS = ["Véhicule", "Immatriculation", "Mode d'achat", "Usage"]

function parseRepeatingRows(value: string): { fields: RepeatingField[] }[] {
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

// A repeating-group answer rendered as a real table (header row from the
// first row's field labels) — same container chrome as the public form's
// own RepeatingTableField (rounded-lg border, gray-50 header row, "#"
// index column), just with plain text cells instead of live inputs.
function RepeatingAnswerTable({ rows }: { rows: { fields: RepeatingField[] }[] }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">Aucune ligne.</p>
  const columns = rows[0].fields.map((f) => f.label)
  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
    {/* whitespace-normal overrides the Table primitive's default nowrap —
        with it, any longish cell (a commune name, a full name) forces the
        table wider than its container and the wrapper's own overflow-x-auto
        kicks in as a horizontal scrollbar; wrapping keeps it inside the
        available width instead. */}
    <Table>
      <TableHeader>
        <TableRow className="bg-gray-50">
          <TableHead className="w-10 whitespace-normal">#</TableHead>
          {columns.map((col) => <TableHead key={col} className="whitespace-normal">{col}</TableHead>)}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, i) => (
          <TableRow key={i}>
            <TableCell className="text-muted-foreground whitespace-normal">{i + 1}</TableCell>
            {columns.map((col) => (
              <TableCell key={col} className="whitespace-normal break-words">{row.fields.find((f) => f.label === col)?.value || "—"}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
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

// A handful of leads submitted before a catalog's handleSubmit learned to
// stringify a repeating field's per-row rows ended up with this saved
// literally — the real per-row data was never captured correctly, so
// there's nothing to recover; just say so instead of showing raw garbage.
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
      eyebrow: question?.eyebrow ?? null,
      rawType: question?.type ?? null,
      inputType: question?.input_type ?? null,
      card: question?.card ?? false,
      options: question?.options ?? [],
      products: question?.products ?? null,
      unit: question?.unit ?? null,
      isDate: question?.input_type === "date",
      isVehicleList: looksLikeRepeatingRows(a.value) || (LEGACY_FLAT_KEYS.has(a.catalog_key) && !isCorruptedLegacyValue(a.value)),
    })
  }
  for (const list of bySection.values()) {
    list.sort((a, b) => (byKey.get(a.catalog_key)?.order ?? Infinity) - (byKey.get(b.catalog_key)?.order ?? Infinity))
  }

  return sectionOrder
    .filter((section) => bySection.has(section))
    .map((section) => ({ section, answers: bySection.get(section)! }))
}

// Consecutive answers sharing the same eyebrow (including consecutive ones
// with none) are grouped into one banded run — mirrors the public form's
// own groupFieldsByEyebrow so a section reads with the exact same bands
// (e.g. "Sinistralité (36 derniers mois)") the client saw while filling it.
function groupAnswersByEyebrow(answers: DisplayAnswer[]) {
  const runs: { eyebrow: string | null; answers: DisplayAnswer[] }[] = []
  for (const a of answers) {
    const eyebrow = a.eyebrow || null
    const last = runs[runs.length - 1]
    if (last && last.eyebrow === eyebrow) last.answers.push(a)
    else runs.push({ eyebrow, answers: [a] })
  }
  return runs
}

// Mirrors the public form's own groupFieldsByProduct: questions with no
// `products` tag render directly in the section; a product-tagged question
// instead lands in its own block under that product's colored header —
// several products can appear in the same section (e.g. a mixed-product
// lead), each getting its own block, in first-appearance order. A
// questionnaire with no sub-products (nothing ever tagged `products`) just
// puts everything through `generic` — this needs no per-questionnaire config.
function groupAnswersByProduct(answers: DisplayAnswer[]) {
  const generic = answers.filter((a) => !a.products || a.products.length === 0)
  const claimed = new Set<number>()
  const products = [...new Set(answers.flatMap((a) => a.products || []))]
  const groups: { product: string; answers: DisplayAnswer[] }[] = []
  for (const product of products) {
    const productAnswers = answers.filter((a) => a.products?.includes(product) && !claimed.has(a.id))
    productAnswers.forEach((a) => claimed.add(a.id))
    if (productAnswers.length > 0) groups.push({ product, answers: productAnswers })
  }
  return { generic, groups }
}

// Product option labels ("Protect Garage", "Les Convoyeurs", …) come from
// whichever question the catalog marks `gate: true` with a radio/checkbox
// type (the public form's own "which product(s) are you interested in"
// screen) — resolved generically off that flag instead of a hardcoded
// catalog key, so this works for any questionnaire's own gate question, or
// produces an empty map (harmless — groups would be empty too) for one
// with none at all.
function resolveProductLabels(questions: PublishedQuestion[]): Record<string, string> {
  const gateQuestion = questions.find((q) => q.gate && (q.type === "radio" || q.type === "checkbox"))
  return Object.fromEntries((gateQuestion?.options ?? []).map((o) => [o.value, o.label]))
}

// Copied from CarInsuranceForm.js's own SECTION_ICONS — same icon per
// section name, so the step tabs bar below matches the public form exactly.
// Any section name not listed here (a future questionnaire's own sections)
// just falls back to a plain circle instead of crashing or guessing.
const SECTION_ICONS: Record<string, typeof CircleIcon> = {
  "Véhicule": CarIcon,
  "Conducteur": UserIcon,
  "Historique": ListChecksIcon,
  "Couverture": ShieldIcon,
  "Contrat": FileTextIcon,
  "Contact": PhoneIcon,
  "Coordonnées": UserIcon,
  "Risques": AlertTriangleIcon,
  "Antécédents": ListChecksIcon,
  "Flotte auto propre": CarIcon,
  "Tarification": WalletIcon,
  "Finalisation": CalendarDaysIcon,
}

// Matches the public form's own isWideField — radio/checkbox groups,
// repeating tables and long free-text answers always span both grid
// columns instead of sharing a row with something unrelated.
function isWideAnswer(a: DisplayAnswer) {
  return a.isVehicleList || a.rawType === "radio" || a.rawType === "checkbox" || a.inputType === "textarea"
}

// One answer, laid out exactly like its live field on the public form (see
// CarInsuranceForm.js's renderFieldCard — same label style, same option
// pills for radio/checkbox with the saved one(s) highlighted, same table
// for a repeating-group answer) but disabled/read-only: this is a frozen
// copy of what the client submitted, not an editable one.
function AnswerFieldCard({ a }: { a: DisplayAnswer }) {
  const wide = isWideAnswer(a)

  let body: React.ReactNode
  if (isCorruptedLegacyValue(a.value)) {
    body = <p className="text-sm italic text-gray-400">Donnée non disponible</p>
  } else if (a.isVehicleList) {
    body = <RepeatingAnswerTable rows={parseRepeatingRows(a.value)} />
  } else if (a.rawType === "radio" || a.rawType === "checkbox") {
    const selectedLabels = a.value.split(",").map((v) => v.trim()).filter(Boolean)
    // Older leads whose catalog question was since edited/removed have no
    // options to enumerate — fall back to just the saved label(s) so the
    // answer still shows instead of disappearing.
    const options = a.options.length > 0 ? a.options : selectedLabels.map((label) => ({ label, value: label }))
    if (a.card) {
      // Card style — a bordered/tinted box per option (FieldLabel > Field >
      // FieldContent > FieldTitle), same markup renderFieldCard uses for
      // s.card questions.
      body = (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {options.map((opt, i) => {
            const isSelected = selectedLabels.includes(opt.label)
            return (
              <PublicFieldLabel key={i} className={isSelected ? "border-[var(--color-brand)] bg-[var(--color-brand)]/5" : ""}>
                <PublicField orientation="horizontal">
                  <PublicFieldContent>
                    <PublicFieldTitle>{opt.label}</PublicFieldTitle>
                  </PublicFieldContent>
                  {a.rawType === "checkbox" ? <PublicCheckbox checked={isSelected} /> : <PublicRadioGroupItem checked={isSelected} />}
                </PublicField>
              </PublicFieldLabel>
            )
          })}
        </div>
      )
    } else if (a.rawType === "checkbox") {
      // Plain checkbox list — no bordered box, just a square + label, same
      // markup as renderFieldCard's "Checkbox — plain list" branch.
      body = (
        <div className="flex flex-col gap-4">
          {options.map((opt, i) => {
            const isSelected = selectedLabels.includes(opt.label)
            return (
              <span key={i} className="flex items-center gap-2.5">
                <PlainCheckboxSquare checked={isSelected} />
                <span className="text-base text-[rgba(0,0,0,0.88)]">{opt.label}</span>
              </span>
            )
          })}
        </div>
      )
    } else {
      // Plain radio list — no bordered box, just a dot + label, same markup
      // as renderFieldCard's "Radio — inline style" branch.
      body = (
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {options.map((opt, i) => {
            const isSelected = selectedLabels.includes(opt.label)
            return (
              <span key={i} className="flex items-center gap-2.5">
                <PublicRadioGroupItem checked={isSelected} />
                <span className="text-base font-normal text-[rgba(0,0,0,0.88)]">{opt.label}</span>
              </span>
            )
          })}
        </div>
      )
    }
  } else {
    const displayValue = a.isDate ? formatDateValue(a.value) : a.unit ? formatUnitValue(a.value, a.unit) : a.value
    body = <Input value={displayValue} disabled readOnly className="bg-white h-[50px]" />
  }

  return (
    <div className={`flex flex-col gap-2 ${wide ? "md:col-span-2" : ""}`}>
      <p className="text-[16px] text-[rgba(0,0,0,0.88)] font-semibold">{a.question}</p>
      {body}
    </div>
  )
}

// The whole Réponses tab: a one-section-at-a-time viewer of the client's
// submission, copying CarInsuranceForm.js's own wizard chrome wholesale —
// the same section tabs bar (icons, active-step highlight, "Étape X/Y ·
// Section" caption on mobile) and the same Précédent/Suivant buttons at the
// bottom — so this reads exactly like the public form the client stepped
// through, just frozen on whichever section you navigate to and with every
// control disabled. Product-agnostic: pass any lead's `answers` alongside
// that questionnaire's own published `questions` (fetched via
// fetchQuestionnaireQuestions(slug)) and it lays itself out correctly.
export function ReponsesStepViewer({
  answers, questions,
}: {
  answers: LeadAnswer[]
  questions: PublishedQuestion[]
}) {
  const [stepIdx, setStepIdx] = useState(0)
  const sections = groupAnswersBySection(answers, questions)
  const productLabels = resolveProductLabels(questions)
  const clampedIdx = Math.min(stepIdx, sections.length - 1)
  const current = sections[clampedIdx]
  if (!current) return null

  return (
    <PublicFormBrandScope className="flex flex-col gap-6">
      {sections.length > 1 && (
        <>
          <div
            className="hidden md:grid gap-0.5 sticky top-0 z-10 bg-white pt-1 pb-1"
            style={{ gridTemplateColumns: `repeat(${sections.length}, minmax(0, 1fr))` }}
          >
            {sections.map(({ section }, i) => {
              const Icon = SECTION_ICONS[section] || CircleIcon
              const isActive = i === clampedIdx
              return (
                <button
                  key={section}
                  type="button"
                  onClick={() => setStepIdx(i)}
                  className={`flex items-center justify-center gap-1 px-1 lg:px-3 py-3.5 text-[11px] font-semibold uppercase tracking-normal transition-colors cursor-pointer ${
                    isActive ? "bg-[var(--color-brand)] text-white" : "bg-gray-200 text-gray-500 hover:bg-gray-300"
                  }`}
                >
                  <Icon size={16} className="shrink-0" />
                  <span className="text-center leading-snug whitespace-nowrap">{section}</span>
                </button>
              )
            })}
          </div>

          <div className="md:hidden flex flex-col gap-2 sticky top-0 z-10 bg-white pt-1 pb-1">
            <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${sections.length}, minmax(0, 1fr))` }}>
              {sections.map(({ section }, i) => {
                const Icon = SECTION_ICONS[section] || CircleIcon
                const isActive = i === clampedIdx
                return (
                  <button
                    key={section}
                    type="button"
                    onClick={() => setStepIdx(i)}
                    className={`flex items-center justify-center py-3 transition-colors ${
                      isActive ? "bg-[var(--color-brand)] text-white" : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    <Icon size={18} />
                  </button>
                )
              })}
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 text-center">
              Étape {clampedIdx + 1}/{sections.length} · {current.section}
            </p>
          </div>
        </>
      )}

      {/* Same split as groupFieldsByProduct: questions with no product tag
          render directly here; product-tagged ones each get their own
          colored-header block below, eyebrow-banded inside it — exactly
          how CarInsuranceForm.js's own return lays out a section. */}
      <div className="flex flex-col gap-16">
        {(() => {
          const { generic, groups } = groupAnswersByProduct(current.answers)
          return (
            <>
              {generic.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-10 bg-gray-100 p-6">
                  {generic.map((a) => <AnswerFieldCard key={a.id} a={a} />)}
                </div>
              )}
              {groups.map(({ product, answers }) => (
                <div key={product} className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <span className="w-1.5 h-5 bg-[var(--color-brand)] shrink-0" />
                    <span className="text-base font-bold text-[rgba(0,0,0,0.88)] whitespace-nowrap">{productLabels[product] ?? product}</span>
                    <span className="flex-1 h-px bg-gray-200" />
                  </div>
                  <div className="flex flex-col gap-6 bg-gray-100 p-6">
                    {groupAnswersByEyebrow(answers).map((run, ri) => (
                      <div key={ri} className="flex flex-col gap-6">
                        {run.eyebrow && (
                          <div className={`-mx-6 bg-[var(--color-brand)]/10 px-4 py-2.5 text-sm font-bold tracking-wide text-[var(--color-brand)] uppercase ${ri === 0 ? "-mt-6" : ""}`}>
                            {run.eyebrow}
                          </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-10">
                          {run.answers.map((a) => <AnswerFieldCard key={a.id} a={a} />)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )
        })()}
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
          disabled={clampedIdx === 0}
          className="h-12 px-5 gap-1"
        >
          <ChevronLeftIcon size={16} />
          Précédent
        </Button>
        <Button
          type="button"
          onClick={() => setStepIdx((i) => Math.min(sections.length - 1, i + 1))}
          disabled={clampedIdx === sections.length - 1}
          className="h-12 px-5 gap-1 bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand)]/90"
        >
          Suivant
          <ChevronRightIcon size={16} />
        </Button>
      </div>
    </PublicFormBrandScope>
  )
}
