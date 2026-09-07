"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { TabsContent } from "@/components/ui/tabs"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogClose,
} from "@/components/ui/dialog"
import { useToastManager } from "@/components/ui/toast"
import {
  Loader2Icon, PlusIcon, XIcon, CalendarClockIcon, AlertTriangleIcon,
  PhoneCallIcon, MailIcon, FileTextIcon, BellRingIcon, PaperclipIcon, CalendarIcon,
  SearchCheckIcon, ListTodoIcon,
} from "lucide-react"
import { createLeadTask, updateLeadTask, deleteLeadTask, type LeadTask } from "@/lib/api"
import { cn } from "@/lib/utils"

const TASK_ACTIONS = [
  "Rappeler le client",
  "Envoyer un email",
  "Envoyer un devis",
  "Relancer le client",
  "Demander des documents",
  "Planifier un rendez-vous",
  "Vérifier le dossier",
  "Autre",
] as const

const TASK_ACTION_ICONS: Record<string, typeof PhoneCallIcon> = {
  "Rappeler le client": PhoneCallIcon,
  "Envoyer un email": MailIcon,
  "Envoyer un devis": FileTextIcon,
  "Relancer le client": BellRingIcon,
  "Demander des documents": PaperclipIcon,
  "Planifier un rendez-vous": CalendarIcon,
  "Vérifier le dossier": SearchCheckIcon,
}

function isOverdue(isoDate: string) {
  if (!isoDate) return false
  const today = new Date().toISOString().slice(0, 10)
  return isoDate < today
}

// Self-contained tasks board for a lead — DB-backed, own state, own API
// calls. Drop it into any questionnaire-type detail view as-is; it only
// needs the lead id and its initial tasks.
export function LeadTasksTab({ leadId, initialTasks, value = "taches" }: { leadId: number; initialTasks: LeadTask[]; value?: string }) {
  const toastManager = useToastManager()
  const [tasks, setTasks] = useState<LeadTask[]>(initialTasks)
  const [newTaskComment, setNewTaskComment] = useState("")
  const [newTaskAction, setNewTaskAction] = useState("")
  const [newTaskDueDate, setNewTaskDueDate] = useState("")
  const [addingTask, setAddingTask] = useState(false)
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)

  async function handleAddTask() {
    if (!newTaskComment.trim() || !newTaskAction.trim() || !newTaskDueDate) return
    setAddingTask(true)
    try {
      const task = await createLeadTask(leadId, {
        comment: newTaskComment.trim(),
        action: newTaskAction.trim(),
        due_date: newTaskDueDate,
      })
      setTasks((prev) => [...prev, task])
      setNewTaskComment("")
      setNewTaskAction("")
      setNewTaskDueDate("")
      setTaskDialogOpen(false)
    } catch (err) {
      console.error(err)
      toastManager.add({ title: "Impossible d'ajouter la tâche", type: "error" })
    } finally {
      setAddingTask(false)
    }
  }

  function handleTaskFieldChange(taskId: number, field: "comment" | "action" | "due_date", value: string) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, [field]: value } : t)))
  }

  async function handleTaskFieldSave(taskId: number, field: "comment" | "action" | "due_date", value: string) {
    try {
      await updateLeadTask(taskId, { [field]: value })
    } catch (err) {
      console.error(err)
      toastManager.add({ title: "Impossible d'enregistrer la tâche", type: "error" })
    }
  }

  async function handleToggleComplete(taskId: number, completed: boolean) {
    const previous = tasks
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, completed } : t)))
    try {
      await updateLeadTask(taskId, { completed })
    } catch (err) {
      console.error(err)
      setTasks(previous)
      toastManager.add({ title: "Impossible de mettre à jour la tâche", type: "error" })
    }
  }

  async function handleDeleteTask(taskId: number) {
    const previous = tasks
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
    try {
      await deleteLeadTask(taskId)
    } catch (err) {
      console.error(err)
      setTasks(previous)
      toastManager.add({ title: "Impossible de supprimer la tâche", type: "error" })
    }
  }

  return (
    <TabsContent value={value} className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
          <DialogTrigger render={<Button />}>
            <PlusIcon />
            Ajouter une tâche
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Nouvelle tâche</DialogTitle>
              <DialogDescription>Ajouter une tâche liée à ce lead.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="t-comment">Commentaire</Label>
                <Textarea
                  id="t-comment"
                  value={newTaskComment}
                  onChange={(e) => setNewTaskComment(e.target.value)}
                  placeholder="Contexte de la tâche…"
                  className="resize-y min-h-[60px]"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="t-action">Action requise</Label>
                <Select value={newTaskAction} onValueChange={(v) => v != null && setNewTaskAction(v)}>
                  <SelectTrigger id="t-action" className="w-full">
                    <SelectValue placeholder="Sélectionner une action" />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_ACTIONS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="t-due">Date d&apos;échéance</Label>
                <Input id="t-due" type="date" value={newTaskDueDate} onChange={(e) => setNewTaskDueDate(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>Annuler</DialogClose>
              <Button
                onClick={handleAddTask}
                disabled={!newTaskComment.trim() || !newTaskAction.trim() || !newTaskDueDate || addingTask}
              >
                {addingTask ? <Loader2Icon size={14} className="animate-spin" /> : <PlusIcon />}
                Ajouter
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune tâche pour ce lead.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {[...tasks].sort((a, b) => a.due_date.localeCompare(b.due_date)).map((task) => {
            const overdue = !task.completed && isOverdue(task.due_date)
            const ActionIcon = TASK_ACTION_ICONS[task.action] ?? ListTodoIcon
            return (
              <div
                key={task.id}
                className={cn(
                  "rounded-xl border p-4 flex flex-col gap-3 shadow-sm transition-shadow hover:shadow-md",
                  overdue && "border-destructive/40 bg-destructive/[0.03]",
                  task.completed && "bg-muted/40 opacity-60 hover:shadow-sm"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Checkbox
                      checked={task.completed}
                      disabled={task.completed}
                      onCheckedChange={(checked) => handleToggleComplete(task.id, checked === true)}
                      aria-label="Marquer comme terminée"
                    />
                    <div
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-full",
                        overdue ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                      )}
                    >
                      <ActionIcon className="size-4" />
                    </div>
                    <Select
                      value={task.action}
                      disabled={task.completed}
                      onValueChange={(v) => {
                        if (v == null) return
                        handleTaskFieldChange(task.id, "action", v)
                        handleTaskFieldSave(task.id, "action", v)
                      }}
                    >
                      <SelectTrigger className={cn("h-8 border-none bg-transparent px-1.5 font-semibold shadow-none hover:bg-accent", task.completed && "line-through")}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TASK_ACTIONS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {task.completed && <Badge variant="secondary" className="text-[10px]">Terminée</Badge>}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0 text-foreground/50 hover:text-destructive"
                    onClick={() => handleDeleteTask(task.id)}
                  >
                    <XIcon className="size-3.5" />
                  </Button>
                </div>

                <Textarea
                  value={task.comment}
                  disabled={task.completed}
                  onChange={(e) => handleTaskFieldChange(task.id, "comment", e.target.value)}
                  onBlur={(e) => handleTaskFieldSave(task.id, "comment", e.target.value)}
                  className={cn("resize-y min-h-[44px] border-none bg-transparent p-0 text-sm shadow-none focus-visible:ring-0 disabled:opacity-100", task.completed && "line-through")}
                />

                <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                  <div className={cn("flex items-center gap-1.5 text-xs", overdue ? "text-destructive font-medium" : "text-muted-foreground")}>
                    <CalendarClockIcon className="size-3.5" />
                    <Input
                      type="date"
                      value={task.due_date}
                      disabled={task.completed}
                      onChange={(e) => handleTaskFieldChange(task.id, "due_date", e.target.value)}
                      onBlur={(e) => handleTaskFieldSave(task.id, "due_date", e.target.value)}
                      className={cn("h-7 w-auto border-none bg-transparent p-0 text-xs shadow-none focus-visible:ring-0 disabled:opacity-100", overdue && "text-destructive")}
                    />
                  </div>
                  {overdue && (
                    <Badge variant="destructive" className="gap-1 text-[10px]">
                      <AlertTriangleIcon className="size-3" />
                      En retard
                    </Badge>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </TabsContent>
  )
}
