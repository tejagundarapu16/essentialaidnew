import { otpConfig } from "../config/otp-config"

export interface SendSmsInput {
  to: string
  otp: string
  expiryMinutes?: number
}

export interface SmsProvider {
  sendOtpSms(input: SendSmsInput): Promise<{ success: boolean; messageId?: string }>
}

export class ConsoleSmsProvider implements SmsProvider {
  async sendOtpSms(input: SendSmsInput): Promise<{ success: boolean; messageId?: string }> {
    console.log(`\n========================================`)
    console.log(`[SMS PROVIDER] Sending SMS to: ${input.to}`)
    console.log(`[SMS PROVIDER] Message: Your EssentialAid verification code is: ${input.otp}. Valid for ${input.expiryMinutes ?? 5} minutes.`)
    console.log(`========================================\n`)
    return { success: true, messageId: `console-sms-${Date.now()}` }
  }
}

export class TwilioSmsProvider implements SmsProvider {
  async sendOtpSms(input: SendSmsInput): Promise<{ success: boolean; messageId?: string }> {
    const config = otpConfig.sms
    if (!config.apiKey || !config.apiSecret) {
      console.warn("[TWILIO PROVIDER] Missing Twilio API credentials. Falling back to Console SMS provider.")
      return new ConsoleSmsProvider().sendOtpSms(input)
    }

    try {
      const authHeader = `Basic ${Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString("base64")}`
      const bodyParams = new URLSearchParams({
        From: config.from,
        To: input.to,
        Body: `Your EssentialAid verification code is: ${input.otp}. It expires in ${input.expiryMinutes ?? 5} minutes. Do not share this code.`,
      })

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${config.apiKey}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: bodyParams,
        },
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[TWILIO SMS ERROR]", errorText)
        return new ConsoleSmsProvider().sendOtpSms(input)
      }

      const resData = (await response.json()) as { sid?: string }
      return { success: true, messageId: resData.sid ?? `twilio-${Date.now()}` }
    } catch (err) {
      console.error("[TWILIO SMS EXCEPTION]", err)
      return new ConsoleSmsProvider().sendOtpSms(input)
    }
  }
}

export function getSmsProvider(): SmsProvider {
  if (otpConfig.sms.provider === "twilio") {
    return new TwilioSmsProvider()
  }
  return new ConsoleSmsProvider()
}
