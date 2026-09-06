"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PencilIcon, Trash2Icon, PlusIcon, EyeIcon, Loader2Icon, GripVerticalIcon } from "lucide-react"
import { QuestionnairePreview } from "@/components/questionnaire-preview"
import {
  getQuestionnaire,
  updateQuestionnaire,
  listAvailableCatalogEntries,
  addQuestion,
  updateQuestionWording,
  removeQuestion,
  type Questionnaire,
  type Question,
  type CatalogEntry,
} from "@/lib/api"

const TYPE_LABELS: Record<string, string> = {
  radio: "Choix unique (boutons)",
  select: "Liste déroulante",
  input: "Champ texte",
  checkbox: "Cases à cocher",
}

function SortableRow({
  id,
  disabled,
  children,
}: {
  id: number
  disabled?: boolean
  children: (handle: { attributes: DraggableAttributes; listeners: DraggableSyntheticListeners }) => React.ReactNode
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
  const router = useRouter()

  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [renameOpen, setRenameOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [renameName, setRenameName] = useState("")
  const [renameSlug, setRenameSlug] = useState("")
  const [renameError, setRenameError] = useState("")

  const [addOpen, setAddOpen] = useState(false)
  const [catalog, setCatalog] = useState<CatalogEntry[] | null>(null)
  const [addingKey, setAddingKey] = useState<string | null>(null)

  const [editTarget, setEditTarget] = useState<Question | null>(null)
  const [editQuestion, setEditQuestion] = useState("")
  const [editHint, setEditHint] = useState("")
  const [editPlaceholder, setEditPlaceholder] = useState("")
  const [saving, setSaving] = useState(false)

  const [previewOpen, setPreviewOpen] = useState(false)
  const [pendingRowId, setPendingRowId] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; question: string } | null>(null)
  const [reordering, setReordering] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const questions = questionnaire ? [...questionnaire.questions].sort((a, b) => a.order - b.order) : []

  function load() {
    setLoading(true)
    setError(null)
    return getQuestionnaire(slug)
      .then(setQuestionnaire)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    setQuestionnaire(null)
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  function openRename() {
    if (!questionnaire) return
    setRenameName(questionnaire.name)
    setRenameSlug(questionnaire.slug)
    setRenameError("")
    setRenameOpen(true)
  }

  async function handleRename() {
    if (!questionnaire || !renameName.trim() || !renameSlug.trim()) return
    setRenaming(true)
    setRenameError("")
    try {
      const updated = await updateQuestionnaire(slug, { name: renameName.trim(), slug: renameSlug.trim() })
      setRenameOpen(false)
      if (updated.slug !== slug) {
        router.replace(`/dashboard/questionnaires/${updated.slug}`)
      } else {
        setQuestionnaire(updated)
      }
    } catch (err) {
      setRenameError(err instanceof Error ? err.message : "Une erreur est survenue.")
    } finally {
      setRenaming(false)
    }
  }

  function openAdd() {
    setCatalog(null)
    setAddOpen(true)
    listAvailableCatalogEntries(slug).then(setCatalog).catch(() => setCatalog([]))
  }

  async function handleAdd(catalogKey: string) {
    setAddingKey(catalogKey)
    try {
      await addQuestion(slug, catalogKey, questions.length)
      await load()
      setCatalog((prev) => prev?.filter((e) => e.key !== catalogKey) ?? null)
    } finally {
      setAddingKey(null)
    }
  }

  function openEdit(question: Question) {
    setEditTarget(question)
    setEditQuestion(question.question)
    setEditHint(question.hint || "")
    setEditPlaceholder(question.placeholder || "")
  }

  async function handleSaveWording() {
    if (!editTarget) return
    setSaving(true)
    try {
      await updateQuestionWording(editTarget.id, {
        question: editQuestion,
        hint: editHint || undefined,
        placeholder: editPlaceholder || undefined,
      })
      setEditTarget(null)
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: number) {
    setPendingRowId(id)
    try {
      await removeQuestion(id)
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

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = questions.findIndex((q) => q.id === active.id)
    const newIndex = questions.findIndex((q) => q.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(questions, oldIndex, newIndex)
    const changed = reordered
      .map((q, index) => ({ q, index }))
      .filter(({ q, index }) => q.order !== index)
    if (changed.length === 0) return

    setReordering(true)
    try {
      await Promise.all(changed.map(({ q, index }) => updateQuestionWording(q.id, { order: index })))
      await load()
    } finally {
      setReordering(false)
    }
  }

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
          {questionnaire && (
            <Button variant="ghost" size="icon-sm" onClick={openRename} title="Renommer">
              <PencilIcon />
            </Button>
          )}
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        {error && <p className="text-sm text-destructive">Erreur : {error}</p>}
        {loading && !questionnaire && <TableSkeleton rows={6} cols={5} />}

        {questionnaire && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {questions.length} question{questions.length > 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPreviewOpen(true)}
                  disabled={questions.length === 0}
                >
                  <EyeIcon />
                  Aperçu
                </Button>
                <Button onClick={openAdd}>
                  <PlusIcon />
                  Ajouter une question
                </Button>
              </div>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <Table containerClassName={`rounded-xl border ${reordering ? "opacity-60 pointer-events-none" : ""}`}>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Question</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
                  <TableBody>
                    {questions.map((q) => (
                      <SortableRow key={q.id} id={q.id} disabled={reordering}>
                        {({ attributes, listeners }) => (
                          <>
                            <TableCell className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing" {...attributes} {...listeners}>
                              <GripVerticalIcon size={16} />
                            </TableCell>
                            <TableCell className="font-medium">
                              {q.question}
                              {q.orphaned && (
                                <Badge variant="outline" className="ml-2 text-destructive">Introuvable</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{q.section || "—"}</TableCell>
                            <TableCell>{TYPE_LABELS[q.type] || q.type}</TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon-sm" onClick={() => openEdit(q)} disabled={pendingRowId === q.id}>
                                  <PencilIcon />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => setDeleteTarget({ id: q.id, question: q.question })}
                                  disabled={pendingRowId === q.id}
                                >
                                  {pendingRowId === q.id ? <Loader2Icon className="animate-spin" /> : <Trash2Icon />}
                                </Button>
                              </div>
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

      <Dialog open={renameOpen} onOpenChange={(open) => !open && setRenameOpen(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Renommer le questionnaire</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="qn-name">Nom</Label>
              <Input id="qn-name" value={renameName} onChange={(e) => setRenameName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="qn-slug">Slug</Label>
              <Input id="qn-slug" value={renameSlug} onChange={(e) => setRenameSlug(e.target.value)} />
              <p className="text-xs text-muted-foreground">
                Changer le slug change l&apos;URL de ce questionnaire — assurez-vous de mettre à jour les liens qui y pointent.
              </p>
            </div>
            {renameError && <p className="text-sm text-destructive">{renameError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)} disabled={renaming}>Annuler</Button>
            <Button onClick={handleRename} disabled={!renameName.trim() || !renameSlug.trim() || renaming}>
              {renaming ? <><Loader2Icon size={14} className="animate-spin" /> Enregistrement…</> : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Ajouter une question</DialogTitle></DialogHeader>
          <div className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto">
            {catalog === null && (
              <p className="text-sm text-muted-foreground py-4 text-center">Chargement…</p>
            )}
            {catalog?.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Toutes les questions disponibles sont déjà ajoutées.
              </p>
            )}
            {catalog?.map((entry) => (
              <button
                key={entry.key}
                onClick={() => handleAdd(entry.key)}
                disabled={addingKey !== null}
                className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left text-sm hover:bg-muted disabled:opacity-50"
              >
                <span className="flex flex-col">
                  <span className="font-medium">{entry.question}</span>
                  <span className="text-xs text-muted-foreground">{entry.section} · {TYPE_LABELS[entry.type] || entry.type}</span>
                </span>
                {addingKey === entry.key ? <Loader2Icon size={16} className="shrink-0 animate-spin" /> : <PlusIcon size={16} className="shrink-0" />}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modifier le texte</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="e-question">Question</Label>
              <Input id="e-question" value={editQuestion} onChange={(e) => setEditQuestion(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="e-hint">Description (optionnel)</Label>
              <Input id="e-hint" value={editHint} onChange={(e) => setEditHint(e.target.value)} />
            </div>
            {editTarget?.type === "input" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="e-placeholder">Placeholder</Label>
                <Input id="e-placeholder" value={editPlaceholder} onChange={(e) => setEditPlaceholder(e.target.value)} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)} disabled={saving}>Annuler</Button>
            <Button onClick={handleSaveWording} disabled={!editQuestion.trim() || saving}>
              {saving ? <><Loader2Icon size={14} className="animate-spin" /> Enregistrement…</> : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Retirer cette question ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            « {deleteTarget?.question} » ne sera plus posée dans ce questionnaire. Vous pourrez la rajouter plus tard.
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
              Retirer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {questionnaire && (
        <QuestionnairePreview
          questions={questions}
          open={previewOpen}
          onOpenChange={setPreviewOpen}
        />
      )}
    </>
  )
}
