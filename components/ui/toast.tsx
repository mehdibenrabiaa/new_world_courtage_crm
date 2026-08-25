"use client"

import * as React from "react"
import { Toast as ToastPrimitive } from "@base-ui/react/toast"
import { XIcon, CheckCircle2Icon, AlertTriangleIcon } from "lucide-react"

import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitive.Provider

export const useToastManager = ToastPrimitive.useToastManager

const TOAST_ICONS: Record<string, React.ReactNode> = {
  error: <AlertTriangleIcon size={16} className="text-destructive shrink-0" />,
  success: <CheckCircle2Icon size={16} className="text-emerald-600 shrink-0" />,
}

function ToastItem({ toast }: { toast: ToastPrimitive.Root.Props["toast"] }) {
  return (
    <ToastPrimitive.Root
      toast={toast}
      data-slot="toast"
      className={cn(
        "absolute right-0 bottom-0 left-auto z-(--toast-index) w-full rounded-xl border bg-popover p-3.5 pr-9 text-popover-foreground shadow-lg ring-1 ring-foreground/10",
        "[transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-offset-y)*-1))] transition-[transform,opacity] duration-300",
        "data-[starting-style]:translateY-4 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 data-[ending-style]:[transform:translateY(0)]",
        toast.type === "error" && "border-destructive/30"
      )}
    >
      <div className="flex items-start gap-2.5">
        {toast.type && TOAST_ICONS[toast.type]}
        <div className="flex flex-col gap-0.5 min-w-0">
          {toast.title && (
            <ToastPrimitive.Title data-slot="toast-title" className="text-sm font-medium" />
          )}
          {toast.description && (
            <ToastPrimitive.Description data-slot="toast-description" className="text-sm text-muted-foreground" />
          )}
        </div>
      </div>
      <ToastPrimitive.Close
        data-slot="toast-close"
        aria-label="Fermer"
        className="absolute top-2.5 right-2.5 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <XIcon size={14} />
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  )
}

function Toaster() {
  const { toasts } = useToastManager()
  return (
    <ToastPrimitive.Portal>
      <ToastPrimitive.Viewport
        data-slot="toast-viewport"
        className="fixed bottom-4 right-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col-reverse gap-2"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </ToastPrimitive.Viewport>
    </ToastPrimitive.Portal>
  )
}

export { ToastProvider, Toaster }
