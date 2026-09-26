"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { Field, FieldLabel, FieldTitle } from "@/components/ui/field"
import { FileTextIcon, Loader2Icon } from "lucide-react"
import { getAccount, type AccountType, type AdminAccountDetail } from "@/lib/api"
import { STATUS_LABELS } from "@/components/leads/garage-lead-fields"

const TYPE_LABELS: Record<AccountType, string> = {
  client: "Client",
  partenaire: "Partenaire",
}

const TYPE_BADGE_CLASS: Record<AccountType, string> = {
  client: "bg-blue-100 text-blue-700",
  partenaire: "bg-purple-100 text-purple-700",
}

const STATUS_BADGE_CLASS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-amber-100 text-amber-700",
  qualified: "bg-purple-100 text-purple-700",
  converted: "bg-green-100 text-green-700",
  lost: "bg-gray-100 text-gray-500",
}

const PROVIDER_LABELS: Record<string, string> = {
  google: "Google",
  apple: "Apple",
  facebook: "Facebook",
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
}

export default function CompteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [account, setAccount] = useState<AdminAccountDetail | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    getAccount(Number(id))
      .then(setAccount)
      .catch((err) => setError(err instanceof Error ? err.message : "Compte introuvable."))
  }, [id])

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-vertical:h-4 data-vertical:self-auto" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard">Tableau de bord</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard/comptes">Comptes</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>{account?.name ?? "…"}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0 max-w-3xl">
        {error && <p className="text-sm text-destructive">{error}</p>}

        {!account && !error && (
          <div className="text-sm text-muted-foreground">
            <Loader2Icon className="inline animate-spin mr-2" size={16} />
            Chargement…
          </div>
        )}

        {account && (
          <>
            <div className="rounded-xl border p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4">
                <h1 className="text-lg font-semibold">{account.name}</h1>
                <Badge className={`border-transparent ${TYPE_BADGE_CLASS[account.type]}`}>
                  {TYPE_LABELS[account.type]}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel className="font-normal text-muted-foreground">Email</FieldLabel>
                  <FieldTitle>{account.email}</FieldTitle>
                </Field>
                <Field>
                  <FieldLabel className="font-normal text-muted-foreground">Connexion</FieldLabel>
                  <FieldTitle>{account.oauth_provider ? PROVIDER_LABELS[account.oauth_provider] ?? account.oauth_provider : "Mot de passe"}</FieldTitle>
                </Field>
                <Field>
                  <FieldLabel className="font-normal text-muted-foreground">Statut</FieldLabel>
                  <FieldTitle>{account.active ? "Actif" : "Désactivé"}</FieldTitle>
                </Field>
                <Field>
                  <FieldLabel className="font-normal text-muted-foreground">Inscrit le</FieldLabel>
                  <FieldTitle>{formatDate(account.created_at)}</FieldTitle>
                </Field>
                {account.type === "partenaire" && (
                  <Field>
                    <FieldLabel className="font-normal text-muted-foreground">Code de parrainage</FieldLabel>
                    <FieldTitle className="font-mono">{account.referral_code}</FieldTitle>
                  </Field>
                )}
              </div>
            </div>

            {account.type === "client" && (
              <div className="rounded-xl border p-5 flex flex-col gap-4">
                <h2 className="text-sm font-semibold">Demandes de devis ({account.leads.length})</h2>
                {account.leads.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                    <FileTextIcon size={20} />
                    <p className="text-sm">Aucune demande de devis pour le moment.</p>
                  </div>
                ) : (
                  <div className="flex flex-col divide-y">
                    {account.leads.map((lead) => (
                      <div
                        key={lead.id}
                        className="flex items-center justify-between gap-4 py-3 cursor-pointer"
                        onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                      >
                        <div>
                          <p className="text-sm font-medium">{lead.type}</p>
                          <p className="text-xs text-muted-foreground">Envoyée le {formatDate(lead.created_at)}</p>
                        </div>
                        <Badge className={`border-transparent ${STATUS_BADGE_CLASS[lead.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {STATUS_LABELS[lead.status] ?? lead.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
