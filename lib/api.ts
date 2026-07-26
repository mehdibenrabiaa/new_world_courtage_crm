const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8001"

export type Option = {
  id: number
  label: string
  value: string
  order: number
}

export type Rule = {
  id: number
  question_id: number
  source_question_id: number
  operator: "equals" | "not_equals"
  value: string
  action: "skip"
}

export type Question = {
  id: number
  questionnaire_id: number
  key: string | null
  question: string
  section: string | null
  eyebrow: string | null
  type: "radio" | "select" | "input" | "checkbox"
  input_type: string | null
  placeholder: string | null
  hint: string | null
  required: boolean
  card: boolean
  uppercase: boolean
  option_cols: number | null
  order: number
  status: "draft" | "published"
  draft_of_id: number | null
  options: Option[]
  rules: Rule[]
}

export type Questionnaire = {
  id: number
  slug: string
  name: string
  questions: Question[]
}

export type QuestionInput = {
  key: string | null
  question: string
  section: string | null
  eyebrow: string | null
  type: string
  input_type: string | null
  placeholder: string | null
  hint: string | null
  required: boolean
  card: boolean
  uppercase: boolean
  option_cols: number | null
  order: number
  options: { label: string; value: string; order: number }[]
  rules: { source_question_id: number; operator: string; value: string; action: string }[]
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
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

export function createQuestion(slug: string, payload: QuestionInput) {
  return request<Question>(`/questionnaires/${slug}/questions`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export function updateQuestion(questionId: number, payload: QuestionInput) {
  return request<Question>(`/questionnaires/questions/${questionId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
}

export function deleteQuestion(questionId: number) {
  return request<void>(`/questionnaires/questions/${questionId}`, {
    method: "DELETE",
  })
}

export function publishQuestion(questionId: number) {
  return request<Question>(`/questionnaires/questions/${questionId}/publish`, {
    method: "POST",
  })
}

export function publishQuestionnaire(slug: string) {
  return request<Questionnaire>(`/questionnaires/${slug}/publish`, {
    method: "POST",
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

export type LeadStatus = "new" | "contacted" | "quote_sent" | "signed" | "lost"
export type LeadType = "taxi" | "ambulance" | "vtc" | "heavy_truck" | "body_shop" | "driving_school" | "car_dealership" | "construction" | "real_estate" | "other"

export type Lead = {
  id: number
  first_name: string
  last_name: string
  email: string
  phone: string
  lead_type: LeadType
  status: LeadStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export type LeadUpdate = Partial<Pick<Lead, "first_name" | "last_name" | "email" | "phone" | "lead_type" | "status" | "notes">>

export type Contact = {
  id: number
  name: string
  email: string
  phone: string | null
  message: string
  read: boolean
  created_at: string
}

export function listLeads() {
  return backendRequest<Lead[]>("/api/leads")
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
