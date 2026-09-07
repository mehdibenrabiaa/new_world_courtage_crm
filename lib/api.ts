import type { Category } from "@/lib/categories"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.detail || `API error ${res.status} on ${path}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

// ── Backend API (leads + contacts) ────────────────────────────────────────────

async function backendRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.detail || `API error ${res.status} on ${path}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

// Matches app/models.py on the backend exactly — LeadStatus/LeadType enum
// values and Lead's field names are not guessable from convention (e.g. a
// single `name` field, not first/last; `type` not `lead_type`).
export type LeadStatus = "new" | "contacted" | "qualified" | "converted" | "lost"
// A lead's category — same wording as the guide categories (see lib/categories.ts).
export type LeadType = Category

export type LeadAnswer = {
  id: number
  catalog_key: string
  question: string
  value: string
}

export type NoteColor = "yellow" | "pink" | "blue" | "green" | "purple" | "orange"

export type LeadNote = {
  id: number
  content: string
  color: NoteColor
  created_at: string
}

export type LeadTask = {
  id: number
  comment: string
  action: string
  due_date: string
  completed: boolean
  created_at: string
}

export type Lead = {
  id: number
  type: LeadType
  status: LeadStatus
  name: string
  phone: string
  email: string | null
  immat: string | null
  naissance: string | null
  permis: string | null
  siret: string | null
  activite: string | null
  source: string | null
  sticky_notes: LeadNote[]
  tasks: LeadTask[]
  answers: LeadAnswer[]
  created_at: string
  updated_at: string
}

export type LeadUpdate = Partial<Pick<Lead, "status" | "name" | "phone" | "email" | "type" | "immat" | "naissance" | "permis" | "siret" | "activite">>

export type LeadCreate = Pick<Lead, "type" | "name" | "phone"> &
  Partial<Pick<Lead, "email" | "immat" | "naissance" | "permis" | "siret" | "activite" | "source">> &
  Partial<{ answers: Pick<LeadAnswer, "catalog_key" | "question" | "value">[] }>

export type Contact = {
  id: number
  name: string
  email: string
  phone: string | null
  message: string
  read: boolean
  created_at: string
}

// A snapshot taken when the lead was created — kept in its own table so it
// survives even if the lead is later deleted (lead_id then reads null).
export type LeadContact = {
  id: number
  lead_id: number | null
  lead_deleted: boolean
  name: string
  phone: string
  email: string | null
  address: string | null
  created_at: string
}

export function listLeadContacts() {
  return backendRequest<LeadContact[]>("/api/leads/contacts")
}

// The published, ordered questions for a questionnaire (e.g. "garage") —
// used to group/sort a lead's saved answers the same way the public site's
// form presents them (by section, in section/question order).
export type PublishedQuestion = {
  id: number
  key: string
  section: string | null
  question: string
  order: number
  type: string
  input_type: string | null
  unit: string | null
}

export function fetchQuestionnaireQuestions(slug: string) {
  return backendRequest<PublishedQuestion[]>(`/questionnaires/${slug}/questions`)
}

export function listLeads(params?: { status?: LeadStatus; limit?: number }) {
  const url = new URL(`${BACKEND_URL}/api/leads/`)
  if (params?.status) url.searchParams.set("status", params.status)
  url.searchParams.set("limit", String(params?.limit ?? 200))
  return backendRequest<Lead[]>(url.pathname + url.search)
}

export function createLead(payload: LeadCreate) {
  return backendRequest<Lead>("/api/leads/", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export function getLead(id: number) {
  return backendRequest<Lead>(`/api/leads/${id}`)
}

export function updateLead(id: number, payload: LeadUpdate) {
  return backendRequest<Lead>(`/api/leads/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
}

export function deleteLead(id: number) {
  return backendRequest<void>(`/api/leads/${id}`, { method: "DELETE" })
}

export function createLeadNote(leadId: number, payload: { content: string; color?: NoteColor }) {
  return backendRequest<LeadNote>(`/api/leads/${leadId}/notes`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export function updateLeadNote(noteId: number, payload: Partial<Pick<LeadNote, "content" | "color">>) {
  return backendRequest<LeadNote>(`/api/leads/notes/${noteId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
}

export function deleteLeadNote(noteId: number) {
  return backendRequest<void>(`/api/leads/notes/${noteId}`, { method: "DELETE" })
}

export function createLeadTask(leadId: number, payload: { comment: string; action: string; due_date: string }) {
  return backendRequest<LeadTask>(`/api/leads/${leadId}/tasks`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export function updateLeadTask(taskId: number, payload: Partial<Pick<LeadTask, "comment" | "action" | "due_date" | "completed">>) {
  return backendRequest<LeadTask>(`/api/leads/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
}

export function deleteLeadTask(taskId: number) {
  return backendRequest<void>(`/api/leads/tasks/${taskId}`, { method: "DELETE" })
}

export function listContacts() {
  return backendRequest<Contact[]>("/api/contacts")
}

export function markContactRead(id: number) {
  return backendRequest<Contact>(`/api/contacts/${id}/read`, { method: "PATCH" })
}

export function deleteContact(id: number) {
  return backendRequest<void>(`/api/contacts/${id}`, { method: "DELETE" })
}
