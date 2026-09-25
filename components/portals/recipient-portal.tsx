"use client"

import { useMemo, useState } from "react"
import {
  ClipboardList,
  Inbox,
  LayoutGrid,
  MapPin,
  PackageCheck,
  Plus,
  Siren,
  Star,
  Map as MapIcon,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, Input, Select } from "@/components/ui/field"
import { DashboardShell, type NavItem } from "@/components/dashboard/dashboard-shell"
import { StatCard } from "@/components/dashboard/stat-card"
import { DriveCard } from "@/components/dashboard/drive-card"
import { RequestTrackingDialog } from "@/components/dashboard/request-tracking-dialog"
import { GoogleMapView, type MapMarkerItem, type MapRouteItem } from "@/components/maps/google-map-view"
import { RequestStatusBadge, UrgencyBadge } from "@/components/status"
import { getDonationDeliveryPosition } from "@/lib/geo"
import { useStore } from "@/lib/store"
import {
  ITEM_CATEGORIES,
  URGENCY_LEVELS,
  type AidRequest,
  type Donation,
  type ItemCategory,
  type Urgency,
} from "@/lib/types"

const NAV: NavItem[] = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "map", label: "Live Aid Map", icon: MapIcon },
  { key: "requests", label: "My Requests", icon: ClipboardList },
  { key: "new", label: "New Request", icon: Plus },
  { key: "drives", label: "Emergency Drives", icon: Siren },
]

export function RecipientPortal() {
  const { user, requests, donations, drives, createRequest, reviewDonation } = useStore()
  const [view, setView] = useState("overview")
  const [trackingRequest, setTrackingRequest] = useState<AidRequest | null>(null)

  const mine = useMemo(
    () => requests.filter((r) => r.recipientId === user?.id),
    [requests, user?.id],
  )
  const open = mine.filter((r) => r.status === "Open").length
  const matched = mine.filter((r) => r.status === "Matched").length
  const delivered = mine.filter((r) => ["Delivered", "Reviewed"].includes(r.status)).length

  const title = NAV.find((n) => n.key === view)!.label === "Overview" ? "Recipient Overview" : NAV.find((n) => n.key === view)!.label

  function getDonation(id?: string) {
    return donations.find((d) => d.id === id)
  }

  // Generate Map Markers & Routes for Recipient's Map
  const { recipientMarkers, recipientRoutes } = useMemo(() => {
    const markers: MapMarkerItem[] = []
    const routes: MapRouteItem[] = []

    mine.forEach((r) => {
      const donation = getDonation(r.matchedDonationId)
      const data = getDonationDeliveryPosition(
        donation || {
          id: `temp-${r.id}`,
          donorId: "",
          donorName: "Available Donor",
          category: r.category,
          title: r.category,
          quantity: r.quantity,
          condition: "Good",
          pickupLocation: "Relief Distribution Center",
          coords: { lat: 30.4, lng: -97.72 },
          status: "Listed",
          verified: true,
          autoVerified: true,
          createdAt: Date.now(),
          history: [],
        },
        r,
      )

      markers.push({
        id: `req-${r.id}`,
        coords: r.coords || { lat: 30.26, lng: -97.68 },
        title: `Your Request: ${r.category}`,
        subtitle: `Qty ${r.quantity} · ${r.urgency} Urgency`,
        type: "recipient",
        status: r.status,
        badge: r.status,
        details: {
          address: r.deliveryAddress,
          category: r.category,
        },
      })

      if (donation) {
        markers.push({
          id: `donor-${donation.id}`,
          coords: data.donorCoords,
          title: `Matched Donor: ${donation.donorName}`,
          subtitle: donation.title,
          type: "donor",
          status: donation.status,
          badge: "Incoming Supply",
          details: {
            address: donation.pickupLocation,
            category: donation.category,
            quantity: donation.quantity,
          },
        })

        routes.push({
          id: `route-${r.id}`,
          from: data.donorCoords,
          to: data.recipientCoords,
          currentPosition: data.currentCoords,
          status: donation.status,
          color: data.isDelivered ? "#10b981" : "#0284c7",
        })

        if (data.isInTransit && !data.isDelivered) {
          markers.push({
            id: `driver-${donation.id}`,
            coords: data.currentCoords,
            title: `Courier In Transit`,
            subtitle: `${donation.pickupMethod || "Courier"} · En route`,
            type: "driver",
            status: donation.status,
            badge: "Live Dispatch",
            details: {
              address: `Delivering to ${r.deliveryAddress}`,
              category: r.category,
            },
          })
        }
      }
    })

    // Also include active emergency drive hubs
    drives.filter((d) => d.active).forEach((drive) => {
      markers.push({
        id: `drive-${drive.id}`,
        coords: { lat: 30.28, lng: -97.73 },
        title: `Emergency Hub: ${drive.title}`,
        subtitle: drive.location,
        type: "hub",
        badge: "Emergency Drive",
        details: {
          address: drive.location,
          category: drive.categories.join(", "),
        },
      })
    })

    return { recipientMarkers: markers, recipientRoutes: routes }
  }, [mine, donations, drives])

  return (
    <DashboardShell navItems={NAV} active={view} onNavigate={setView} title={title}>
      {view === "overview" && (
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard icon={Inbox} label="Open requests" value={open} tone="warning" />
            <StatCard icon={PackageCheck} label="Matched" value={matched} tone="primary" />
            <StatCard icon={Star} label="Delivered" value={delivered} tone="success" />
          </div>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Your requests</h2>
            <Button onClick={() => setView("new")}>
              <Plus className="size-4" /> New request
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {mine.slice(0, 4).map((r) => (
              <RequestCard
                key={r.id}
                request={r}
                donation={getDonation(r.matchedDonationId)}
                onTrack={() => setTrackingRequest(r)}
                onReview={reviewDonation}
              />
            ))}
          </div>
        </div>
      )}

      {view === "map" && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-2xl font-semibold">Live Aid & Supply Map</h2>
              <p className="text-sm text-muted-foreground">
                Track incoming shipments, your delivery locations, and nearby emergency relief supply hubs.
              </p>
            </div>
            <Button onClick={() => setView("new")}>
              <Plus className="size-4 mr-1.5" /> Request Aid
            </Button>
          </div>

          <div className="space-y-4">
            <GoogleMapView
              markers={recipientMarkers}
              routes={recipientRoutes}
              height="450px"
              className="shadow-xl"
              onSelectMarker={(m) => {
                if (m && m.id.startsWith("req-")) {
                  const reqId = m.id.replace("req-", "")
                  const found = mine.find((r) => r.id === reqId)
                  if (found) setTrackingRequest(found)
                }
              }}
            />
            <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground px-1">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-sky-500" /> Your Request Location
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-emerald-500" /> Donor Pickup Origin
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-amber-500" /> Courier In Transit
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-rose-500" /> Relief Hub
                </span>
              </div>
              <span>Click your pin on the map to open the live tracker</span>
            </div>
          </div>
        </div>
      )}

      {view === "requests" && (
        <div className="grid gap-4 md:grid-cols-2">
          {mine.length === 0 && (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <ClipboardList className="size-6" />
                </span>
                <p className="font-medium">No requests yet</p>
                <Button onClick={() => setView("new")}>
                  <Plus className="size-4" /> Create a request
                </Button>
              </CardContent>
            </Card>
          )}
          {mine.map((r) => (
            <RequestCard
              key={r.id}
              request={r}
              donation={getDonation(r.matchedDonationId)}
              onTrack={() => setTrackingRequest(r)}
              onReview={reviewDonation}
            />
          ))}
        </div>
      )}

      {view === "new" && (
        <NewRequestForm
          drives={drives}
          onSubmit={(input) => {
            createRequest(input)
            setView("requests")
          }}
        />
      )}

      {view === "drives" && (
        <div className="grid gap-4 md:grid-cols-2">
          {drives.map((drive) => (
            <DriveCard
              key={drive.id}
              drive={drive}
              action={
                drive.active && (
                  <Button className="w-full" onClick={() => setView("new")}>
                    Request from this drive
                  </Button>
                )
              }
            />
          ))}
        </div>
      )}

      {trackingRequest && (
        <RequestTrackingDialog
          request={trackingRequest}
          onClose={() => setTrackingRequest(null)}
        />
      )}
    </DashboardShell>
  )
}

function RequestCard({
  request,
  donation,
  onTrack,
  onReview,
}: {
  request: AidRequest
  donation?: Donation
  onTrack: () => void
  onReview: (id: string, rating: number, feedback: string) => void
}) {
  const [reviewing, setReviewing] = useState(false)
  const canReview = donation?.status === "Delivered"

  return (
    <Card className="hover:border-primary/40 transition-colors shadow-sm">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-bold text-base leading-tight text-foreground">{request.category}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Quantity: {request.quantity} units · ID: {request.id}</p>
          </div>
          <RequestStatusBadge status={request.status} />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <UrgencyBadge urgency={request.urgency} />
          <span className="flex items-center gap-1">
            <MapPin className="size-3.5 text-primary" /> {request.deliveryAddress}
          </span>
          {request.driveId && <Badge variant="critical" className="text-[10px]">Emergency Drive</Badge>}
        </div>

        {donation ? (
          <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Matched Donation
              </p>
              <p className="mt-0.5 font-bold text-foreground">{donation.title}</p>
              <p className="text-xs text-muted-foreground">From donor {donation.donorName}</p>
            </div>
            <Badge variant="outline" className="text-xs">
              {donation.status}
            </Badge>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-2.5 text-xs text-muted-foreground flex items-center gap-2">
            <Sparkles className="size-4 text-primary shrink-0" />
            <span>Matching algorithm actively searching nearby verified donors...</span>
          </div>
        )}

        {request.rating ? (
          <div className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400 font-semibold">
            {Array.from({ length: request.rating }).map((_, i) => (
              <Star key={i} className="size-4 fill-amber-400 text-amber-400" />
            ))}
            <span className="ml-1 text-xs text-muted-foreground">Feedback submitted ({request.feedback || "Verified"})</span>
          </div>
        ) : reviewing && donation ? (
          <FeedbackForm
            onSubmit={(rating, feedback) => {
              onReview(donation.id, rating, feedback)
              setReviewing(false)
            }}
            onCancel={() => setReviewing(false)}
          />
        ) : (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              variant={donation ? "outline" : "default"}
              size="sm"
              className="flex-1 font-semibold shadow-sm"
              onClick={onTrack}
            >
              <MapIcon className="size-4 mr-1.5 text-primary" />
              {donation ? "Track Live Delivery" : "Track Request & Supplies"}
            </Button>
            {canReview && (
              <Button size="sm" className="flex-1 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setReviewing(true)}>
                <Star className="size-4 mr-1.5" /> Leave Feedback
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function FeedbackForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (rating: number, feedback: string) => void
  onCancel: () => void
}) {
  const [rating, setRating] = useState(5)
  const [feedback, setFeedback] = useState("")
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-background p-3">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} stars`}>
            <Star
              className={
                n <= rating ? "size-6 fill-warning text-warning" : "size-6 text-muted-foreground"
              }
            />
          </button>
        ))}
      </div>
      <Input
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="Share your experience (optional)"
      />
      <div className="flex gap-2">
        <Button size="sm" variant="ghost" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" className="flex-1" onClick={() => onSubmit(rating, feedback || "Thank you!")}>
          Submit
        </Button>
      </div>
    </div>
  )
}

function NewRequestForm({
  drives,
  onSubmit,
}: {
  drives: { id: string; title: string; active: boolean }[]
  onSubmit: (input: {
    category: ItemCategory
    quantity: number
    urgency: Urgency
    deliveryAddress: string
    driveId?: string
  }) => void
}) {
  const { user } = useStore()
  const [category, setCategory] = useState<ItemCategory>(ITEM_CATEGORIES[0])
  const [quantity, setQuantity] = useState(1)
  const [urgency, setUrgency] = useState<Urgency>("Normal")
  const [deliveryAddress, setDeliveryAddress] = useState(user?.location ?? "")
  const [driveId, setDriveId] = useState("")

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>Request essential items</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit({ category, quantity, urgency, deliveryAddress, driveId: driveId || undefined })
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Item category">
              <Select value={category} onChange={(e) => setCategory(e.target.value as ItemCategory)}>
                {ITEM_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Quantity needed">
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
              />
            </Field>
          </div>
          <Field label="Urgency level">
            <div className="grid grid-cols-3 gap-2">
              {URGENCY_LEVELS.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUrgency(u)}
                  className={
                    urgency === u
                      ? "rounded-lg border-2 border-primary bg-primary/5 px-3 py-2 text-sm font-medium"
                      : "rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:border-primary/40"
                  }
                >
                  {u}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Delivery address">
            <Input value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} />
          </Field>
          <Field label="Emergency drive (optional)">
            <Select value={driveId} onChange={(e) => setDriveId(e.target.value)}>
              <option value="">Not part of a drive</option>
              {drives
                .filter((d) => d.active)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
            </Select>
          </Field>
          <div className="rounded-lg border border-border bg-background p-3 text-sm text-muted-foreground">
            Critical requests are prioritized and matched to nearby donations first.
          </div>
          <Button type="submit" size="lg">
            Submit request
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
