"use client"

import {
  Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Loader2Icon } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { ConsultantCalendarEditor } from "@/components/consultants/consultant-calendar-editor"

// Every user is just a User row now — no separate consultant profile to
// link, so there's no "not linked yet" case anymore. Self-ownership
// (managing your own calendar) is always allowed by the backend regardless
// of role (see routers/consultants.py's _can_manage); only being in the
// public booking pool actually requires role === "consultant".
export default function MyCalendarPage() {
  const { user: me } = useAuth()

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-vertical:h-4 data-vertical:self-auto" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Mon calendrier</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        {!me ? (
          <div className="flex items-center justify-center text-muted-foreground gap-2 py-16">
            <Loader2Icon size={18} className="animate-spin" />
            <span className="text-sm">Chargement…</span>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-3xl rounded-xl border p-5 flex flex-col gap-4">
            <div>
              <p className="text-sm font-medium">Bloquez les créneaux où vous n&apos;êtes pas disponible</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Les prospects qui réservent un appel ne verront plus ces créneaux, ni cette journée entière si vous
                la bloquez complètement (congé, arrêt maladie…).
              </p>
            </div>
            <ConsultantCalendarEditor consultantId={me.id} />
          </div>
        )}
      </div>
    </>
  )
}
