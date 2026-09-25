"use client"

import { useMemo, useState } from "react"
import {
  CheckCircle2,
  ExternalLink,
  HeartHandshake,
  MapPin,
  Navigation,
  Package,
  Truck,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { GoogleMapView, type MapMarkerItem, type MapRouteItem } from "./google-map-view"
import { calculateDistance, estimateTravelTime, getDonationDeliveryPosition } from "@/lib/geo"
import type { AidRequest, Donation } from "@/lib/types"

interface DeliveryTrackingMapProps {
  donation: Donation
  matchedRequest?: AidRequest
  className?: string
  compact?: boolean
}

export function DeliveryTrackingMap({
  donation,
  matchedRequest,
  className = "",
  compact = false,
}: DeliveryTrackingMapProps) {
  const [selectedPin, setSelectedPin] = useState<string | undefined>(undefined)

  const deliveryData = useMemo(() => {
    return getDonationDeliveryPosition(donation, matchedRequest)
  }, [donation, matchedRequest])

  const distanceInfo = useMemo(() => {
    return calculateDistance(deliveryData.donorCoords, deliveryData.recipientCoords)
  }, [deliveryData.donorCoords, deliveryData.recipientCoords])

  const timeInfo = useMemo(() => {
    return estimateTravelTime(distanceInfo.miles)
  }, [distanceInfo.miles])

  // Prepare map markers
  const markers = useMemo<MapMarkerItem[]>(() => {
    const list: MapMarkerItem[] = [
      {
        id: `donor-${donation.id}`,
        coords: deliveryData.donorCoords,
        title: `Donor: ${donation.donorName}`,
        subtitle: donation.pickupLocation,
        type: "donor",
        status: donation.status,
        badge: "Pickup Origin",
        details: {
          address: donation.pickupLocation,
          category: donation.category,
          quantity: donation.quantity,
        },
      },
    ]

    if (matchedRequest) {
      list.push({
        id: `recipient-${matchedRequest.id}`,
        coords: deliveryData.recipientCoords,
        title: `Recipient: ${matchedRequest.recipientName}`,
        subtitle: matchedRequest.deliveryAddress,
        type: "recipient",
        status: matchedRequest.status,
        badge: "Delivery Destination",
        details: {
          address: matchedRequest.deliveryAddress,
          category: matchedRequest.category,
        },
      })
    }

    // If item is actively in-transit, add the vehicle live marker
    if (deliveryData.isInTransit && !deliveryData.isDelivered) {
      list.push({
        id: `live-vehicle-${donation.id}`,
        coords: deliveryData.currentCoords,
        title: "Live Delivery Courier",
        subtitle: `${donation.pickupMethod || "Volunteer Courier"} · ${deliveryData.stageLabel}`,
        type: "driver",
        status: donation.status,
        badge: "Live GPS",
        details: {
          address: `En route to ${matchedRequest?.deliveryAddress || "Destination"}`,
          category: donation.category,
        },
      })
    }

    return list
  }, [donation, matchedRequest, deliveryData])

  // Prepare route line
  const routes = useMemo<MapRouteItem[]>(() => {
    if (!matchedRequest) return []
    return [
      {
        id: `route-${donation.id}`,
        from: deliveryData.donorCoords,
        to: deliveryData.recipientCoords,
        currentPosition: deliveryData.currentCoords,
        status: donation.status,
        color: deliveryData.isDelivered ? "#10b981" : "#0284c7",
      },
    ]
  }, [donation.id, donation.status, matchedRequest, deliveryData])

  const mapCenter = useMemo(() => {
    return deliveryData.currentCoords
  }, [deliveryData.currentCoords])

  const googleMapsDirectionsUrl = useMemo(() => {
    return `https://www.google.com/maps/dir/?api=1&origin=${deliveryData.donorCoords.lat},${deliveryData.donorCoords.lng}&destination=${deliveryData.recipientCoords.lat},${deliveryData.recipientCoords.lng}`
  }, [deliveryData])

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Live Status Hero Banner */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex size-11 items-center justify-center rounded-xl font-bold shadow ${
                deliveryData.isDelivered
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : deliveryData.isInTransit
                  ? "bg-sky-500/15 text-sky-600 dark:text-sky-400"
                  : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
              }`}
            >
              {deliveryData.isDelivered ? (
                <CheckCircle2 className="size-6" />
              ) : deliveryData.isInTransit ? (
                <Truck className="size-6 animate-pulse" />
              ) : (
                <Package className="size-6" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base tracking-tight text-foreground">
                  {deliveryData.isDelivered
                    ? "Delivered to Recipient"
                    : deliveryData.isInTransit
                    ? "In Transit to Destination"
                    : "Awaiting Logistics Pickup"}
                </h3>
                <Badge
                  variant={
                    deliveryData.isDelivered
                      ? "success"
                      : deliveryData.isInTransit
                      ? "default"
                      : "secondary"
                  }
                  className="font-semibold text-xs"
                >
                  {donation.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {deliveryData.stageLabel} · {distanceInfo.formatted} ({timeInfo.formatted} est.)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={googleMapsDirectionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-sm"
            >
              <ExternalLink className="size-3.5 text-primary" /> Directions in Google Maps
            </a>
          </div>
        </div>

        {/* Dynamic Route Progress Bar */}
        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Donor: {donation.pickupLocation}</span>
            <span className="font-bold text-primary">{deliveryData.progressPercentage}% Completed</span>
            <span>
              Recipient: {matchedRequest?.deliveryAddress || "Awaiting Match Destination"}
            </span>
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
      </div>

      {/* Interactive Map View */}
      <div className="relative">
        <GoogleMapView
          center={mapCenter}
          zoom={13}
          markers={markers}
          routes={routes}
          selectedMarkerId={selectedPin}
          onSelectMarker={(m) => setSelectedPin(m?.id)}
          height={compact ? "280px" : "340px"}
          className="shadow-md"
        />
      </div>

      {/* Location Details Grid: Donor Origin & Recipient Destination */}
      <div className="grid gap-3 sm:grid-cols-2 text-sm">
        {/* Donor Origin Card */}
        <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-3.5 shadow-sm">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <HeartHandshake className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                Donor Origin
              </span>
              <Badge variant="outline" className="text-[10px] px-1 py-0">
                Pickup
              </Badge>
            </div>
            <p className="font-bold text-foreground truncate mt-0.5">{donation.donorName}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 truncate">
              <MapPin className="size-3 shrink-0" /> {donation.pickupLocation}
            </p>
          </div>
        </div>

        {/* Recipient Destination Card */}
        <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-3.5 shadow-sm">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
            <MapPin className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wide">
                Delivery Destination
              </span>
              <Badge variant="outline" className="text-[10px] px-1 py-0">
                Recipient
              </Badge>
            </div>
            <p className="font-bold text-foreground truncate mt-0.5">
              {matchedRequest?.recipientName || "Matching in progress..."}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 truncate">
              <Navigation className="size-3 shrink-0" />{" "}
              {matchedRequest?.deliveryAddress || "Awaiting recipient allocation"}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
