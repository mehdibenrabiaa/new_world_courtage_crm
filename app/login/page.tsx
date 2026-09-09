"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2Icon } from "lucide-react"
import { getToken, login } from "@/lib/auth"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Already logged in? Skip straight to the dashboard instead of showing
  // the form again.
  useEffect(() => {
    if (getToken()) router.replace("/dashboard")
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) {
      setError("Merci de renseigner votre email et votre mot de passe.")
      return
    }
    setError(null)
    setLoading(true)
    try {
      await login(email, password)
      router.replace("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-background p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <img src="/nwc_logo.svg" alt="New World Courtage" className="h-8 w-auto" />
          <h1 className="text-lg font-semibold">Connexion au CRM</h1>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" size="lg" disabled={loading} className="mt-2 gap-2">
            {loading && <Loader2Icon className="size-4 animate-spin" />}
            Se connecter
          </Button>
        </form>
      </div>
    </div>
  )
}
