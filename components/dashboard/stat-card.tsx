import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "primary",
}: {
  icon: LucideIcon
  label: string
  value: string | number
  hint?: string
  tone?: "primary" | "success" | "warning" | "critical"
}) {
  const toneMap = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/12 text-success",
    warning: "bg-warning/20 text-warning-foreground",
    critical: "bg-critical/12 text-critical",
  }
  return (
    <Card className="gap-3 py-4">
      <CardContent className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 font-serif text-2xl font-semibold tabular-nums">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <span className={cn("flex size-10 items-center justify-center rounded-xl", toneMap[tone])}>
          <Icon className="size-5" />
        </span>
      </CardContent>
    </Card>
  )
}
