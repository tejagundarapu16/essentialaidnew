import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { readStore, writeStore } from "@/lib/backend-store"
import { connectToDatabase } from "@/lib/mongodb"
import { UserModel } from "@/lib/models"
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

    if (!password) {
      return NextResponse.json(
        { success: false, message: "Password is required." },
        { status: 400 },
      )
    }

    let user: User | null = null

    // Query MongoDB first if connected
    try {
      const mongooseInstance = await connectToDatabase()
      if (mongooseInstance) {
        const dbUser = await UserModel.findOne({ email: trimmedEmail })
        if (dbUser) {
          user = {
            id: dbUser.id || dbUser._id.toString(),
            name: dbUser.name,
            email: dbUser.email,
            phone: dbUser.phone,
            password: dbUser.password,
            roles: dbUser.roles as Role[],
            location: dbUser.location,
            coords: dbUser.coords,
            emailVerified: dbUser.emailVerified,
            phoneVerified: dbUser.phoneVerified,
            createdAt: dbUser.createdAt,
          }
        }
      }
    } catch (dbErr) {
      console.warn("[Login Route] MongoDB query skipped or error:", dbErr)
    }

    const store = await readStore()
    if (!user) {
      user = store.state.users.find(
        (u) => u.email && u.email.trim().toLowerCase() === trimmedEmail,
      ) ?? null
    }

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

    // Update MongoDB if connected
    try {
      const mongooseInstance = await connectToDatabase()
      if (mongooseInstance) {
        await UserModel.updateOne(
          { email: trimmedEmail },
          { $set: { roles: user.roles, emailVerified: true } },
        )
      }
    } catch (dbErr) {
      console.warn("[Login Route] Could not update MongoDB user state:", dbErr)
    }

    // Sync in store
    const storeUser = store.state.users.find((u) => u.id === user!.id)
    if (storeUser) {
      storeUser.roles = user.roles
      storeUser.emailVerified = true
    } else {
      store.state.users.unshift(user)
    }
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

