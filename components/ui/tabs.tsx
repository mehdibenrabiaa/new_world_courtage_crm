"use client"

import * as React from "react"
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"

import { cn } from "@/lib/utils"

function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

// The vertical (data-[orientation=vertical]:*) classes below kick in only
// when a <Tabs orientation="vertical"> ancestor sets that data attribute —
// existing horizontal usages (e.g. the permissions page) are unaffected.
function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "relative inline-flex h-9 max-w-full items-center justify-center gap-0.5 overflow-x-auto rounded-lg bg-muted p-1 text-muted-foreground",
        "data-[orientation=vertical]:h-auto data-[orientation=vertical]:w-48 data-[orientation=vertical]:shrink-0 data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch data-[orientation=vertical]:justify-start data-[orientation=vertical]:overflow-visible",
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative z-10 inline-flex h-7 shrink-0 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap outline-none transition-colors select-none disabled:pointer-events-none disabled:opacity-50 data-active:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "data-[orientation=vertical]:h-9 data-[orientation=vertical]:w-full data-[orientation=vertical]:justify-start",
        className
      )}
      {...props}
    />
  )
}

function TabsIndicator({ className, ...props }: TabsPrimitive.Indicator.Props) {
  return (
    <TabsPrimitive.Indicator
      data-slot="tabs-indicator"
      className={cn(
        "absolute z-0 h-(--active-tab-height) w-(--active-tab-width) rounded-md bg-background shadow-sm transition-all duration-200 ease-out",
        "data-[orientation=horizontal]:top-1/2 data-[orientation=horizontal]:left-0 data-[orientation=horizontal]:-translate-y-1/2 data-[orientation=horizontal]:translate-x-(--active-tab-left)",
        "data-[orientation=vertical]:top-0 data-[orientation=vertical]:left-1/2 data-[orientation=vertical]:-translate-x-1/2 data-[orientation=vertical]:translate-y-(--active-tab-top)",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn(
        "flex-1 outline-none",
        // Lets the panel scroll on its own within a height-constrained
        // vertical layout (see the lead detail page) so the tab list next
        // to it never has to move — h-full/min-h-0 are no-ops (auto) when
        // no ancestor actually constrains the height, e.g. on smaller
        // screens or the horizontal Permissions-page usage.
        "data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-0 data-[orientation=vertical]:overflow-y-auto",
        className
      )}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsIndicator, TabsContent }
