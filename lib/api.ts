import type { Category } from "@/lib/categories"
import { authFetch, type UserRole, type PermissionResource, type PermissionAction } from "@/lib/auth"

// Trailing slash stripped so a production env var set with one doesn't
// double up with the leading "/" on every call below.
const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000").replace(/\/+$/, "")

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await authFetch(`${BACKEND_URL}${path}`, {
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

// Same as backendRequest, but also hands back the raw Response so a caller
// can read a header off it (e.g. X-Total-Count for paginated lists).
async function backendRequestWithHeaders<T>(path: string, init?: RequestInit): Promise<{ data: T; headers: Headers }> {
  const res = await authFetch(`${BACKEND_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.detail || `API error ${res.status} on ${path}`)
  }
  const data = res.status === 204 ? (undefined as T) : await res.json()
  return { data, headers: res.headers }
}

// ── Backend API (leads + contacts) ────────────────────────────────────────────

async function backendRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await authFetch(`${BACKEND_URL}${path}`, {
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

export type LeadAssignee = { id: number; name: string; email: string }

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
  assigned_to: LeadAssignee | null
  sticky_notes: LeadNote[]
  tasks: LeadTask[]
  answers: LeadAnswer[]
  created_at: string
  updated_at: string
}

export type LeadUpdate = Partial<Pick<Lead, "status" | "name" | "phone" | "email" | "type" | "immat" | "naissance" | "permis" | "siret" | "activite">> &
  // Reassign (only takes effect for a superadmin/admin caller — the
  // backend 403s anyone else) or explicitly clear the assignee.
  Partial<{ assigned_to_id: number; unassign: boolean }>

export type LeadCreate = Pick<Lead, "type" | "name" | "phone"> &
  Partial<Pick<Lead, "email" | "immat" | "naissance" | "permis" | "siret" | "activite" | "source">> &
  // Set by the CRM's own create-lead flow only — a consultant creating a
  // lead auto-assigns it to themselves (see app/dashboard/leads/page.tsx),
  // otherwise omitted so it's unassigned like every public submission.
  Partial<{ assigned_to_id: number }> &
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

export function deleteLeadContact(id: number) {
  return backendRequest<void>(`/api/leads/contacts/${id}`, { method: "DELETE" })
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

// What GET /api/leads/ actually returns — the backend deliberately leaves
// out answers/sticky_notes/tasks (and the vehicle/business detail fields)
// here, since listing leads doesn't need them and including them would mean
// lazy-loading three relationships per row. Fetch a single lead (getLead)
// for the full Lead shape.
export type LeadListItem = Pick<Lead, "id" | "type" | "status" | "name" | "phone" | "email" | "assigned_to" | "created_at">

export function listLeads(params?: { status?: LeadStatus; assignedToId?: number; limit?: number }) {
  const url = new URL(`${BACKEND_URL}/api/leads/`)
  if (params?.status) url.searchParams.set("status", params.status)
  if (params?.assignedToId != null) url.searchParams.set("assigned_to_id", String(params.assignedToId))
  url.searchParams.set("limit", String(params?.limit ?? 200))
  return backendRequest<LeadListItem[]>(url.pathname + url.search)
}

export type LeadsPage = { leads: LeadListItem[]; total: number }

// Server-side paginated + filtered fetch for the leads table — unlike
// listLeads() above, this only ever pulls one page's worth of rows over the
// wire no matter how many leads exist, and reads the true match count off
// X-Total-Count instead of assuming everything fit in one response.
export async function listLeadsPage(params: {
  page: number
  pageSize: number
  status?: LeadStatus
  type?: LeadType
  assignedToId?: number
  unassigned?: boolean
  search?: string
}): Promise<LeadsPage> {
  const url = new URL(`${BACKEND_URL}/api/leads/`)
  if (params.status) url.searchParams.set("status", params.status)
  if (params.type) url.searchParams.set("type", params.type)
  if (params.unassigned) url.searchParams.set("unassigned", "true")
  else if (params.assignedToId != null) url.searchParams.set("assigned_to_id", String(params.assignedToId))
  if (params.search) url.searchParams.set("search", params.search)
  url.searchParams.set("skip", String((params.page - 1) * params.pageSize))
  url.searchParams.set("limit", String(params.pageSize))
  const { data, headers } = await backendRequestWithHeaders<LeadListItem[]>(url.pathname + url.search)
  const total = Number(headers.get("X-Total-Count") ?? data.length)
  return { leads: data, total }
}

// Who a lead can be handed to — superadmin/admin only, the backend 403s
// anyone else.
export function listAssignableUsers() {
  return backendRequest<LeadAssignee[]>("/api/leads/assignable-users")
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

// ── Users & permissions (superadmin only — the backend 403s anyone else) ──────

export type ManagedUser = {
  id: number
  name: string
  username: string
  email: string
  role: UserRole
  active: boolean
  created_at: string
}

export type UserCreatePayload = { name: string; username: string; email: string; password: string; role: UserRole }
export type UserUpdatePayload = Partial<{ name: string; username: string; role: UserRole; active: boolean; password: string }>

export function listUsers() {
  return backendRequest<ManagedUser[]>("/api/users/")
}

export function createUser(payload: UserCreatePayload) {
  return backendRequest<ManagedUser>("/api/users/", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export function updateUser(id: number, payload: UserUpdatePayload) {
  return backendRequest<ManagedUser>(`/api/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
}

export function deleteUser(id: number) {
  return backendRequest<void>(`/api/users/${id}`, { method: "DELETE" })
}

export type RolePermissionRow = {
  role: UserRole
  resource: PermissionResource
  action: PermissionAction
  allowed: boolean
}

export function listPermissions() {
  return backendRequest<RolePermissionRow[]>("/api/permissions/")
}

export function updatePermission(role: UserRole, resource: PermissionResource, action: PermissionAction, allowed: boolean) {
  return backendRequest<RolePermissionRow>(`/api/permissions/${role}/${resource}/${action}`, {
    method: "PATCH",
    body: JSON.stringify({ allowed }),
  })
}
