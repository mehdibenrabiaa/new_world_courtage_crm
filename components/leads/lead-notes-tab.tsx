"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { TabsContent } from "@/components/ui/tabs"
import { useToastManager } from "@/components/ui/toast"
import { Loader2Icon, PlusIcon, XIcon } from "lucide-react"
import { createLeadNote, updateLeadNote, deleteLeadNote, type LeadNote, type NoteColor } from "@/lib/api"
import { cn } from "@/lib/utils"

const NOTE_COLORS: NoteColor[] = ["yellow", "pink", "blue", "green", "purple", "orange"]

const NOTE_CARD_STYLES: Record<NoteColor, string> = {
  yellow: "bg-yellow-100 border-yellow-200/80",
  pink: "bg-pink-100 border-pink-200/80",
  blue: "bg-blue-100 border-blue-200/80",
  green: "bg-green-100 border-green-200/80",
  purple: "bg-purple-100 border-purple-200/80",
  orange: "bg-orange-100 border-orange-200/80",
}

const NOTE_SWATCH_STYLES: Record<NoteColor, string> = {
  yellow: "bg-yellow-300",
  pink: "bg-pink-300",
  blue: "bg-blue-300",
  green: "bg-green-300",
  purple: "bg-purple-300",
  orange: "bg-orange-300",
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

// Self-contained sticky-notes board for a lead — DB-backed, own state, own
// API calls. Drop it into any questionnaire-type detail view as-is; it only
// needs the lead id and its initial notes.
export function LeadNotesTab({ leadId, initialNotes, value = "notes" }: { leadId: number; initialNotes: LeadNote[]; value?: string }) {
  const toastManager = useToastManager()
  const [notes, setNotes] = useState<LeadNote[]>(initialNotes)
  const [newNoteContent, setNewNoteContent] = useState("")
  const [addingNote, setAddingNote] = useState(false)

  async function handleAddNote() {
    if (!newNoteContent.trim()) return
    setAddingNote(true)
    try {
      const note = await createLeadNote(leadId, { content: newNoteContent.trim() })
      setNotes((prev) => [note, ...prev])
      setNewNoteContent("")
    } catch (err) {
      console.error(err)
      toastManager.add({ title: "Impossible d'ajouter la note", type: "error" })
    } finally {
      setAddingNote(false)
    }
  }

  function handleNoteContentChange(noteId: number, content: string) {
    setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, content } : n)))
  }

  async function handleNoteContentBlur(noteId: number, content: string) {
    try {
      await updateLeadNote(noteId, { content })
    } catch (err) {
      console.error(err)
      toastManager.add({ title: "Impossible d'enregistrer la note", type: "error" })
    }
  }

  async function handleNoteColorChange(noteId: number, color: NoteColor) {
    const previous = notes
    setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, color } : n)))
    try {
      await updateLeadNote(noteId, { color })
    } catch (err) {
      console.error(err)
      setNotes(previous)
      toastManager.add({ title: "Impossible de changer la couleur", type: "error" })
    }
  }

  async function handleDeleteNote(noteId: number) {
    const previous = notes
    setNotes((prev) => prev.filter((n) => n.id !== noteId))
    try {
      await deleteLeadNote(noteId)
    } catch (err) {
      console.error(err)
      setNotes(previous)
      toastManager.add({ title: "Impossible de supprimer la note", type: "error" })
    }
  }

  return (
    <TabsContent value={value} className="flex flex-col gap-4">
      <div className="rounded-xl border p-4 flex flex-col gap-2">
        <Label htmlFor="l-new-note">Nouvelle note</Label>
        <div className="flex gap-2">
          <Textarea
            id="l-new-note"
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            placeholder="Écrire une note…"
            className="resize-none min-h-[60px]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAddNote()
            }}
          />
          <Button onClick={handleAddNote} disabled={!newNoteContent.trim() || addingNote} className="self-end">
            {addingNote ? <Loader2Icon size={14} className="animate-spin" /> : <PlusIcon />}
            Ajouter
          </Button>
        </div>
      </div>

      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune note pour ce lead.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map((note, i) => (
            <div
              key={note.id}
              className={cn(
                "flex flex-col gap-2 rounded-sm border p-3 shadow-md transition-transform hover:rotate-0 hover:z-10",
                NOTE_CARD_STYLES[note.color],
                i % 2 === 0 ? "rotate-1" : "-rotate-1"
              )}
            >
              <Textarea
                value={note.content}
                onChange={(e) => handleNoteContentChange(note.id, e.target.value)}
                onBlur={(e) => handleNoteContentBlur(note.id, e.target.value)}
                className="resize-none min-h-[100px] border-none bg-transparent p-0 text-sm shadow-none focus-visible:ring-0 dark:bg-transparent"
              />
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-foreground/60">{formatDateTime(note.created_at)}</span>
                <div className="flex items-center gap-1">
                  {NOTE_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={c}
                      onClick={() => handleNoteColorChange(note.id, c)}
                      className={cn(
                        "size-3.5 rounded-full border border-black/10",
                        NOTE_SWATCH_STYLES[c],
                        note.color === c && "ring-2 ring-offset-1 ring-foreground/50"
                      )}
                    />
                  ))}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-1 size-6 text-foreground/60 hover:text-destructive"
                    onClick={() => handleDeleteNote(note.id)}
                  >
                    <XIcon className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </TabsContent>
  )
}
