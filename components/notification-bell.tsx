"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { BellIcon, Loader2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  listNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  type Notification,
} from "@/lib/api"

// No push/websocket — the bell just polls its unread count in the
// background, and only fetches the actual list when opened.
const POLL_INTERVAL_MS = 30_000

function relativeTime(iso: string): string {
  const diffSec = Math.round((new Date(iso).getTime() - Date.now()) / 1000)
  const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" })
  if (Math.abs(diffSec) < 60) return rtf.format(diffSec, "second")
  const diffMin = Math.round(diffSec / 60)
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute")
  const diffHour = Math.round(diffMin / 60)
  if (Math.abs(diffHour) < 24) return rtf.format(diffHour, "hour")
  return rtf.format(Math.round(diffHour / 24), "day")
}

export function NotificationBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)

  const refreshCount = useCallback(() => {
    getUnreadNotificationCount()
      .then((r) => setUnreadCount(r.count))
      .catch(() => {})
  }, [])

  useEffect(() => {
    refreshCount()
    const interval = setInterval(refreshCount, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [refreshCount])

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      setLoading(true)
      listNotifications()
        .then(setNotifications)
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }

  function handleClickNotification(n: Notification) {
    if (!n.read) {
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)))
      setUnreadCount((c) => Math.max(0, c - 1))
      markNotificationRead(n.id).catch(() => {})
    }
    if (n.link) router.push(n.link)
  }

  function handleMarkAllRead() {
    // Optimistic, same as a single-notification click — update instantly,
    // fire the request in the background instead of making the badge lag
    // behind a round-trip for something this low-stakes.
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
    markAllNotificationsRead().catch(() => {})
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
            <BellIcon />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        </DropdownMenuGroup>
        {unreadCount > 0 && (
          <DropdownMenuItem
            onClick={handleMarkAllRead}
            className="justify-center text-xs text-muted-foreground"
          >
            Tout marquer comme lu
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2Icon size={14} className="animate-spin" />
            Chargement…
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-2 py-6 text-center text-sm text-muted-foreground">
            Aucune notification pour le moment.
          </div>
        ) : (
          <div className="-mx-1 max-h-80 overflow-y-auto">
            {notifications.map((n) => (
              <DropdownMenuItem
                key={n.id}
                onClick={() => handleClickNotification(n)}
                className="items-start gap-2 py-2 whitespace-normal"
              >
                <span
                  className={
                    n.read
                      ? "mt-1.5 size-1.5 shrink-0 rounded-full"
                      : "mt-1.5 size-1.5 shrink-0 rounded-full bg-blue-600"
                  }
                />
                <div className="flex-1">
                  <p className={n.read ? "text-muted-foreground" : ""}>{n.message}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{relativeTime(n.created_at)}</p>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
