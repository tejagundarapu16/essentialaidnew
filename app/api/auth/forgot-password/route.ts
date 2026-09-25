import { NextResponse } from "next/server"
import { randomBytes } from "node:crypto"
import { readStore, writeStore } from "@/lib/backend-store"
import { getEmailProvider } from "@/lib/server/services/email-service"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email } = body as { email?: string }

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

    const store = await readStore()
    const user = store.state.users.find(
      (u) => u.email && u.email.trim().toLowerCase() === trimmedEmail,
    )

    if (user) {
      const resetToken = randomBytes(32).toString("hex")
      const resetTokenExpires = Date.now() + 60 * 60 * 1000 // 1 hour

      user.resetToken = resetToken
      user.resetTokenExpires = resetTokenExpires
      await writeStore(store)

      const origin = request.headers.get("origin") || request.headers.get("referer") || "http://localhost:3000"
      const baseUrl = origin.replace(/\/$/, "")
      const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`

      const emailProvider = getEmailProvider()
      await emailProvider.sendPasswordResetEmail({
        to: trimmedEmail,
        resetUrl,
        expiryMinutes: 60,
      })
    }

    return NextResponse.json(
      {
        success: true,
        message: "If an account with that email exists, a password reset link has been sent.",
      },
      { status: 200 },
    )
  } catch (err) {
    console.error("[POST /api/auth/forgot-password ERROR]", err)
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 },
    )
  }
}
