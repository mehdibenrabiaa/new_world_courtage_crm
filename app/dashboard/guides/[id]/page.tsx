"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  DndContext, closestCenter, PointerSensor,
  KeyboardSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext, useSortable,
  verticalListSortingStrategy, arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  GripVerticalIcon, Trash2Icon, PlusIcon,
  CheckIcon, ChevronLeftIcon, Loader2Icon, HelpCircleIcon,
} from "lucide-react"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  getGuide, saveGuide, uploadGuideImage, uid,
  type Guide, type Block, type SectionBlock,
  type AccentCardBlock, type AccentCardItem, type ParagraphBlock,
  type Status,
} from "@/lib/guides-store"

const CATEGORIES = [
  "Flotte & Transport", "Taxi", "Ambulance", "VTC",
  "Pro de l'auto", "Construction", "Immobilier", "Général",
]

// ─── Block editors ───────────────────────────────────────────────────────────

function SectionEditor({
  block,
  onUpdate,
}: {
  block: SectionBlock
  onUpdate: (patch: Partial<SectionBlock>) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Titre (h2)</Label>
        <Input
          value={block.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Titre de la section…"
          className="font-semibold"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Contenu</Label>
        <Textarea
          value={block.content}
          onChange={(e) => onUpdate({ content: e.target.value })}
          placeholder="Paragraphe de la section…"
          className="resize-none min-h-[80px]"
        />
      </div>
    </div>
  )
}

function AccentCardEditor({
  block,
  onUpdate,
  onItemAdd,
  onItemUpdate,
  onItemDelete,
}: {
  block: AccentCardBlock
  onUpdate: (patch: Partial<AccentCardBlock>) => void
  onItemAdd: () => void
  onItemUpdate: (itemId: string, patch: Partial<AccentCardItem>) => void
  onItemDelete: (itemId: string) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Titre de section (optionnel)</Label>
        <Input
          value={block.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Titre optionnel au-dessus des cartes…"
        />
      </div>
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground">Colonnes</Label>
        <div className="flex gap-1">
          {([1, 2] as const).map((n) => (
            <Button
              key={n}
              size="sm"
              variant={block.cols === n ? "default" : "outline"}
              className="h-7 w-7 p-0 text-xs"
              onClick={() => onUpdate({ cols: n })}
            >
              {n}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {block.items.map((item) => (
          <div key={item.id} className="border rounded-lg p-3 flex flex-col gap-2 bg-muted/30">
            <div className="flex items-start gap-2">
              <div className="flex-1 flex flex-col gap-2">
                <Input
                  value={item.heading}
                  onChange={(e) => onItemUpdate(item.id, { heading: e.target.value })}
                  placeholder="En-tête de la carte…"
                  className="text-sm font-medium"
                />
                <Textarea
                  value={item.body}
                  onChange={(e) => onItemUpdate(item.id, { body: e.target.value })}
                  placeholder="Corps de la carte…"
                  className="resize-none min-h-[60px] text-sm"
                />
              </div>
              {block.items.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => onItemDelete(item.id)}
                >
                  <Trash2Icon size={14} />
                </Button>
              )}
            </div>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={onItemAdd} className="w-fit">
          <PlusIcon size={14} />
          Ajouter une carte
        </Button>
      </div>
    </div>
  )
}

function ParagraphEditor({
  block,
  onUpdate,
}: {
  block: ParagraphBlock
  onUpdate: (patch: Partial<ParagraphBlock>) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs text-muted-foreground">Paragraphe</Label>
      <Textarea
        value={block.content}
        onChange={(e) => onUpdate({ content: e.target.value })}
        placeholder="Contenu du paragraphe…"
        className="resize-none min-h-[80px]"
      />
    </div>
  )
}

// ─── Sortable block wrapper ───────────────────────────────────────────────────

const BLOCK_LABELS: Record<Block["type"], string> = {
  "section": "Section",
  "accent-card": "Accent card",
  "paragraph": "Paragraphe",
}

const BLOCK_COLORS: Record<Block["type"], string> = {
  "section": "bg-blue-50 border-blue-100",
  "accent-card": "bg-amber-50 border-amber-100",
  "paragraph": "bg-gray-50 border-gray-100",
}

function SortableBlock({
  block,
  onUpdate,
  onDelete,
  onItemAdd,
  onItemUpdate,
  onItemDelete,
}: {
  block: Block
  onUpdate: (blockId: string, patch: object) => void
  onDelete: (blockId: string) => void
  onItemAdd: (blockId: string) => void
  onItemUpdate: (blockId: string, itemId: string, patch: Partial<AccentCardItem>) => void
  onItemDelete: (blockId: string, itemId: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border overflow-hidden ${isDragging ? "opacity-50 shadow-lg ring-2 ring-primary/30" : ""}`}
    >
      <div className={`flex items-center gap-2 px-3 py-2 border-b ${BLOCK_COLORS[block.type]}`}>
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab text-muted-foreground hover:text-foreground touch-none"
          aria-label="Déplacer le bloc"
        >
          <GripVerticalIcon size={16} />
        </button>
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground select-none">
          {BLOCK_LABELS[block.type]}
        </span>
        <button
          onClick={() => onDelete(block.id)}
          className="ml-auto text-muted-foreground hover:text-destructive transition-colors"
          aria-label="Supprimer le bloc"
        >
          <Trash2Icon size={14} />
        </button>
      </div>
      <div className="p-4 bg-card">
        {block.type === "section" && (
          <SectionEditor block={block} onUpdate={(p) => onUpdate(block.id, p)} />
        )}
        {block.type === "accent-card" && (
          <AccentCardEditor
            block={block}
            onUpdate={(p) => onUpdate(block.id, p)}
            onItemAdd={() => onItemAdd(block.id)}
            onItemUpdate={(itemId, p) => onItemUpdate(block.id, itemId, p)}
            onItemDelete={(itemId) => onItemDelete(block.id, itemId)}
          />
        )}
        {block.type === "paragraph" && (
          <ParagraphEditor block={block} onUpdate={(p) => onUpdate(block.id, p)} />
        )}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function GuideEditorPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [guide, setGuide] = useState<Guide | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => {
    getGuide(Number(id))
      .then((g) => {
        if (!g) router.push("/dashboard/guides")
        else setGuide(g)
      })
      .catch(() => router.push("/dashboard/guides"))
  }, [id, router])

  function updateField<K extends keyof Guide>(key: K, value: Guide[K]) {
    setGuide((prev) => prev ? { ...prev, [key]: value } : prev)
  }

  function addBlock(type: Block["type"]) {
    let block: Block
    if (type === "section") {
      block = { id: uid(), type: "section", title: "", content: "" }
    } else if (type === "accent-card") {
      block = { id: uid(), type: "accent-card", title: "", cols: 1, items: [{ id: uid(), heading: "", body: "" }] }
    } else {
      block = { id: uid(), type: "paragraph", content: "" }
    }
    setGuide((prev) => prev ? { ...prev, blocks: [...prev.blocks, block] } : prev)
  }

  function updateBlock(blockId: string, patch: object) {
    setGuide((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        blocks: prev.blocks.map((b) => b.id === blockId ? { ...b, ...patch } as Block : b),
      }
    })
  }

  function deleteBlock(blockId: string) {
    setGuide((prev) =>
      prev ? { ...prev, blocks: prev.blocks.filter((b) => b.id !== blockId) } : prev
    )
  }

  function addItem(blockId: string) {
    setGuide((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        blocks: prev.blocks.map((b) => {
          if (b.id !== blockId || b.type !== "accent-card") return b
          return { ...b, items: [...b.items, { id: uid(), heading: "", body: "" }] }
        }) as Block[],
      }
    })
  }

  function updateItem(blockId: string, itemId: string, patch: Partial<AccentCardItem>) {
    setGuide((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        blocks: prev.blocks.map((b) => {
          if (b.id !== blockId || b.type !== "accent-card") return b
          return { ...b, items: b.items.map((i) => i.id === itemId ? { ...i, ...patch } : i) }
        }) as Block[],
      }
    })
  }

  function deleteItem(blockId: string, itemId: string) {
    setGuide((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        blocks: prev.blocks.map((b) => {
          if (b.id !== blockId || b.type !== "accent-card") return b
          return { ...b, items: b.items.filter((i) => i.id !== itemId) }
        }) as Block[],
      }
    })
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id || !guide) return
    const oldIdx = guide.blocks.findIndex((b) => b.id === active.id)
    const newIdx = guide.blocks.findIndex((b) => b.id === over.id)
    if (oldIdx < 0 || newIdx < 0) return
    setGuide((prev) =>
      prev ? { ...prev, blocks: arrayMove(prev.blocks, oldIdx, newIdx) } : prev
    )
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !guide) return
    setUploading(true)
    try {
      const updated = await uploadGuideImage(guide.id, file)
      setGuide(updated)
    } catch (err) {
      console.error(err)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  async function handleSave() {
    if (!guide || saving) return
    setSaving(true)
    try {
      const updated = await saveGuide(guide)
      setGuide(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (!guide) return (
    <div className="flex flex-1 items-center justify-center text-muted-foreground gap-2">
      <Loader2Icon size={18} className="animate-spin" />
      <span className="text-sm">Chargement…</span>
    </div>
  )

  return (
    <>
      {/* ── Header ── */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4 sticky top-0 z-10">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 data-vertical:h-4 data-vertical:self-auto" />
        <Breadcrumb className="flex-1 min-w-0">
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="/dashboard">Tableau de bord</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="/dashboard/guides">Guides</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage className="max-w-[200px] truncate">{guide.title || "Sans titre"}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex items-center gap-2 ml-auto shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/dashboard/guides")}
          >
            <ChevronLeftIcon size={14} />
            Retour
          </Button>
          <Select
            value={guide.status}
            onValueChange={(v) => v != null && updateField("status", v as Status)}
          >
            <SelectTrigger size="sm" className="w-32" aria-label="Statut">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Brouillon">Brouillon</SelectItem>
              <SelectItem value="Publié">Publié</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving
              ? <><Loader2Icon size={14} className="animate-spin" /> Enregistrement…</>
              : saved
              ? <><CheckIcon size={14} /> Enregistré</>
              : "Enregistrer"}
          </Button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 flex-col lg:flex-row gap-0 min-h-0">
        {/* Left: Metadata */}
        <div className="w-full lg:w-80 xl:w-96 shrink-0 border-b lg:border-b-0 lg:border-r overflow-y-auto">
          <div className="p-5 flex flex-col gap-5">
            <div>
              <h2 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wide">
                Métadonnées
              </h2>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="m-title" className="text-xs">Titre</Label>
                  <Input
                    id="m-title"
                    value={guide.title}
                    onChange={(e) => updateField("title", e.target.value)}
                    placeholder="Titre du guide"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="m-slug" className="text-xs">Slug</Label>
                  <Input
                    id="m-slug"
                    value={guide.slug}
                    onChange={(e) => updateField("slug", e.target.value)}
                    className="font-mono text-sm"
                    placeholder="mon-guide"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="m-cat" className="text-xs">Catégorie</Label>
                  <Select value={guide.category} onValueChange={(v) => v != null && updateField("category", v)}>
                    <SelectTrigger id="m-cat" aria-label="Catégorie">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="m-cat-href" className="text-xs">Lien catégorie (categoryHref)</Label>
                  <Input
                    id="m-cat-href"
                    value={guide.categoryHref}
                    onChange={(e) => updateField("categoryHref", e.target.value)}
                    placeholder="/assurance-transport/taxi/"
                    className="font-mono text-sm"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs">Image de la carte</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <span className="inline-flex text-muted-foreground hover:text-foreground transition-colors cursor-default">
                            <HelpCircleIcon size={13} />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-[200px] text-center leading-relaxed">
                          <p className="font-semibold">Dimensions recommandées</p>
                          <p>800 × 500 px — ratio 8:5</p>
                          <p className="text-muted-foreground">Minimum : 560 × 350 px</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  {guide.imageUrl && (
                    <div className="w-full rounded-lg overflow-hidden border bg-muted aspect-[8/5]">
                      <img
                        src={guide.imageUrl}
                        alt="Aperçu"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-fit"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploading
                      ? <><Loader2Icon size={14} className="animate-spin" /> Upload…</>
                      : guide.imageUrl ? "Changer l'image" : "Choisir une image"}
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h2 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wide">
                Article hero
              </h2>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="m-intro" className="text-xs">Introduction</Label>
                  <Textarea
                    id="m-intro"
                    value={guide.intro}
                    onChange={(e) => updateField("intro", e.target.value)}
                    placeholder="Phrase d'accroche de l'article…"
                    className="resize-none min-h-[80px] text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="m-author" className="text-xs">Auteur</Label>
                  <Input
                    id="m-author"
                    value={guide.authorName}
                    onChange={(e) => updateField("authorName", e.target.value)}
                    placeholder="Loubna Moucharref"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="m-editor" className="text-xs">Éditeur</Label>
                  <Input
                    id="m-editor"
                    value={guide.editorName}
                    onChange={(e) => updateField("editorName", e.target.value)}
                    placeholder="Anna Swartz"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="m-reviewer" className="text-xs">Expert vérificateur</Label>
                  <Input
                    id="m-reviewer"
                    value={guide.reviewerName}
                    onChange={(e) => updateField("reviewerName", e.target.value)}
                    placeholder="Fabio Faschi, PLCS…"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="m-date" className="text-xs">Date de mise à jour</Label>
                  <Input
                    id="m-date"
                    value={guide.updatedDate}
                    onChange={(e) => updateField("updatedDate", e.target.value)}
                    placeholder="22 juillet 2026"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="m-rt" className="text-xs">Temps de lecture</Label>
                  <Input
                    id="m-rt"
                    value={guide.readingTime}
                    onChange={(e) => updateField("readingTime", e.target.value)}
                    placeholder="4 minutes"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Block editor */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 flex flex-col gap-4 max-w-3xl mx-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Contenu — {guide.blocks.length} bloc{guide.blocks.length !== 1 ? "s" : ""}
              </h2>
            </div>

            {guide.blocks.length === 0 && (
              <div className="border-2 border-dashed border-muted rounded-xl py-16 flex flex-col items-center gap-3 text-muted-foreground">
                <p className="text-sm">Aucun bloc. Ajoutez-en un ci-dessous.</p>
              </div>
            )}

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={guide.blocks.map((b) => b.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col gap-3">
                  {guide.blocks.map((block) => (
                    <SortableBlock
                      key={block.id}
                      block={block}
                      onUpdate={updateBlock}
                      onDelete={deleteBlock}
                      onItemAdd={addItem}
                      onItemUpdate={updateItem}
                      onItemDelete={deleteItem}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {/* Add block buttons */}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => addBlock("section")}>
                <PlusIcon size={14} />
                Section
              </Button>
              <Button variant="outline" size="sm" onClick={() => addBlock("accent-card")}>
                <PlusIcon size={14} />
                Accent card
              </Button>
              <Button variant="outline" size="sm" onClick={() => addBlock("paragraph")}>
                <PlusIcon size={14} />
                Paragraphe
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
