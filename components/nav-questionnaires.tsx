"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { ChevronRightIcon, ListChecksIcon, Loader2Icon, PlusIcon } from "lucide-react"
import { listQuestionnaires, createQuestionnaire, type Questionnaire } from "@/lib/api"

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

// The list of questionnaires is fetched dynamically (rather than hardcoded)
// so any new one added shows up here automatically. Creating one only sets
// up the data (slug/name); the site page that consumes it still needs to be
// built separately.
export function NavQuestionnaires() {
  const router = useRouter()
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [slugEdited, setSlugEdited] = useState(false)
  const [formError, setFormError] = useState("")

  useEffect(() => {
    listQuestionnaires().then(setQuestionnaires).catch(() => {})
  }, [])

  function openCreate() {
    setName("")
    setSlug("")
    setSlugEdited(false)
    setFormError("")
    setCreateOpen(true)
  }

  async function handleCreate() {
    if (!name.trim() || !slug.trim()) return
    setCreating(true)
    setFormError("")
    try {
      const questionnaire = await createQuestionnaire(slug.trim(), name.trim())
      setQuestionnaires((prev) => [...prev, questionnaire].sort((a, b) => a.name.localeCompare(b.name)))
      setCreateOpen(false)
      router.push(`/dashboard/questionnaires/${questionnaire.slug}`)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Une erreur est survenue.")
    } finally {
      setCreating(false)
    }
  }

  return (
    <SidebarGroup>
      <SidebarMenu>
        <Collapsible defaultOpen className="group/collapsible" render={<SidebarMenuItem />}>
          <CollapsibleTrigger render={<SidebarMenuButton tooltip="Questionnaires" />}>
            <ListChecksIcon />
            <span>Questionnaires</span>
            <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-open/collapsible:rotate-90" />
          </CollapsibleTrigger>
          <SidebarMenuAction title="Nouveau questionnaire" onClick={openCreate}>
            <PlusIcon />
          </SidebarMenuAction>
          <CollapsibleContent>
            <SidebarMenuSub>
              {questionnaires.map((q) => (
                <SidebarMenuSubItem key={q.slug}>
                  <SidebarMenuSubButton render={<Link href={`/dashboard/questionnaires/${q.slug}`} />}>
                    <span>{q.name}</span>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </Collapsible>
      </SidebarMenu>

      <Dialog open={createOpen} onOpenChange={(open) => !open && setCreateOpen(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouveau questionnaire</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="q-name">Nom</Label>
              <Input
                id="q-name"
                value={name}
                onChange={(e) => {
                  const value = e.target.value
                  setName(value)
                  if (!slugEdited) setSlug(slugify(value))
                }}
                placeholder="Assurance Taxi"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="q-slug">Slug</Label>
              <Input
                id="q-slug"
                value={slug}
                onChange={(e) => {
                  setSlugEdited(true)
                  setSlug(e.target.value)
                }}
                placeholder="taxi"
              />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>Annuler</Button>
            <Button onClick={handleCreate} disabled={!name.trim() || !slug.trim() || creating}>
              {creating ? <><Loader2Icon size={14} className="animate-spin" /> Création…</> : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarGroup>
  )
}
