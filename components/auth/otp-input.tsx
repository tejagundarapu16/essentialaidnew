"use client"

import {
  useRef,
  useEffect,
  type KeyboardEvent,
  type ClipboardEvent,
  type ChangeEvent,
} from "react"
import { cn } from "@/lib/utils"

interface OtpInputProps {
  length?: number
  value: string
  onChange: (value: string) => void
  onComplete?: (code: string) => void
  disabled?: boolean
  hasError?: boolean
  className?: string
}

export function OtpInput({
  length = 6,
  value = "",
  onChange,
  onComplete,
  disabled = false,
  hasError = false,
  className,
}: OtpInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  // Keep internal digits array synced with prop value
  const digits = Array.from({ length }, (_, i) => value[i] || "")

  useEffect(() => {
    // Auto focus first input on mount if empty
    if (!value && inputsRef.current[0]) {
      inputsRef.current[0].focus()
    }
  }, [])

  const handleChange = (e: ChangeEvent<HTMLInputElement>, index: number) => {
    const val = e.target.value
    if (disabled) return

    // Allow only numeric input
    const lastChar = val.slice(-1)
    if (lastChar && !/^\d$/.test(lastChar)) {
      return
    }

    const newDigits = [...digits]
    newDigits[index] = lastChar

    const combined = newDigits.join("")
    onChange(combined)

    if (lastChar && index < length - 1) {
      inputsRef.current[index + 1]?.focus()
    }

    if (combined.length === length && onComplete) {
      onComplete(combined)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (disabled) return

    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        // Move focus back and clear previous digit
        inputsRef.current[index - 1]?.focus()
        const newDigits = [...digits]
        newDigits[index - 1] = ""
        const combined = newDigits.join("")
        onChange(combined)
      } else if (digits[index]) {
        const newDigits = [...digits]
        newDigits[index] = ""
        const combined = newDigits.join("")
        onChange(combined)
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault()
      inputsRef.current[index - 1]?.focus()
    } else if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault()
      inputsRef.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (disabled) return

    const pastedData = e.clipboardData.getData("text").trim()
    const numericOnly = pastedData.replace(/\D/g, "").slice(0, length)

    if (!numericOnly) return

    onChange(numericOnly)

    // Focus box after last pasted digit
    const nextIndex = Math.min(numericOnly.length, length - 1)
    inputsRef.current[nextIndex]?.focus()

    if (numericOnly.length === length && onComplete) {
      onComplete(numericOnly)
    }
  }

  return (
    <div className={cn("flex items-center justify-center gap-2 sm:gap-3", className)}>
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => {
            inputsRef.current[index] = el
          }}
          type="text"
          inputMode="numeric"
          pattern="\d*"
          maxLength={1}
          value={digits[index]}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          disabled={disabled}
          aria-label={`Digit ${index + 1} of ${length}`}
          className={cn(
            "flex size-11 items-center justify-center rounded-xl border text-center font-mono text-xl font-bold transition-all focus:outline-none focus:ring-2 sm:size-14 sm:text-2xl",
            hasError
              ? "border-destructive bg-destructive/5 text-destructive focus:ring-destructive/30"
              : "border-input bg-background text-foreground hover:border-primary/50 focus:border-primary focus:ring-primary/20",
            disabled && "cursor-not-allowed opacity-50 bg-muted",
          )}
        />
      ))}
    </div>
  )
}
