"use client"

import { use, useEffect, useState } from "react"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
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
import { TableSkeleton } from "@/components/table-skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MoreHorizontalIcon, PencilIcon, Trash2Icon, PlusIcon, XIcon, EyeIcon, UploadIcon, RotateCcwIcon, Loader2Icon, GripVerticalIcon } from "lucide-react"
import { QuestionnairePreview } from "@/components/questionnaire-preview"
import {
  getQuestionnaire,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  publishQuestion,
  publishQuestionnaire,
  type Questionnaire,
  type Question,
  type QuestionInput,
} from "@/lib/api"

const QUESTION_TYPES = [
  { value: "radio", label: "Choix unique (boutons)" },
  { value: "select", label: "Liste déroulante" },
  { value: "input", label: "Champ texte" },
  { value: "checkbox", label: "Cases à cocher" },
]

const INPUT_TYPES = [
  { value: "text", label: "Texte" },
  { value: "number", label: "Nombre" },
  { value: "email", label: "Email" },
  { value: "tel", label: "Téléphone" },
  { value: "date", label: "Date complète (jour, mois, année)" },
  { value: "month", label: "Mois et année (2 menus déroulants)" },
  { value: "year", label: "Année seule (menu déroulant)" },
]

const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  QUESTION_TYPES.map((t) => [t.value, t.label])
)

const INPUT_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  INPUT_TYPES.map((t) => [t.value, t.label])
)

const SECTION_SUGGESTIONS = ["Véhicule", "Usage & infos", "Conducteur", "Prochain contrat", "Coordonnées"]

const RULE_ACTIONS = [{ value: "skip", label: "Ignorer cette question" }]
const RULE_ACTION_LABELS: Record<string, string> = Object.fromEntries(
  RULE_ACTIONS.map((a) => [a.value, a.label])
)

type OptionDraft = { localId: string; label: string; value: string }
type RuleDraft = { localId: string; source_question_id: number | ""; value: string; action: string }

const EMPTY_DRAFT = {
  key: "",
  question: "",
  hint: "",
  section: "",
  type: "radio",
  input_type: "text",
  placeholder: "",
  required: true,
  uppercase: false,
  order: 0,
  options: [] as OptionDraft[],
  rules: [] as RuleDraft[],
}

function newLocalId() {
  return Math.random().toString(36).slice(2)
}

function questionToInput(q: Question, order: number): QuestionInput {
  return {
    key: q.key,
    question: q.question,
    hint: q.hint,
    section: q.section,
    eyebrow: q.eyebrow,
    type: q.type,
    input_type: q.input_type,
    placeholder: q.placeholder,
    required: q.required,
    card: q.card,
    uppercase: q.uppercase,
    option_cols: q.option_cols,
    order,
    options: q.options.map((o) => ({ label: o.label, value: o.value, order: o.order })),
    rules: q.rules.map((r) => ({
      source_question_id: r.source_question_id,
      operator: r.operator,
      value: r.value,
      action: r.action,
    })),
  }
}

function SortableRow({
  id,
  disabled,
  children,
}: {
  id: number
  disabled?: boolean
  children: (handle: { attributes: Record<string, unknown>; listeners: Record<string, unknown> | undefined }) => React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }
  return (
    <TableRow ref={setNodeRef} style={style} className={isDragging ? "relative z-10 bg-muted" : undefined}>
      {children({ attributes, listeners })}
    </TableRow>
  )
}

export default function QuestionnairePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = use(params)

  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [pendingRowId, setPendingRowId] = useState<number | null>(null)
  const [publishingAll, setPublishingAll] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; question: string } | null>(null)
  const [reordering, setReordering] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  // A "primary" row is either a published question or a brand-new question
  // that was never published. If a primary has a pending edit, its shadow
  // draft (draft_of_id === primary.id) holds the up-to-date content; `display`
  // is whichever of the two should currently be shown to the admin.
  const mergedRows = questionnaire
    ? questionnaire.questions
        .filter((q) => q.draft_of_id === null)
        .map((primary) => {
          const shadow = questionnaire.questions.find((q) => q.draft_of_id === primary.id) ?? null
          return { primary, shadow, display: shadow ?? primary }
        })
        .sort((a, b) => a.display.order - b.display.order)
    : []

  const pendingCount = mergedRows.filter((r) => r.shadow || r.primary.status === "draft").length

  function load() {
    setLoading(true)
    setError(null)
    return getQuestionnaire(slug)
      .then(setQuestionnaire)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    // Clear stale data on navigation to a different questionnaire so the old
    // one's table never flashes under the new slug — but in-page reloads
    // (after save/publish/delete) skip this and keep showing current data
    // while refetching, since load() alone is called for those.
    setQuestionnaire(null)
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  function openCreate() {
    setEditingId(null)
    setDraft({
      ...EMPTY_DRAFT,
      order: mergedRows.length,
      options: [{ localId: newLocalId(), label: "", value: "" }],
    })
    setDialogOpen(true)
  }

  // `primaryId` is always the stable id (never a shadow draft's own id) — PATCH
  // requests always target it, and the backend transparently routes the write
  // to a shadow draft if the primary is already published. `display` supplies
  // the values shown in the form (the draft's content if one is pending).
  function openEdit(primaryId: number, display: Question) {
    setEditingId(primaryId)
    setDraft({
      key: display.key || "",
      question: display.question,
      hint: display.hint || "",
      section: display.section || "",
      type: display.type,
      input_type: display.input_type || "text",
      placeholder: display.placeholder || "",
      required: display.required,
      uppercase: display.uppercase,
      order: display.order,
      options: display.options.map((o) => ({ localId: newLocalId(), label: o.label, value: o.value })),
      rules: display.rules.map((r) => ({ localId: newLocalId(), source_question_id: r.source_question_id, value: r.value, action: r.action })),
    })
    setDialogOpen(true)
  }

  function addOptionRow() {
    setDraft((d) => ({ ...d, options: [...d.options, { localId: newLocalId(), label: "", value: "" }] }))
  }

  function removeOptionRow(localId: string) {
    setDraft((d) => ({ ...d, options: d.options.filter((o) => o.localId !== localId) }))
  }

  function updateOptionRow(localId: string, patch: Partial<OptionDraft>) {
    setDraft((d) => ({
      ...d,
      options: d.options.map((o) => (o.localId === localId ? { ...o, ...patch } : o)),
    }))
  }

  function addRuleRow() {
    setDraft((d) => ({ ...d, rules: [...d.rules, { localId: newLocalId(), source_question_id: "", value: "", action: "skip" }] }))
  }

  function removeRuleRow(localId: string) {
    setDraft((d) => ({ ...d, rules: d.rules.filter((r) => r.localId !== localId) }))
  }

  function updateRuleRow(localId: string, patch: Partial<RuleDraft>) {
    setDraft((d) => ({
      ...d,
      rules: d.rules.map((r) => (r.localId === localId ? { ...r, ...patch } : r)),
    }))
  }

  async function save() {
    const hasOptions = ["radio", "select", "checkbox"].includes(draft.type)
    const payload: QuestionInput = {
      key: draft.key || null,
      question: draft.question,
      section: draft.section || null,
      eyebrow: null,
      type: draft.type,
      input_type: draft.type === "input" ? draft.input_type : null,
      placeholder: draft.type === "input" ? draft.placeholder || null : null,
      hint: draft.hint || null,
      required: draft.required,
      card: draft.type === "radio",
      uppercase: draft.type === "input" && draft.input_type === "text" ? draft.uppercase : false,
      option_cols: null,
      order: draft.order,
      options: hasOptions
        ? draft.options
            .filter((o) => o.label.trim() && o.value.trim())
            .map((o, i) => ({ label: o.label, value: o.value, order: i }))
        : [],
      rules: draft.rules
        .filter((r) => r.source_question_id !== "" && r.value.trim())
        .map((r) => ({ source_question_id: r.source_question_id as number, operator: "equals", value: r.value, action: r.action })),
    }

    if (editingId) {
      await updateQuestion(editingId, payload)
    } else {
      await createQuestion(slug, payload)
    }
    setDialogOpen(false)
    load()
  }

  async function remove(id: number) {
    setPendingRowId(id)
    try {
      await deleteQuestion(id)
      await load()
    } finally {
      setPendingRowId(null)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    await remove(deleteTarget.id)
    setDeleteTarget(null)
  }

  async function publish(primaryId: number, targetId: number) {
    setPendingRowId(primaryId)
    try {
      await publishQuestion(targetId)
      await load()
    } finally {
      setPendingRowId(null)
    }
  }

  async function publishAll() {
    setPublishingAll(true)
    try {
      await publishQuestionnaire(slug)
      await load()
    } finally {
      setPublishingAll(false)
    }
  }

  async function discardDraft(primaryId: number, shadowId: number) {
    setPendingRowId(primaryId)
    try {
      await deleteQuestion(shadowId)
      await load()
    } finally {
      setPendingRowId(null)
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = mergedRows.findIndex((r) => r.primary.id === active.id)
    const newIndex = mergedRows.findIndex((r) => r.primary.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(mergedRows, oldIndex, newIndex)
    const changed = reordered
      .map((row, index) => ({ row, index }))
      .filter(({ row, index }) => row.display.order !== index)
    if (changed.length === 0) return

    setReordering(true)
    try {
      await Promise.all(
        changed.map(({ row, index }) => updateQuestion(row.primary.id, questionToInput(row.display, index)))
      )
      await load()
    } finally {
      setReordering(false)
    }
  }

  const hasOptionsType = ["radio", "select", "checkbox"].includes(draft.type)

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-vertical:h-4 data-vertical:self-auto"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="#">Questionnaires</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>{questionnaire?.name || slug}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        {error && <p className="text-sm text-destructive">Erreur : {error}</p>}
        {loading && !questionnaire && <TableSkeleton rows={6} cols={8} />}

        {questionnaire && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {mergedRows.length} question{mergedRows.length > 1 ? "s" : ""}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setPreviewOpen(true)}
                    disabled={mergedRows.length === 0}
                  >
                    <EyeIcon />
                    Aperçu
                  </Button>
                  <Button onClick={openCreate}>
                    <PlusIcon />
                    Nouvelle question
                  </Button>
                </div>
              </div>

              {pendingCount > 0 && (
                <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-4 py-3">
                  <p className="text-sm">
                    {pendingCount} question{pendingCount > 1 ? "s ont" : " a"} des modifications non publiées.
                  </p>
                  <Button size="sm" onClick={publishAll} disabled={publishingAll}>
                    {publishingAll ? <Loader2Icon className="animate-spin" /> : <UploadIcon />}
                    Publier tout
                  </Button>
                </div>
              )}

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <Table containerClassName={`rounded-xl border ${reordering ? "opacity-60 pointer-events-none" : ""}`}>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8" />
                      <TableHead className="w-16">Ordre</TableHead>
                      <TableHead>Question</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Clé</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Requis</TableHead>
                      <TableHead>Options</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <SortableContext items={mergedRows.map((r) => r.primary.id)} strategy={verticalListSortingStrategy}>
                    <TableBody>
                      {mergedRows.map(({ primary, shadow, display }) => (
                        <SortableRow key={primary.id} id={primary.id} disabled={reordering}>
                          {({ attributes, listeners }) => (
                            <>
                              <TableCell className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing" {...attributes} {...listeners}>
                                <GripVerticalIcon size={16} />
                              </TableCell>
                              <TableCell
                                className={`text-muted-foreground ${pendingRowId === primary.id ? "opacity-50 transition-opacity" : "transition-opacity"}`}
                              >
                                {display.order}
                              </TableCell>
                              <TableCell className="font-medium">{display.question}</TableCell>
                              <TableCell className="text-muted-foreground">{display.section || "—"}</TableCell>
                              <TableCell className="text-muted-foreground">{display.key || "—"}</TableCell>
                              <TableCell>{TYPE_LABELS[display.type] || display.type}</TableCell>
                              <TableCell>
                                {display.required ? (
                                  <Badge variant="secondary">Requis</Badge>
                                ) : (
                                  <Badge variant="outline">Optionnel</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {display.options.length > 0 ? `${display.options.length} option${display.options.length > 1 ? "s" : ""}` : "—"}
                              </TableCell>
                              <TableCell>
                                {primary.status === "draft" ? (
                                  <Badge variant="outline">Brouillon</Badge>
                                ) : shadow ? (
                                  <Badge variant="outline">Modifié</Badge>
                                ) : (
                                  <Badge variant="secondary">Publié</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger
                                    render={
                                      <Button variant="ghost" size="icon-sm" disabled={pendingRowId === primary.id}>
                                        {pendingRowId === primary.id ? (
                                          <Loader2Icon className="animate-spin" />
                                        ) : (
                                          <MoreHorizontalIcon />
                                        )}
                                        <span className="sr-only">Actions</span>
                                      </Button>
                                    }
                                  />
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => openEdit(primary.id, display)}>
                                      <PencilIcon />
                                      Modifier
                                    </DropdownMenuItem>
                                    {(primary.status === "draft" || shadow) && (
                                      <DropdownMenuItem onClick={() => publish(primary.id, display.id)}>
                                        <UploadIcon />
                                        Publier
                                      </DropdownMenuItem>
                                    )}
                                    {shadow && (
                                      <DropdownMenuItem onClick={() => discardDraft(primary.id, shadow.id)}>
                                        <RotateCcwIcon />
                                        Annuler les modifications
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem
                                      variant="destructive"
                                      onClick={() => setDeleteTarget({ id: primary.id, question: display.question })}
                                    >
                                      <Trash2Icon />
                                      Supprimer
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </>
                          )}
                        </SortableRow>
                      ))}
                    </TableBody>
                  </SortableContext>
                </Table>
              </DndContext>
            </>
          )}
        </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-3xl p-6 gap-5">
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifier la question" : "Nouvelle question"}</DialogTitle>
          </DialogHeader>

          <div className="flex max-h-[70vh] flex-col gap-6 overflow-y-auto pr-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="q-text">Question</Label>
              <Input
                id="q-text"
                value={draft.question}
                onChange={(e) => setDraft((d) => ({ ...d, question: e.target.value }))}
                placeholder="Ex : Marque du véhicule"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="q-hint">Description (optionnel)</Label>
              <Input
                id="q-hint"
                value={draft.hint}
                onChange={(e) => setDraft((d) => ({ ...d, hint: e.target.value }))}
                placeholder="Ex : Sélectionnez tout ce qui s'applique."
              />
              <p className="text-xs text-muted-foreground">
                Affichée en petit texte gris sous la question, sur le site.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="q-order">Ordre</Label>
              <Input
                id="q-order"
                type="number"
                value={draft.order}
                onChange={(e) => setDraft((d) => ({ ...d, order: Number(e.target.value) }))}
              />
              <p className="text-xs text-muted-foreground">
                Détermine à quel moment cette question apparaît dans le parcours (0 = en premier).
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="q-section">Section (optionnel)</Label>
              <Input
                id="q-section"
                list="q-section-suggestions"
                value={draft.section}
                onChange={(e) => setDraft((d) => ({ ...d, section: e.target.value }))}
                placeholder="Ex : Véhicule"
              />
              <datalist id="q-section-suggestions">
                {SECTION_SUGGESTIONS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
              <p className="text-xs text-muted-foreground">
                Regroupe les questions par thème (Véhicule, Conducteur, Coordonnées…).
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="q-key">Clé (optionnel)</Label>
              <Input
                id="q-key"
                value={draft.key}
                onChange={(e) => setDraft((d) => ({ ...d, key: e.target.value }))}
                placeholder="Ex : bonus_malus"
              />
              <p className="text-xs text-muted-foreground">
                Sert à pré-remplir la réponse depuis les paramètres d&apos;URL.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="q-type">Type</Label>
              <Select items={TYPE_LABELS} value={draft.type} onValueChange={(v) => setDraft((d) => ({ ...d, type: v }))}>
                <SelectTrigger id="q-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUESTION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {draft.type === "input" && (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="q-input-type">Type de champ</Label>
                  <Select
                    items={INPUT_TYPE_LABELS}
                    value={draft.input_type}
                    onValueChange={(v) => setDraft((d) => ({ ...d, input_type: v }))}
                  >
                    <SelectTrigger id="q-input-type" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INPUT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="q-placeholder">Placeholder</Label>
                  <Input
                    id="q-placeholder"
                    value={draft.placeholder}
                    onChange={(e) => setDraft((d) => ({ ...d, placeholder: e.target.value }))}
                    placeholder="Ex : Ex : Clio, Série 3..."
                  />
                </div>
                {draft.input_type === "text" && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="q-uppercase"
                      checked={draft.uppercase}
                      onCheckedChange={(checked) => setDraft((d) => ({ ...d, uppercase: checked === true }))}
                    />
                    <Label htmlFor="q-uppercase" className="font-normal">
                      Mettre automatiquement en majuscules
                    </Label>
                  </div>
                )}
              </>
            )}

            <div className="flex items-center gap-2">
              <Checkbox
                id="q-required"
                checked={draft.required}
                onCheckedChange={(checked) => setDraft((d) => ({ ...d, required: checked === true }))}
              />
              <Label htmlFor="q-required" className="font-normal">Réponse requise</Label>
            </div>

            {hasOptionsType && (
              <div className="flex flex-col gap-2">
                <Label>Options</Label>
                {draft.options.map((o) => (
                  <div key={o.localId} className="flex items-center gap-2">
                    <Input
                      value={o.label}
                      onChange={(e) => updateOptionRow(o.localId, { label: e.target.value })}
                      placeholder="Libellé"
                      className="flex-1"
                    />
                    <Input
                      value={o.value}
                      onChange={(e) => updateOptionRow(o.localId, { value: e.target.value })}
                      placeholder="Valeur"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeOptionRow(o.localId)}
                    >
                      <XIcon />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addOptionRow} className="self-start">
                  <PlusIcon />
                  Ajouter une option
                </Button>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label>Règles</Label>
              <p className="text-xs text-muted-foreground -mt-1">
                Ignorer cette question si la réponse à une autre question correspond à une valeur.
              </p>
              {draft.rules.map((r) => {
                // Sourced from mergedRows (not the raw flat list) so a question with a
                // pending draft appears once, using its freshest (draft) content/options.
                const sourceRows = mergedRows
                  .filter((row) => row.primary.id !== editingId)
                  .sort((a, b) => a.display.order - b.display.order)
                const sourceQuestion = mergedRows.find((row) => row.primary.id === r.source_question_id)?.display
                const sourceItems = sourceRows.map((row) => ({ label: row.display.question, value: String(row.primary.id) }))
                const valueItems = sourceQuestion?.options.map((o) => ({ label: o.label, value: o.value })) ?? []
                return (
                  <div key={r.localId} className="flex flex-col gap-3 rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground shrink-0 w-4">Si</span>
                      <Select
                        items={sourceItems}
                        value={r.source_question_id === "" ? null : String(r.source_question_id)}
                        onValueChange={(v) => updateRuleRow(r.localId, { source_question_id: Number(v), value: "" })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Question…" />
                        </SelectTrigger>
                        <SelectContent>
                          {sourceRows.map((row) => (
                            <SelectItem key={row.primary.id} value={String(row.primary.id)}>
                              {row.display.question}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground shrink-0 w-4">=</span>
                      {sourceQuestion && sourceQuestion.options.length > 0 ? (
                        <Select items={valueItems} value={r.value || null} onValueChange={(v) => updateRuleRow(r.localId, { value: v })}>
                          <SelectTrigger className="flex-1 min-w-0">
                            <SelectValue placeholder="Valeur…" />
                          </SelectTrigger>
                          <SelectContent>
                            {sourceQuestion.options.map((o) => (
                              <SelectItem key={o.id} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={r.value}
                          onChange={(e) => updateRuleRow(r.localId, { value: e.target.value })}
                          placeholder="Valeur"
                          className="flex-1 min-w-0"
                        />
                      )}
                      <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeRuleRow(r.localId)}>
                        <XIcon />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground shrink-0 w-4">Alors</span>
                      <Select
                        items={RULE_ACTION_LABELS}
                        value={r.action}
                        onValueChange={(v) => updateRuleRow(r.localId, { action: v })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RULE_ACTIONS.map((a) => (
                            <SelectItem key={a.value} value={a.value}>
                              {a.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )
              })}
              <Button type="button" variant="outline" size="sm" onClick={addRuleRow} className="self-start">
                <PlusIcon />
                Ajouter une règle
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={save} disabled={!draft.question.trim()}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer cette question ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            « {deleteTarget?.question} » sera définitivement supprimée. Cette action est irréversible.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={pendingRowId === deleteTarget?.id}
            >
              {pendingRowId === deleteTarget?.id ? <Loader2Icon className="animate-spin" /> : <Trash2Icon />}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {questionnaire && (
        <QuestionnairePreview
          // Draft content, with each question's id pinned to its stable "primary"
          // id (never a shadow draft's own id) so rules — which always reference
          // the primary id — still match correctly against preview answers.
          questions={mergedRows.map((r) => ({ ...r.display, id: r.primary.id }))}
          open={previewOpen}
          onOpenChange={setPreviewOpen}
        />
      )}
    </>
  )
}
