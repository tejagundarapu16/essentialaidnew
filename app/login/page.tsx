"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { ArrowRight, Check, LifeBuoy, RefreshCw, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Field, Input } from "@/components/ui/field"
import { EmailInput } from "@/components/auth/email-input"
import { PasswordInput } from "@/components/auth/password-input"
import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"
import { ROLE_META, ROLE_ORDER } from "@/lib/roles"
import type { Role } from "@/lib/types"

type AuthMode = "login" | "signup" | "forgot"

export default function LoginPage() {
  const router = useRouter()
  const { setSessionUser } = useStore()

  const [mode, setMode] = useState<AuthMode>("login")
  const [selectedRole, setSelectedRole] = useState<Role>("donor")
  const [name, setName] = useState("")
  const [location, setLocation] = useState("")
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  async function handleLogin(e?: React.FormEvent) {
    if (e) e.preventDefault()
    setError(null)
    setStatus(null)

    const trimmedEmail = identifier.trim().toLowerCase()
    if (!trimmedEmail) {
      setError("Email is required.")
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address.")
      return
    }

    if (!password) {
      setError("Password is required.")
      return
    }

    setIsBusy(true)

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          password,
          role: selectedRole,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Invalid email or password.")
      }

      setSessionUser(data.user, selectedRole)
      router.push("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
    } finally {
      setIsBusy(false)
    }
  }

  async function handleSignup(e?: React.FormEvent) {
    if (e) e.preventDefault()
    setError(null)
    setStatus(null)

    if (!name.trim()) {
      setError("Full name is required.")
      return
    }

    const trimmedEmail = identifier.trim().toLowerCase()
    if (!trimmedEmail) {
      setError("Email is required.")
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address.")
      return
    }

    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters long.")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setIsBusy(true)

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: trimmedEmail,
          password,
          role: selectedRole,
          location: location.trim() || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to create account.")
      }

      setSessionUser(data.user, selectedRole)
      router.push("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
    } finally {
      setIsBusy(false)
    }
  }

  async function handleForgotPassword(e?: React.FormEvent) {
    if (e) e.preventDefault()
    setError(null)
    setStatus(null)

    const trimmedEmail = identifier.trim().toLowerCase()
    if (!trimmedEmail) {
      setError("Email is required.")
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address.")
      return
    }

    setIsBusy(true)

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to send password reset email.")
      }

      setStatus(data.message || "Password reset link sent to your email.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
    } finally {
      setIsBusy(false)
    }
  }

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
        <div className="w-full max-w-2xl">
          <div className="text-center">
            <h1 className="font-serif text-3xl font-semibold tracking-tight">
              {mode === "forgot"
                ? "Reset Your Password"
                : mode === "signup"
                ? "Create your account"
                : "Sign in to your portal"}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {mode === "forgot"
                ? "Enter your email address to receive a secure password reset link."
                : "Enter your email and password to access your EssentialAid account."}
            </p>
          </div>

          {mode !== "forgot" && (
            <>
              <div className="mt-6 grid grid-cols-2 gap-2 rounded-xl border border-border bg-background p-1">
                {(["login", "signup"] as AuthMode[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setMode(item)
                      setError(null)
                      setStatus(null)
                    }}
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      mode === item ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {item === "login" ? "Login" : "Sign up"}
                  </button>
                ))}
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {ROLE_ORDER.map((role) => {
                  const meta = ROLE_META[role]
                  const isActive = selectedRole === role
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setSelectedRole(role)}
                      className={cn(
                        "flex items-start gap-3 rounded-xl border p-4 text-left transition-all",
                        isActive
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-border bg-background hover:border-primary/40",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-10 shrink-0 items-center justify-center rounded-lg",
                          isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                        )}
                      >
                        <meta.icon className="size-5" />
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{meta.short}</span>
                          {isActive && <Check className="size-4 text-primary" />}
                        </div>
                        <p className="mt-1 text-sm leading-snug text-muted-foreground">{meta.description}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          )}

          <Card className="mt-6 border-border bg-background shadow-sm">
            <CardContent className="flex flex-col gap-4 py-6">
              {mode === "forgot" ? (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <EmailInput
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value)
                      setError(null)
                    }}
                    error={error}
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

                  <Button
                    type="submit"
                    size="lg"
                    disabled={isBusy || !identifier.trim()}
                    className="w-full font-semibold shadow"
                  >
                    {isBusy ? (
                      <>
                        <RefreshCw className="mr-2 size-4 animate-spin" /> Sending link...
                      </>
                    ) : (
                      "Send Reset Link"
                    )}
                  </Button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMode("login")
                        setError(null)
                        setStatus(null)
                      }}
                      className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ArrowLeft className="mr-1.5 size-4" /> Back to Login
                    </button>
                  </div>
                </form>
              ) : mode === "login" ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <EmailInput
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value)
                      setError(null)
                    }}
                    error={error}
                  />

                  <div>
                    <PasswordInput
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        setError(null)
                      }}
                      placeholder="Enter your password"
                    />
                    <div className="mt-1.5 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setMode("forgot")
                          setError(null)
                          setStatus(null)
                        }}
                        className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                  </div>

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

                  <Button
                    type="submit"
                    size="lg"
                    disabled={isBusy || !identifier.trim() || !password}
                    className="w-full font-semibold shadow"
                  >
                    {isBusy ? (
                      <>
                        <RefreshCw className="mr-2 size-4 animate-spin" /> Logging in...
                      </>
                    ) : (
                      <>
                        Login <ArrowRight className="ml-2 size-4" />
                      </>
                    )}
                  </Button>

                  <div className="text-center text-sm text-muted-foreground pt-1">
                    Don't have an account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setMode("signup")
                        setError(null)
                        setStatus(null)
                      }}
                      className="font-semibold text-primary hover:underline transition-colors"
                    >
                      Sign up
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Full name">
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                      />
                    </Field>
                    <Field label="Location">
                      <Input
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="City or neighborhood"
                      />
                    </Field>
                  </div>

                  <EmailInput
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value)
                      setError(null)
                    }}
                    error={error}
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <PasswordInput
                      label="Password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        setError(null)
                      }}
                      placeholder="At least 6 characters"
                    />

                    <PasswordInput
                      label="Confirm Password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value)
                        setError(null)
                      }}
                      placeholder="Re-enter password"
                    />
                  </div>

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

                  <Button
                    type="submit"
                    size="lg"
                    disabled={isBusy || !identifier.trim() || !password || !confirmPassword || !name.trim()}
                    className="w-full font-semibold shadow"
                  >
                    {isBusy ? (
                      <>
                        <RefreshCw className="mr-2 size-4 animate-spin" /> Creating account...
                      </>
                    ) : (
                      <>
                        Create Account <ArrowRight className="ml-2 size-4" />
                      </>
                    )}
                  </Button>

                  <div className="text-center text-sm text-muted-foreground pt-1">
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setMode("login")
                        setError(null)
                        setStatus(null)
                      }}
                      className="font-semibold text-primary hover:underline transition-colors"
                    >
                      Login
                    </button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
