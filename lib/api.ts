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

// Uploaded via the public site's Finalisation/booking step (see
// CarInsuranceForm.js's BookingPanel) — file_url points at a randomly
// named file on disk (collision- and path-traversal-proof), but
// original_filename is the name to actually show, since that's what the
// person who uploaded it recognizes.
export type LeadDocument = {
  id: number
  lead_id: number
  document_label: string
  original_filename: string
  content_type: string | null
  size_bytes: number
  file_url: string
  created_at: string
}

export type LeadDuplicate = { id: number; name: string }

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
  // Estimated/actual premium — optional, powers the dashboard's pipeline
  // and converted-value KPIs (see /api/leads/stats).
  deal_value: number | null
  // Set server-side at creation if another lead already shared this
  // phone/email — a flag for a human to check, not something that ever
  // blocked the submission (see the backend's _find_duplicate).
  duplicate_of: LeadDuplicate | null
  assigned_to: LeadAssignee | null
  sticky_notes: LeadNote[]
  tasks: LeadTask[]
  answers: LeadAnswer[]
  documents: LeadDocument[]
  created_at: string
  updated_at: string
}

export type LeadUpdate = Partial<Pick<Lead, "status" | "name" | "phone" | "email" | "type" | "immat" | "naissance" | "permis" | "siret" | "activite" | "deal_value">> &
  // Reassign (only takes effect for a superadmin/admin caller — the
  // backend 403s anyone else) or explicitly clear the assignee.
  Partial<{ assigned_to_id: number; unassign: boolean }>

export type LeadCreate = Pick<Lead, "type" | "name" | "phone"> &
  Partial<Pick<Lead, "email" | "immat" | "naissance" | "permis" | "siret" | "activite" | "source" | "deal_value">> &
  // Set by the CRM's own create-lead flow only — a consultant creating a
  // lead auto-assigns it to themselves (see app/dashboard/leads/page.tsx),
  // otherwise omitted so it's unassigned like every public submission.
  Partial<{ assigned_to_id: number }> &
  Partial<{ answers: Pick<LeadAnswer, "catalog_key" | "question" | "value">[] }>

// One entry in a lead's unified activity timeline (see LeadActivity in the
// backend's models.py) — replaces "compare timestamps across three
// separate tables" with a single, actor-attributed, chronological log.
export type LeadActivity = {
  id: number
  actor_name: string | null
  action: string
  field: string | null
  old_value: string | null
  new_value: string | null
  description: string | null
  created_at: string
}

export function getLeadActivity(leadId: number) {
  return backendRequest<LeadActivity[]>(`/api/leads/${leadId}/activity`)
}

export type ConsultantStat = {
  consultant_id: number
  name: string
  total_leads: number
  converted_leads: number
  conversion_rate: number
  total_value: number
  converted_value: number
}

export type LeadStats = {
  total_leads: number
  by_status: Record<LeadStatus, number>
  conversion_rate: number
  total_pipeline_value: number
  converted_value: number
  unread_contacts: number
  by_consultant: ConsultantStat[]
}

export function getLeadStats() {
  return backendRequest<LeadStats>("/api/leads/stats")
}

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

// ── Public-site accounts (Espace Client / Espace Partenaire) ────────────────
//
// Read-only view onto the Account table the public site's own
// connexion/inscription flow writes to — entirely separate from this CRM's
// own User accounts (see the backend's app/routers/crm_accounts.py).

export type AccountType = "client" | "partenaire"

export type AdminAccount = {
  id: number
  name: string
  email: string
  type: AccountType
  referral_code: string | null
  active: boolean
  oauth_provider: "google" | "apple" | "facebook" | null
  leads_count: number
  created_at: string
}

export type AdminAccountLead = {
  id: number
  type: LeadType
  status: LeadStatus
  created_at: string
}

export type AdminAccountDetail = AdminAccount & { leads: AdminAccountLead[] }

export type AccountsPage = { accounts: AdminAccount[]; total: number }

// Same server-side pagination pattern as listLeadsPage above.
export async function listAccountsPage(params: {
  page: number
  pageSize: number
  type?: AccountType
  search?: string
}): Promise<AccountsPage> {
  const url = new URL(`${BACKEND_URL}/api/crm-accounts/`)
  if (params.type) url.searchParams.set("type", params.type)
  if (params.search) url.searchParams.set("search", params.search)
  url.searchParams.set("skip", String((params.page - 1) * params.pageSize))
  url.searchParams.set("limit", String(params.pageSize))
  const { data, headers } = await backendRequestWithHeaders<AdminAccount[]>(url.pathname + url.search)
  const total = Number(headers.get("X-Total-Count") ?? data.length)
  return { accounts: data, total }
}

export function getAccount(id: number) {
  return backendRequest<AdminAccountDetail>(`/api/crm-accounts/${id}`)
}

// The published, ordered questions for a questionnaire (e.g. "garage") —
// used to group/sort a lead's saved answers the same way the public site's
// form presents them (by section, in section/question order).
export type PublishedQuestionOption = { label: string; value: string }

export type PublishedQuestion = {
  id: number
  key: string
  section: string | null
  // A colored band header grouping a run of consecutive questions within a
  // section (e.g. "Sinistralité (36 derniers mois)") — same field the
  // public site's CarInsuranceForm.js groups by (groupFieldsByEyebrow).
  eyebrow: string | null
  question: string
  order: number
  type: string
  input_type: string | null
  unit: string | null
  // Card-style (grid of selectable boxes) vs plain inline radio/checkbox
  // list — matches the public form's own s.card flag exactly.
  card: boolean
  options: PublishedQuestionOption[]
  // Restricts this question to whichever product(s) it belongs to (null =
  // shown regardless) — the public form groups fields by this into
  // separately-headed blocks (see groupFieldsByProduct).
  products: string[] | null
  // Shown on its own screen before the step-by-step wizard begins, not one
  // of its sections — a questionnaire's product-picker question is usually
  // the one with this set (see the CRM's resolveProductLabels).
  gate: boolean
}

export function fetchQuestionnaireQuestions(slug: string) {
  return backendRequest<PublishedQuestion[]>(`/questionnaires/${slug}/questions`)
}

// What GET /api/leads/ actually returns — the backend deliberately leaves
// out answers/sticky_notes/tasks (and the vehicle/business detail fields)
// here, since listing leads doesn't need them and including them would mean
// lazy-loading three relationships per row. Fetch a single lead (getLead)
// for the full Lead shape.
export type LeadListItem = Pick<Lead, "id" | "type" | "status" | "name" | "phone" | "email" | "deal_value" | "duplicate_of" | "assigned_to" | "created_at">

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

// ── Consultants (booking pool + their own calendar) ─────────────────────────
//
// A "consultant" is just a User with role === "consultant" — there's no
// separate consultant profile/table anymore (see app/main.py's one-time
// migration that folded the old standalone Consultant table into Users).
// listConsultants() below returns the same shape as listUsers(), filtered
// to that role.

export type ConsultantUnavailability = {
  id: number
  consultant_id: number
  date: string // YYYY-MM-DD
  time: string | null // HH:MM, or null for the whole day blocked
  created_at: string
}

// A real, already-confirmed appointment — read-only from the calendar
// editor's point of view (there's no "unbook" action, unlike a manual
// block), shown so a consultant/manager sees their actual schedule.
export type ConsultantBooking = {
  id: number
  date: string
  time: string
  // null once the lead itself has been deleted (the FK sets it null rather
  // than deleting the booking) — lead_name then reads null too.
  lead_id: number | null
  lead_name: string | null
  created_at: string
}

// Requires the "consultants" permission's "view" action — see the
// Permissions page. Returns every User with role === "consultant".
export function listConsultants() {
  return backendRequest<ManagedUser[]>("/api/consultants")
}

// `month` is "YYYY-MM" — the calendar UI only ever needs one month at a time.
export function listConsultantUnavailabilities(consultantId: number, month: string) {
  return backendRequest<ConsultantUnavailability[]>(`/api/consultants/${consultantId}/unavailabilities?month=${month}`)
}

export function listConsultantBookings(consultantId: number, month: string) {
  return backendRequest<ConsultantBooking[]>(`/api/consultants/${consultantId}/bookings?month=${month}`)
}

export type ConsultantBookingWithConsultant = ConsultantBooking & {
  consultant: { id: number; name: string }
}

// Backs the "Rendez-vous" sidebar section — whoever has the "consultants"
// view permission (admin/superadmin by default) gets every consultant's
// bookings for that month, optionally narrowed via consultantId; a plain
// consultant only ever gets their own regardless of that filter (enforced
// server-side).
export function listAllBookings(month: string, consultantId?: number) {
  const url = new URL(`${BACKEND_URL}/api/consultants/bookings`)
  url.searchParams.set("month", month)
  if (consultantId != null) url.searchParams.set("consultant_id", String(consultantId))
  return backendRequest<ConsultantBookingWithConsultant[]>(url.pathname + url.search)
}

// Moves a confirmed appointment to a different consultant — gated by the
// "consultants" permission's "edit" action on the backend (see the
// Permissions page), not self-service: it also affects a second
// consultant's schedule, so it isn't something the booked consultant can
// do to themselves by just owning the calendar.
export function reallocateBooking(consultantId: number, bookingId: number, newConsultantId: number) {
  return backendRequest<ConsultantBooking>(`/api/consultants/${consultantId}/bookings/${bookingId}/reallocate`, {
    method: "PATCH",
    body: JSON.stringify({ new_consultant_id: newConsultantId }),
  })
}

// `time: null` blocks the whole day.
export function blockConsultantTimeframe(consultantId: number, payload: { date: string; time?: string | null }) {
  return backendRequest<ConsultantUnavailability>(`/api/consultants/${consultantId}/unavailabilities`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export function unblockConsultantTimeframe(consultantId: number, unavailabilityId: number) {
  return backendRequest<void>(`/api/consultants/${consultantId}/unavailabilities/${unavailabilityId}`, {
    method: "DELETE",
  })
}

export function createLead(payload: LeadCreate) {
  return backendRequest<Lead>("/api/leads/", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

// Superadmin-only (see the backend route) — creates `count` fake
// "Assurance Garage" leads with realistic catalog-shaped answers, for
// exercising the CRM's own views without hand-filling the public form or
// this "Nouveau lead" dialog repeatedly.
export function generateTestData(count: number) {
  return backendRequest<{ created: number; ids: number[] }>(`/api/leads/generate-test-data?count=${count}`, {
    method: "POST",
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

// Goes through the authenticated download route (not the raw file_url,
// which is an unauthenticated static path and — worse — serves the file
// under its on-disk random name) so the file saves locally under the name
// it was actually uploaded with.
export async function downloadLeadDocument(leadId: number, documentId: number, filename: string) {
  const res = await authFetch(`${BACKEND_URL}/api/leads/${leadId}/documents/${documentId}/download`)
  if (!res.ok) throw new Error(`Failed to download document (${res.status})`)
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = window.document.createElement("a")
  a.href = url
  a.download = filename
  window.document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
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

// A task plus just enough about its lead to show in a cross-lead list —
// backs the "Tâches" sidebar section (app/dashboard/tasks/page.tsx).
export type LeadTaskWithLead = LeadTask & {
  lead: { id: number; name: string }
  assigned_to: LeadAssignee | null
}

// A consultant only ever gets tasks on their own leads (enforced
// server-side); anyone else gets every consultant's, optionally narrowed
// to one via assignedToId — that's how an admin sees "all the
// consultants' tasks" instead of just their own.
export function listAllTasks(params?: { completed?: boolean; assignedToId?: number }) {
  const url = new URL(`${BACKEND_URL}/api/leads/tasks`)
  if (params?.completed != null) url.searchParams.set("completed", String(params.completed))
  if (params?.assignedToId != null) url.searchParams.set("assigned_to_id", String(params.assignedToId))
  return backendRequest<LeadTaskWithLead[]>(url.pathname + url.search)
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

// ── Notifications ───────────────────────────────────────────────────────────

export type Notification = {
  id: number
  type: string
  message: string
  link: string | null
  read: boolean
  created_at: string
}

export function listNotifications() {
  return backendRequest<Notification[]>("/api/notifications/")
}

export function getUnreadNotificationCount() {
  return backendRequest<{ count: number }>("/api/notifications/unread-count")
}

export function markNotificationRead(id: number) {
  return backendRequest<Notification>(`/api/notifications/${id}/read`, { method: "PATCH" })
}

export function markAllNotificationsRead() {
  return backendRequest<void>("/api/notifications/read-all", { method: "PATCH" })
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

// "Force logout" — revokes every refresh token this user currently holds
// (every device/browser they're logged in on), without touching their
// password or account status. Their access token already in flight stays
// valid for at most ~30 minutes (see the backend's ACCESS_TOKEN_TTL).
export function revokeUserSessions(id: number) {
  return backendRequest<void>(`/api/users/${id}/revoke-sessions`, { method: "POST" })
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
