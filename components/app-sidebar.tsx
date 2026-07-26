"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavQuestionnaires } from "@/components/nav-questionnaires"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { GalleryVerticalEndIcon, ReceiptTextIcon, UsersIcon, LayoutDashboardIcon, BookOpenIcon } from "lucide-react"

const data = {
  user: {
    name: "New World Courtage",
    email: "contact@newworldcourtage.fr",
    avatar: "",
  },
  teams: [
    {
      name: "New World Courtage",
      logo: <GalleryVerticalEndIcon />,
      plan: "CRM",
    },
  ],
  navMain: [
    {
      title: "Tableau de bord",
      url: "/dashboard",
      icon: <LayoutDashboardIcon />,
    },
    {
      title: "Devis",
      url: "/dashboard/devis",
      icon: <ReceiptTextIcon />,
    },
    {
      title: "Contacts",
      url: "/dashboard/contacts",
      icon: <UsersIcon />,
    },
    {
      title: "Guides",
      url: "/dashboard/guides",
      icon: <BookOpenIcon />,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavQuestionnaires />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
