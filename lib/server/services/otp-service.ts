import { randomInt, randomBytes, createHash } from "node:crypto"
import { otpConfig } from "../config/otp-config"
import { OtpRepository } from "../repositories/otp-repository"
import { getEmailProvider } from "./email-service"
import { getSmsProvider } from "./sms-service"
import type { ContactMethod, OtpRecord } from "@/lib/types"

export class OtpService {
  /**
   * Generates a cryptographically secure 6-digit OTP string.
   */
  static generateOtpCode(length: number = otpConfig.otpLength): string {
    const min = Math.pow(10, length - 1)
    const max = Math.pow(10, length) - 1
    return String(randomInt(min, max + 1))
  }

  /**
   * Hashes an OTP code with a salt using SHA-256.
   */
  static hashOtp(otp: string, salt: string): string {
    return createHash("sha256")
      .update(`${salt}:${otp}`)
      .digest("hex")
  }

  /**
   * Generates a random hexadecimal salt string.
   */
  static generateSalt(): string {
    return randomBytes(16).toString("hex")
  }

  /**
   * Validates format for email or phone.
   */
  static validateIdentifier(identifier: string, type: ContactMethod): { valid: boolean; error?: string } {
    const trimmed = identifier.trim()
    if (!trimmed) {
      return { valid: false, error: "Identifier cannot be empty." }
    }

    if (type === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(trimmed)) {
        return { valid: false, error: "Please enter a valid email address (e.g. user@example.com)." }
      }
    } else if (type === "phone") {
      // E.164 or international phone format validation (at least 7 digits, digits with optional leading +)
      const cleanDigits = trimmed.replace(/[^\d+]/g, "")
      const digitsOnly = cleanDigits.replace(/[^\d]/g, "")
      if (digitsOnly.length < 7 || digitsOnly.length > 15) {
        return { valid: false, error: "Please enter a valid phone number with 7 to 15 digits." }
      }
    }

    return { valid: true }
  }

  /**
   * Normalizes email to lowercase or phone to sanitized string.
   */
  static normalizeIdentifier(identifier: string, type: ContactMethod): string {
    const trimmed = identifier.trim()
    if (type === "email") {
      return trimmed.toLowerCase()
    }
    const cleanDigits = trimmed.replace(/[^\d+]/g, "")
    if (!cleanDigits.startsWith("+")) {
      return `+${cleanDigits}`
    }
    return cleanDigits
  }

  /**
   * Masks email or phone number for user privacy.
   * Example Email: user@example.com -> u***@example.com
   * Example Phone: +919876543210 -> +91 ****3210
   */
  static maskIdentifier(identifier: string, type: ContactMethod): string {
    const normalized = this.normalizeIdentifier(identifier, type)
    if (type === "email") {
      const [local, domain] = normalized.split("@")
      if (!domain) return normalized
      if (local.length <= 2) {
        return `${local[0] || "*"}***@${domain}`
      }
      return `${local[0]}***${local[local.length - 1]}@${domain}`
    } else {
      // Phone masking
      const digitsOnly = normalized.replace(/[^\d]/g, "")
      if (digitsOnly.length <= 4) {
        return "****"
      }
      const countryPrefix = normalized.startsWith("+") ? normalized.slice(0, 3) : ""
      const last4 = digitsOnly.slice(-4)
      return `${countryPrefix} ****${last4}`.trim()
    }
  }

  /**
   * Sends or Resends an OTP to a target identifier (Email or Phone).
   */
  static async requestOtp(
    identifier: string,
    type: ContactMethod,
  ): Promise<{
    success: boolean
    message: string
    maskedIdentifier?: string
    cooldownRemainingSeconds?: number
    expiresInSeconds?: number
  }> {
    // 1. Format & Validation
    const valResult = this.validateIdentifier(identifier, type)
    if (!valResult.valid) {
      return { success: false, message: valResult.error || "Invalid contact input." }
    }

    const normalized = this.normalizeIdentifier(identifier, type)
    const masked = this.maskIdentifier(normalized, type)
    const now = Date.now()

    // 2. Check previous OTP for rate limiting & cooldown
    const existing = await OtpRepository.findLatestByIdentifier(normalized)
    if (existing && !existing.verified) {
      const timeSinceLastSent = Math.floor((now - existing.last_sent_at) / 1000)
      const cooldown = otpConfig.resendCooldownSeconds

      if (timeSinceLastSent < cooldown) {
        const remaining = cooldown - timeSinceLastSent
        return {
          success: false,
          message: `Please wait ${remaining} second${remaining > 1 ? "s" : ""} before requesting another OTP.`,
          maskedIdentifier: masked,
          cooldownRemainingSeconds: remaining,
        }
      }
    }

    // 3. Generate New OTP & Salt
    const plainOtp = this.generateOtpCode()
    const salt = this.generateSalt()
    const otpHash = this.hashOtp(plainOtp, salt)
    const expiryMs = otpConfig.expiryMinutes * 60 * 1000
    const expiresAt = now + expiryMs

    const newRecord: OtpRecord = {
      id: `otp_${Date.now()}_${randomBytes(4).toString("hex")}`,
      identifier: normalized,
      type,
      otp_hash: otpHash,
      salt,
      created_at: now,
      expires_at: expiresAt,
      attempts: 0,
      verified: false,
      last_sent_at: now,
    }

    // Save record securely (overwriting previous active OTP)
    await OtpRepository.save(newRecord)

    // 4. Dispatch via chosen channel
    if (type === "email") {
      const emailProvider = getEmailProvider()
      await emailProvider.sendOtpEmail({
        to: normalized,
        otp: plainOtp,
        expiryMinutes: otpConfig.expiryMinutes,
      })
    } else {
      const smsProvider = getSmsProvider()
      await smsProvider.sendOtpSms({
        to: normalized,
        otp: plainOtp,
        expiryMinutes: otpConfig.expiryMinutes,
      })
    }

    return {
      success: true,
      message: `OTP sent successfully to ${masked}`,
      maskedIdentifier: masked,
      cooldownRemainingSeconds: otpConfig.resendCooldownSeconds,
      expiresInSeconds: otpConfig.expiryMinutes * 60,
    }
  }

  /**
   * Verifies an OTP entered by the user.
   */
  static async verifyOtp(
    identifier: string,
    inputOtp: string,
  ): Promise<{
    success: boolean
    message: string
    remainingAttempts?: number
  }> {
    const trimmedOtp = inputOtp.trim()
    if (!trimmedOtp || trimmedOtp.length !== otpConfig.otpLength) {
      return { success: false, message: `Please enter a valid ${otpConfig.otpLength}-digit code.` }
    }

    const type: ContactMethod = identifier.includes("@") ? "email" : "phone"
    const normalized = this.normalizeIdentifier(identifier, type)
    const now = Date.now()

    const record = await OtpRepository.findLatestByIdentifier(normalized)
    if (!record || record.verified) {
      return { success: false, message: "No active OTP found. Please request a new code." }
    }

    // Check expiration
    if (now > record.expires_at) {
      return { success: false, message: "This verification code has expired. Please request a new code." }
    }

    // Check maximum attempts limit
    if (record.attempts >= otpConfig.maxAttempts) {
      return {
        success: false,
        message: `Maximum verification attempts (${otpConfig.maxAttempts}) exceeded. Please request a new code.`,
      }
    }

    // Verify hash match
    const computedHash = this.hashOtp(trimmedOtp, record.salt)
    if (computedHash !== record.otp_hash) {
      const updatedAttempts = record.attempts + 1
      record.attempts = updatedAttempts
      await OtpRepository.update(record)

      const remaining = Math.max(0, otpConfig.maxAttempts - updatedAttempts)
      if (remaining === 0) {
        return {
          success: false,
          message: "Maximum verification attempts reached. This code is now invalidated.",
          remainingAttempts: 0,
        }
      }

      return {
        success: false,
        message: `Incorrect code. ${remaining} attempt${remaining > 1 ? "s" : ""} remaining.`,
        remainingAttempts: remaining,
      }
    }

    // Success: Mark OTP verified to prevent reuse
    await OtpRepository.invalidate(record.id)

    return {
      success: true,
      message: "OTP verified successfully",
    }
  }
}
