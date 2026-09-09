const TOKEN_KEY = "nwc_crm_token"

const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000").replace(/\/+$/, "")

export type UserRole = "superadmin" | "admin" | "supervisor" | "consultant"
export type PermissionResource = "leads" | "contacts" | "guides" | "authors" | "media" | "questionnaires"
export type PermissionAction = "view" | "create" | "edit" | "delete"

export type CurrentUser = {
  id: number
  name: string
  email: string
  role: UserRole
  active: boolean
  created_at: string
  // resource -> allowed actions. A superadmin's is pre-expanded to every
  // action on every resource by the backend, so UI code never needs a
  // separate "or is superadmin" branch — just check permissions.
  permissions: Record<PermissionResource, PermissionAction[]>
}

export function can(user: CurrentUser | null, resource: PermissionResource, action: PermissionAction): boolean {
  return !!user?.permissions?.[resource]?.includes(action)
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(TOKEN_KEY)
}

function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

// Every CRM data call (lib/api.ts, lib/*-store.ts) goes through this instead
// of calling fetch() directly — it attaches the bearer token, and on a 401
// (missing/expired/invalid session) it clears the stale token and sends the
// user back to /login instead of leaving every call site to handle that
// itself.
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken()
  const headers = new Headers(init.headers)
  if (token) headers.set("Authorization", `Bearer ${token}`)
  const res = await fetch(input, { ...init, headers })
  if (res.status === 401 && typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    clearToken()
    window.location.href = "/login"
  }
  return res
}

export async function login(email: string, password: string): Promise<CurrentUser> {
  const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.detail || "Connexion impossible.")
  }
  const data = await res.json()
  setToken(data.access_token)
  return data.user
}

// Returns null (rather than throwing) both when there's no token at all and
// when the backend rejects it — either way the caller's answer is the same:
// "not logged in".
export async function fetchCurrentUser(): Promise<CurrentUser | null> {
  if (!getToken()) return null
  const res = await authFetch(`${BACKEND_URL}/api/auth/me`)
  if (!res.ok) return null
  return res.json()
}

export function logout() {
  clearToken()
  if (typeof window !== "undefined") window.location.href = "/login"
}
