import type { AidRequest, Coords, Donation, Urgency } from "./types"

// Haversine distance in kilometers
export function distanceKm(a: Coords, b: Coords): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10
}

const URGENCY_WEIGHT: Record<Urgency, number> = {
  Critical: 1,
  High: 0.7,
  Normal: 0.4,
}

export interface MatchScore {
  request: AidRequest
  distance: number
  confidence: number
  categoryMatch: boolean
  reasons: string[]
}

// Score a donation against a request. Returns 0-100 confidence.
export function scoreMatch(donation: Donation, request: AidRequest): MatchScore {
  const distance = distanceKm(donation.coords, request.coords)
  const reasons: string[] = []

  // Distance score: full within 5km, decays to 0 at 60km
  const distanceScore = Math.max(0, 1 - Math.max(0, distance - 5) / 55)
  if (distance <= 10) reasons.push(`Only ${distance} km apart`)
  else if (distance <= 30) reasons.push(`${distance} km apart`)
  else reasons.push(`${distance} km apart (distant)`)

  const categoryMatch = donation.category === request.category
  const categoryScore = categoryMatch ? 1 : 0
  if (categoryMatch) reasons.push(`Category match: ${donation.category}`)

  const urgencyScore = URGENCY_WEIGHT[request.urgency]
  if (request.urgency === "Critical") reasons.push("Critical priority request")
  else if (request.urgency === "High") reasons.push("High priority request")

  const quantityScore = donation.quantity >= request.quantity ? 1 : donation.quantity / request.quantity
  if (donation.quantity >= request.quantity) reasons.push("Quantity fully covers request")

  // Weighted blend
  const confidence = Math.round(
    (categoryScore * 0.45 + distanceScore * 0.3 + urgencyScore * 0.15 + quantityScore * 0.1) * 100,
  )

  return { request, distance, confidence, categoryMatch, reasons }
}

// Rank open requests for a given donation, best match first.
export function rankMatches(donation: Donation, requests: AidRequest[]): MatchScore[] {
  return requests
    .filter((r) => r.status === "Open")
    .map((r) => scoreMatch(donation, r))
    .filter((m) => m.categoryMatch) // must be same category to be a viable match
    .sort((a, b) => {
      // Critical urgency wins ties, then confidence
      const ua = URGENCY_WEIGHT[a.request.urgency]
      const ub = URGENCY_WEIGHT[b.request.urgency]
      if (ub !== ua) return ub - ua
      return b.confidence - a.confidence
    })
}

export function confidenceLabel(confidence: number): { label: string; tone: "high" | "mid" | "low" } {
  if (confidence >= 80) return { label: "Strong match", tone: "high" }
  if (confidence >= 55) return { label: "Good match", tone: "mid" }
  return { label: "Weak match", tone: "low" }
}
