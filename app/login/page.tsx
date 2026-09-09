"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
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
        <div className="mb-6 flex flex-col items-center gap-4 text-center">
          <img src="/nwc_logo.svg" alt="New World Courtage" className="h-9 w-auto" />
          <Separator className="w-full my-2" />
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <FieldGroup>
            <Field data-invalid={!!error}>
              <FieldLabel htmlFor="email">Email</FieldLabel>
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
            </Field>
            <Field data-invalid={!!error}>
              <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <FieldError errors={error ? [{ message: error }] : []} />
            </Field>

            <Button type="submit" size="lg" disabled={loading} className="gap-2">
              {loading ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  Connexion…
                </>
              ) : (
                "Se connecter"
              )}
            </Button>
          </FieldGroup>
        </form>
      </div>
    </div>
  )
}
