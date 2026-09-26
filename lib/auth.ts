import { logger } from "@/lib/logger"

const TOKEN_KEY = "nwc_crm_token"
const REFRESH_TOKEN_KEY = "nwc_crm_refresh_token"

const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000").replace(/\/+$/, "")

export type UserRole = "superadmin" | "admin" | "supervisor" | "consultant"
// Questionnaires deliberately aren't here — editing them is superadmin-only
// on the backend, not a permission any role can be granted (see
// new_world_courtage_backend's routers/questionnaires.py).
export type PermissionResource = "leads" | "contacts" | "guides" | "authors" | "media" | "consultants"
export type PermissionAction = "view" | "create" | "edit" | "delete"

export type CurrentUser = {
  id: number
  name: string
  username: string
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

// "Remember me" decides which storage the tokens land in: localStorage
// survives closing the browser, sessionStorage clears when the tab does.
// Checked on every read since either could hold them depending on what the
// user picked at login.
export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY)
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(REFRESH_TOKEN_KEY) ?? sessionStorage.getItem(REFRESH_TOKEN_KEY)
}

// Whichever storage currently holds a token is where "remember" landed at
// login — read back here so a token refresh keeps writing to the same
// place instead of guessing.
function rememberedInLocalStorage(): boolean {
  return typeof window !== "undefined" && !!localStorage.getItem(REFRESH_TOKEN_KEY)
}

function setTokens(accessToken: string, refreshToken: string, remember: boolean) {
  const storage = remember ? localStorage : sessionStorage
  const other = remember ? sessionStorage : localStorage
  storage.setItem(TOKEN_KEY, accessToken)
  storage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  other.removeItem(TOKEN_KEY)
  other.removeItem(REFRESH_TOKEN_KEY)
}

function clearTokens() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(REFRESH_TOKEN_KEY)
}

// Access tokens are short-lived (30 min — see the backend's auth.py) by
// design, so a 401 doesn't necessarily mean "logged out": it usually just
// means "needs a refresh". Concurrent 401s (several calls in flight at
// once) must share one refresh attempt — the refresh token rotates on
// every use, so two independent calls would have the second one fail as a
// reuse of an already-rotated token and wrongly kill the session.
let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise
  refreshPromise = (async () => {
    const refreshToken = getRefreshToken()
    if (!refreshToken) return null
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })
      if (!res.ok) return null
      const data = await res.json()
      setTokens(data.access_token, data.refresh_token, rememberedInLocalStorage())
      return data.access_token as string
    } catch (err) {
      logger.warn("Silent token refresh failed", { error: String(err) })
      return null
    }
  })()
  try {
    return await refreshPromise
  } finally {
    refreshPromise = null
  }
}

// Every CRM data call (lib/api.ts, lib/*-store.ts) goes through this instead
// of calling fetch() directly — it attaches the bearer token, and on a 401
// tries exactly one silent refresh-and-retry before giving up. Only a 401
// that survives a refresh attempt (refresh token itself missing/expired/
// revoked) actually clears the session and sends the user back to /login.
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const attempt = async (): Promise<Response> => {
    const token = getToken()
    const headers = new Headers(init.headers)
    if (token) headers.set("Authorization", `Bearer ${token}`)
    return fetch(input, { ...init, headers })
  }

  let res = await attempt()
  if (res.status === 401 && getRefreshToken()) {
    const newAccessToken = await refreshAccessToken()
    if (newAccessToken) {
      res = await attempt()
    }
  }
  if (res.status === 401 && typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    clearTokens()
    window.location.href = "/login"
  }
  return res
}

export async function login(username: string, password: string, remember: boolean): Promise<CurrentUser> {
  const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.detail || "Connexion impossible.")
  }
  const data = await res.json()
  setTokens(data.access_token, data.refresh_token, remember)
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
  const refreshToken = getRefreshToken()
  if (refreshToken) {
    // Best-effort — revokes the session server-side so a copy of this
    // refresh token (an old device, a stolen laptop) stops working too.
    // Not awaited: the user shouldn't wait on a network call just to log
    // out, and the redirect below happens regardless of the outcome.
    fetch(`${BACKEND_URL}/api/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      keepalive: true,
    }).catch(() => {})
  }
  clearTokens()
  if (typeof window !== "undefined") window.location.href = "/login"
}
