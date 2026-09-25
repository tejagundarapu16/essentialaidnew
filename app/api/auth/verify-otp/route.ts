import { NextResponse } from "next/server"
import { OtpService } from "@/lib/server/services/otp-service"
import { readStore, writeStore } from "@/lib/backend-store"
import type { ContactMethod } from "@/lib/types"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { identifier, otp } = body as { identifier?: string; otp?: string }

    if (!identifier || typeof identifier !== "string") {
      return NextResponse.json(
        { success: false, message: "Missing or invalid 'identifier' parameter." },
        { status: 400 },
      )
    }

    if (!otp || typeof otp !== "string") {
      return NextResponse.json(
        { success: false, message: "Missing or invalid 'otp' parameter." },
        { status: 400 },
      )
    }

    const result = await OtpService.verifyOtp(identifier, otp)

    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }

    // Update user verified flag in backend store if user account exists
    const store = await readStore()
    const type: ContactMethod = identifier.includes("@") ? "email" : "phone"
    const normalized = OtpService.normalizeIdentifier(identifier, type)

    const user = store.state.users.find((u) => {
      const field = type === "email" ? u.email : u.phone
      return field ? OtpService.normalizeIdentifier(field, type) === normalized : false
    })

    if (user) {
      if (type === "email") user.emailVerified = true
      if (type === "phone") user.phoneVerified = true
      await writeStore(store)
    }

    return NextResponse.json(
      {
        success: true,
        message: "OTP verified successfully",
        user: user ?? undefined,
      },
      { status: 200 },
    )
  } catch (err) {
    console.error("[POST /api/auth/verify-otp ERROR]", err)
    return NextResponse.json(
      { success: false, message: "Internal server error verifying OTP." },
      { status: 500 },
    )
  }
}
