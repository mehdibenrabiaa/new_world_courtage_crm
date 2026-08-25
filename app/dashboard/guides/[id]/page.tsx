"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
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
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
  GripVerticalIcon, Trash2Icon, PlusIcon,
  CheckIcon, ChevronLeftIcon, Loader2Icon, HelpCircleIcon, CalendarIcon,
  CheckCircle2Icon, ChevronRightIcon,
} from "lucide-react"
import { articleSerif } from "@/lib/fonts"
import {
  getGuide, saveGuide, uploadGuideImage, uid,
  type Guide, type Block, type SectionBlock,
  type AccentCardBlock, type AccentCardItem, type ParagraphBlock,
  type CtaBlock, type BulletCardBlock, type BulletItem,
  type TableBlock,
  type Status,
} from "@/lib/guides-store"
import { getAuthors, type Author } from "@/lib/authors-store"
import { CATEGORIES } from "@/lib/categories"

const READING_TIME_OPTIONS = ["2 minutes", "3 minutes", "4 minutes", "5 minutes", "6 minutes", "8 minutes", "10 minutes"]

const MOIS_FR = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
]

function formatFrenchDate(date: Date) {
  return `${date.getDate()} ${MOIS_FR[date.getMonth()]} ${date.getFullYear()}`
}

function parseFrenchDate(str: string): Date | undefined {
  const match = str.trim().toLowerCase().match(/^(\d{1,2})\s+([a-zéûôîàè]+)\s+(\d{4})$/)
  if (!match) return undefined
  const day = parseInt(match[1], 10)
  const monthIndex = MOIS_FR.indexOf(match[2])
  const year = parseInt(match[3], 10)
  if (monthIndex === -1) return undefined
  return new Date(year, monthIndex, day)
}

// ─── Block editors ───────────────────────────────────────────────────────────
// Styled to match how each block actually renders on the live site
// (see ArticleSection.js / AccentCardGrid.js in new_world_courtage), so
// editing here looks like editing the real page instead of filling out a form.

function AutoGrowTextarea({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={1}
      className={cn(
        "w-full resize-none overflow-hidden bg-transparent outline-none placeholder:text-muted-foreground/50 placeholder:font-normal",
        className
      )}
    />
  )
}

function SectionEditor({
  block,
  onUpdate,
}: {
  block: SectionBlock
  onUpdate: (patch: Partial<SectionBlock>) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1 self-end">
        {([
          { value: "sans" as const, label: "Sans" },
          { value: "serif" as const, label: "Serif" },
        ]).map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onUpdate({ titleFont: opt.value })}
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide transition-colors",
              block.titleFont === opt.value
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:bg-muted-foreground/20"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <AutoGrowTextarea
        value={block.title}
        onChange={(title) => onUpdate({ title })}
        placeholder="Titre de la section…"
        className={cn(
          "text-[17px] sm:text-xl font-bold text-[var(--color-text)]",
          block.titleFont === "serif" && articleSerif.className
        )}
      />
      <AutoGrowTextarea
        value={block.content}
        onChange={(content) => onUpdate({ content })}
        placeholder="Contenu de la section…"
        className="text-[15px] text-gray-600 leading-relaxed"
      />
    </div>
  )
}

function CtaEditor({
  block,
  onUpdate,
}: {
  block: CtaBlock
  onUpdate: (patch: Partial<CtaBlock>) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="py-6 flex flex-col items-center text-center gap-5">
        <AutoGrowTextarea
          value={block.text}
          onChange={(text) => onUpdate({ text })}
          placeholder="Prêt à comparer les offres ?"
          className="w-full text-xl sm:text-2xl font-semibold text-[var(--color-text)] text-center"
        />
        {/* Same class composition as CtaButton.js (Button size="lg" + cta-btn overrides),
            so this preview resolves through twMerge to the exact classes the real button uses. */}
        <div
          className={cn(
            "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius)] text-sm font-medium transition-colors cursor-pointer",
            "bg-[var(--color-brand)] text-[var(--color-text)] shadow hover:bg-[var(--color-brand-hover)]",
            "h-10 px-8",
            "cta-btn text-white text-base font-normal py-[25px] px-[15px] shrink-0"
          )}
        >
          <input
            value={block.buttonLabel}
            onChange={(e) => onUpdate({ buttonLabel: e.target.value })}
            placeholder="Obtenir un devis"
            size={1}
            className="border-0 bg-transparent p-0 m-0 leading-none text-base font-normal text-white outline-none placeholder:text-white/60 [field-sizing:content]"
          />
          <ChevronRightIcon size={18} strokeWidth={2.5} className="text-white shrink-0" />
        </div>
      </div>
      <div className="flex items-center gap-1.5 px-1">
        <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">Lien</span>
        <span className="shrink-0 font-mono text-xs text-muted-foreground/50">www.newworldcourtage.fr/</span>
        <input
          value={block.href}
          onChange={(e) => onUpdate({ href: e.target.value.replace(/^\/+/, "") })}
          placeholder="assurance-transport/taxi/devis"
          className="flex-1 bg-transparent font-mono text-xs text-muted-foreground outline-none placeholder:text-muted-foreground/50"
        />
      </div>
    </div>
  )
}

function BulletCardEditor({
  block,
  onUpdate,
  onItemAdd,
  onItemUpdate,
  onItemDelete,
}: {
  block: BulletCardBlock
  onUpdate: (patch: Partial<BulletCardBlock>) => void
  onItemAdd: () => void
  onItemUpdate: (itemId: string, patch: Partial<BulletItem>) => void
  onItemDelete: (itemId: string) => void
}) {
  const showTopLine = block.topLine !== false

  return (
    <div className="overflow-hidden rounded-b-[var(--radius)]">
      {showTopLine && <div className="h-2 bg-[var(--color-brand)]" />}
      <div className="bg-[var(--color-light)] p-6 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <AutoGrowTextarea
            value={block.title}
            onChange={(title) => onUpdate({ title })}
            placeholder="Titre de la liste (optionnel)…"
            className="flex-1 text-[15px] font-semibold text-[var(--color-text)] leading-snug"
          />
          <label className="flex items-center gap-1.5 shrink-0 cursor-pointer select-none text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={showTopLine}
              onChange={(e) => onUpdate({ topLine: e.target.checked })}
              className="accent-[var(--color-brand)]"
            />
            Ligne du haut
          </label>
        </div>
        <ul className="flex flex-col gap-1.5">
          {block.items.map((item) => (
            <li key={item.id} className="group/item flex items-start gap-2">
              <span className="mt-2 size-1.5 rounded-full bg-gray-400 shrink-0" />
              <AutoGrowTextarea
                value={item.text}
                onChange={(text) => onItemUpdate(item.id, { text })}
                placeholder="Élément de la liste…"
                className="flex-1 text-[15px] text-gray-600 leading-relaxed"
              />
              {block.items.length > 1 && (
                <button
                  type="button"
                  onClick={() => onItemDelete(item.id)}
                  className="mt-0.5 shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover/item:opacity-100"
                  aria-label="Supprimer l'élément"
                >
                  <Trash2Icon size={12} />
                </button>
              )}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onItemAdd}
          className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <PlusIcon size={14} />
          Ajouter un élément
        </button>
      </div>
    </div>
  )
}

function TableEditor({
  block,
  onUpdate,
}: {
  block: TableBlock
  onUpdate: (patch: Partial<TableBlock>) => void
}) {
  function updateHeader(i: number, value: string) {
    onUpdate({ headers: block.headers.map((h, idx) => idx === i ? value : h) })
  }
  function updateCell(rowId: string, colIndex: number, value: string) {
    onUpdate({
      rows: block.rows.map((r) =>
        r.id === rowId ? { ...r, cells: r.cells.map((c, i) => i === colIndex ? value : c) } : r
      ),
    })
  }
  function addColumn() {
    onUpdate({
      headers: [...block.headers, ""],
      rows: block.rows.map((r) => ({ ...r, cells: [...r.cells, ""] })),
    })
  }
  function deleteColumn(i: number) {
    if (block.headers.length <= 1) return
    onUpdate({
      headers: block.headers.filter((_, idx) => idx !== i),
      rows: block.rows.map((r) => ({ ...r, cells: r.cells.filter((_, idx) => idx !== i) })),
    })
  }
  function addRow() {
    onUpdate({ rows: [...block.rows, { id: uid(), cells: block.headers.map(() => "") }] })
  }
  function deleteRow(rowId: string) {
    if (block.rows.length <= 1) return
    onUpdate({ rows: block.rows.filter((r) => r.id !== rowId) })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full border-collapse text-[15px]">
          <thead>
            <tr className="bg-[var(--color-brand)]">
              {block.headers.map((h, i) => (
                <th key={i} className="group/col relative p-3 text-left font-semibold text-white">
                  <input
                    value={h}
                    onChange={(e) => updateHeader(i, e.target.value)}
                    placeholder={`Colonne ${i + 1}`}
                    className="w-full min-w-[6ch] bg-transparent outline-none placeholder:text-white/60"
                  />
                  {block.headers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => deleteColumn(i)}
                      className="absolute -top-1.5 right-0.5 rounded-full bg-black/25 p-0.5 text-white opacity-0 transition-opacity group-hover/col:opacity-100"
                      aria-label="Supprimer la colonne"
                    >
                      <Trash2Icon size={10} />
                    </button>
                  )}
                </th>
              ))}
              <th className="w-8 p-1">
                <button
                  type="button"
                  onClick={addColumn}
                  className="flex size-6 items-center justify-center rounded text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Ajouter une colonne"
                >
                  <PlusIcon size={13} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row) => (
              <tr key={row.id} className="group/row border-t border-[var(--color-light)]">
                {row.cells.map((cell, i) => (
                  <td key={i} className="p-3">
                    <input
                      value={cell}
                      onChange={(e) => updateCell(row.id, i, e.target.value)}
                      placeholder="—"
                      className={cn(
                        "w-full min-w-[5ch] bg-transparent text-gray-600 outline-none tabular-nums placeholder:text-muted-foreground/40",
                        i === 0 && "font-medium text-[var(--color-text)]"
                      )}
                    />
                  </td>
                ))}
                <td className="w-8 p-1 text-center">
                  {block.rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => deleteRow(row.id)}
                      className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover/row:opacity-100"
                      aria-label="Supprimer la ligne"
                    >
                      <Trash2Icon size={12} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={addRow}
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <PlusIcon size={14} />
        Ajouter une ligne
      </button>
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
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <AutoGrowTextarea
          value={block.title}
          onChange={(title) => onUpdate({ title })}
          placeholder="Titre de section (optionnel)…"
          className="flex-1 text-xl font-bold text-[var(--color-text)]"
        />
        <div className="flex gap-1 shrink-0 pt-0.5">
          {([1, 2] as const).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onUpdate({ cols: n })}
              className={cn(
                "size-6 rounded text-xs font-medium transition-colors",
                block.cols === n
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-muted-foreground/20"
              )}
              aria-label={`${n} colonne${n > 1 ? "s" : ""}`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className={cn("grid grid-cols-1 gap-4", block.cols === 2 && "lg:grid-cols-2")}>
        {block.items.map((item) => (
          <div
            key={item.id}
            className="group/card relative overflow-hidden rounded-b-[var(--radius)] bg-[var(--color-light)]"
          >
            <div className="h-2 bg-[var(--color-brand)]" />
            <div className="p-6 flex flex-col gap-2">
              <AutoGrowTextarea
                value={item.heading}
                onChange={(heading) => onItemUpdate(item.id, { heading })}
                placeholder="En-tête de la carte…"
                className="text-[15px] font-semibold text-[var(--color-text)] leading-snug"
              />
              <AutoGrowTextarea
                value={item.body}
                onChange={(body) => onItemUpdate(item.id, { body })}
                placeholder="Corps de la carte…"
                className="text-[15px] text-gray-600 leading-relaxed"
              />
            </div>
            {block.items.length > 1 && (
              <button
                type="button"
                onClick={() => onItemDelete(item.id)}
                className="absolute top-2 right-2 rounded-full bg-black/15 p-1.5 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/30 group-hover/card:opacity-100"
                aria-label="Supprimer la carte"
              >
                <Trash2Icon size={12} />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={onItemAdd}
          className="flex min-h-[100px] items-center justify-center gap-1.5 rounded-b-[var(--radius)] border-2 border-dashed border-muted-foreground/25 text-sm text-muted-foreground transition-colors hover:border-muted-foreground/40 hover:text-foreground"
        >
          <PlusIcon size={14} />
          Ajouter une carte
        </button>
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
    <AutoGrowTextarea
      value={block.content}
      onChange={(content) => onUpdate({ content })}
      placeholder="Contenu du paragraphe…"
      className="text-[15px] text-gray-600 leading-relaxed"
    />
  )
}

// ─── Sortable block wrapper ───────────────────────────────────────────────────

const BLOCK_LABELS: Record<Block["type"], string> = {
  "section": "Section",
  "accent-card": "Accent card",
  "paragraph": "Paragraphe",
  "cta": "CTA",
  "bullet-card": "Liste à puces",
  "table": "Tableau",
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
      className={cn(
        "group/block relative rounded-lg px-2 -mx-2 py-1 transition-colors hover:bg-muted/30",
        isDragging && "opacity-50 shadow-lg ring-2 ring-primary/30 bg-card"
      )}
    >
      <div className="absolute -top-3 right-1 z-10 flex items-center gap-0.5 rounded-md border bg-popover px-1 py-0.5 opacity-0 shadow-sm transition-opacity group-hover/block:opacity-100">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab rounded p-1 text-muted-foreground hover:text-foreground touch-none"
          aria-label="Déplacer le bloc"
        >
          <GripVerticalIcon size={13} />
        </button>
        <span className="px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground select-none">
          {BLOCK_LABELS[block.type]}
        </span>
        <button
          onClick={() => onDelete(block.id)}
          className="rounded p-1 text-muted-foreground hover:text-destructive transition-colors"
          aria-label="Supprimer le bloc"
        >
          <Trash2Icon size={13} />
        </button>
      </div>

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
      {block.type === "cta" && (
        <CtaEditor block={block} onUpdate={(p) => onUpdate(block.id, p)} />
      )}
      {block.type === "bullet-card" && (
        <BulletCardEditor
          block={block}
          onUpdate={(p) => onUpdate(block.id, p)}
          onItemAdd={() => onItemAdd(block.id)}
          onItemUpdate={(itemId, p) => onItemUpdate(block.id, itemId, p)}
          onItemDelete={(itemId) => onItemDelete(block.id, itemId)}
        />
      )}
      {block.type === "table" && (
        <TableEditor block={block} onUpdate={(p) => onUpdate(block.id, p)} />
      )}
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
  const [authors, setAuthors] = useState<Author[]>([])
  const [authorCustom, setAuthorCustom] = useState(false)
  const [editorCustom, setEditorCustom] = useState(false)
  const [reviewerCustom, setReviewerCustom] = useState(false)
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

  useEffect(() => {
    getAuthors().then(setAuthors).catch(console.error)
  }, [])

  function selectAuthor(name: string) {
    const author = authors.find((a) => a.name === name)
    setGuide((prev) =>
      prev ? { ...prev, authorName: name, authorAvatar: author?.avatarUrl ?? "" } : prev
    )
  }

  function updateField<K extends keyof Guide>(key: K, value: Guide[K]) {
    setGuide((prev) => prev ? { ...prev, [key]: value } : prev)
  }

  function addBlock(type: Block["type"]) {
    let block: Block
    if (type === "section") {
      block = { id: uid(), type: "section", title: "", content: "", titleFont: "sans" }
    } else if (type === "accent-card") {
      block = { id: uid(), type: "accent-card", title: "", cols: 1, items: [{ id: uid(), heading: "", body: "" }] }
    } else if (type === "cta") {
      block = { id: uid(), type: "cta", text: "", buttonLabel: "Obtenir un devis", href: "contact" }
    } else if (type === "bullet-card") {
      block = { id: uid(), type: "bullet-card", title: "", topLine: true, items: [{ id: uid(), text: "" }] }
    } else if (type === "table") {
      block = {
        id: uid(), type: "table",
        headers: ["", ""],
        rows: [{ id: uid(), cells: ["", ""] }],
      }
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
          if (b.id !== blockId) return b
          if (b.type === "accent-card") return { ...b, items: [...b.items, { id: uid(), heading: "", body: "" }] }
          if (b.type === "bullet-card") return { ...b, items: [...b.items, { id: uid(), text: "" }] }
          return b
        }) as Block[],
      }
    })
  }

  function updateItem(blockId: string, itemId: string, patch: Partial<AccentCardItem> & Partial<BulletItem>) {
    setGuide((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        blocks: prev.blocks.map((b) => {
          if (b.id !== blockId) return b
          if (b.type === "accent-card") return { ...b, items: b.items.map((i) => i.id === itemId ? { ...i, ...patch } : i) }
          if (b.type === "bullet-card") return { ...b, items: b.items.map((i) => i.id === itemId ? { ...i, ...patch } : i) }
          return b
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
          if (b.id !== blockId) return b
          if (b.type === "accent-card") return { ...b, items: b.items.filter((i) => i.id !== itemId) }
          if (b.type === "bullet-card") return { ...b, items: b.items.filter((i) => i.id !== itemId) }
          return b
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

  const authorIsCustom = authorCustom || (Boolean(guide.authorName) && !authors.some((a) => a.name === guide.authorName))
  const editorIsCustom = editorCustom || (Boolean(guide.editorName) && !authors.some((a) => a.name === guide.editorName))
  const reviewerIsCustom = reviewerCustom || (Boolean(guide.reviewerName) && !authors.some((a) => a.name === guide.reviewerName))

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
            value={guide.status ?? "Brouillon"}
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
        {/* Left: Metadata — fields with no visual home on the page itself */}
        <div className="w-full lg:w-72 xl:w-80 shrink-0 border-b lg:border-b-0 lg:border-r overflow-y-auto">
          <div className="p-5 flex flex-col gap-5">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Métadonnées
                </h2>
                <Link href="/dashboard/authors" className="text-xs text-muted-foreground hover:text-foreground underline">
                  Gérer les auteurs
                </Link>
              </div>
              <div className="flex flex-col gap-4">
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
          </div>
        </div>

        {/* Right: Block editor — rendered in the site's own look */}
        <div className="site-preview flex-1 overflow-y-auto bg-white">
          <div className="p-5 pt-8 flex flex-col gap-8 max-w-4xl mx-auto">

            {/* Hero — mirrors ArticleHero.js on the live site */}
            <div className="flex flex-col gap-5">
              <Select value={guide.category ?? ""} onValueChange={(v) => v != null && updateField("category", v)}>
                <SelectTrigger
                  aria-label="Catégorie"
                  className="h-auto w-fit gap-1 rounded-none border-0 bg-transparent p-0 text-sm font-semibold text-gray-500 shadow-none hover:text-gray-700 [&_svg]:size-3.5"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>

              <AutoGrowTextarea
                value={guide.title}
                onChange={(title) => updateField("title", title)}
                placeholder="Titre du guide…"
                className={cn(
                  "text-[28px] sm:text-[36px] lg:text-[45px] leading-[1.15] text-[var(--color-text)] font-normal",
                  articleSerif.className
                )}
              />

              {/* Byline card */}
              <div className="bg-[var(--color-light)] rounded-xl p-6 flex flex-col gap-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Author */}
                  <div className="flex items-start gap-3 min-w-0">
                    <Avatar className="shrink-0">
                      <AvatarImage src={guide.authorAvatar} alt={guide.authorName} />
                      <AvatarFallback className="text-xs">
                        {guide.authorName ? guide.authorName.trim().slice(0, 1).toUpperCase() : "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-xs font-semibold text-[var(--color-text)]">Auteur</span>
                      {authorIsCustom ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            value={guide.authorName}
                            onChange={(e) => updateField("authorName", e.target.value)}
                            placeholder="Nom de l'auteur invité"
                            className="min-w-0 bg-transparent text-xs text-gray-600 underline outline-none placeholder:text-muted-foreground/60 placeholder:no-underline"
                          />
                          <button
                            type="button"
                            onClick={() => { setAuthorCustom(false); updateField("authorName", ""); updateField("authorAvatar", "") }}
                            className="shrink-0 text-[10px] text-muted-foreground hover:text-foreground"
                          >
                            Liste
                          </button>
                        </div>
                      ) : (
                        <Select
                          value={guide.authorName || ""}
                          onValueChange={(v) => {
                            if (v == null) return
                            if (v === "__custom__") {
                              setAuthorCustom(true)
                              updateField("authorName", "")
                              updateField("authorAvatar", "")
                            } else {
                              selectAuthor(v)
                            }
                          }}
                        >
                          <SelectTrigger aria-label="Auteur" className="h-auto w-fit max-w-full gap-1 rounded-none border-0 bg-transparent p-0 text-xs text-gray-600 underline shadow-none [&_svg]:size-3">
                            <SelectValue placeholder="Choisir…" />
                          </SelectTrigger>
                          <SelectContent>
                            {authors.map((a) => <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>)}
                            <SelectItem value="__custom__">+ Auteur invité…</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>

                  {/* Editor */}
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-xs font-semibold text-[var(--color-text)]">Édité par</span>
                    {editorIsCustom ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          value={guide.editorName}
                          onChange={(e) => updateField("editorName", e.target.value)}
                          placeholder="Nom de l'éditeur invité"
                          className="min-w-0 bg-transparent text-xs text-gray-600 underline outline-none placeholder:text-muted-foreground/60 placeholder:no-underline"
                        />
                        <button
                          type="button"
                          onClick={() => { setEditorCustom(false); updateField("editorName", "") }}
                          className="shrink-0 text-[10px] text-muted-foreground hover:text-foreground"
                        >
                          Liste
                        </button>
                      </div>
                    ) : (
                      <Select
                        value={guide.editorName || "__none__"}
                        onValueChange={(v) => {
                          if (v == null) return
                          if (v === "__custom__") { setEditorCustom(true); updateField("editorName", "") }
                          else updateField("editorName", v === "__none__" ? "" : v)
                        }}
                      >
                        <SelectTrigger aria-label="Éditeur" className="h-auto w-fit max-w-full gap-1 rounded-none border-0 bg-transparent p-0 text-xs text-gray-600 underline shadow-none [&_svg]:size-3">
                          <SelectValue placeholder="Aucun" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Aucun</SelectItem>
                          {authors.map((a) => <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>)}
                          <SelectItem value="__custom__">+ Invité…</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Reviewer */}
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-xs font-semibold text-[var(--color-text)]">Vérifié par</span>
                    {reviewerIsCustom ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          value={guide.reviewerName}
                          onChange={(e) => updateField("reviewerName", e.target.value)}
                          placeholder="Nom de l'expert invité"
                          className="min-w-0 bg-transparent text-xs text-gray-600 underline outline-none placeholder:text-muted-foreground/60 placeholder:no-underline"
                        />
                        <button
                          type="button"
                          onClick={() => { setReviewerCustom(false); updateField("reviewerName", "") }}
                          className="shrink-0 text-[10px] text-muted-foreground hover:text-foreground"
                        >
                          Liste
                        </button>
                      </div>
                    ) : (
                      <Select
                        value={guide.reviewerName || "__none__"}
                        onValueChange={(v) => {
                          if (v == null) return
                          if (v === "__custom__") { setReviewerCustom(true); updateField("reviewerName", "") }
                          else updateField("reviewerName", v === "__none__" ? "" : v)
                        }}
                      >
                        <SelectTrigger aria-label="Expert vérificateur" className="h-auto w-fit max-w-full gap-1 rounded-none border-0 bg-transparent p-0 text-xs text-gray-600 underline shadow-none [&_svg]:size-3">
                          <SelectValue placeholder="Aucun" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Aucun</SelectItem>
                          {authors.map((a) => <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>)}
                          <SelectItem value="__custom__">+ Invité…</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-[var(--color-text)]">Mis à jour</span>
                    <Popover>
                      <PopoverTrigger
                        render={<button type="button" className="w-fit text-left text-xs text-gray-600 hover:text-foreground" />}
                      >
                        {guide.updatedDate || "Sélectionner…"}
                      </PopoverTrigger>
                      <PopoverContent align="start">
                        <Calendar
                          selected={parseFrenchDate(guide.updatedDate)}
                          onSelect={(date) => updateField("updatedDate", formatFrenchDate(date))}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="hidden sm:block" aria-hidden="true" />
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-[var(--color-text)]">Temps de lecture</span>
                    <Select value={guide.readingTime || ""} onValueChange={(v) => v != null && updateField("readingTime", v)}>
                      <SelectTrigger aria-label="Temps de lecture" className="h-auto w-fit gap-1 rounded-none border-0 bg-transparent p-0 text-xs text-gray-600 shadow-none [&_svg]:size-3">
                        <SelectValue placeholder="Choisir…" />
                      </SelectTrigger>
                      <SelectContent>
                        {!READING_TIME_OPTIONS.includes(guide.readingTime) && guide.readingTime && (
                          <SelectItem value={guide.readingTime}>{guide.readingTime}</SelectItem>
                        )}
                        {READING_TIME_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {Boolean(guide.reviewerName) && (
                  <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-teal-50 text-teal-800 text-xs font-semibold px-3 py-1.5">
                    <CheckCircle2Icon size={14} />
                    Vérifié par un expert
                  </div>
                )}

                <p className="text-xs font-normal text-gray-500 leading-relaxed">
                  Le contenu publié par New World Courtage respecte des règles strictes d&apos;exactitude, de fiabilité et d&apos;intégrité éditoriale. Chaque information est vérifiée et mise à jour afin de fournir des contenus clairs, objectifs et conformes aux réglementations en vigueur.
                </p>
              </div>

              <AutoGrowTextarea
                value={guide.intro}
                onChange={(intro) => updateField("intro", intro)}
                placeholder="Phrase d'accroche de l'article…"
                className={cn(
                  "text-2xl sm:text-[28px] leading-[1.2] text-[var(--color-text)] text-justify",
                  articleSerif.className
                )}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between -mt-4">
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
                <div className="flex flex-col gap-8">
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
              <Button variant="outline" size="sm" onClick={() => addBlock("cta")}>
                <PlusIcon size={14} />
                CTA
              </Button>
              <Button variant="outline" size="sm" onClick={() => addBlock("bullet-card")}>
                <PlusIcon size={14} />
                Liste à puces
              </Button>
              <Button variant="outline" size="sm" onClick={() => addBlock("table")}>
                <PlusIcon size={14} />
                Tableau
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
