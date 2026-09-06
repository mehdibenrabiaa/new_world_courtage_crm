import type { Category } from "@/lib/categories"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

export type CatalogOption = {
  label: string
  value: string
}

// A question's identity (key/type/options) is fixed in the backend's
// app/question_catalog.py — the CRM can only include/exclude a catalog entry
// in a questionnaire and override its wording (see Question below).
export type CatalogEntry = {
  key: string
  section: string | null
  eyebrow: string | null
  type: "radio" | "select" | "input" | "checkbox"
  input_type: string | null
  question: string
  hint: string | null
  placeholder: string | null
  required: boolean
  card: boolean
  options: CatalogOption[]
}

export type Question = {
  id: number
  questionnaire_id: number
  catalog_key: string
  key: string
  section: string | null
  eyebrow: string | null
  type: "radio" | "select" | "input" | "checkbox"
  input_type: string | null
  question: string
  hint: string | null
  placeholder: string | null
  required: boolean
  card: boolean
  order: number
  options: CatalogOption[]
  orphaned: boolean
}

export type Questionnaire = {
  id: number
  slug: string
  name: string
  questions: Question[]
}

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

export function listQuestionnaires() {
  return request<Questionnaire[]>("/questionnaires")
}

export function getQuestionnaire(slug: string) {
  return request<Questionnaire>(`/questionnaires/${slug}`)
}

export function createQuestionnaire(slug: string, name: string) {
  return request<Questionnaire>("/questionnaires", {
    method: "POST",
    body: JSON.stringify({ slug, name }),
  })
}

export function updateQuestionnaire(slug: string, payload: { slug?: string; name?: string }) {
  return request<Questionnaire>(`/questionnaires/${slug}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
}

export function listAvailableCatalogEntries(slug: string) {
  return request<CatalogEntry[]>(`/questionnaires/${slug}/catalog`)
}

export function addQuestion(slug: string, catalogKey: string, order: number) {
  return request<Question>(`/questionnaires/${slug}/questions`, {
    method: "POST",
    body: JSON.stringify({ catalog_key: catalogKey, order }),
  })
}

export function updateQuestionWording(
  questionId: number,
  payload: { question?: string; hint?: string; placeholder?: string; order?: number }
) {
  return request<Question>(`/questionnaires/questions/${questionId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
}

export function removeQuestion(questionId: number) {
  return request<void>(`/questionnaires/questions/${questionId}`, {
    method: "DELETE",
  })
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
  notes: string | null
  answers: LeadAnswer[]
  created_at: string
  updated_at: string
}

export type LeadUpdate = Partial<Pick<Lead, "status" | "name" | "phone" | "email" | "type" | "immat" | "naissance" | "permis" | "siret" | "activite" | "notes">>

export type LeadCreate = Pick<Lead, "type" | "name" | "phone"> &
  Partial<Pick<Lead, "email" | "immat" | "naissance" | "permis" | "siret" | "activite" | "source" | "notes">> &
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

export function listContacts() {
  return backendRequest<Contact[]>("/api/contacts")
}

export function markContactRead(id: number) {
  return backendRequest<Contact>(`/api/contacts/${id}/read`, { method: "PATCH" })
}

export function deleteContact(id: number) {
  return backendRequest<void>(`/api/contacts/${id}`, { method: "DELETE" })
}
