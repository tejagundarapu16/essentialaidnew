import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { readStore, writeStore } from "@/lib/backend-store"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { token, newPassword } = body as { token?: string; newPassword?: string }

    if (!token || !token.trim()) {
      return NextResponse.json(
        { success: false, message: "Reset token is required." },
        { status: 400 },
      )
    }

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 6 characters long." },
        { status: 400 },
      )
    }

    const store = await readStore()
    const user = store.state.users.find(
      (u) =>
        u.resetToken &&
        u.resetToken === token &&
        u.resetTokenExpires &&
        u.resetTokenExpires > Date.now(),
    )

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired password reset token." },
        { status: 400 },
      )
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    user.password = hashedPassword
    delete user.resetToken
    delete user.resetTokenExpires

    await writeStore(store)

    return NextResponse.json(
      {
        success: true,
        message: "Password updated successfully! Please log in with your new password.",
      },
      { status: 200 },
    )
  } catch (err) {
    console.error("[POST /api/auth/reset-password ERROR]", err)
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 },
    )
  }
}
