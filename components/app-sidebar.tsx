"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import { useAuth } from "@/components/auth-provider"
import { can, type PermissionResource } from "@/lib/auth"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  ReceiptTextIcon, UsersIcon, LayoutDashboardIcon, BookOpenIcon, UserIcon,
  ImageIcon, UserCogIcon, ShieldCheckIcon,
} from "lucide-react"

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
      resource: "leads" as PermissionResource,
    },
    {
      title: "Contacts",
      url: "/dashboard/contacts",
      icon: <UsersIcon />,
      resource: "contacts" as PermissionResource,
    },
  ],
  navContent: [
    {
      title: "Guides",
      url: "/dashboard/guides",
      icon: <BookOpenIcon />,
      resource: "guides" as PermissionResource,
    },
    {
      title: "Auteurs",
      url: "/dashboard/authors",
      icon: <UserIcon />,
      resource: "authors" as PermissionResource,
    },
    {
      title: "Média",
      url: "/dashboard/media",
      icon: <ImageIcon />,
      resource: "media" as PermissionResource,
    },
  ],
  navAdmin: [
    {
      title: "Utilisateurs",
      url: "/dashboard/users",
      icon: <UserCogIcon />,
    },
    {
      title: "Permissions",
      url: "/dashboard/permissions",
      icon: <ShieldCheckIcon />,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()
  const isSuperadmin = user?.role === "superadmin"

  // Sections a role can't see anything in (no "view" on any of its items)
  // are hidden rather than shown empty/greyed — backend still enforces this
  // regardless, this is just so the nav matches what's actually usable.
  const navCrm = data.navCrm.filter((item) => can(user, item.resource, "view"))
  const navContent = data.navContent.filter((item) => can(user, item.resource, "view"))

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain label="Général" items={data.navGeneral} />
        {navCrm.length > 0 && <NavMain label="CRM" items={navCrm} />}
        {navContent.length > 0 && <NavMain label="Contenu" items={navContent} />}
        {isSuperadmin && <NavMain label="Administration" items={data.navAdmin} />}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{ name: user?.name ?? "", email: user?.email ?? "", avatar: "" }} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
