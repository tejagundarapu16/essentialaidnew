import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { readStore, writeStore } from "@/lib/backend-store"
import type { Role, User } from "@/lib/types"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, password, role, location } = body as {
      name?: string
      email?: string
      password?: string
      role?: Role
      location?: string
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, message: "Full name is required." },
        { status: 400 },
      )
    }

    const trimmedEmail = email?.trim().toLowerCase()
    if (!trimmedEmail) {
      return NextResponse.json(
        { success: false, message: "Email is required." },
        { status: 400 },
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid email address." },
        { status: 400 },
      )
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 6 characters long." },
        { status: 400 },
      )
    }

    const store = await readStore()
    const existing = store.state.users.find(
      (u) => u.email && u.email.trim().toLowerCase() === trimmedEmail,
    )

    if (existing) {
      return NextResponse.json(
        { success: false, message: "An account with this email address already exists." },
        { status: 400 },
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const newUser: User = {
      id: `u-${Date.now()}`,
      name: name.trim(),
      email: trimmedEmail,
      password: hashedPassword,
      roles: [role || "donor"],
      location: location?.trim() || "Central Relief Area",
      coords: { lat: 30.2672, lng: -97.7431 },
      emailVerified: true,
      createdAt: Date.now(),
    }

    store.state.users.unshift(newUser)
    store.state.userId = newUser.id
    await writeStore(store)

    const safeUser: Partial<User> = { ...newUser }
    delete safeUser.password
    delete safeUser.resetToken
    delete safeUser.resetTokenExpires

    return NextResponse.json(
      {
        success: true,
        message: "Account created successfully",
        user: safeUser as User,
      },
      { status: 201 },
    )
  } catch (err) {
    console.error("[POST /api/auth/register ERROR]", err)
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 },
    )
  }
}
