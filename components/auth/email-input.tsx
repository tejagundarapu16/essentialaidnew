"use client"

import { useState } from "react"
import { Mail, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmailInputProps extends React.ComponentProps<"input"> {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  error?: string | null
  label?: string
}

export function EmailInput({
  value,
  onChange,
  error,
  label = "Email Address",
  className,
  placeholder = "name@example.com",
  ...props
}: EmailInputProps) {
  const [isFocused, setIsFocused] = useState(false)

  // Simple client-side regex check to give immediate green check badge
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-sm font-semibold tracking-tight text-foreground/90 flex items-center justify-between">
          <span>{label}</span>
          {isValidEmail && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 animate-in fade-in duration-200">
              <CheckCircle2 className="size-3.5" /> Valid format
            </span>
          )}
        </label>
      )}

      <div
        className={cn(
          "group relative flex h-12 w-full items-center rounded-xl border bg-background px-3.5 shadow-sm transition-all duration-200",
          error
            ? "border-destructive bg-destructive/5 ring-4 ring-destructive/10"
            : isFocused
            ? "border-primary ring-4 ring-primary/15 shadow-md"
            : "border-input hover:border-primary/40 hover:bg-accent/5",
          className,
        )}
      >
        <Mail
          className={cn(
            "size-5 shrink-0 transition-colors duration-200 mr-3",
            error
              ? "text-destructive"
              : isFocused || isValidEmail
              ? "text-primary"
              : "text-muted-foreground group-hover:text-foreground/70",
          )}
        />

        <input
          type="email"
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="h-full w-full bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground/60 focus:outline-none"
          {...props}
        />

        {isValidEmail && !error && (
          <div className="flex items-center justify-center size-6 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0 ml-2 animate-in zoom-in-75 duration-200">
            <CheckCircle2 className="size-4" />
          </div>
        )}
      </div>
    </div>
  )
}
