"use client"

import { useState, useEffect, useCallback } from "react"
import { ArrowRight, CheckCircle2, AlertCircle, RefreshCw, Lock, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { OtpInput } from "./otp-input"
import { EmailInput } from "./email-input"

interface OtpVerificationCardProps {
  onSuccess?: (data: { identifier: string; type: "email" }) => void
  defaultIdentifier?: string
  className?: string
}

export function OtpVerificationCard({
  onSuccess,
  defaultIdentifier = "",
  className = "",
}: OtpVerificationCardProps) {
  const [identifier, setIdentifier] = useState(defaultIdentifier)
  const [step, setStep] = useState<"request" | "verify">("request")

  const [otpCode, setOtpCode] = useState("")
  const [maskedTarget, setMaskedTarget] = useState("")
  const [cooldown, setCooldown] = useState(0)

  const [isBusy, setIsBusy] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Countdown timer effect
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  // Clear messages on input change
  const handleIdentifierChange = (val: string) => {
    setIdentifier(val)
    setErrorMessage(null)
    setStatusMessage(null)
  }

  // Request OTP API call
  const handleSendOtp = async () => {
    setErrorMessage(null)
    setStatusMessage(null)
    setIsBusy(true)

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), type: "email" }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to send OTP.")
      }

      setMaskedTarget(data.maskedIdentifier || identifier)
      setCooldown(data.cooldownRemainingSeconds || 60)
      setStep("verify")
      setStatusMessage(`OTP sent successfully to ${data.maskedIdentifier || identifier}`)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "An error occurred while sending OTP.")
    } finally {
      setIsBusy(false)
    }
  }

  // Verify OTP API call
  const handleVerifyOtp = useCallback(
    async (codeToVerify?: string) => {
      const code = codeToVerify || otpCode
      if (code.length !== 6) {
        setErrorMessage("Please enter the complete 6-digit OTP.")
        return
      }

      setErrorMessage(null)
      setStatusMessage(null)
      setIsBusy(true)

      try {
        const res = await fetch("/api/auth/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            identifier: identifier.trim(),
            otp: code,
          }),
        })

        const data = await res.json()

        if (!res.ok || !data.success) {
          throw new Error(data.message || "Verification failed.")
        }

        setStatusMessage("OTP verified successfully!")
        if (onSuccess) {
          onSuccess({ identifier: identifier.trim(), type: "email" })
        }
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "Failed to verify OTP.")
      } finally {
        setIsBusy(false)
      }
    },
    [identifier, otpCode, onSuccess],
  )

  // Resend OTP API call
  const handleResendOtp = async () => {
    if (cooldown > 0 || isBusy) return

    setErrorMessage(null)
    setStatusMessage(null)
    setIsBusy(true)

    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), type: "email" }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to resend OTP.")
      }

      setOtpCode("")
      setCooldown(data.cooldownRemainingSeconds || 60)
      setStatusMessage(`New OTP sent successfully to ${data.maskedIdentifier || maskedTarget}`)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "An error occurred while resending OTP.")
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <Card className={`border-border bg-card shadow-lg transition-all ${className}`}>
      <CardHeader className="text-center pb-2">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-2">
          {step === "request" ? <Lock className="size-6" /> : <ShieldCheck className="size-6" />}
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">
          {step === "request" ? "Email OTP Authentication" : "Verify Email OTP"}
        </CardTitle>
        <CardDescription className="text-muted-foreground text-sm">
          {step === "request"
            ? "Enter your email address to receive a secure 6-digit verification code."
            : "Enter the 6-digit code sent to your email address."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 pt-4">
        {step === "request" ? (
          <div className="space-y-4">
            <EmailInput
              value={identifier}
              onChange={(e) => handleIdentifierChange(e.target.value)}
              error={errorMessage}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  void handleSendOtp()
                }
              }}
            />

            {statusMessage && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-sm font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="size-4 shrink-0" />
                <span>{statusMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-sm font-medium text-destructive border border-destructive/20">
                <AlertCircle className="size-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <Button
              size="lg"
              className="w-full font-semibold shadow-md"
              onClick={handleSendOtp}
              disabled={isBusy || !identifier.trim()}
            >
              {isBusy ? (
                <>
                  <RefreshCw className="mr-2 size-4 animate-spin" /> Sending Code...
                </>
              ) : (
                <>
                  Send OTP Code <ArrowRight className="ml-2 size-4" />
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-5 text-center">
            {maskedTarget && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm font-medium text-foreground">
                OTP sent successfully to <span className="font-bold text-primary">{maskedTarget}</span>
              </div>
            )}

            <div className="py-2">
              <OtpInput
                value={otpCode}
                onChange={setOtpCode}
                onComplete={(code) => void handleVerifyOtp(code)}
                disabled={isBusy}
                hasError={!!errorMessage}
              />
            </div>

            {statusMessage && (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-sm font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="size-4 shrink-0" />
                <span>{statusMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-destructive/10 p-3 text-sm font-medium text-destructive border border-destructive/20">
                <AlertCircle className="size-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-3 pt-2">
              <Button
                size="lg"
                className="w-full font-semibold shadow-md"
                onClick={() => void handleVerifyOtp()}
                disabled={isBusy || otpCode.length !== 6}
              >
                {isBusy ? (
                  <>
                    <RefreshCw className="mr-2 size-4 animate-spin" /> Verifying...
                  </>
                ) : (
                  "Verify OTP"
                )}
              </Button>

              <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setStep("request")
                    setOtpCode("")
                    setErrorMessage(null)
                    setStatusMessage(null)
                  }}
                  className="font-medium text-muted-foreground hover:text-foreground underline transition-colors"
                >
                  Change Email
                </button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResendOtp}
                  disabled={cooldown > 0 || isBusy}
                  className="font-semibold text-primary hover:text-primary/80"
                >
                  {cooldown > 0 ? (
                    `Resend OTP in ${cooldown}s`
                  ) : (
                    <>
                      <RefreshCw className="mr-1.5 size-3.5" /> Resend OTP
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
