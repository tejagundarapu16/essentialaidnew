"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { DONATIONS, DRIVES, NOTIFICATIONS, REQUESTS, USERS } from "./mock-data"
import { rankMatches } from "./matching"
import {
  DONATION_FLOW,
  type ContactMethod,
  type AidRequest,
  type AppNotification,
  type Donation,
  type DonationStatus,
  type EmergencyDrive,
  type ItemCategory,
  type ItemCondition,
  type PickupMethod,
  type Role,
  type Urgency,
  type VerificationChallenge,
  type User,
} from "./types"

let idCounter = 9000
const nextId = (prefix: string) => `${prefix}-${idCounter++}`

interface Toast {
  id: string
  title: string
  message: string
  type: AppNotification["type"]
  urgent: boolean
}

interface StoreValue {
  user: User | null
  users: User[]
  hydrated: boolean
  verificationChallenges: VerificationChallenge[]
  activeRole: Role | null
  setActiveRole: (role: Role | null) => void
  donations: Donation[]
  requests: AidRequest[]
  drives: EmergencyDrive[]
  notifications: AppNotification[]
  toasts: Toast[]
  login: (role: Role) => void
  loginUser: (input: { identifier: string; role: Role; name?: string; location?: string }) => User
  setSessionUser: (user: User, role: Role) => void
  logout: () => void
  requestVerificationCode: (input: {
    mode: "login" | "signup"
    role: Role
    method: ContactMethod
    identifier: string
    name?: string
    location?: string
  }) => { challengeId: string; destination: string; code: string; userId: string }
  verifyContactCode: (input: { challengeId: string; code: string }) => {
    success: boolean
    message: string
    user?: User
  }
  createDonation: (input: {
    category: ItemCategory
    title: string
    quantity: number
    condition: ItemCondition
    pickupLocation: string
    driveId?: string
  }) => void
  advanceDonation: (id: string, to: DonationStatus, note?: string) => void
  verifyDonation: (id: string, approve: boolean) => void
  assignPickup: (id: string, method: PickupMethod, deliveryWindow: string) => void
  matchDonation: (donationId: string, requestId: string, confidence: number) => void
  reviewDonation: (id: string, rating: number, feedback: string) => void
  createRequest: (input: {
    category: ItemCategory
    quantity: number
    urgency: Urgency
    deliveryAddress: string
    driveId?: string
  }) => void
  createDrive: (input: Omit<EmergencyDrive, "id" | "createdAt" | "active">) => void
  toggleDrive: (id: string) => void
  markAllRead: () => void
  dismissToast: (id: string) => void
  notify: (n: Omit<AppNotification, "id" | "createdAt" | "read">) => void
}

interface PersistedStoreState {
  userId: string | null
  users: User[]
  verificationChallenges: VerificationChallenge[]
  donations: Donation[]
  requests: AidRequest[]
  drives: EmergencyDrive[]
  notifications: AppNotification[]
}

function getMaxNumericId(...collections: Array<{ id: string }[]>) {
  let max = 8999
  for (const collection of collections) {
    for (const item of collection) {
      const match = item.id.match(/-(\d+)$/)
      if (!match) continue
      max = Math.max(max, Number(match[1]))
    }
  }
  return max + 1
}

interface BackendStateResponse {
  state: PersistedStoreState
  idCounter: number
}

interface BackendSnapshotPayload {
  state: PersistedStoreState
  idCounter: number
}

function normalizeIdentifier(method: ContactMethod, value: string) {
  const trimmed = value.trim()
  return method === "email" ? trimmed.toLowerCase() : trimmed.replace(/[^\d+]/g, "")
}

function generateVerificationCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

function findUserByIdentifier(users: User[], method: ContactMethod, identifier: string) {
  const normalized = normalizeIdentifier(method, identifier)
  return users.find((user) => {
    const candidate = method === "email" ? user.email : user.phone
    return candidate ? normalizeIdentifier(method, candidate) === normalized : false
  })
}

function normalizePersistedState(state: Partial<PersistedStoreState> | null | undefined) {
  return {
    userId: typeof state?.userId === "string" ? state.userId : null,
    users: Array.isArray(state?.users) ? state!.users : USERS,
    verificationChallenges: Array.isArray(state?.verificationChallenges)
      ? state!.verificationChallenges
      : [],
    donations: Array.isArray(state?.donations) ? state!.donations : DONATIONS,
    requests: Array.isArray(state?.requests) ? state!.requests : REQUESTS,
    drives: Array.isArray(state?.drives) ? state!.drives : DRIVES,
    notifications: Array.isArray(state?.notifications) ? state!.notifications : NOTIFICATIONS,
  }
}

async function fetchBackendState() {
  const response = await fetch("/api/store", { cache: "no-store" })
  if (!response.ok) {
    throw new Error("Failed to load backend store")
  }
  return (await response.json()) as BackendStateResponse
}

async function saveBackendState(snapshot: BackendSnapshotPayload) {
  await fetch("/api/store", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(snapshot),
  })
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>(USERS)
  const [verificationChallenges, setVerificationChallenges] = useState<VerificationChallenge[]>([])
  const [donations, setDonations] = useState<Donation[]>(DONATIONS)
  const [requests, setRequests] = useState<AidRequest[]>(REQUESTS)
  const [drives, setDrives] = useState<EmergencyDrive[]>(DRIVES)
  const [notifications, setNotifications] = useState<AppNotification[]>(NOTIFICATIONS)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [activeRole, setActiveRole] = useState<Role | null>(null)

  useEffect(() => {
    let cancelled = false

    fetchBackendState()
      .then((payload) => {
        if (cancelled) return
        const state = normalizePersistedState(payload.state)
        idCounter = payload.idCounter
        setUsers(state.users)
        setVerificationChallenges(state.verificationChallenges)
        setUser(state.users.find((u) => u.id === state.userId) ?? null)
        setDonations(state.donations)
        setRequests(state.requests)
        setDrives(state.drives)
        setNotifications(state.notifications)
        setHydrated(true)
      })
      .catch(() => {
        if (cancelled) return
        idCounter = getMaxNumericId(DONATIONS, REQUESTS, DRIVES, NOTIFICATIONS)
        setUser(null)
        setUsers(USERS)
        setVerificationChallenges([])
        setDonations(DONATIONS)
        setRequests(REQUESTS)
        setDrives(DRIVES)
        setNotifications(NOTIFICATIONS)
        setHydrated(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const pushToast = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = nextId("toast")
      setToasts((prev) => [...prev, { ...t, id }])
      setTimeout(() => dismissToast(id), 5000)
    },
    [dismissToast],
  )

  const notify = useCallback<StoreValue["notify"]>(
    (n) => {
      const notification: AppNotification = {
        ...n,
        id: nextId("n"),
        createdAt: Date.now(),
        read: false,
      }
      setNotifications((prev) => [notification, ...prev])
      pushToast({ title: n.title, message: n.message, type: n.type, urgent: n.urgent })
    },
    [pushToast],
  )

  const login = useCallback(
    (role: Role) => {
      const found =
        users.find((u) => u.roles?.includes(role) && (u.emailVerified || u.phoneVerified)) ??
        users.find((u) => u.roles?.includes(role)) ??
        users[0] ??
        null
      setUser(found)
      setActiveRole(role)
    },
    [users],
  )

  const loginUser = useCallback(
    (input: { identifier: string; role: Role; name?: string; location?: string }): User => {
      const normalized = normalizeIdentifier("email", input.identifier)
      const existing = findUserByIdentifier(users, "email", normalized)

      let authenticatedUser: User

      if (existing) {
        const roles = Array.from(new Set([...(existing.roles || []), input.role]))
        authenticatedUser = {
          ...existing,
          emailVerified: true,
          roles,
        }
        setUsers((prev) => prev.map((u) => (u.id === existing.id ? authenticatedUser : u)))
      } else {
        const fallbackName = input.name?.trim() || normalized.split("@")[0] || "User"
        authenticatedUser = {
          id: nextId("u"),
          name: fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1),
          email: normalized,
          emailVerified: true,
          phoneVerified: false,
          roles: [input.role],
          location: input.location?.trim() || "Central Relief Area",
          coords: { lat: 30.2672, lng: -97.7431 },
          createdAt: Date.now(),
        }
        setUsers((prev) => [authenticatedUser, ...prev.filter((u) => u.id !== authenticatedUser.id)])
      }

      setUser(authenticatedUser)
      setActiveRole(input.role)
      return authenticatedUser
    },
    [users],
  )

  const setSessionUser = useCallback((u: User, role: Role) => {
    setUser(u)
    setActiveRole(role)
    setUsers((prev) => {
      const idx = prev.findIndex((item) => item.id === u.id)
      if (idx >= 0) {
        return prev.map((item) => (item.id === u.id ? u : item))
      }
      return [u, ...prev]
    })
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    setActiveRole(null)
  }, [])

  useEffect(() => {
    if (!user) setActiveRole(null)
  }, [user])

  const requestVerificationCode = useCallback<StoreValue["requestVerificationCode"]>(
    (input) => {
      const identifier = normalizeIdentifier(input.method, input.identifier)
      const now = Date.now()
      const code = generateVerificationCode()
      const existing = findUserByIdentifier(users, input.method, identifier)

      let targetUser = existing

      if (existing) {
        // Ensure the requested role is added to user's roles
        const roles = Array.from(new Set([...(existing.roles || []), input.role]))
        targetUser = { ...existing, roles }
        setUsers((prev) => prev.map((u) => (u.id === existing.id ? targetUser! : u)))
      } else {
        const fallbackName = input.name?.trim() || identifier.split("@")[0] || "User"
        targetUser = {
          id: nextId("u"),
          name: fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1),
          email: input.method === "email" ? identifier : undefined,
          phone: input.method === "phone" ? identifier : undefined,
          emailVerified: false,
          phoneVerified: false,
          roles: [input.role],
          location: input.location?.trim() || "Unspecified location",
          coords: { lat: 30.2672, lng: -97.7431 },
          createdAt: now,
        }
        setUsers((prev) => [targetUser as User, ...prev])
      }

      const challenge: VerificationChallenge = {
        id: nextId("vc"),
        userId: targetUser.id,
        method: input.method,
        identifier,
        role: input.role,
        code,
        expiresAt: now + 10 * 60 * 1000,
        createdAt: now,
        purpose: input.mode === "signup" ? "signup" : "login",
      }

      setVerificationChallenges((prev) => [challenge, ...prev.filter((item) => item.userId !== targetUser.id)])

      return {
        challengeId: challenge.id,
        destination:
          input.method === "email"
            ? targetUser.email ?? identifier
            : targetUser.phone ?? identifier,
        code,
        userId: targetUser.id,
      }
    },
    [users],
  )

  const verifyContactCode = useCallback<StoreValue["verifyContactCode"]>(
    ({ challengeId, code }) => {
      const challenge = verificationChallenges.find((item) => item.id === challengeId)
      if (!challenge) {
        return { success: false, message: "Verification code not found or expired." }
      }
      if (challenge.expiresAt < Date.now()) {
        return { success: false, message: "The verification code has expired." }
      }
      if (challenge.code !== code.trim()) {
        return { success: false, message: "The verification code did not match." }
      }

      const current = users.find((item) => item.id === challenge.userId)
      if (!current) {
        return { success: false, message: "Account not found for this verification challenge." }
      }

      // Update verification flags and, if this was a signup request,
      // add the requested role to the user's roles array.
      const updatedRoles = current.roles ? [...current.roles] : []
      if (challenge.purpose === "signup" && (challenge as VerificationChallenge).role) {
        const r = (challenge as VerificationChallenge).role!
        if (!updatedRoles.includes(r)) updatedRoles.push(r)
      }

      const verifiedUser: User = {
        ...current,
        emailVerified: challenge.method === "email" ? true : current.emailVerified,
        phoneVerified: challenge.method === "phone" ? true : current.phoneVerified,
        roles: updatedRoles,
      }

      setUsers((prev) => prev.map((item) => (item.id === verifiedUser.id ? verifiedUser : item)))
      setVerificationChallenges((prev) => prev.filter((item) => item.id !== challengeId))
      setUser(verifiedUser)
      // If the verification was for a signup role, prefer that role for this session
      const challengeRole = (challenge as VerificationChallenge).role
      if (challengeRole) setActiveRole(challengeRole)

      return {
        success: true,
        message: `${challenge.method === "email" ? "Email" : "Phone"} verified successfully.`,
        user: verifiedUser,
      }
    },
    [users, verificationChallenges],
  )

  const createDonation = useCallback<StoreValue["createDonation"]>(
    (input) => {
      if (!user) return
      const at = Date.now()
      const autoVerified = input.condition === "New" && input.quantity <= 50
      const donation: Donation = {
        id: nextId("d"),
        donorId: user.id,
        donorName: user.name,
        category: input.category,
        title: input.title,
        quantity: input.quantity,
        condition: input.condition,
        pickupLocation: input.pickupLocation || user.location,
        coords: user.coords,
        status: autoVerified ? "Verified" : "Listed",
        verified: autoVerified,
        autoVerified,
        driveId: input.driveId,
        createdAt: at,
        history: [
          { status: "Listed", at },
          ...(autoVerified
            ? [{ status: "Verified" as DonationStatus, at: at + 1, note: "Auto-verified" }]
            : []),
        ],
      }
      setDonations((prev) => [donation, ...prev])
      notify({
        title: "Donation listed",
        message: autoVerified
          ? `"${input.title}" was auto-verified and is ready to match.`
          : `"${input.title}" is pending verification.`,
        type: "status",
        urgent: false,
      })
    },
    [user, notify],
  )

  const setDonation = useCallback(
    (id: string, updater: (d: Donation) => Donation) => {
      setDonations((prev) => prev.map((d) => (d.id === id ? updater(d) : d)))
    },
    [],
  )

  const advanceDonation = useCallback<StoreValue["advanceDonation"]>(
    (id, to, note) => {
      setDonation(id, (d) => ({
        ...d,
        status: to,
        history: [...d.history, { status: to, at: Date.now(), note }],
      }))
      const d = donations.find((x) => x.id === id)
      notify({
        title: `Status: ${to}`,
        message: `${d?.title ?? "Donation"} moved to "${to}".`,
        type: to === "Delivered" ? "delivery" : "status",
        urgent: to === "In-transit" || to === "Delivered",
      })
    },
    [setDonation, donations, notify],
  )

  const verifyDonation = useCallback<StoreValue["verifyDonation"]>(
    (id, approve) => {
      setDonation(id, (d) => ({
        ...d,
        verified: approve,
        status: approve ? "Verified" : "Listed",
        history: approve
          ? [...d.history, { status: "Verified", at: Date.now(), note: "Admin verified" }]
          : d.history,
      }))
      notify({
        title: approve ? "Donation verified" : "Verification rejected",
        message: approve ? "Item approved and ready to match." : "Item sent back to donor.",
        type: "status",
        urgent: false,
        role: "admin",
      })
    },
    [setDonation, notify],
  )

  const assignPickup = useCallback<StoreValue["assignPickup"]>(
    (id, method, deliveryWindow) => {
      setDonation(id, (d) => ({
        ...d,
        pickupMethod: method,
        deliveryWindow,
        status: d.status === "Matched" ? "Picked-up" : d.status,
        history:
          d.status === "Matched"
            ? [...d.history, { status: "Picked-up", at: Date.now(), note: `${method} scheduled` }]
            : d.history,
      }))
      notify({
        title: "Pickup scheduled",
        message: `${method} scheduled — ${deliveryWindow}.`,
        type: "delivery",
        urgent: true,
        role: "logistics",
      })
    },
    [setDonation, notify],
  )

  const matchDonation = useCallback<StoreValue["matchDonation"]>(
    (donationId, requestId, confidence) => {
      setDonation(donationId, (d) => ({
        ...d,
        status: "Matched",
        matchedRequestId: requestId,
        matchConfidence: confidence,
        history: [...d.history, { status: "Matched", at: Date.now(), note: `${confidence}% confidence` }],
      }))
      setRequests((prev) =>
        prev.map((r) =>
          r.id === requestId ? { ...r, status: "Matched", matchedDonationId: donationId } : r,
        ),
      )
      notify({
        title: "Match confirmed",
        message: `Donation matched with ${confidence}% confidence.`,
        type: "match",
        urgent: true,
      })
    },
    [setDonation, notify],
  )

  const reviewDonation = useCallback<StoreValue["reviewDonation"]>(
    (id, rating, feedback) => {
      setDonation(id, (d) => ({
        ...d,
        status: "Reviewed",
        rating,
        feedback,
        history: [...d.history, { status: "Reviewed", at: Date.now(), note: `${rating}-star review` }],
      }))
      const d = donations.find((x) => x.id === id)
      if (d?.matchedRequestId) {
        setRequests((prev) =>
          prev.map((r) =>
            r.id === d.matchedRequestId ? { ...r, status: "Reviewed", rating, feedback } : r,
          ),
        )
      }
      notify({
        title: "Feedback received",
        message: `A ${rating}-star review was submitted. Thank you!`,
        type: "info",
        urgent: false,
      })
    },
    [setDonation, donations, notify],
  )

  const createRequest = useCallback<StoreValue["createRequest"]>(
    (input) => {
      if (!user) return
      const request: AidRequest = {
        id: nextId("r"),
        recipientId: user.id,
        recipientName: user.name,
        category: input.category,
        quantity: input.quantity,
        urgency: input.urgency,
        deliveryAddress: input.deliveryAddress || user.location,
        coords: user.coords,
        status: "Open",
        driveId: input.driveId,
        createdAt: Date.now(),
      }
      setRequests((prev) => [request, ...prev])

      const candidate = donations.find(
        (d) => d.verified && !d.matchedRequestId && d.category === input.category,
      )
      if (candidate) {
        const [best] = rankMatches(candidate, [request])
        if (best) {
          matchDonation(candidate.id, request.id, best.confidence)
        }
      }
      notify({
        title: "Request submitted",
        message:
          input.urgency === "Critical"
            ? "Critical request prioritized for immediate matching."
            : "We're searching for matching donations now.",
        type: "info",
        urgent: input.urgency === "Critical",
      })
    },
    [user, donations, matchDonation, notify],
  )

  const createDrive = useCallback<StoreValue["createDrive"]>(
    (input) => {
      const drive: EmergencyDrive = {
        ...input,
        id: nextId("drive"),
        active: true,
        createdAt: Date.now(),
      }
      setDrives((prev) => [drive, ...prev])
      notify({
        title: "Emergency drive launched",
        message: `${input.title} is now active across the platform.`,
        type: "drive",
        urgent: true,
      })
    },
    [notify],
  )

  const toggleDrive = useCallback((id: string) => {
    setDrives((prev) => prev.map((d) => (d.id === id ? { ...d, active: !d.active } : d)))
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  useEffect(() => {
    if (!hydrated) return
    const payload: BackendSnapshotPayload = {
      state: {
        userId: user?.id ?? null,
        users,
        verificationChallenges,
        donations,
        requests,
        drives,
        notifications,
      },
      idCounter,
    }
    void saveBackendState(payload)
  }, [hydrated, user, users, verificationChallenges, donations, requests, drives, notifications])

  const value = useMemo<StoreValue>(
    () => ({
      user,
      users,
      hydrated,
      verificationChallenges,
      activeRole,
      setActiveRole,
      donations,
      requests,
      drives,
      notifications,
      toasts,
      login,
      loginUser,
      setSessionUser,
      logout,
      requestVerificationCode,
      verifyContactCode,
      createDonation,
      advanceDonation,
      verifyDonation,
      assignPickup,
      matchDonation,
      reviewDonation,
      createRequest,
      createDrive,
      toggleDrive,
      markAllRead,
      dismissToast,
      notify,
    }),
    [
      user,
      users,
      hydrated,
      verificationChallenges,
      activeRole,
      setActiveRole,
      donations,
      requests,
      drives,
      notifications,
      toasts,
      login,
      loginUser,
      setSessionUser,
      logout,
      requestVerificationCode,
      verifyContactCode,
      createDonation,
      advanceDonation,
      verifyDonation,
      assignPickup,
      matchDonation,
      reviewDonation,
      createRequest,
      createDrive,
      toggleDrive,
      markAllRead,
      dismissToast,
      notify,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error("useStore must be used within StoreProvider")
  return ctx
}

export { DONATION_FLOW }
