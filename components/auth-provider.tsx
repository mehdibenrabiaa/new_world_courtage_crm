"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { fetchCurrentUser, type CurrentUser } from "@/lib/auth"

const AuthContext = createContext<{ user: CurrentUser | null }>({ user: null })

export function useAuth() {
  return useContext(AuthContext)
}

// Gates every /dashboard route: checks the stored token against the backend
// on mount, redirects to /login if it's missing/invalid, and otherwise
// exposes the real logged-in user (replacing the sidebar's old hardcoded
// placeholder). Renders nothing until that check resolves, so the dashboard
// shell never flashes before an unauthenticated redirect.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchCurrentUser().then((u) => {
      if (cancelled) return
      if (!u) {
        router.replace("/login")
        return
      }
      setUser(u)
      setChecked(true)
    })
    return () => {
      cancelled = true
    }
  }, [router])

  if (!checked) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center text-sm text-muted-foreground">
        Chargement…
      </div>
    )
  }

  return <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>
}
