import { cookies } from "next/headers"
import { AppSidebar } from "@/components/app-sidebar"
import { AuthProvider } from "@/components/auth-provider"
import { NotificationBell } from "@/components/notification-bell"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false"

  return (
    <AuthProvider>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar />
        <SidebarInset>
          {/* Overlaid on every page's own h-16 header row (SidebarInset is
              already position:relative) instead of editing each page. */}
          <div className="absolute top-0 right-0 z-20 flex h-16 items-center pr-4">
            <NotificationBell />
          </div>
          {children}
        </SidebarInset>
      </SidebarProvider>
    </AuthProvider>
  )
}
