import { MapPin, Siren } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { EmergencyDrive } from "@/lib/types"

export function DriveCard({
  drive,
  contributed,
  action,
}: {
  drive: EmergencyDrive
  contributed?: number
  action?: React.ReactNode
}) {
  const pct = contributed != null ? Math.min(100, Math.round((contributed / drive.goal) * 100)) : null
  return (
    <Card className={drive.active ? "border-critical/30" : "opacity-70"}>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-critical/12 text-critical">
              <Siren className="size-5" />
            </span>
            <div>
              <h3 className="font-semibold leading-tight">{drive.title}</h3>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3" /> {drive.location}
              </p>
            </div>
          </div>
          <Badge variant={drive.active ? "critical" : "muted"}>
            {drive.active ? "Active" : "Closed"}
          </Badge>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{drive.description}</p>
        <div className="flex flex-wrap gap-1.5">
          {drive.categories.map((c) => (
            <Badge key={c} variant="secondary">
              {c}
            </Badge>
          ))}
        </div>
        {pct != null && (
          <div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {contributed} / {drive.goal} items
              </span>
              <span className="tabular-nums">{pct}%</span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-critical" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
        {action}
      </CardContent>
    </Card>
  )
}
