import { Boxes, MapPin, Package, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { MatchConfidence, StatusBadge } from "@/components/status"
import type { Donation } from "@/lib/types"

export function DonationCard({
  donation,
  showDonor,
  footer,
  onClick,
}: {
  donation: Donation
  showDonor?: boolean
  footer?: React.ReactNode
  onClick?: () => void
}) {
  return (
    <Card
      className={onClick ? "cursor-pointer transition-shadow hover:shadow-md" : undefined}
      onClick={onClick}
    >
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
              <Package className="size-5" />
            </span>
            <div>
              <h3 className="font-medium leading-tight">{donation.title}</h3>
              <p className="text-xs text-muted-foreground">{donation.category}</p>
            </div>
          </div>
          <StatusBadge status={donation.status} />
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Boxes className="size-3.5" /> Qty {donation.quantity}
          </span>
          <span>{donation.condition}</span>
          <span className="flex items-center gap-1">
            <MapPin className="size-3.5" /> {donation.pickupLocation}
          </span>
          {showDonor && (
            <span className="flex items-center gap-1">
              <User className="size-3.5" /> {donation.donorName}
            </span>
          )}
        </div>

        {donation.driveId && (
          <Badge variant="critical" className="w-fit">
            Emergency drive
          </Badge>
        )}

        {donation.matchConfidence != null && <MatchConfidence value={donation.matchConfidence} />}

        {footer}
      </CardContent>
    </Card>
  )
}
