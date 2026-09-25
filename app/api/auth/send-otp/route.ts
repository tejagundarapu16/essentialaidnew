import { NextResponse } from "next/server"
import { OtpService } from "@/lib/server/services/otp-service"
import type { ContactMethod } from "@/lib/types"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { identifier, type } = body as { identifier?: string; type?: ContactMethod }

    if (!identifier || typeof identifier !== "string") {
      return NextResponse.json(
        { success: false, message: "Missing or invalid 'identifier' parameter." },
        { status: 400 },
      )
    }

    const contactType: ContactMethod =
      type === "phone" || type === "email"
        ? type
        : identifier.includes("@")
        ? "email"
        : "phone"

    const result = await OtpService.requestOtp(identifier, contactType)

    if (!result.success) {
      const status = result.cooldownRemainingSeconds ? 429 : 400
      return NextResponse.json(result, { status })
    }

    return NextResponse.json(result, { status: 200 })
  } catch (err) {
    console.error("[POST /api/auth/send-otp ERROR]", err)
    return NextResponse.json(
      { success: false, message: "Internal server error processing OTP request." },
      { status: 500 },
    )
  }
}
