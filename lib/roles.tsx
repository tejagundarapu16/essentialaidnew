import { HeartHandshake, PackageOpen, ShieldCheck, Truck, type LucideIcon } from "lucide-react"
import type { Role, User } from "./types"

export interface RoleMeta {
  role: Role
  label: string
  short: string
  description: string
  icon: LucideIcon
}

export const ROLE_META: Record<Role, RoleMeta> = {
  admin: {
    role: "admin",
    label: "Admin",
    short: "Administrator",
    description: "Manage drives, verify donations, and monitor platform metrics.",
    icon: ShieldCheck,
  },
  donor: {
    role: "donor",
    label: "Donor",
    short: "Donor",
    description: "List donation items, track their journey, and join emergency drives.",
    icon: HeartHandshake,
  },
  recipient: {
    role: "recipient",
    label: "Recipient",
    short: "Recipient",
    description: "Request essential items, track delivery, and share feedback.",
    icon: PackageOpen,
  },
  logistics: {
    role: "logistics",
    label: "Logistics",
    short: "Logistics Coordinator",
    description: "Assign pickups, manage inventory, and schedule deliveries.",
    icon: Truck,
  },
  volunteer: {
    role: "volunteer",
    label: "Volunteer",
    short: "Volunteer",
    description: "Support drives and assist with pickups and sorting donations.",
    icon: HeartHandshake,
  },
}

export const ROLE_ORDER: Role[] = ["donor", "recipient", "volunteer", "logistics", "admin"]

// Choose a primary role from a user's roles according to ROLE_ORDER priority.
export function getPrimaryRole(user: User): Role {
  for (const r of ROLE_ORDER) {
    if (user.roles.includes(r)) return r
  }
  // fallback to the first role if the user's roles are out-of-order
  return user.roles[0]
}
