"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { useToastManager } from "@/components/ui/toast"
import { Loader2Icon, AlertTriangleIcon, CalendarClockIcon, ListTodoIcon } from "lucide-react"
import { listAllTasks, listAssignableUsers, updateLeadTask, type LeadTaskWithLead, type LeadAssignee } from "@/lib/api"
import { useAuth } from "@/components/auth-provider"
import { cn } from "@/lib/utils"

function isOverdue(isoDate: string, completed: boolean) {
  if (completed || !isoDate) return false
  return isoDate < new Date().toISOString().slice(0, 10)
}

function formatDate(isoDate: string) {
  return new Date(isoDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
}

export default function TasksPage() {
  const { user: me } = useAuth()
  const toastManager = useToastManager()
  // The backend's assignable-users list is superadmin/admin-only (same
  // level as reassigning a lead) — a supervisor still sees every
  // consultant's tasks below, just without the "filter by person" picker.
  const canFilterByAssignee = me?.role === "superadmin" || me?.role === "admin"

  const [tasks, setTasks] = useState<LeadTaskWithLead[]>([])
  const [assignableUsers, setAssignableUsers] = useState<LeadAssignee[]>([])
  const [loading, setLoading] = useState(true)
  const [showCompleted, setShowCompleted] = useState(false)
  const [assigneeFilter, setAssigneeFilter] = useState<"Tous" | string>("Tous")
  const [togglingId, setTogglingId] = useState<number | null>(null)

  useEffect(() => {
    if (canFilterByAssignee) listAssignableUsers().then(setAssignableUsers).catch(console.error)
  }, [canFilterByAssignee])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listAllTasks({
      completed: showCompleted ? undefined : false,
      assignedToId: assigneeFilter !== "Tous" ? Number(assigneeFilter) : undefined,
    })
      .then((data) => { if (!cancelled) setTasks(data) })
      .catch((err) => {
        console.error(err)
        if (!cancelled) toastManager.add({ title: "Impossible de charger les tâches", type: "error" })
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCompleted, assigneeFilter])

  async function handleToggleComplete(task: LeadTaskWithLead) {
    setTogglingId(task.id)
    const previous = tasks
    setTasks((prev) => (
      task.completed || showCompleted
        ? prev.map((t) => (t.id === task.id ? { ...t, completed: !task.completed } : t))
        : prev.filter((t) => t.id !== task.id)
    ))
    try {
      await updateLeadTask(task.id, { completed: !task.completed })
    } catch (err) {
      console.error(err)
      setTasks(previous)
      toastManager.add({ title: "Impossible de mettre à jour la tâche", type: "error" })
    } finally {
      setTogglingId(null)
    }
  }

  const sorted = [...tasks].sort((a, b) => a.due_date.localeCompare(b.due_date))

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-vertical:h-4 data-vertical:self-auto" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Tâches</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <p className="text-sm text-muted-foreground">
          {canFilterByAssignee
            ? "Toutes les tâches, tous consultants confondus — filtrez par personne si besoin."
            : "Vos tâches, tous leads confondus."}
        </p>

        <div className="flex flex-wrap items-center gap-3">
          {canFilterByAssignee && (
            <Select value={assigneeFilter} onValueChange={(v) => v != null && setAssigneeFilter(v)}>
              <SelectTrigger className="w-48" aria-label="Filtrer par assigné">
                <SelectValue>
                  {(v: string) => (v === "Tous" ? "Tout le monde" : assignableUsers.find((u) => String(u.id) === v)?.name ?? v)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Tous">Tout le monde</SelectItem>
                {assignableUsers.map((u) => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <Checkbox checked={showCompleted} onCheckedChange={(checked) => setShowCompleted(checked === true)} />
            Afficher les tâches terminées
          </label>
        </div>

        {loading ? (
          <div className="flex items-center justify-center text-muted-foreground gap-2 py-16">
            <Loader2Icon size={18} className="animate-spin" />
            <span className="text-sm">Chargement…</span>
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
            <ListTodoIcon size={24} />
            <p className="text-sm">Aucune tâche{showCompleted ? "" : " en attente"}.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sorted.map((task) => {
              const overdue = isOverdue(task.due_date, task.completed)
              return (
                <div
                  key={task.id}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3",
                    overdue && "border-destructive/40 bg-destructive/[0.03]",
                    task.completed && "opacity-60",
                  )}
                >
                  <Checkbox
                    checked={task.completed}
                    disabled={togglingId === task.id}
                    onCheckedChange={() => handleToggleComplete(task)}
                    aria-label="Marquer comme terminée"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium", task.completed && "line-through")}>{task.action}</p>
                    {task.comment && <p className="text-xs text-muted-foreground truncate">{task.comment}</p>}
                  </div>
                  <Link
                    href={`/dashboard/leads/${task.lead.id}?tab=taches`}
                    className="text-sm text-muted-foreground underline hover:text-foreground shrink-0"
                  >
                    {task.lead.name}
                  </Link>
                  {task.assigned_to && canFilterByAssignee && (
                    <span className="text-xs text-muted-foreground shrink-0">{task.assigned_to.name}</span>
                  )}
                  <div className={cn("flex items-center gap-1.5 text-xs shrink-0", overdue ? "text-destructive font-medium" : "text-muted-foreground")}>
                    <CalendarClockIcon size={13} />
                    {formatDate(task.due_date)}
                  </div>
                  {overdue && (
                    <Badge variant="destructive" className="gap-1 text-[10px] shrink-0">
                      <AlertTriangleIcon size={11} />
                      En retard
                    </Badge>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
