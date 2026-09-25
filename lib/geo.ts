import type { Coords, Donation, AidRequest } from "./types"

// Default center coordinates (Austin, TX relief hub)
export const DEFAULT_MAP_CENTER: Coords = {
  lat: 30.2672,
  lng: -97.7431,
}

/**
 * Calculates Haversine great-circle distance between two GPS coordinates in miles and km.
 */
export function calculateDistance(
  coord1: Coords,
  coord2: Coords,
): { miles: number; km: number; formatted: string } {
  const R = 6371 // Earth radius in km
  const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180
  const dLng = ((coord2.lng - coord1.lng) * Math.PI) / 180
  const lat1 = (coord1.lat * Math.PI) / 180
  const lat2 = (coord2.lat * Math.PI) / 180

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  const km = R * c
  const miles = km * 0.621371

  return {
    miles: Math.round(miles * 10) / 10,
    km: Math.round(km * 10) / 10,
    formatted: miles < 0.2 ? "Nearby (< 0.2 mi)" : `${miles.toFixed(1)} miles`,
  }
}

/**
 * Estimates delivery travel duration in minutes based on distance and average urban crisis speed (~25 mph).
 */
export function estimateTravelTime(distanceMiles: number): { minutes: number; formatted: string } {
  const avgSpeedMph = 25
  const hours = distanceMiles / avgSpeedMph
  const minutes = Math.max(5, Math.round(hours * 60))

  if (minutes < 60) {
    return { minutes, formatted: `${minutes} mins` }
  }
  const hrs = Math.floor(minutes / 60)
  const remMins = minutes % 60
  return { minutes, formatted: `${hrs} hr ${remMins > 0 ? `${remMins}m` : ""}`.trim() }
}

/**
 * Computes intermediate GPS coordinates along a route between origin and destination based on progress (0 to 1).
 */
export function interpolatePosition(origin: Coords, destination: Coords, progress: number): Coords {
  const clamped = Math.max(0, Math.min(1, progress))
  // Add a slight realistic curve off straight line for realistic path
  const curveFactor = Math.sin(clamped * Math.PI) * 0.004
  return {
    lat: origin.lat + (destination.lat - origin.lat) * clamped + curveFactor,
    lng: origin.lng + (destination.lng - origin.lng) * clamped - curveFactor * 0.5,
  }
}

/**
 * Returns estimated delivery percentage (0 to 100%) and current GPS coordinates for a donation item.
 */
export function getDonationDeliveryPosition(
  donation: Donation,
  matchedRequest?: AidRequest,
): {
  donorCoords: Coords
  recipientCoords: Coords
  currentCoords: Coords
  progressPercentage: number
  stageLabel: string
  isDelivered: boolean
  isInTransit: boolean
} {
  const donorCoords = donation.coords || { lat: 30.4, lng: -97.72 }
  const recipientCoords = matchedRequest?.coords || { lat: 30.26, lng: -97.68 }

  let progress: number
  let stageLabel: string
  let isDelivered = false
  let isInTransit = false

  switch (donation.status) {
    case "Listed":
      progress = 0
      stageLabel = "Listed at Donor Location"
      break
    case "Verified":
      progress = 0.05
      stageLabel = "Verified & Awaiting Match"
      break
    case "Matched":
      progress = 0.15
      stageLabel = "Matched with Recipient"
      break
    case "Picked-up":
      progress = 0.35
      stageLabel = "Picked up by Courier"
      isInTransit = true
      break
    case "In-transit":
      progress = 0.72
      stageLabel = "In Transit to Delivery Destination"
      isInTransit = true
      break
    case "Delivered":
    case "Reviewed":
      progress = 1.0
      stageLabel = "Delivered to Recipient"
      isDelivered = true
      break
    default:
      progress = 0
      stageLabel = "Listed at Donor Location"
  }

  const currentCoords = isDelivered
    ? recipientCoords
    : progress === 0
    ? donorCoords
    : interpolatePosition(donorCoords, recipientCoords, progress)

  return {
    donorCoords,
    recipientCoords,
    currentCoords,
    progressPercentage: Math.round(progress * 100),
    stageLabel,
    isDelivered,
    isInTransit,
  }
}
