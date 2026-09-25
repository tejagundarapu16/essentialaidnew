"use client"

import { useState, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { LifeBuoy, CheckCircle2, AlertCircle, RefreshCw, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PasswordInput } from "@/components/auth/password-input"

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setStatus(null)

    if (!token) {
      setError("Invalid or missing password reset token.")
      return
    }

    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters long.")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setIsBusy(true)

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to reset password.")
      }

      setStatus(data.message || "Password updated successfully!")
      setTimeout(() => {
        router.push("/login")
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
    } finally {
      setIsBusy(false)
    }
  }

  if (!token) {
    return (
      <div className="text-center py-6">
        <AlertCircle className="mx-auto size-12 text-destructive" />
        <h2 className="mt-4 text-xl font-bold">Invalid Reset Link</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This password reset link is invalid or has expired.
        </p>
        <Link href="/login">
          <Button className="mt-6">Return to Login</Button>
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
      <PasswordInput
        label="New Password"
        value={newPassword}
        onChange={(e) => {
          setNewPassword(e.target.value)
          setError(null)
        }}
        placeholder="Enter your new password"
      />

      <PasswordInput
        label="Confirm New Password"
        value={confirmPassword}
        onChange={(e) => {
          setConfirmPassword(e.target.value)
          setError(null)
        }}
        placeholder="Confirm your new password"
      />

      {status && (
        <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-lg border border-emerald-200">
          <CheckCircle2 className="size-4 shrink-0" />
          {status}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive font-medium bg-destructive/10 p-3 rounded-lg border border-destructive/20">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      <Button type="submit" size="lg" disabled={isBusy} className="w-full font-semibold shadow mt-2">
        {isBusy ? (
          <>
            <RefreshCw className="mr-2 size-4 animate-spin" /> Updating password...
          </>
        ) : (
          "Reset Password"
        )}
      </Button>

      <div className="text-center mt-2">
        <Link
          href="/login"
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="mr-1.5 size-4" /> Back to Login
        </Link>
      </div>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col bg-card">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-5xl items-center px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <LifeBuoy className="size-5" />
            </span>
            <span className="text-lg font-semibold tracking-tight">
              Essential<span className="text-primary">Aid</span>
            </span>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center">
            <h1 className="font-serif text-3xl font-semibold tracking-tight">Set New Password</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter your new password below to update your account access.
            </p>
          </div>

          <Card className="mt-6 border-border bg-background shadow-sm">
            <CardContent className="py-6">
              <Suspense
                fallback={
                  <div className="flex justify-center py-8">
                    <RefreshCw className="size-6 animate-spin text-primary" />
                  </div>
                }
              >
                <ResetPasswordForm />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
