"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useStore } from "@/lib/store"
import { DonorPortal } from "@/components/portals/donor-portal"
import { RecipientPortal } from "@/components/portals/recipient-portal"
import { AdminPortal } from "@/components/portals/admin-portal"
import { LogisticsPortal } from "@/components/portals/logistics-portal"
import { VolunteerPortal } from "@/components/portals/volunteer-portal"
import { getPrimaryRole } from "@/lib/roles"
import { RefreshCw } from "lucide-react"

export default function DashboardPage() {
  const { user, activeRole, hydrated } = useStore()
  const router = useRouter()

  useEffect(() => {
    if (hydrated && !user) {
      router.replace("/login")
    }
  }, [user, hydrated, router])

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <RefreshCw className="size-6 animate-spin text-primary" />
          <p className="text-sm font-medium">Loading your portal...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  const primary = activeRole ?? getPrimaryRole(user)

  switch (primary) {
    case "donor":
      return <DonorPortal />
    case "recipient":
      return <RecipientPortal />
    case "logistics":
      return <LogisticsPortal />
    case "volunteer":
      return <VolunteerPortal />
    case "admin":
      return <AdminPortal />
    default:
      return <VolunteerPortal />
  }
}
