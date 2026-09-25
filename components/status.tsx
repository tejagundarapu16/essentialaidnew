import { Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { DONATION_FLOW, type DonationStatus, type Urgency } from "@/lib/types"
import { confidenceLabel } from "@/lib/matching"

const STATUS_VARIANT: Record<DonationStatus, "muted" | "default" | "warning" | "success"> = {
  Listed: "muted",
  Verified: "default",
  Matched: "default",
  "Picked-up": "warning",
  "In-transit": "warning",
  Delivered: "success",
  Reviewed: "success",
}

export function StatusBadge({ status }: { status: DonationStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>
}

export function RequestStatusBadge({
  status,
}: {
  status: "Open" | "Matched" | "Delivered" | "Reviewed"
}) {
  const map = {
    Open: "warning",
    Matched: "default",
    Delivered: "success",
    Reviewed: "success",
  } as const
  return <Badge variant={map[status]}>{status}</Badge>
}

export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  const map = { Normal: "muted", High: "warning", Critical: "critical" } as const
  return (
    <Badge variant={map[urgency]}>
      {urgency === "Critical" && <span className="inline-block size-1.5 rounded-full bg-critical" />}
      {urgency}
    </Badge>
  )
}

export function MatchConfidence({ value }: { value: number }) {
  const { label, tone } = confidenceLabel(value)
  const color =
    tone === "high" ? "text-success" : tone === "mid" ? "text-primary" : "text-muted-foreground"
  const bar = tone === "high" ? "bg-success" : tone === "mid" ? "bg-primary" : "bg-muted-foreground"
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className={cn("font-medium", color)}>{label}</span>
        <span className="tabular-nums text-muted-foreground">{value}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", bar)} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

export function StatusTimeline({
  history,
  current,
}: {
  history: { status: DonationStatus; at: number; note?: string }[]
  current: DonationStatus
}) {
  const currentIndex = DONATION_FLOW.indexOf(current)
  const reached = new Map(history.map((h) => [h.status, h.at]))

  return (
    <ol className="relative flex flex-col gap-0">
      {DONATION_FLOW.map((stage, i) => {
        const isDone = i < currentIndex
        const isCurrent = i === currentIndex
        const at = reached.get(stage)
        const note = history.find((h) => h.status === stage)?.note
        return (
          <li key={stage} className="flex gap-3 pb-5 last:pb-0">
            <div className="relative flex flex-col items-center">
              <span
                className={cn(
                  "z-10 flex size-6 items-center justify-center rounded-full border-2 text-xs",
                  isDone && "border-success bg-success text-success-foreground",
                  isCurrent && "border-primary bg-primary text-primary-foreground",
                  !isDone && !isCurrent && "border-border bg-card text-muted-foreground",
                )}
              >
                {isDone ? <Check className="size-3.5" /> : i + 1}
              </span>
              {i < DONATION_FLOW.length - 1 && (
                <span
                  className={cn(
                    "absolute top-6 h-full w-0.5",
                    i < currentIndex ? "bg-success" : "bg-border",
                  )}
                />
              )}
            </div>
            <div className="flex flex-col pt-0.5">
              <span
                className={cn(
                  "text-sm font-medium",
                  isCurrent ? "text-foreground" : isDone ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {stage}
              </span>
              {at && (
                <span className="text-xs text-muted-foreground">
                  {new Date(at).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              )}
              {note && <span className="text-xs text-muted-foreground italic">{note}</span>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
