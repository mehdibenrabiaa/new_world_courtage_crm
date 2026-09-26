"use client"

import { useEffect, useState } from "react"
import { TabsContent } from "@/components/ui/tabs"
import { Loader2Icon, HistoryIcon } from "lucide-react"
import { getLeadActivity, type LeadActivity, type LeadStatus } from "@/lib/api"
import { STATUS_LABELS } from "@/components/leads/garage-lead-fields"

const FIELD_LABELS: Record<string, string> = {
  status: "Statut",
  name: "Nom",
  phone: "Téléphone",
  email: "Email",
  type: "Catégorie",
  immat: "Immatriculation",
  naissance: "Date de naissance",
  permis: "Date de permis",
  siret: "SIRET",
  activite: "Activité",
  deal_value: "Valeur estimée",
  assigned_to: "Assigné à",
}

function formatValue(field: string | null, value: string | null): string {
  if (value === null || value === "") return "—"
  if (field === "status" && value in STATUS_LABELS) return STATUS_LABELS[value as LeadStatus]
  if (field === "deal_value") {
    const n = Number(value)
    return Number.isFinite(n) ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n) : value
  }
  return value
}

function summarize(entry: LeadActivity): string {
  switch (entry.action) {
    case "created":
      return "Lead créé"
    case "deleted":
      return "Lead supprimé"
    case "duplicate_detected":
    case "unassigned":
    case "call_booked":
    case "call_reallocated":
      return entry.description ?? entry.action
    case "reassigned":
      return `Assigné à : ${formatValue(null, entry.old_value) === "—" ? "personne" : entry.old_value} → ${entry.new_value}`
    case "field_changed": {
      const label = entry.field ? FIELD_LABELS[entry.field] ?? entry.field : "Champ"
      return `${label} : ${formatValue(entry.field, entry.old_value)} → ${formatValue(entry.field, entry.new_value)}`
    }
    case "note_added":
      return "Note ajoutée"
    case "note_deleted":
      return "Note supprimée"
    case "task_added":
      return entry.description ? `Tâche ajoutée : ${entry.description}` : "Tâche ajoutée"
    case "task_completed":
      return entry.description ? `Tâche terminée : ${entry.description}` : "Tâche terminée"
    case "task_deleted":
      return entry.description ? `Tâche supprimée : ${entry.description}` : "Tâche supprimée"
    case "document_uploaded":
      return entry.description ? `Document ajouté : ${entry.description}` : "Document ajouté"
    default:
      return entry.description ?? entry.action
  }
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

// A single, chronological, actor-attributed feed of everything that's
// happened to this lead — status/field changes, notes/tasks/documents
// being added, calls being booked or reallocated — instead of piecing that
// history together by eye across three separate tabs.
export function LeadActivityTab({ leadId, value = "activite" }: { leadId: number; value?: string }) {
  const [activity, setActivity] = useState<LeadActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getLeadActivity(leadId)
      .then((data) => { if (!cancelled) setActivity(data) })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [leadId])

  return (
    <TabsContent value={value} className="rounded-xl border p-5 flex flex-col gap-4 md:flex-1 md:min-h-0 md:overflow-y-auto">
      {loading ? (
        <div className="flex items-center justify-center text-muted-foreground gap-2 py-10">
          <Loader2Icon size={16} className="animate-spin" />
          <span className="text-sm">Chargement…</span>
        </div>
      ) : activity.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
          <HistoryIcon size={22} />
          <p className="text-sm">Aucune activité pour le moment.</p>
        </div>
      ) : (
        <ol className="flex flex-col gap-4">
          {activity.map((entry) => (
            <li key={entry.id} className="flex gap-3">
              <div className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
              <div className="flex flex-col gap-0.5">
                <p className="text-sm">{summarize(entry)}</p>
                <p className="text-xs text-muted-foreground">
                  {entry.actor_name ?? "Système"} · {formatDateTime(entry.created_at)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </TabsContent>
  )
}
