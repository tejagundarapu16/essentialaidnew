"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import {
  Bell,
  CheckCircle2,
  LifeBuoy,
  LogOut,
  PackageCheck,
  Siren,
  Truck,
  ArrowLeftRight,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"
import { ROLE_META, ROLE_ORDER, getPrimaryRole } from "@/lib/roles"
import type { AppNotification } from "@/lib/types"

export interface NavItem {
  key: string
  label: string
  icon: LucideIcon
  badge?: number
}

const NOTIF_ICONS: Record<AppNotification["type"], LucideIcon> = {
  match: CheckCircle2,
  status: PackageCheck,
  delivery: Truck,
  drive: Siren,
  info: Bell,
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts
  const m = Math.round(diff / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}

export function DashboardShell({
  navItems,
  active,
  onNavigate,
  title,
  children,
}: {
  navItems: NavItem[]
  active: string
  onNavigate: (key: string) => void
  title: string
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, logout, notifications, markAllRead, activeRole, setActiveRole } = useStore()
  const [notifOpen, setNotifOpen] = useState(false)
  const [roleSelectOpen, setRoleSelectOpen] = useState(false)

  if (!user) return null
  const primary = activeRole ?? getPrimaryRole(user)
  const meta = ROLE_META[primary]
  const unread = notifications.filter((n) => !n.read).length

  function handleLogout() {
    logout()
    router.push("/")
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <Link href="/" className="flex h-16 items-center gap-2 px-5 hover:opacity-90 transition-opacity">
          <span className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <LifeBuoy className="size-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">
            Essential<span className="text-sidebar-primary">Aid</span>
          </span>
        </Link>

        {/* User Card with Role Switcher */}
        <div className="mx-3 mb-4 rounded-xl bg-sidebar-accent p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary/20 text-sidebar-primary">
                <meta.icon className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{user.name}</p>
                <p className="truncate text-xs text-sidebar-foreground/60">{meta.short}</p>
              </div>
            </div>
            <button
              type="button"
              title="Switch Portal Role"
              onClick={() => setRoleSelectOpen((o) => !o)}
              className="p-1 rounded-md text-sidebar-foreground/60 hover:text-sidebar-primary hover:bg-sidebar-primary/10 transition-colors"
            >
              <ArrowLeftRight className="size-3.5" />
            </button>
          </div>

          {roleSelectOpen && (
            <div className="mt-2 pt-2 border-t border-sidebar-border/40 space-y-1">
              <p className="text-[10px] uppercase font-bold text-sidebar-foreground/50 px-1">Switch Portal</p>
              {ROLE_ORDER.map((r) => {
                const rMeta = ROLE_META[r]
                const isCurrent = primary === r
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setActiveRole(r)
                      setRoleSelectOpen(false)
                    }}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                      isCurrent
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/80 hover:text-sidebar-foreground",
                    )}
                  >
                    <rMeta.icon className="size-3.5" />
                    {rMeta.short}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {navItems.map((item) => {
            const isActive = active === item.key
            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                )}
              >
                <item.icon className="size-4" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge ? (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-xs",
                      isActive ? "bg-sidebar-primary-foreground/20" : "bg-sidebar-accent",
                    )}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </button>
            )
          })}
        </nav>

        <div className="p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur md:px-6">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Button
                variant="outline"
                size="icon"
                aria-label="Notifications"
                onClick={() => setNotifOpen((o) => !o)}
              >
                <Bell className="size-4" />
                {unread > 0 && (
                  <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-critical text-[10px] font-semibold text-critical-foreground">
                    {unread}
                  </span>
                )}
              </Button>
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
                    <div className="flex items-center justify-between border-b border-border px-4 py-3">
                      <span className="text-sm font-semibold">Notifications</span>
                      <button
                        onClick={markAllRead}
                        className="text-xs text-primary hover:underline"
                      >
                        Mark all read
                      </button>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 && (
                        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                          No notifications yet.
                        </p>
                      )}
                      {notifications.map((n) => {
                        const Icon = NOTIF_ICONS[n.type]
                        return (
                          <div
                            key={n.id}
                            className={cn(
                              "flex gap-3 border-b border-border px-4 py-3 last:border-0",
                              !n.read && "bg-primary/5",
                            )}
                          >
                            <span
                              className={cn(
                                "flex size-8 shrink-0 items-center justify-center rounded-lg",
                                n.urgent ? "bg-critical/12 text-critical" : "bg-primary/10 text-primary",
                              )}
                            >
                              <Icon className="size-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium">{n.title}</p>
                              <p className="text-sm text-muted-foreground">{n.message}</p>
                              <p className="mt-1 text-xs text-muted-foreground">{timeAgo(n.createdAt)}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
            <Link href="/" className="hidden sm:inline-flex">
              <Button variant="ghost" size="sm">
                Home
              </Button>
            </Link>
          </div>
        </header>

        {/* Mobile nav */}
        <div className="flex gap-1 overflow-x-auto border-b border-border bg-background px-2 py-2 md:hidden">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium",
                active === item.key ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </button>
          ))}
        </div>

        <main className="flex-1 p-4 md:p-6">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
