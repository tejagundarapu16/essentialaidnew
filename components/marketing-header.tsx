"use client"

import Link from "next/link"
import { LifeBuoy } from "lucide-react"
import { Button } from "@/components/ui/button"

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LifeBuoy className="size-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">
            Essential<span className="text-primary">Aid</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <a href="#how" className="transition-colors hover:text-foreground">
            How it works
          </a>
          <a href="#roles" className="transition-colors hover:text-foreground">
            For everyone
          </a>
          <a href="#drives" className="transition-colors hover:text-foreground">
            Emergency drives
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
          <Link href="/login">
            <Button size="sm">
              Get started
            </Button>
          </Link>
        </div>
      </div>
    </header>
  )
}
