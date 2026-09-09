"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import { useAuth } from "@/components/auth-provider"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { ReceiptTextIcon, UsersIcon, LayoutDashboardIcon, BookOpenIcon, UserIcon, ImageIcon } from "lucide-react"

const data = {
  teams: [
    {
      name: "New World Courtage",
      logo: <img src="/nwc-logo-white.svg" alt="New World Courtage" className="size-full object-contain p-1.5" />,
      plan: "CRM",
    },
  ],
  navGeneral: [
    {
      title: "Tableau de bord",
      url: "/dashboard",
      icon: <LayoutDashboardIcon />,
    },
  ],
  navCrm: [
    {
      title: "Leads",
      url: "/dashboard/leads",
      icon: <ReceiptTextIcon />,
    },
    {
      title: "Contacts",
      url: "/dashboard/contacts",
      icon: <UsersIcon />,
    },
  ],
  navContent: [
    {
      title: "Guides",
      url: "/dashboard/guides",
      icon: <BookOpenIcon />,
    },
    {
      title: "Auteurs",
      url: "/dashboard/authors",
      icon: <UserIcon />,
    },
    {
      title: "Média",
      url: "/dashboard/media",
      icon: <ImageIcon />,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain label="Général" items={data.navGeneral} />
        <NavMain label="CRM" items={data.navCrm} />
        <NavMain label="Contenu" items={data.navContent} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{ name: user?.name ?? "", email: user?.email ?? "", avatar: "" }} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
