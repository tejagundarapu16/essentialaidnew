"use client"

import { useState } from "react"
import { Boxes, MapPin, Package, Truck, User, X, Clock, Map as MapIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { StatusTimeline } from "@/components/status"
import { DeliveryTrackingMap } from "@/components/maps/delivery-tracking-map"
import { useStore } from "@/lib/store"
import type { Donation } from "@/lib/types"

export function TrackingDialog({
  donation,
  onClose,
}: {
  donation: Donation
  onClose: () => void
}) {
  const { requests } = useStore()
  const [activeTab, setActiveTab] = useState<"map" | "timeline">("map")
  const matched = requests.find((r) => r.id === donation.matchedRequestId)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 sm:items-center sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:rounded-2xl">
        {/* Dialog Header */}
        <div className="flex items-start justify-between border-b border-border p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Package className="size-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-lg leading-tight text-foreground">{donation.title}</h2>
                <Badge variant="outline" className="text-xs">
                  {donation.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {donation.category} · Ref ID: {donation.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* View Mode Tabs */}
        <div className="flex border-b border-border bg-muted/40 px-5 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab("map")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              activeTab === "map"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <MapIcon className="size-4" /> Live Map & GPS Route
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("timeline")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              activeTab === "timeline"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock className="size-4" /> Status Timeline
          </button>
        </div>

        {/* Dialog Content Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === "map" ? (
            <DeliveryTrackingMap donation={donation} matchedRequest={matched} />
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Boxes className="size-4" /> Quantity:{" "}
                  <span className="font-semibold text-foreground">{donation.quantity}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  Condition: <span className="font-semibold text-foreground">{donation.condition}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="size-4" />{" "}
                  <span className="font-semibold text-foreground truncate">{donation.pickupLocation}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="size-4" />{" "}
                  <span className="font-semibold text-foreground truncate">{donation.donorName}</span>
                </div>
              </div>

              {donation.pickupMethod && (
                <div className="flex items-center gap-3 rounded-xl border border-border bg-background p-3.5 text-sm shadow-sm">
                  <Truck className="size-5 text-primary shrink-0" />
                  <div>
                    <p className="font-bold text-foreground">{donation.pickupMethod}</p>
                    {donation.deliveryWindow && (
                      <p className="text-xs text-muted-foreground mt-0.5">{donation.deliveryWindow}</p>
                    )}
                  </div>
                </div>
              )}

              {matched && (
                <div className="rounded-xl border border-border bg-background p-3.5 text-sm shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Matched Request
                  </p>
                  <p className="mt-1 font-bold text-foreground">
                    {matched.recipientName} · {matched.deliveryAddress}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="secondary">{matched.category}</Badge>
                    {donation.matchConfidence != null && (
                      <span className="text-xs font-medium text-muted-foreground">
                        {donation.matchConfidence}% match confidence
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div>
                <p className="mb-3 text-sm font-bold text-foreground">6-Stage Delivery Progress</p>
                <StatusTimeline history={donation.history} current={donation.status} />
              </div>

              {donation.feedback && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Recipient Feedback · {donation.rating}/5 ⭐
                  </p>
                  <p className="mt-1 text-sm text-foreground">{donation.feedback}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 bg-card">
          <Button variant="outline" className="w-full font-semibold" onClick={onClose}>
            Close Tracker
          </Button>
        </div>
      </div>
    </div>
  )
}

