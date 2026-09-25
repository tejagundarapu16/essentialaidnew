export type Role = "admin" | "donor" | "recipient" | "logistics" | "volunteer"

export type ContactMethod = "email" | "phone"

export interface User {
  id: string
  name: string
  email?: string
  phone?: string
  password?: string
  resetToken?: string
  resetTokenExpires?: number
  // A user can hold multiple roles (donor, recipient, logistics, admin, volunteer)
  roles: Role[]
  location: string
  coords: { lat: number; lng: number }
  emailVerified?: boolean
  phoneVerified?: boolean
  createdAt?: number
}

export type ItemCategory =
  | "Food & Water"
  | "Clothing"
  | "Medical Supplies"
  | "Shelter & Bedding"
  | "Hygiene"
  | "Baby & Child"
  | "Electronics"
  | "Household"

export const ITEM_CATEGORIES: ItemCategory[] = [
  "Food & Water",
  "Clothing",
  "Medical Supplies",
  "Shelter & Bedding",
  "Hygiene",
  "Baby & Child",
  "Electronics",
  "Household",
]

export type ItemCondition = "New" | "Like New" | "Good" | "Fair"
export const ITEM_CONDITIONS: ItemCondition[] = ["New", "Like New", "Good", "Fair"]

// 6-stage status flow (plus terminal Reviewed)
export type DonationStatus =
  | "Listed"
  | "Verified"
  | "Matched"
  | "Picked-up"
  | "In-transit"
  | "Delivered"
  | "Reviewed"

export const DONATION_FLOW: DonationStatus[] = [
  "Listed",
  "Verified",
  "Matched",
  "Picked-up",
  "In-transit",
  "Delivered",
  "Reviewed",
]

export type Urgency = "Normal" | "High" | "Critical"
export const URGENCY_LEVELS: Urgency[] = ["Normal", "High", "Critical"]

export type PickupMethod = "Self-pickup" | "Volunteer delivery" | "Third-party courier"
export const PICKUP_METHODS: PickupMethod[] = [
  "Self-pickup",
  "Volunteer delivery",
  "Third-party courier",
]

export interface Coords {
  lat: number
  lng: number
}

export interface Donation {
  id: string
  donorId: string
  donorName: string
  category: ItemCategory
  title: string
  quantity: number
  condition: ItemCondition
  pickupLocation: string
  coords: Coords
  status: DonationStatus
  verified: boolean
  autoVerified: boolean
  photoUrl?: string
  driveId?: string
  matchedRequestId?: string
  matchConfidence?: number
  pickupMethod?: PickupMethod
  deliveryWindow?: string
  createdAt: number
  history: { status: DonationStatus; at: number; note?: string }[]
  rating?: number
  feedback?: string
}

export interface AidRequest {
  id: string
  recipientId: string
  recipientName: string
  category: ItemCategory
  quantity: number
  urgency: Urgency
  deliveryAddress: string
  coords: Coords
  status: "Open" | "Matched" | "Delivered" | "Reviewed"
  matchedDonationId?: string
  driveId?: string
  createdAt: number
  rating?: number
  feedback?: string
}

export interface EmergencyDrive {
  id: string
  title: string
  description: string
  location: string
  categories: ItemCategory[]
  active: boolean
  createdAt: number
  goal: number
}

export interface AppNotification {
  id: string
  title: string
  message: string
  type: "match" | "status" | "delivery" | "drive" | "info"
  urgent: boolean
  read: boolean
  createdAt: number
  role?: Role
}

export interface VerificationChallenge {
  id: string
  userId: string
  method: ContactMethod
  identifier: string
  role?: Role
  code: string
  expiresAt: number
  createdAt: number
  purpose: "signup" | "login" | "verify"
}

export interface OtpRecord {
  id: string
  identifier: string
  type: ContactMethod
  otp_hash: string
  salt: string
  created_at: number
  expires_at: number
  attempts: number
  verified: boolean
  last_sent_at: number
}

