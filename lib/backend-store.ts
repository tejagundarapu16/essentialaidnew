import { readFile, writeFile, mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { DONATIONS, DRIVES, NOTIFICATIONS, REQUESTS, USERS } from "./mock-data"
import type {
  AidRequest,
  AppNotification,
  Donation,
  EmergencyDrive,
  OtpRecord,
  User,
  VerificationChallenge,
} from "./types"

export interface PersistedStoreState {
  userId: string | null
  users: User[]
  verificationChallenges: VerificationChallenge[]
  otpRecords?: OtpRecord[]
  donations: Donation[]
  requests: AidRequest[]
  drives: EmergencyDrive[]
  notifications: AppNotification[]
}

export interface StoreSnapshot {
  state: PersistedStoreState
  idCounter: number
}

const STORE_PATH = join(process.cwd(), "data", "essential-aid-store.json")

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

export function defaultStoreSnapshot(): StoreSnapshot {
  return {
    state: {
      userId: null,
      users: USERS,
      verificationChallenges: [],
      otpRecords: [],
      donations: DONATIONS,
      requests: REQUESTS,
      drives: DRIVES,
      notifications: NOTIFICATIONS,
    },
    idCounter: getMaxNumericId(DONATIONS, REQUESTS, DRIVES, NOTIFICATIONS),
  }
}

export function resolveUserById(userId: string | null): User | null {
  return USERS.find((user) => user.id === userId) ?? null
}

export async function readStore(): Promise<StoreSnapshot> {
  try {
    const raw = await readFile(STORE_PATH, "utf8")
    const parsed = JSON.parse(raw) as Partial<StoreSnapshot>
    if (!parsed.state) {
      return defaultStoreSnapshot()
    }

    const state = parsed.state
      const idCounter = typeof parsed.idCounter === "number"
        ? parsed.idCounter
        : getMaxNumericId(
            Array.isArray(state.users) ? state.users : USERS,
            Array.isArray(state.donations) ? state.donations : DONATIONS,
            Array.isArray(state.requests) ? state.requests : REQUESTS,
            Array.isArray(state.drives) ? state.drives : DRIVES,
            Array.isArray(state.notifications) ? state.notifications : NOTIFICATIONS,
            Array.isArray(state.verificationChallenges) ? state.verificationChallenges : [],
            Array.isArray(state.otpRecords) ? state.otpRecords : [],
          )

    const loadedUsers = Array.isArray(state.users) ? state.users : USERS
    const users = loadedUsers.map((u) => {
      if (!u.password) {
        const mockMatch = USERS.find((m) => m.email?.toLowerCase() === u.email?.toLowerCase())
        if (mockMatch?.password) {
          return { ...u, password: mockMatch.password }
        }
      }
      return u
    })

    return {
      state: {
        userId: typeof state.userId === "string" ? state.userId : null,
        users,
        verificationChallenges: Array.isArray(state.verificationChallenges)
          ? state.verificationChallenges
          : [],
        otpRecords: Array.isArray(state.otpRecords) ? state.otpRecords : [],
        donations: Array.isArray(state.donations) ? state.donations : DONATIONS,
        requests: Array.isArray(state.requests) ? state.requests : REQUESTS,
        drives: Array.isArray(state.drives) ? state.drives : DRIVES,
        notifications: Array.isArray(state.notifications) ? state.notifications : NOTIFICATIONS,
      },
      idCounter,
    }
  } catch {
    return defaultStoreSnapshot()
  }
}

export async function writeStore(snapshot: StoreSnapshot) {
  await mkdir(dirname(STORE_PATH), { recursive: true })
  await writeFile(STORE_PATH, JSON.stringify(snapshot, null, 2), "utf8")
}
