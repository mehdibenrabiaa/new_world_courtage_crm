"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { ChevronRightIcon, ListChecksIcon } from "lucide-react"
import { listQuestionnaires, type Questionnaire } from "@/lib/api"

// The list of questionnaires is fetched dynamically (rather than hardcoded)
// so any new one added via seed.py/the API shows up here automatically —
// but creating one still requires a developer to also build the site page
// that consumes it, so there's no "create" affordance here.
export function NavQuestionnaires() {
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([])

  useEffect(() => {
    listQuestionnaires().then(setQuestionnaires).catch(() => {})
  }, [])

  return (
    <SidebarGroup>
      <SidebarMenu>
        <Collapsible defaultOpen className="group/collapsible" render={<SidebarMenuItem />}>
          <CollapsibleTrigger render={<SidebarMenuButton tooltip="Questionnaires" />}>
            <ListChecksIcon />
            <span>Questionnaires</span>
            <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-open/collapsible:rotate-90" />
          </CollapsibleTrigger>
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
    </SidebarGroup>
  )
}
