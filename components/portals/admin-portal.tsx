"use client"

import { useMemo, useState } from "react"
import {
  BarChart3,
  Boxes,
  Check,
  ClipboardCheck,
  Gauge,
  LayoutGrid,
  Link2,
  Package,
  Plus,
  ShieldCheck,
  Siren,
  X,
  Map as MapIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, Input, Textarea } from "@/components/ui/field"
import { DashboardShell, type NavItem } from "@/components/dashboard/dashboard-shell"
import { StatCard } from "@/components/dashboard/stat-card"
import { DriveCard } from "@/components/dashboard/drive-card"
import { MatchConfidence, UrgencyBadge } from "@/components/status"
import { rankMatches } from "@/lib/matching"
import { GoogleMapView, type MapMarkerItem, type MapRouteItem } from "@/components/maps/google-map-view"
import { getDonationDeliveryPosition } from "@/lib/geo"
import { useStore } from "@/lib/store"
import { ITEM_CATEGORIES, type ItemCategory } from "@/lib/types"

const NAV: NavItem[] = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "map", label: "Operations Map", icon: MapIcon },
  { key: "verify", label: "Verification", icon: ClipboardCheck },
  { key: "match", label: "Matching", icon: Link2 },
  { key: "drives", label: "Drives", icon: Siren },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
]

export function AdminPortal() {
  const { donations, requests, drives, verifyDonation, matchDonation } = useStore()
  const [view, setView] = useState("overview")
  const [selectedMapPin, setSelectedMapPin] = useState<string | null>(null)

  const pendingVerify = donations.filter((d) => !d.verified)
  const activeDrives = drives.filter((d) => d.active)
  const delivered = donations.filter((d) => ["Delivered", "Reviewed"].includes(d.status)).length
  const matchedOrBeyond = donations.filter((d) =>
    ["Matched", "Picked-up", "In-transit", "Delivered", "Reviewed"].includes(d.status),
  ).length
  const verifiedCount = donations.filter((d) => d.verified).length
  const openRequests = requests.filter((r) => r.status === "Open").length
  const successRate = donations.length ? Math.round((delivered / donations.length) * 100) : 0
  const verificationRate = donations.length ? Math.round((verifiedCount / donations.length) * 100) : 0

  const { adminMarkers, adminRoutes } = useMemo(() => {
    const markers: MapMarkerItem[] = []
    const routes: MapRouteItem[] = []

    // 1. Emergency drive hubs
    drives.forEach((drive) => {
      markers.push({
        id: `drive-${drive.id}`,
        coords: { lat: 30.27 + (Math.random() - 0.5) * 0.04, lng: -97.74 + (Math.random() - 0.5) * 0.04 },
        title: `Drive: ${drive.title}`,
        subtitle: `${drive.location} · Goal ${drive.goal} items`,
        type: "hub",
        badge: drive.active ? "Active Crisis Drive" : "Completed Drive",
        details: {
          address: drive.location,
          category: drive.categories.join(", "),
        },
      })
    })

    // 2. Donations
    donations.forEach((d) => {
      const req = requests.find((r) => r.id === d.matchedRequestId)
      const data = getDonationDeliveryPosition(d, req)

      markers.push({
        id: `donor-${d.id}`,
        coords: data.donorCoords,
        title: `Donor: ${d.donorName}`,
        subtitle: `${d.title} (Qty ${d.quantity})`,
        type: "donor",
        status: d.status,
        badge: d.status,
        details: {
          address: d.pickupLocation,
          category: d.category,
          quantity: d.quantity,
        },
      })

      if (req) {
        routes.push({
          id: `route-${d.id}`,
          from: data.donorCoords,
          to: data.recipientCoords,
          currentPosition: data.currentCoords,
          status: d.status,
          color: data.isDelivered ? "#10b981" : "#0284c7",
        })
      }

      if (data.isInTransit && !data.isDelivered) {
        markers.push({
          id: `courier-${d.id}`,
          coords: data.currentCoords,
          title: `Courier: ${d.title}`,
          subtitle: `${d.pickupMethod || "Courier"} · En route`,
          type: "driver",
          status: d.status,
          badge: "Live Dispatch",
          details: {
            address: `Heading to ${req?.deliveryAddress || "Recipient"}`,
            category: d.category,
          },
        })
      }
    })

    // 3. Open Aid Requests
    requests.forEach((r) => {
      markers.push({
        id: `request-${r.id}`,
        coords: r.coords || { lat: 30.26, lng: -97.68 },
        title: `Request: ${r.recipientName}`,
        subtitle: `${r.category} · Qty ${r.quantity}`,
        type: "recipient",
        status: r.status,
        badge: `${r.urgency} Urgency`,
        details: {
          address: r.deliveryAddress,
          category: r.category,
        },
      })
    })

    return { adminMarkers: markers, adminRoutes: routes }
  }, [donations, requests, drives])

  const nav = NAV.map((n) => (n.key === "verify" ? { ...n, badge: pendingVerify.length } : n))
  const title = view === "overview" ? "Admin Dashboard" : NAV.find((n) => n.key === view)!.label

  return (
    <DashboardShell navItems={nav} active={view} onNavigate={setView} title={title}>
      {view === "overview" && (
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Boxes} label="Total donations" value={donations.length} tone="primary" />
            <StatCard icon={Siren} label="Active drives" value={activeDrives.length} tone="critical" />
            <StatCard icon={Gauge} label="Verification rate" value={`${verificationRate}%`} tone="success" />
            <StatCard
              icon={ClipboardCheck}
              label="Pending verifications"
              value={pendingVerify.length}
              tone="warning"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Operational focus</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <span>Open requests awaiting a match</span>
                  <span className="font-semibold text-foreground">{openRequests}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <span>Items already in motion</span>
                  <span className="font-semibold text-foreground">{matchedOrBeyond}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <span>Current success rate</span>
                  <span className="font-semibold text-foreground">{successRate}%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Priority actions</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
                {pendingVerify.length > 0 ? (
                  <div className="rounded-lg border border-warning/30 bg-warning/10 p-3">
                    Review {pendingVerify.length} donation{pendingVerify.length > 1 ? "s" : ""} pending approval.
                  </div>
                ) : (
                  <div className="rounded-lg border border-success/30 bg-success/10 p-3">
                    Verification queue is clear and all recent items have been reviewed.
                  </div>
                )}
                {openRequests > 0 ? (
                  <div className="rounded-lg border border-primary/30 bg-primary/10 p-3">
                    {openRequests} request{openRequests > 1 ? "s" : ""} need a matching donation.
                  </div>
                ) : (
                  <div className="rounded-lg border border-border p-3">
                    No open requests are waiting for a match right now.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Pipeline overview</CardTitle>
                <Badge variant="secondary">{matchedOrBeyond} in motion</Badge>
              </CardHeader>
              <CardContent>
                <PipelineBars donations={donations} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Emergency drives</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setView("drives")}>
                  Manage
                </Button>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {activeDrives.map((d) => (
                  <div key={d.id} className="flex items-center gap-2 rounded-lg border border-critical/30 bg-critical/5 p-3">
                    <Siren className="size-4 shrink-0 text-critical" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{d.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{d.location}</p>
                    </div>
                  </div>
                ))}
                {activeDrives.length === 0 && (
                  <p className="text-sm text-muted-foreground">No active drives.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {pendingVerify.length > 0 && (
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Needs verification</CardTitle>
                <Button size="sm" onClick={() => setView("verify")}>
                  Review queue
                </Button>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {pendingVerify.slice(0, 2).map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <p className="text-sm font-medium">{d.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.donorName} · Qty {d.quantity}
                      </p>
                    </div>
                    <Badge variant="warning">Pending</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {view === "map" && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-2xl font-semibold">Regional Operations Map</h2>
              <p className="text-sm text-muted-foreground">
                Central command overview of active emergency relief drives, donor supplies, courier routes, and recipient aid requests.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-xs font-semibold">
                {donations.length} Donations
              </Badge>
              <Badge variant="outline" className="text-xs font-semibold">
                {requests.length} Aid Requests
              </Badge>
              <Badge variant="critical" className="text-xs font-semibold">
                {activeDrives.length} Active Drives
              </Badge>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-4">
            <div className="lg:col-span-3 space-y-3">
              <GoogleMapView
                markers={adminMarkers}
                routes={adminRoutes}
                selectedMarkerId={selectedMapPin || undefined}
                height="500px"
                className="shadow-xl"
                onSelectMarker={(m) => setSelectedMapPin(m ? m.id : null)}
              />
              <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground px-1">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-rose-500" /> Crisis Hub
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-emerald-500" /> Donor Pickup
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-amber-500" /> In-Motion Courier
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-sky-500" /> Recipient Request
                  </span>
                </div>
                <span>Zoom & pan freely across the crisis operations zone</span>
              </div>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Operations Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/30">
                    <span className="text-muted-foreground">Emergency Drives</span>
                    <span className="font-bold text-foreground">{drives.length} total</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/30">
                    <span className="text-muted-foreground">Donor Supplies</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {donations.reduce((sum, d) => sum + d.quantity, 0)} units
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/30">
                    <span className="text-muted-foreground">Active Deliveries</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">{matchedOrBeyond} items</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/30">
                    <span className="text-muted-foreground">Unfulfilled Requests</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">{openRequests} requests</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Active Emergency Hubs</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {activeDrives.map((drive) => (
                    <div
                      key={drive.id}
                      className="p-3 rounded-lg border border-critical/30 bg-critical/5 text-xs space-y-1"
                    >
                      <p className="font-bold text-foreground">{drive.title}</p>
                      <p className="text-muted-foreground">{drive.location}</p>
                      <Badge variant="critical" className="text-[10px] mt-1">
                        Goal: {drive.goal} supplies
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {view === "verify" && (
        <div className="flex flex-col gap-4">
          {pendingVerify.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
                <span className="flex size-12 items-center justify-center rounded-xl bg-success/12 text-success">
                  <ShieldCheck className="size-6" />
                </span>
                <p className="font-medium">Verification queue is clear</p>
                <p className="text-sm text-muted-foreground">All donations have been reviewed.</p>
              </CardContent>
            </Card>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {pendingVerify.map((d) => (
              <Card key={d.id}>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex aspect-video items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Package className="size-10" />
                  </div>
                  <div>
                    <h3 className="font-medium">{d.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {d.category} · {d.condition} · Qty {d.quantity}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Submitted by {d.donorName} · {d.pickupLocation}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                      onClick={() => verifyDonation(d.id, false)}
                    >
                      <X className="size-4" /> Reject
                    </Button>
                    <Button size="sm" className="flex-1" onClick={() => verifyDonation(d.id, true)}>
                      <Check className="size-4" /> Approve
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {view === "match" && (
        <MatchingView
          donations={donations}
          requests={requests}
          onMatch={matchDonation}
        />
      )}

      {view === "drives" && <DrivesManager />}

      {view === "analytics" && <Analytics />}
    </DashboardShell>
  )
}

function PipelineBars({ donations }: { donations: { status: string }[] }) {
  const stages = ["Listed", "Verified", "Matched", "Picked-up", "In-transit", "Delivered", "Reviewed"]
  const counts = stages.map((s) => donations.filter((d) => d.status === s).length)
  const max = Math.max(1, ...counts)
  return (
    <div className="flex flex-col gap-3">
      {stages.map((s, i) => (
        <div key={s} className="flex items-center gap-3">
          <span className="w-20 shrink-0 text-xs text-muted-foreground">{s}</span>
          <div className="h-6 flex-1 overflow-hidden rounded-md bg-muted">
            <div
              className="flex h-full items-center justify-end rounded-md bg-primary px-2 text-xs font-medium text-primary-foreground"
              style={{ width: `${(counts[i] / max) * 100}%`, minWidth: counts[i] ? "1.5rem" : 0 }}
            >
              {counts[i] || ""}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function MatchingView({
  donations,
  requests,
  onMatch,
}: {
  donations: import("@/lib/types").Donation[]
  requests: import("@/lib/types").AidRequest[]
  onMatch: (donationId: string, requestId: string, confidence: number) => void
}) {
  const candidates = donations.filter((d) => d.verified && !d.matchedRequestId)
  const openRequests = requests.filter((r) => r.status === "Open")

  return (
    <div className="flex flex-col gap-4">
      <Card className="bg-secondary/40">
        <CardContent className="flex items-center gap-3 py-1 text-sm text-muted-foreground">
          <Link2 className="size-4 text-primary" />
          Suggestions rank open requests by category, distance, and urgency. Confirm to lock the match.
        </CardContent>
      </Card>
      {candidates.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No verified donations awaiting a match.
          </CardContent>
        </Card>
      )}
      {candidates.map((d) => {
        const ranked = rankMatches(d, openRequests).slice(0, 3)
        return (
          <Card key={d.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="size-4 text-primary" /> {d.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {d.category} · Qty {d.quantity} · {d.pickupLocation}
              </p>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {ranked.length === 0 && (
                <p className="text-sm text-muted-foreground">No matching open requests right now.</p>
              )}
              {ranked.map((m) => (
                <div
                  key={m.request.id}
                  className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{m.request.recipientName}</p>
                      <UrgencyBadge urgency={m.request.urgency} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {m.request.deliveryAddress} · {m.distance} km away · needs {m.request.quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 sm:w-64">
                    <div className="flex-1">
                      <MatchConfidence value={m.confidence} />
                    </div>
                    <Button size="sm" onClick={() => onMatch(d.id, m.request.id, m.confidence)}>
                      Match
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function DrivesManager() {
  const { drives, donations, createDrive, toggleDrive } = useStore()
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [location, setLocation] = useState("")
  const [goal, setGoal] = useState(300)
  const [cats, setCats] = useState<ItemCategory[]>(["Food & Water"])

  function toggleCat(c: ItemCategory) {
    setCats((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Emergency drives</h2>
        <Button onClick={() => setCreating((c) => !c)}>
          <Plus className="size-4" /> {creating ? "Close" : "New drive"}
        </Button>
      </div>

      {creating && (
        <Card>
          <CardHeader>
            <CardTitle>Launch an emergency drive</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault()
                if (!title.trim()) return
                createDrive({ title: title.trim(), description, location, goal, categories: cats })
                setCreating(false)
                setTitle("")
                setDescription("")
                setLocation("")
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Drive title">
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Wildfire Response" required />
                </Field>
                <Field label="Location">
                  <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Bastrop County, TX" />
                </Field>
              </div>
              <Field label="Description">
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is needed and why" />
              </Field>
              <Field label="Item goal">
                <Input type="number" min={1} value={goal} onChange={(e) => setGoal(Math.max(1, Number(e.target.value)))} />
              </Field>
              <div>
                <p className="mb-2 text-sm font-medium">Needed categories</p>
                <div className="flex flex-wrap gap-2">
                  {ITEM_CATEGORIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleCat(c)}
                      className={
                        cats.includes(c)
                          ? "rounded-full border-2 border-primary bg-primary/5 px-3 py-1 text-xs font-medium"
                          : "rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
                      }
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <Button type="submit">Launch drive</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {drives.map((drive) => {
          const contributed = donations
            .filter((d) => d.driveId === drive.id)
            .reduce((s, d) => s + d.quantity, 0)
          return (
            <DriveCard
              key={drive.id}
              drive={drive}
              contributed={contributed}
              action={
                <Button variant="outline" className="w-full" onClick={() => toggleDrive(drive.id)}>
                  {drive.active ? "Close drive" : "Reopen drive"}
                </Button>
              }
            />
          )
        })}
      </div>
    </div>
  )
}

function Analytics() {
  const { donations, requests } = useStore()

  const byCategory = ITEM_CATEGORIES.map((c) => ({
    category: c,
    count: donations.filter((d) => d.category === c).length,
  })).filter((x) => x.count > 0)
  const maxCat = Math.max(1, ...byCategory.map((x) => x.count))

  const urgencyBreakdown = (["Critical", "High", "Normal"] as const).map((u) => ({
    urgency: u,
    count: requests.filter((r) => r.urgency === u).length,
  }))
  const totalReq = Math.max(1, requests.length)

  const avgRating =
    donations.filter((d) => d.rating).reduce((s, d) => s + (d.rating ?? 0), 0) /
    Math.max(1, donations.filter((d) => d.rating).length)

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Boxes} label="Total requests" value={requests.length} tone="primary" />
        <StatCard
          icon={Siren}
          label="Critical requests"
          value={requests.filter((r) => r.urgency === "Critical").length}
          tone="critical"
        />
        <StatCard
          icon={Gauge}
          label="Avg. rating"
          value={avgRating ? avgRating.toFixed(1) : "—"}
          tone="success"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Donations by category</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {byCategory.map((c) => (
              <div key={c.category} className="flex items-center gap-3">
                <span className="w-28 shrink-0 truncate text-xs text-muted-foreground">{c.category}</span>
                <div className="h-5 flex-1 overflow-hidden rounded-md bg-muted">
                  <div
                    className="h-full rounded-md bg-primary"
                    style={{ width: `${(c.count / maxCat) * 100}%` }}
                  />
                </div>
                <span className="w-6 text-right text-xs tabular-nums text-muted-foreground">{c.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Request urgency mix</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {urgencyBreakdown.map((u) => (
              <div key={u.urgency} className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-xs text-muted-foreground">{u.urgency}</span>
                <div className="h-5 flex-1 overflow-hidden rounded-md bg-muted">
                  <div
                    className={
                      u.urgency === "Critical"
                        ? "h-full rounded-md bg-critical"
                        : u.urgency === "High"
                          ? "h-full rounded-md bg-warning"
                          : "h-full rounded-md bg-primary"
                    }
                    style={{ width: `${(u.count / totalReq) * 100}%` }}
                  />
                </div>
                <span className="w-6 text-right text-xs tabular-nums text-muted-foreground">{u.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
