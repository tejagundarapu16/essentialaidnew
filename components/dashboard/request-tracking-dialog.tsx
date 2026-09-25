"use client"

import { useMemo, useState } from "react"
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  HeartHandshake,
  MapPin,
  Package,
  Sparkles,
  Star,
  Truck,
  X,
  Search,
  Map as MapIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { GoogleMapView, type MapMarkerItem, type MapRouteItem } from "@/components/maps/google-map-view"
import { StatusTimeline, UrgencyBadge, RequestStatusBadge } from "@/components/status"
import { calculateDistance, estimateTravelTime, getDonationDeliveryPosition } from "@/lib/geo"
import { useStore } from "@/lib/store"
import type { AidRequest } from "@/lib/types"

interface RequestTrackingDialogProps {
  request: AidRequest
  onClose: () => void
  onMatchWithDonation?: (donationId: string, requestId: string) => void
}

export function RequestTrackingDialog({
  request,
  onClose,
  onMatchWithDonation,
}: RequestTrackingDialogProps) {
  const { donations, matchDonation, reviewDonation } = useStore()
  const [activeTab, setActiveTab] = useState<"map" | "timeline" | "matches">("map")
  const [rating, setRating] = useState(5)
  const [feedbackText, setFeedbackText] = useState("")
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)

  // Find matched donation if linked
  const matchedDonation = useMemo(() => {
    return donations.find((d) => d.id === request.matchedDonationId || d.matchedRequestId === request.id)
  }, [donations, request.id, request.matchedDonationId])

  // Find potential candidate donations that match category and are verified/available
  const candidateDonations = useMemo(() => {
    if (matchedDonation) return []
    return donations.filter(
      (d) => d.verified && !d.matchedRequestId && d.category === request.category,
    )
  }, [donations, matchedDonation, request.category])

  // Compute location and delivery info
  const deliveryData = useMemo(() => {
    if (matchedDonation) {
      return getDonationDeliveryPosition(matchedDonation, request)
    }
    return {
      donorCoords: { lat: 30.4, lng: -97.72 },
      recipientCoords: request.coords || { lat: 30.26, lng: -97.68 },
      currentCoords: request.coords || { lat: 30.26, lng: -97.68 },
      progressPercentage: 0,
      stageLabel: "Awaiting donor match",
      isDelivered: request.status === "Delivered" || request.status === "Reviewed",
      isInTransit: false,
    }
  }, [matchedDonation, request])

  const distanceInfo = useMemo(() => {
    if (matchedDonation) {
      return calculateDistance(deliveryData.donorCoords, deliveryData.recipientCoords)
    }
    return null
  }, [matchedDonation, deliveryData.donorCoords, deliveryData.recipientCoords])

  const timeInfo = useMemo(() => {
    if (!distanceInfo) return null
    return estimateTravelTime(distanceInfo.miles)
  }, [distanceInfo])

  // Generate Map Markers
  const { markers, routes } = useMemo(() => {
    const mList: MapMarkerItem[] = []
    const rList: MapRouteItem[] = []

    // 1. Recipient destination pin
    mList.push({
      id: `recipient-${request.id}`,
      coords: deliveryData.recipientCoords,
      title: `Your Request Location`,
      subtitle: `${request.category} (Qty ${request.quantity})`,
      type: "recipient",
      status: request.status,
      badge: `${request.urgency} Urgency`,
      details: {
        address: request.deliveryAddress,
        category: request.category,
      },
    })

    // 2. If matched, plot the Donor & Live Vehicle
    if (matchedDonation) {
      mList.push({
        id: `donor-${matchedDonation.id}`,
        coords: deliveryData.donorCoords,
        title: `Donor: ${matchedDonation.donorName}`,
        subtitle: `${matchedDonation.title} (${matchedDonation.condition})`,
        type: "donor",
        status: matchedDonation.status,
        badge: "Matched Supply Origin",
        details: {
          address: matchedDonation.pickupLocation,
          category: matchedDonation.category,
          quantity: matchedDonation.quantity,
        },
      })

      rList.push({
        id: `route-${request.id}`,
        from: deliveryData.donorCoords,
        to: deliveryData.recipientCoords,
        currentPosition: deliveryData.currentCoords,
        status: matchedDonation.status,
        color: deliveryData.isDelivered ? "#10b981" : "#0284c7",
      })

      if (deliveryData.isInTransit && !deliveryData.isDelivered) {
        mList.push({
          id: `driver-${matchedDonation.id}`,
          coords: deliveryData.currentCoords,
          title: `Courier In Transit`,
          subtitle: `${matchedDonation.pickupMethod || "Volunteer Delivery"} · ${deliveryData.stageLabel}`,
          type: "driver",
          status: matchedDonation.status,
          badge: "Live Dispatch GPS",
          details: {
            address: `En route to ${request.deliveryAddress}`,
            category: request.category,
          },
        })
      }
    } else {
      // If open, plot nearby candidate donations on the map as potential supply hubs
      candidateDonations.forEach((cand) => {
        mList.push({
          id: `candidate-${cand.id}`,
          coords: cand.coords || { lat: 30.3 + (Math.random() - 0.5) * 0.05, lng: -97.7 + (Math.random() - 0.5) * 0.05 },
          title: `Available: ${cand.title}`,
          subtitle: `From ${cand.donorName} · Qty ${cand.quantity}`,
          type: "donor",
          status: "Verified",
          badge: "Available Supply",
          details: {
            address: cand.pickupLocation,
            category: cand.category,
            quantity: cand.quantity,
          },
        })
      })
    }

    return { markers: mList, routes: rList }
  }, [request, matchedDonation, candidateDonations, deliveryData])

  const handleInstantMatch = (donationId: string) => {
    matchDonation(donationId, request.id, 96)
    if (onMatchWithDonation) onMatchWithDonation(donationId, request.id)
    setActiveTab("map")
  }

  const handleSendFeedback = () => {
    if (matchedDonation) {
      reviewDonation(matchedDonation.id, rating, feedbackText.trim() || "Thank you for the prompt delivery!")
      setFeedbackSubmitted(true)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 sm:items-center sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Package className="size-6" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-bold text-lg leading-tight text-foreground">{request.category}</h2>
                <RequestStatusBadge status={request.status} />
                <UrgencyBadge urgency={request.urgency} />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Requested Qty: {request.quantity} · ID: {request.id} · {request.deliveryAddress}
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

        {/* View Tabs */}
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
            <MapIcon className="size-4" /> Live Map & Tracking
          </button>
          {matchedDonation && (
            <button
              type="button"
              onClick={() => setActiveTab("timeline")}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                activeTab === "timeline"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Clock className="size-4" /> 6-Stage Delivery Progress
            </button>
          )}
          {!matchedDonation && (
            <button
              type="button"
              onClick={() => setActiveTab("matches")}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                activeTab === "matches"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Search className="size-4" /> Available Supplies ({candidateDonations.length})
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === "map" && (
            <div className="space-y-4">
              {/* Status Banner */}
              <div className="rounded-xl border border-border bg-background p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex size-10 items-center justify-center rounded-xl font-bold shadow ${
                        deliveryData.isDelivered
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : deliveryData.isInTransit
                          ? "bg-sky-500/15 text-sky-600 dark:text-sky-400"
                          : matchedDonation
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      {deliveryData.isDelivered ? (
                        <CheckCircle2 className="size-5" />
                      ) : deliveryData.isInTransit ? (
                        <Truck className="size-5 animate-pulse" />
                      ) : matchedDonation ? (
                        <Package className="size-5" />
                      ) : (
                        <Search className="size-5 animate-spin" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-foreground">
                        {deliveryData.isDelivered
                          ? "Donation Delivered to You"
                          : deliveryData.isInTransit
                          ? "Courier En Route with Your Aid"
                          : matchedDonation
                          ? "Matched: Awaiting Courier Pickup"
                          : "Searching for Verified Donor Supplies"}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {matchedDonation
                          ? `${distanceInfo?.formatted || "Calculating"} route · ${
                              timeInfo?.formatted || ""
                            } est. transit`
                          : `${candidateDonations.length} potential donor supplies found nearby`}
                      </p>
                    </div>
                  </div>

                  {matchedDonation && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&origin=${deliveryData.donorCoords.lat},${deliveryData.donorCoords.lng}&destination=${deliveryData.recipientCoords.lat},${deliveryData.recipientCoords.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-sm"
                    >
                      <ExternalLink className="size-3.5 text-primary" /> Directions
                    </a>
                  )}
                </div>

                {/* Progress Bar if matched */}
                {matchedDonation && (
                  <div className="mt-3.5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                      <span>Origin: {matchedDonation.pickupLocation}</span>
                      <span className="font-bold text-primary">{deliveryData.progressPercentage}% Completed</span>
                      <span>Delivery: {request.deliveryAddress}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className={`h-full transition-all duration-700 ${
                          deliveryData.isDelivered
                            ? "bg-emerald-500"
                            : deliveryData.isInTransit
                            ? "bg-sky-500"
                            : "bg-primary"
                        }`}
                        style={{ width: `${deliveryData.progressPercentage}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Map */}
              <GoogleMapView
                center={deliveryData.currentCoords}
                zoom={13}
                markers={markers}
                routes={routes}
                height="320px"
                className="shadow-md"
              />

              {/* Location Cards */}
              <div className="grid gap-3 sm:grid-cols-2 text-xs">
                <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                    <MapPin className="size-4" />
                  </span>
                  <div>
                    <span className="font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wide">
                      Your Delivery Address
                    </span>
                    <p className="font-bold text-foreground mt-0.5">{request.recipientName}</p>
                    <p className="text-muted-foreground mt-0.5">{request.deliveryAddress}</p>
                  </div>
                </div>

                {matchedDonation ? (
                  <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <HeartHandshake className="size-4" />
                    </span>
                    <div>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                        Matched Donor
                      </span>
                      <p className="font-bold text-foreground mt-0.5">{matchedDonation.donorName}</p>
                      <p className="text-muted-foreground mt-0.5">
                        {matchedDonation.title} · {matchedDonation.pickupLocation}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 rounded-xl border border-dashed border-border bg-muted/20 p-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Sparkles className="size-4" />
                    </span>
                    <div>
                      <span className="font-bold text-primary uppercase tracking-wide">
                        Smart Matching Active
                      </span>
                      <p className="text-muted-foreground mt-0.5">
                        Our algorithm pairs closest donors by urgency and distance.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Review Form if Delivered */}
              {deliveryData.isDelivered && !request.rating && !feedbackSubmitted && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-sm text-foreground">
                      How was this delivery? Rate your experience
                    </p>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className="text-amber-400 hover:scale-110 transition-transform"
                        >
                          <Star
                            className={`size-5 ${
                              star <= rating ? "fill-amber-400 text-amber-400" : "text-slate-400"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="Leave a thank you message or feedback..."
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <Button size="sm" className="w-full font-semibold" onClick={handleSendFeedback}>
                    Submit Feedback
                  </Button>
                </div>
              )}
            </div>
          )}

          {activeTab === "timeline" && matchedDonation && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-bold text-foreground mb-3">6-Stage Delivery Progress</p>
                <StatusTimeline history={matchedDonation.history} current={matchedDonation.status} />
              </div>
            </div>
          )}

          {activeTab === "matches" && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground">
                The following verified donations in <span className="font-bold text-foreground">{request.category}</span> are available nearby. Click to pair instantly:
              </p>

              {candidateDonations.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  No direct surplus items currently match this category. New donations are scanned automatically every few minutes.
                </div>
              ) : (
                candidateDonations.map((cand) => (
                  <div
                    key={cand.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3.5 shadow-sm hover:border-primary/50 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <HeartHandshake className="size-5" />
                      </span>
                      <div>
                        <p className="font-bold text-sm text-foreground">{cand.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {cand.donorName} · Qty {cand.quantity} · {cand.condition}
                        </p>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="size-3 shrink-0" /> {cand.pickupLocation}
                        </p>
                      </div>
                    </div>

                    <Button size="sm" onClick={() => handleInstantMatch(cand.id)} className="font-semibold">
                      Match Now
                    </Button>
                  </div>
                ))
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
