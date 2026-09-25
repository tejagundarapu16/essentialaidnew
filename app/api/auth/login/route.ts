import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { readStore, writeStore } from "@/lib/backend-store"
import type { Role, User } from "@/lib/types"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, role } = body as { email?: string; password?: string; role?: Role }

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

    if (!password || !password.trim()) {
      return NextResponse.json(
        { success: false, message: "Password is required." },
        { status: 400 },
      )
    }

    const store = await readStore()
    const user = store.state.users.find(
      (u) => u.email && u.email.trim().toLowerCase() === trimmedEmail,
    )

    if (!user || !user.password) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password." },
        { status: 401 },
      )
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password." },
        { status: 401 },
      )
    }

    // Attach role if not present
    if (role && !user.roles.includes(role)) {
      user.roles.push(role)
    }
    user.emailVerified = true
    store.state.userId = user.id

    await writeStore(store)

    const safeUser: Partial<User> = { ...user }
    delete safeUser.password
    delete safeUser.resetToken
    delete safeUser.resetTokenExpires

    return NextResponse.json(
      {
        success: true,
        message: "Login successful",
        user: safeUser as User,
      },
      { status: 200 },
    )
  } catch (err) {
    console.error("[POST /api/auth/login ERROR]", err)
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 },
    )
  }
}
