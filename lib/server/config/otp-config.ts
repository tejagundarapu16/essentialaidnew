export interface OtpConfig {
  expiryMinutes: number
  otpLength: number
  resendCooldownSeconds: number
  maxAttempts: number
  email: {
    provider: "smtp" | "console"
    host?: string
    port?: number
    username?: string
    password?: string
    from: string
  }
  sms: {
    provider: "twilio" | "console"
    apiKey?: string
    apiSecret?: string
    from: string
  }
}

export const otpConfig: OtpConfig = {
  expiryMinutes: Number(process.env.OTP_EXPIRY_MINUTES) || 5,
  otpLength: Number(process.env.OTP_LENGTH) || 6,
  resendCooldownSeconds: Number(process.env.OTP_RESEND_COOLDOWN) || 60,
  maxAttempts: Number(process.env.MAX_VERIFICATION_ATTEMPTS) || 5,
  email: {
    provider: (process.env.EMAIL_PROVIDER as "smtp" | "console") || "smtp",
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
    username: (process.env.SMTP_USERNAME || "tejagundarapu9@gmail.com").trim(),
    password: (process.env.SMTP_PASSWORD || "tqnm ukmf hqca zrlo").replace(/\s+/g, ""),
    from: (process.env.EMAIL_FROM || '"EssentialAid" <tejagundarapu9@gmail.com>').trim(),
  },
  sms: {
    provider: (process.env.SMS_PROVIDER as "twilio" | "console") || "console",
    apiKey: process.env.SMS_API_KEY,
    apiSecret: process.env.SMS_API_SECRET,
    from: process.env.SMS_FROM || "+15550199283",
  },
}
