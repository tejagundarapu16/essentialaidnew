"use client"

import { useMemo, useState } from "react"
import {
  Award,
  CheckCircle2,
  ExternalLink,
  HeartHandshake,
  LayoutGrid,
  Map as MapIcon,
  Navigation,
  Package,
  Plus,
  Siren,
  Star,
  Timer,
  Truck,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardShell, type NavItem } from "@/components/dashboard/dashboard-shell"
import { StatCard } from "@/components/dashboard/stat-card"
import { TrackingDialog } from "@/components/dashboard/tracking-dialog"
import { GoogleMapView, type MapMarkerItem, type MapRouteItem } from "@/components/maps/google-map-view"
import { StatusBadge } from "@/components/status"
import { calculateDistance, getDonationDeliveryPosition } from "@/lib/geo"
import { useStore } from "@/lib/store"
import type { AidRequest, Donation, DonationStatus } from "@/lib/types"

const NAV: NavItem[] = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "map", label: "Mission Route Map", icon: MapIcon },
  { key: "tasks", label: "Active Tasks", icon: Truck },
  { key: "available", label: "Available Missions", icon: HeartHandshake },
  { key: "drives", label: "Emergency Shifts", icon: Siren },
  { key: "impact", label: "Impact & Badges", icon: Award },
]

export function VolunteerPortal() {
  const { user, donations, requests, drives, advanceDonation, assignPickup } = useStore()
  const [view, setView] = useState("overview")
  const [trackingDonation, setTrackingDonation] = useState<Donation | null>(null)
  const [joinedDriveIds, setJoinedDriveIds] = useState<string[]>(["drive-flood"])

  // Volunteer's location (fallback to Austin downtown if not set)
  const volunteerCoords = user?.coords || { lat: 30.24, lng: -97.75 }

  // Available donations needing pickup/delivery (Verified, Matched, or Listed needing transport)
  const availableMissions = useMemo(() => {
    return donations.filter(
      (d) =>
        (d.status === "Verified" || d.status === "Matched") &&
        (!d.pickupMethod || d.pickupMethod === "Volunteer delivery"),
    )
  }, [donations])

  // Active missions assigned to / in progress by volunteer
  const activeTasks = useMemo(() => {
    return donations.filter(
      (d) =>
        d.pickupMethod === "Volunteer delivery" &&
        (d.status === "Picked-up" || d.status === "In-transit" || d.status === "Matched"),
    )
  }, [donations])

  // Completed missions
  const completedMissions = useMemo(() => {
    return donations.filter(
      (d) =>
        d.pickupMethod === "Volunteer delivery" &&
        (d.status === "Delivered" || d.status === "Reviewed"),
    )
  }, [donations])

  const totalSuppliesDelivered = useMemo(() => {
    return completedMissions.reduce((sum, d) => sum + d.quantity, 0)
  }, [completedMissions])

  // Map markers and routes for the volunteer's map
  const { mapMarkers, mapRoutes } = useMemo(() => {
    const markers: MapMarkerItem[] = []
    const routes: MapRouteItem[] = []

    // 1. Volunteer current station
    markers.push({
      id: "volunteer-pos",
      coords: volunteerCoords,
      title: `You: ${user?.name || "Volunteer"}`,
      subtitle: user?.location || "Austin, TX",
      type: "driver",
      badge: "Your Location",
      details: {
        address: user?.location || "Austin, TX",
      },
    })

    // 2. Active tasks routes and pins
    activeTasks.forEach((d) => {
      const req = requests.find((r) => r.id === d.matchedRequestId)
      const data = getDonationDeliveryPosition(d, req)

      markers.push({
        id: `pickup-${d.id}`,
        coords: data.donorCoords,
        title: `Pickup: ${d.donorName}`,
        subtitle: `${d.title} (Qty ${d.quantity})`,
        type: "donor",
        status: d.status,
        badge: "Pickup Origin",
        details: {
          address: d.pickupLocation,
          category: d.category,
          quantity: d.quantity,
        },
      })

      if (req) {
        markers.push({
          id: `dest-${req.id}`,
          coords: data.recipientCoords,
          title: `Delivery: ${req.recipientName}`,
          subtitle: `${req.category} · ${req.urgency} Urgency`,
          type: "recipient",
          status: req.status,
          badge: "Recipient Destination",
          details: {
            address: req.deliveryAddress,
            category: req.category,
          },
        })

        routes.push({
          id: `route-${d.id}`,
          from: data.donorCoords,
          to: data.recipientCoords,
          currentPosition: data.currentCoords,
          status: d.status,
          color: d.status === "In-transit" ? "#0284c7" : "#f59e0b",
        })
      }
    })

    // 3. Available missions pickup pins
    availableMissions.forEach((d) => {
      const req = requests.find((r) => r.id === d.matchedRequestId)
      const data = getDonationDeliveryPosition(d, req)

      markers.push({
        id: `avail-${d.id}`,
        coords: data.donorCoords,
        title: `Available Mission: ${d.title}`,
        subtitle: `From ${d.donorName} · Qty ${d.quantity}`,
        type: "donor",
        status: d.status,
        badge: "Open Mission",
        details: {
          address: d.pickupLocation,
          category: d.category,
          quantity: d.quantity,
        },
      })
    })

    // 4. Emergency drive hubs
    drives.filter((d) => d.active).forEach((drive) => {
      markers.push({
        id: `hub-${drive.id}`,
        coords: { lat: 30.28, lng: -97.73 },
        title: `Crisis Hub: ${drive.title}`,
        subtitle: drive.location,
        type: "hub",
        badge: "Volunteer Hub",
        details: {
          address: drive.location,
          category: drive.categories.join(", "),
        },
      })
    })

    return { mapMarkers: markers, mapRoutes: routes }
  }, [volunteerCoords, user, activeTasks, availableMissions, requests, drives])

  const handleClaimMission = (donationId: string) => {
    assignPickup(donationId, "Volunteer delivery", "Today · 2 Hours")
    advanceDonation(donationId, "Picked-up", "Volunteer claimed mission and is en route to pickup")
    setView("tasks")
  }

  const handleAdvanceTask = (donation: Donation, nextStatus: DonationStatus, note: string) => {
    advanceDonation(donation.id, nextStatus, note)
  }

  const handleToggleDrive = (driveId: string) => {
    setJoinedDriveIds((prev) =>
      prev.includes(driveId) ? prev.filter((id) => id !== driveId) : [...prev, driveId],
    )
  }

  const nav = NAV.map((n) => {
    if (n.key === "tasks") return { ...n, badge: activeTasks.length }
    if (n.key === "available") return { ...n, badge: availableMissions.length }
    return n
  })

  const title =
    NAV.find((n) => n.key === view)?.label === "Overview"
      ? "Volunteer Mission Hub"
      : NAV.find((n) => n.key === view)!.label

  return (
    <DashboardShell navItems={nav} active={view} onNavigate={setView} title={title}>
      {/* 1. OVERVIEW TAB */}
      {view === "overview" && (
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={Truck}
              label="Active Tasks"
              value={activeTasks.length}
              tone="primary"
            />
            <StatCard
              icon={HeartHandshake}
              label="Available Missions"
              value={availableMissions.length}
              tone="warning"
            />
            <StatCard
              icon={CheckCircle2}
              label="Completed Deliveries"
              value={completedMissions.length}
              tone="success"
            />
            <StatCard
              icon={Package}
              label="Items Transported"
              value={totalSuppliesDelivered}
              tone="primary"
            />
          </div>

          {/* Quick Mission Map Widget */}
          <Card className="overflow-hidden shadow-lg border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Navigation className="size-4 text-primary" /> Live Mission Dispatch Map
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {activeTasks.length} active dispatches · {availableMissions.length} open community pickups nearby
                </p>
              </div>
              <Button size="sm" onClick={() => setView("map")}>
                <MapIcon className="size-4 mr-1.5" /> Full Map
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <GoogleMapView
                markers={mapMarkers}
                routes={mapRoutes}
                height="300px"
              />
            </CardContent>
          </Card>

          {/* Active Tasks Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-foreground">Your Active Missions</h3>
              <Button variant="outline" size="sm" onClick={() => setView("tasks")}>
                View All ({activeTasks.length})
              </Button>
            </div>

            {activeTasks.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-10 text-center gap-3">
                  <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Truck className="size-6" />
                  </span>
                  <p className="font-semibold text-foreground">No active delivery missions</p>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Claim an open community pickup mission to start delivering vital relief supplies to families in need.
                  </p>
                  <Button size="sm" onClick={() => setView("available")}>
                    <HeartHandshake className="size-4 mr-1.5" /> Browse Open Missions
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {activeTasks.slice(0, 2).map((task) => {
                  const req = requests.find((r) => r.id === task.matchedRequestId)
                  return (
                    <VolunteerTaskCard
                      key={task.id}
                      task={task}
                      request={req}
                      onTrack={() => setTrackingDonation(task)}
                      onAdvance={handleAdvanceTask}
                    />
                  )
                })}
              </div>
            )}
          </div>

          {/* Emergency Drive Alert */}
          <Card className="border-critical/30 bg-critical/5">
            <CardContent className="flex flex-col items-start gap-3 py-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-critical/15 text-critical">
                  <Siren className="size-5" />
                </span>
                <div>
                  <p className="font-bold text-foreground">
                    {drives.filter((d) => d.active).length} Active Crisis Relief Drives
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Volunteers needed on-site for package sorting and vehicle dispatch.
                  </p>
                </div>
              </div>
              <Button size="sm" variant="destructive" onClick={() => setView("drives")}>
                Sign Up for Shifts
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 2. MISSION ROUTE MAP TAB */}
      {view === "map" && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-2xl font-semibold">Volunteer Route & Mission Map</h2>
              <p className="text-sm text-muted-foreground">
                Turn-by-turn routing between donor pickup origins, recipient delivery drop-offs, and relief hubs.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-semibold">
                {activeTasks.length} Active Tasks
              </Badge>
              <Badge variant="default" className="text-xs font-semibold">
                {availableMissions.length} Open Missions
              </Badge>
            </div>
          </div>

          <div className="space-y-3">
            <GoogleMapView
              markers={mapMarkers}
              routes={mapRoutes}
              height="500px"
              className="shadow-xl"
            />
            <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground px-1">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-emerald-500" /> Donor Pickup
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-sky-500" /> Recipient Destination
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-amber-500" /> In-Motion Route
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-rose-500" /> Crisis Relief Hub
                </span>
              </div>
              <span>Click pins for direct Google Maps driving navigation</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. ACTIVE TASKS TAB */}
      {view === "tasks" && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-2xl font-semibold">Active Volunteer Tasks</h2>
              <p className="text-sm text-muted-foreground">
                Manage your ongoing deliveries, update shipment milestones, and confirm deliveries.
              </p>
            </div>
            <Button onClick={() => setView("available")}>
              <Plus className="size-4 mr-1.5" /> Claim New Task
            </Button>
          </div>

          {activeTasks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
                <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <Truck className="size-6" />
                </span>
                <p className="font-bold text-foreground">You currently have no active deliveries</p>
                <p className="text-sm text-muted-foreground max-w-md">
                  Check out open community missions to help transport essential food, water, medical items, and bedding.
                </p>
                <Button onClick={() => setView("available")}>
                  <HeartHandshake className="size-4 mr-1.5" /> View Available Missions
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {activeTasks.map((task) => {
                const req = requests.find((r) => r.id === task.matchedRequestId)
                return (
                  <VolunteerTaskCard
                    key={task.id}
                    task={task}
                    request={req}
                    onTrack={() => setTrackingDonation(task)}
                    onAdvance={handleAdvanceTask}
                  />
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. AVAILABLE MISSIONS TAB */}
      {view === "available" && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-2xl font-semibold">Available Community Missions</h2>
              <p className="text-sm text-muted-foreground">
                Verified donations ready for volunteer pickup and delivery to matched recipients.
              </p>
            </div>
            <Badge variant="outline" className="text-xs font-semibold">
              {availableMissions.length} Available
            </Badge>
          </div>

          {availableMissions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
                <span className="flex size-12 items-center justify-center rounded-xl bg-success/15 text-success">
                  <CheckCircle2 className="size-6" />
                </span>
                <p className="font-bold text-foreground">All community pickups are currently covered!</p>
                <p className="text-sm text-muted-foreground">
                  Check out emergency drive sorting shifts to help at local relief centers.
                </p>
                <Button onClick={() => setView("drives")}>
                  <Siren className="size-4 mr-1.5" /> View Relief Shifts
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {availableMissions.map((item) => {
                const req = requests.find((r) => r.id === item.matchedRequestId)
                const dist = calculateDistance(volunteerCoords, item.coords)

                return (
                  <Card key={item.id} className="hover:border-primary/40 transition-colors shadow-sm">
                    <CardContent className="flex flex-col gap-3 p-5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-base text-foreground leading-tight">{item.title}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Category: {item.category} · Qty {item.quantity} · {item.condition}
                          </p>
                        </div>
                        <Badge variant="secondary" className="font-semibold text-xs">
                          {dist.formatted} away
                        </Badge>
                      </div>

                      <div className="space-y-1.5 rounded-xl border border-border bg-muted/30 p-3 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                          <span className="font-semibold text-foreground">Pickup:</span>
                          <span className="text-muted-foreground truncate">{item.pickupLocation}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="size-2 rounded-full bg-sky-500 shrink-0" />
                          <span className="font-semibold text-foreground">Deliver to:</span>
                          <span className="text-muted-foreground truncate">
                            {req ? req.deliveryAddress : "Relief Distribution Center"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-border">
                        <Button
                          className="flex-1 font-semibold"
                          onClick={() => handleClaimMission(item.id)}
                        >
                          <Truck className="size-4 mr-1.5" /> Accept Mission
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setTrackingDonation(item)}
                        >
                          <MapIcon className="size-4 mr-1.5 text-primary" /> View Map
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. EMERGENCY RELIEF SHIFTS TAB */}
      {view === "drives" && (
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="font-serif text-2xl font-semibold">Emergency Relief Volunteer Shifts</h2>
            <p className="text-sm text-muted-foreground">
              Sign up for active volunteer shifts at local disaster relief operations and distribution centers.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {drives.map((drive) => {
              const isJoined = joinedDriveIds.includes(drive.id)
              return (
                <Card key={drive.id} className="shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base font-bold">{drive.title}</CardTitle>
                      <Badge variant={drive.active ? "critical" : "secondary"}>
                        {drive.active ? "Active Crisis" : "Completed"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{drive.location}</p>
                  </CardHeader>
                  <CardContent className="space-y-4 text-xs">
                    <p className="text-muted-foreground leading-relaxed">{drive.description}</p>

                    <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-3">
                      <p className="font-bold text-foreground">Needed Roles & Tasks:</p>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <CheckCircle2 className="size-3.5 text-emerald-500" /> Package Sorting
                        </span>
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <CheckCircle2 className="size-3.5 text-emerald-500" /> Intake & Verification
                        </span>
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <CheckCircle2 className="size-3.5 text-emerald-500" /> Rapid Dispatch
                        </span>
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <CheckCircle2 className="size-3.5 text-emerald-500" /> Loading Trucks
                        </span>
                      </div>
                    </div>

                    <Button
                      variant={isJoined ? "outline" : "default"}
                      className="w-full font-semibold"
                      onClick={() => handleToggleDrive(drive.id)}
                    >
                      {isJoined ? (
                        <>
                          <CheckCircle2 className="size-4 mr-1.5 text-emerald-500" /> Signed Up for Shift
                        </>
                      ) : (
                        <>
                          <Users className="size-4 mr-1.5" /> Join Relief Volunteer Team
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* 6. IMPACT & BADGES TAB */}
      {view === "impact" && (
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="font-serif text-2xl font-semibold">Your Volunteer Impact & Honors</h2>
            <p className="text-sm text-muted-foreground">
              Recognizing your dedicated service delivering vital supplies across the community.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="text-center p-6 bg-primary/5 border-primary/20">
              <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary mb-3">
                <Truck className="size-6" />
              </span>
              <p className="text-3xl font-black text-foreground">{completedMissions.length + 12}</p>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-1">
                Completed Missions
              </p>
            </Card>

            <Card className="text-center p-6 bg-emerald-500/5 border-emerald-500/20">
              <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 mb-3">
                <Timer className="size-6" />
              </span>
              <p className="text-3xl font-black text-foreground">38.5</p>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-1">
                Hours Volunteered
              </p>
            </Card>

            <Card className="text-center p-6 bg-amber-500/5 border-amber-500/20">
              <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 mb-3">
                <Star className="size-6 fill-amber-500 text-amber-500" />
              </span>
              <p className="text-3xl font-black text-foreground">4.98</p>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-1">
                Recipient Satisfaction
              </p>
            </Card>
          </div>

          {/* Badges Grid */}
          <div className="space-y-3">
            <h3 className="font-bold text-lg text-foreground">Earned Badges & Qualifications</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex items-center gap-3.5 rounded-2xl border border-border bg-card p-4 shadow-sm">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 text-2xl">
                  🛡️
                </span>
                <div>
                  <p className="font-bold text-sm text-foreground">First Responder</p>
                  <p className="text-xs text-muted-foreground">Deployed on 5+ critical urgency missions.</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 rounded-2xl border border-border bg-card p-4 shadow-sm">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600 text-2xl">
                  🚚
                </span>
                <div>
                  <p className="font-bold text-sm text-foreground">Rapid Courier</p>
                  <p className="text-xs text-muted-foreground">Average delivery time under 45 minutes.</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 rounded-2xl border border-border bg-card p-4 shadow-sm">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 text-2xl">
                  📦
                </span>
                <div>
                  <p className="font-bold text-sm text-foreground">Century Supply Hero</p>
                  <p className="text-xs text-muted-foreground">Delivered over 100+ vital relief units.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tracking Dialog Modal */}
      {trackingDonation && (
        <TrackingDialog
          donation={trackingDonation}
          onClose={() => setTrackingDonation(null)}
        />
      )}
    </DashboardShell>
  )
}

function VolunteerTaskCard({
  task,
  request,
  onTrack,
  onAdvance,
}: {
  task: Donation
  request?: AidRequest
  onTrack: () => void
  onAdvance: (task: Donation, nextStatus: DonationStatus, note: string) => void
}) {
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
    task.pickupLocation,
  )}&destination=${encodeURIComponent(request?.deliveryAddress || "Recipient")}`

  return (
    <Card className="hover:border-primary/40 transition-colors shadow-sm">
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-bold text-base text-foreground leading-tight">{task.title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Category: {task.category} · Qty {task.quantity} · ID: {task.id}
            </p>
          </div>
          <StatusBadge status={task.status} />
        </div>

        {/* Origin & Destination */}
        <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-3 text-xs">
          <div className="flex items-start gap-2">
            <span className="size-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
            <div>
              <span className="font-semibold text-foreground">Pickup from Donor:</span>
              <p className="text-muted-foreground">{task.donorName} · {task.pickupLocation}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <span className="size-2 rounded-full bg-sky-500 mt-1 shrink-0" />
            <div>
              <span className="font-semibold text-foreground">Deliver to Recipient:</span>
              <p className="text-muted-foreground">
                {request ? `${request.recipientName} · ${request.deliveryAddress}` : "Relief Hub"}
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
          {task.status === "Matched" && (
            <Button
              size="sm"
              className="flex-1 font-semibold"
              onClick={() => onAdvance(task, "Picked-up", "Volunteer picked up donation from donor")}
            >
              <Package className="size-4 mr-1.5" /> Confirm Pickup
            </Button>
          )}

          {task.status === "Picked-up" && (
            <Button
              size="sm"
              className="flex-1 font-semibold bg-sky-600 hover:bg-sky-700 text-white"
              onClick={() => onAdvance(task, "In-transit", "Volunteer is in transit to recipient")}
            >
              <Truck className="size-4 mr-1.5" /> Start Transit
            </Button>
          )}

          {task.status === "In-transit" && (
            <Button
              size="sm"
              className="flex-1 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => onAdvance(task, "Delivered", "Volunteer confirmed safe delivery to recipient")}
            >
              <CheckCircle2 className="size-4 mr-1.5" /> Complete Delivery
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={onTrack} className="font-semibold">
            <MapIcon className="size-4 mr-1.5 text-primary" /> Live Map
          </Button>

          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
          >
            <ExternalLink className="size-3.5 text-primary" />
          </a>
        </div>
      </CardContent>
    </Card>
  )
}
