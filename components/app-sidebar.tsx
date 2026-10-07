"use client"

import * as React from "react"
import Link from "next/link"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { NotificationBell } from "@/components/notification-bell"
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
  ImageIcon, UserCogIcon, ShieldCheckIcon, CalendarIcon, CalendarCogIcon, ListTodoIcon, CalendarClockIcon,
  IdCardIcon,
} from "lucide-react"

// Sidebar header: the full logo with a "CRM" tag, or just the white logo mark
// on a brand-blue square when the sidebar is collapsed to icons.
function SidebarBrand() {
  return (
    <Link href="/dashboard" aria-label="New World Courtage — Tableau de bord" className="flex h-12 items-center gap-2 px-2 group-data-[collapsible=icon]:px-0">
      <img src="/nwc-logo.svg" alt="" className="h-8 w-auto group-data-[collapsible=icon]:hidden" />
      <span className="bg-[var(--brand)] px-1.5 py-0.5 text-[11px] font-bold tracking-wider text-white group-data-[collapsible=icon]:hidden">CRM</span>
      <span className="hidden size-8 items-center justify-center bg-[var(--brand)] group-data-[collapsible=icon]:flex">
        <img src="/nwc-logo-white.svg" alt="" className="size-full object-contain p-1.5" />
      </span>
    </Link>
  )
}

const data = {
  navGeneral: [
    {
      title: "Tableau de bord",
      url: "/dashboard",
      icon: <LayoutDashboardIcon />,
    },
    {
      title: "Mon calendrier",
      url: "/dashboard/my-calendar",
      icon: <CalendarIcon />,
    },
    {
      // Ungated, like "Mon calendrier" — self-service (seeing your own
      // bookings) is always allowed regardless of the "consultants"
      // permission matrix (see the backend's _has_permission). The page
      // itself asks the backend for either everyone's bookings or just
      // the caller's, depending on that same permission.
      title: "Rendez-vous",
      url: "/dashboard/bookings",
      icon: <CalendarClockIcon />,
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
      // Gated on the same "leads" permission as the Leads page itself —
      // it's a cross-lead view of the exact same LeadTask rows, not a
      // separate resource. A consultant only ever sees their own leads'
      // tasks here (enforced server-side); anyone else sees every
      // consultant's, filterable by person.
      title: "Tâches",
      url: "/dashboard/tasks",
      icon: <ListTodoIcon />,
      resource: "leads" as PermissionResource,
    },
    {
      title: "Contacts",
      url: "/dashboard/contacts",
      icon: <UsersIcon />,
      resource: "contacts" as PermissionResource,
    },
    {
      // The public site's Espace Client / Espace Partenaire accounts — a
      // different table from Contacts (which is deals from leads), gated on
      // the same permission since both are "someone who reached us through
      // the public site" lookups.
      title: "Comptes",
      url: "/dashboard/comptes",
      icon: <IdCardIcon />,
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
  // Consultants is admin-*and*-superadmin (matches the backend's
  // CAN_MANAGE_ANY), unlike navAdmin below which is superadmin-only —
  // kept as its own section so loosening it never risks quietly widening
  // who sees Utilisateurs/Permissions too.
  navConsultants: [
    {
      title: "Consultants",
      url: "/dashboard/consultants",
      icon: <CalendarCogIcon />,
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
  const canManageConsultants = isSuperadmin || user?.role === "admin"

  // Sections a role can't see anything in (no "view" on any of its items)
  // are hidden rather than shown empty/greyed — backend still enforces this
  // regardless, this is just so the nav matches what's actually usable.
  const navCrm = data.navCrm.filter((item) => can(user, item.resource, "view"))
  const navContent = data.navContent.filter((item) => can(user, item.resource, "view"))

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-1">
          <div className="min-w-0 flex-1">
            <SidebarBrand />
          </div>
          {/* Hidden when the sidebar collapses to icon-only — no room for
              it next to the team switcher at that width, and it'd fight
              the switcher's own icon+tooltip layout at that size. */}
          <div className="shrink-0 group-data-[collapsible=icon]:hidden">
            <NotificationBell />
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain label="Général" items={data.navGeneral} />
        {navCrm.length > 0 && <NavMain label="CRM" items={navCrm} />}
        {navContent.length > 0 && <NavMain label="Contenu" items={navContent} />}
        {canManageConsultants && <NavMain label="Consultants" items={data.navConsultants} />}
        {isSuperadmin && <NavMain label="Administration" items={data.navAdmin} />}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{ name: user?.name ?? "", email: user?.email ?? "", avatar: "" }} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
