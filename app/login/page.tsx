"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import { Loader2Icon, EyeIcon, EyeOffIcon } from "lucide-react"
import { getToken, login } from "@/lib/auth"

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Already logged in? Skip straight to the dashboard instead of showing
  // the form again.
  useEffect(() => {
    if (getToken()) router.replace("/dashboard")
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim() || !password) {
      setError("Merci de renseigner votre nom d'utilisateur et votre mot de passe.")
      return
    }
    setError(null)
    setLoading(true)
    try {
      await login(username.trim(), password, remember)
      router.replace("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible.")
    } finally {
      setLoading(false)
    }
  }

  // Same split layout as the public site's login pages (AuthLayout): the
  // form in a white column, a brand-blue panel beside it on desktop.
  return (
    <div className="flex min-h-screen w-full flex-col bg-white lg:flex-row">
      <main className="flex w-full flex-col px-6 py-8 sm:px-10 lg:w-[480px] lg:shrink-0 lg:px-12">
        <img src="/nwc-logo.svg" alt="New World Courtage" className="h-10 w-fit" />

        <div className="my-auto flex flex-col gap-8 py-12">
          <div className="flex flex-col gap-2">
            <h1 className="heading-font text-[32px] leading-[1.1] text-foreground">
              Espace <em>conseillers</em>.
            </h1>
            <p className="text-[15px] text-muted-foreground">Connectez-vous pour accéder au CRM.</p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <FieldGroup>
              <Field data-invalid={!!error}>
                <FieldLabel htmlFor="username">Nom d&apos;utilisateur</FieldLabel>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </Field>
              <Field data-invalid={!!error}>
                <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      type="button"
                      tabIndex={-1}
                      aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                      onClick={() => setShowPassword((s) => !s)}
                    >
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
                <FieldError errors={error ? [{ message: error }] : []} />
              </Field>

              <label className="flex items-center gap-2 text-sm text-muted-foreground select-none">
                <Checkbox checked={remember} onCheckedChange={() => setRemember((r) => !r)} />
                Se souvenir de moi
              </label>

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

        <p className="text-[13px] text-muted-foreground">© {new Date().getFullYear()} New World Courtage</p>
      </main>

      <aside className="relative hidden flex-1 flex-col justify-end bg-[var(--brand)] p-14 text-white lg:flex">
        <div className="flex max-w-xl flex-col gap-4">
          <span className="w-fit bg-white px-2 py-1 text-[12px] font-bold tracking-wider text-[var(--brand)]">CRM</span>
          <p className="heading-font text-[44px] leading-[1.05]">
            Leads, guides et rendez-vous, <em>au même endroit.</em>
          </p>
          <p className="max-w-md text-[15px] leading-relaxed text-white/80">
            Suivez les demandes de devis du site, publiez les guides et organisez les rappels de vos clients.
          </p>
        </div>
      </aside>
    </div>
  )
}
