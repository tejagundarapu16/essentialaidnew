import nodemailer from "nodemailer"
import { otpConfig } from "../config/otp-config"

export interface SendEmailInput {
  to: string
  otp: string
  expiryMinutes?: number
}

export interface SendResetEmailInput {
  to: string
  resetUrl: string
  expiryMinutes?: number
}

export interface EmailProvider {
  sendOtpEmail(input: SendEmailInput): Promise<{ success: boolean; messageId?: string }>
  sendPasswordResetEmail(input: SendResetEmailInput): Promise<{ success: boolean; messageId?: string }>
}

export function renderOtpEmailHtml(otp: string, expiryMinutes: number = 5): string {
  const currentYear = new Date().getFullYear()

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email - EssentialAid</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f6f8;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #f4f6f8;
      padding: 40px 0;
    }
    .main {
      background-color: #ffffff;
      margin: 0 auto;
      width: 100%;
      max-width: 540px;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      padding: 32px 40px;
      text-align: center;
    }
    .logo {
      color: #ffffff;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.5px;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
    }
    .logo-accent {
      color: #0284c7;
    }
    .content {
      padding: 40px;
      text-align: center;
    }
    .heading {
      font-size: 22px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 12px 0;
      letter-spacing: -0.3px;
    }
    .text {
      font-size: 15px;
      line-height: 1.6;
      color: #475569;
      margin: 0 0 28px 0;
    }
    .otp-container {
      background: #f8fafc;
      border: 2px dashed #0284c7;
      border-radius: 12px;
      padding: 20px 24px;
      display: inline-block;
      margin: 0 auto 28px auto;
    }
    .otp-code {
      font-family: 'Courier New', Courier, monospace;
      font-size: 36px;
      font-weight: 800;
      letter-spacing: 10px;
      color: #0284c7;
      margin: 0;
      text-indent: 10px;
    }
    .expiry-note {
      font-size: 14px;
      font-weight: 600;
      color: #64748b;
      margin: 0 0 24px 0;
    }
    .security-warning {
      background-color: #f1f5f9;
      border-left: 4px solid #94a3b8;
      border-radius: 6px;
      padding: 12px 16px;
      font-size: 13px;
      color: #64748b;
      text-align: left;
      line-height: 1.5;
      margin-bottom: 0;
    }
    .footer {
      background-color: #f8fafc;
      border-top: 1px solid #f1f5f9;
      padding: 24px 40px;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
    }
    @media only screen and (max-width: 600px) {
      .wrapper { padding: 20px 10px; }
      .header { padding: 24px 20px; }
      .content { padding: 28px 20px; }
      .otp-code { font-size: 30px; letter-spacing: 6px; }
      .footer { padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <table class="main" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td class="header">
          <div class="logo">⚡ Essential<span class="logo-accent">Aid</span></div>
        </td>
      </tr>
      <tr>
        <td class="content">
          <h1 class="heading">Verify Your Email</h1>
          <p class="text">Use the verification code below to complete your verification.</p>

          <div class="otp-container">
            <p class="otp-code">${otp}</p>
          </div>

          <p class="expiry-note">This code expires in ${expiryMinutes} minutes.</p>

          <div class="security-warning">
            <strong>Security Notice:</strong> If you did not request this code, you can safely ignore this email. Someone may have entered your email address by mistake.
          </div>
        </td>
      </tr>
      <tr>
        <td class="footer">
          &copy; ${currentYear} EssentialAid. All rights reserved.<br>
          Building crisis-resilient community supply chains.
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`
}

export function renderPasswordResetEmailHtml(resetUrl: string, expiryMinutes: number = 60): string {
  const currentYear = new Date().getFullYear()

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password - EssentialAid</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; }
    .wrapper { width: 100%; padding: 40px 0; background-color: #f4f6f8; }
    .main { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 540px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); overflow: hidden; }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 40px; text-align: center; }
    .logo { color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; text-decoration: none; }
    .logo-accent { color: #0284c7; }
    .content { padding: 40px; text-align: center; }
    .heading { font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 12px 0; }
    .text { font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 28px 0; }
    .btn { display: inline-block; background-color: #0284c7; color: #ffffff !important; font-weight: 600; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-size: 15px; margin: 0 auto 28px auto; }
    .expiry-note { font-size: 14px; font-weight: 600; color: #64748b; margin: 0 0 24px 0; }
    .security-warning { background-color: #f1f5f9; border-left: 4px solid #94a3b8; border-radius: 6px; padding: 12px 16px; font-size: 13px; color: #64748b; text-align: left; line-height: 1.5; }
    .footer { background-color: #f8fafc; border-top: 1px solid #f1f5f9; padding: 24px 40px; text-align: center; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="wrapper">
    <table class="main" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td class="header">
          <div class="logo">⚡ Essential<span class="logo-accent">Aid</span></div>
        </td>
      </tr>
      <tr>
        <td class="content">
          <h1 class="heading">Reset Your Password</h1>
          <p class="text">We received a request to reset your EssentialAid password. Click the button below to set a new password.</p>

          <a href="${resetUrl}" class="btn" target="_blank">Reset Password</a>

          <p class="expiry-note">This link expires in ${expiryMinutes} minutes.</p>

          <div class="security-warning">
            <strong>Security Notice:</strong> If you did not request a password reset, you can safely ignore this email.
          </div>
        </td>
      </tr>
      <tr>
        <td class="footer">
          &copy; ${currentYear} EssentialAid. All rights reserved.
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`
}

export class ConsoleEmailProvider implements EmailProvider {
  async sendOtpEmail(input: SendEmailInput): Promise<{ success: boolean; messageId?: string }> {
    console.log(`\n========================================`)
    console.log(`[DEV CONSOLE OTP] (No real email sent)`)
    console.log(`To: ${input.to}`)
    console.log(`Subject: Verify Your Email - EssentialAid`)
    console.log(`🔐 OTP Code: ${input.otp}`)
    console.log(`Expires in: ${input.expiryMinutes ?? 5} minutes`)
    console.log(`========================================\n`)
    return { success: true, messageId: `console-email-${Date.now()}` }
  }

  async sendPasswordResetEmail(input: SendResetEmailInput): Promise<{ success: boolean; messageId?: string }> {
    console.log(`\n========================================`)
    console.log(`[DEV CONSOLE PASSWORD RESET]`)
    console.log(`To: ${input.to}`)
    console.log(`Subject: Reset Your Password - EssentialAid`)
    console.log(`🔗 Reset Link: ${input.resetUrl}`)
    console.log(`Expires in: ${input.expiryMinutes ?? 60} minutes`)
    console.log(`========================================\n`)
    return { success: true, messageId: `console-reset-${Date.now()}` }
  }
}

export class SmtpEmailProvider implements EmailProvider {
  async sendOtpEmail(input: SendEmailInput): Promise<{ success: boolean; messageId?: string }> {
    const config = otpConfig.email
    if (!config.username || !config.password) {
      console.warn("[SMTP PROVIDER] Missing SMTP username or password. Falling back to Console provider.")
      return new ConsoleEmailProvider().sendOtpEmail(input)
    }

    try {
      const isGmail = config.host?.includes("gmail.com") || config.username.includes("@gmail.com")
      const pass = config.password.replace(/\s+/g, "")

      const transportOptions: nodemailer.TransportOptions = isGmail
        ? ({
            service: "gmail",
            auth: {
              user: config.username,
              pass,
            },
          } as unknown as nodemailer.TransportOptions)
        : ({
            host: config.host,
            port: config.port ?? 587,
            secure: config.port === 465,
            auth: {
              user: config.username,
              pass,
            },
          } as unknown as nodemailer.TransportOptions)

      const transporter = nodemailer.createTransport(transportOptions)

      console.log(`[SMTP PROVIDER] Attempting to send live email via Gmail SMTP to: ${input.to}...`)

      const htmlContent = renderOtpEmailHtml(input.otp, input.expiryMinutes)
      const info = await transporter.sendMail({
        from: config.from || `"EssentialAid" <${config.username}>`,
        to: input.to,
        subject: "Verify Your Email - EssentialAid",
        text: `Use the verification code below to complete your verification:\n\n${input.otp}\n\nThis code expires in ${input.expiryMinutes ?? 5} minutes.`,
        html: htmlContent,
      })

      console.log(`✅ [SMTP PROVIDER] Live email successfully dispatched! Message ID: ${info.messageId}`)
      return { success: true, messageId: info.messageId }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      console.error(`❌ [SMTP PROVIDER ERROR] Failed to send email via SMTP: ${errorMsg}`)
      console.warn(`[SMTP PROVIDER] Falling back to Console log so local authentication can proceed:`)
      return new ConsoleEmailProvider().sendOtpEmail(input)
    }
  }

  async sendPasswordResetEmail(input: SendResetEmailInput): Promise<{ success: boolean; messageId?: string }> {
    const config = otpConfig.email
    if (!config.username || !config.password) {
      console.warn("[SMTP PROVIDER] Missing SMTP credentials. Falling back to Console provider.")
      return new ConsoleEmailProvider().sendPasswordResetEmail(input)
    }

    try {
      const isGmail = config.host?.includes("gmail.com") || config.username.includes("@gmail.com")
      const pass = config.password.replace(/\s+/g, "")

      const transportOptions: nodemailer.TransportOptions = isGmail
        ? ({
            service: "gmail",
            auth: {
              user: config.username,
              pass,
            },
          } as unknown as nodemailer.TransportOptions)
        : ({
            host: config.host,
            port: config.port ?? 587,
            secure: config.port === 465,
            auth: {
              user: config.username,
              pass,
            },
          } as unknown as nodemailer.TransportOptions)

      const transporter = nodemailer.createTransport(transportOptions)

      console.log(`[SMTP PROVIDER] Sending Password Reset Email to: ${input.to}...`)

      const htmlContent = renderPasswordResetEmailHtml(input.resetUrl, input.expiryMinutes)
      const info = await transporter.sendMail({
        from: config.from || `"EssentialAid" <${config.username}>`,
        to: input.to,
        subject: "Reset Your Password - EssentialAid",
        text: `Reset your password by visiting the following link:\n\n${input.resetUrl}\n\nThis link expires in ${input.expiryMinutes ?? 60} minutes.`,
        html: htmlContent,
      })

      console.log(`✅ [SMTP PROVIDER] Password Reset email dispatched! Message ID: ${info.messageId}`)
      return { success: true, messageId: info.messageId }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      console.error(`❌ [SMTP PROVIDER ERROR] Failed to send reset email via SMTP: ${errorMsg}`)
      return new ConsoleEmailProvider().sendPasswordResetEmail(input)
    }
  }
}

export function getEmailProvider(): EmailProvider {
  if (otpConfig.email.provider === "smtp") {
    return new SmtpEmailProvider()
  }
  return new ConsoleEmailProvider()
}
