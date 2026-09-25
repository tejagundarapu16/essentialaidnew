"use client"

import { useState } from "react"
import { Lock, Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"

interface PasswordInputProps extends React.ComponentProps<"input"> {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  error?: string | null
  label?: string
  placeholder?: string
}

export function PasswordInput({
  value,
  onChange,
  error,
  label = "Password",
  className,
  placeholder = "Enter your password",
  ...props
}: PasswordInputProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-sm font-semibold tracking-tight text-foreground/90 flex items-center justify-between">
          <span>{label}</span>
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
        <Lock
          className={cn(
            "size-5 shrink-0 transition-colors duration-200 mr-3",
            error
              ? "text-destructive"
              : isFocused
              ? "text-primary"
              : "text-muted-foreground group-hover:text-foreground/70",
          )}
        />

        <input
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="h-full w-full bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground/60 focus:outline-none pr-8"
          {...props}
        />

        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          className="absolute right-3.5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
          tabIndex={-1}
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
        </button>
      </div>
    </div>
  )
}
