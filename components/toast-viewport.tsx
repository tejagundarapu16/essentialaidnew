"use client"

import { Bell, CheckCircle2, PackageCheck, Siren, Truck, X } from "lucide-react"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import type { AppNotification } from "@/lib/types"

const ICONS: Record<AppNotification["type"], typeof Bell> = {
  match: CheckCircle2,
  status: PackageCheck,
  delivery: Truck,
  drive: Siren,
  info: Bell,
}

export function ToastViewport() {
  const { toasts, dismissToast } = useStore()

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:right-0 sm:left-auto sm:items-end">
      {toasts.map((t) => {
        const Icon = ICONS[t.type]
        return (
          <div
            key={t.id}
            role="status"
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-card p-4 shadow-lg",
              "animate-in slide-in-from-bottom-2 fade-in",
              t.urgent ? "border-critical/40" : "border-border",
            )}
          >
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-lg",
                t.urgent ? "bg-critical/12 text-critical" : "bg-primary/10 text-primary",
              )}
            >
              <Icon className="size-4" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{t.title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{t.message}</p>
            </div>
            <button
              onClick={() => dismissToast(t.id)}
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Dismiss notification"
            >
              <X className="size-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
