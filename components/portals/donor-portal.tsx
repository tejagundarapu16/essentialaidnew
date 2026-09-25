"use client"

import { useMemo, useState } from "react"
import {
  Boxes,
  Gauge,
  HeartHandshake,
  LayoutGrid,
  PackageCheck,
  Plus,
  Siren,
  Truck,
  MapPin,
  ClipboardList,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, Input, Select } from "@/components/ui/field"
import { DashboardShell, type NavItem } from "@/components/dashboard/dashboard-shell"
import { StatCard } from "@/components/dashboard/stat-card"
import { DonationCard } from "@/components/dashboard/donation-card"
import { DriveCard } from "@/components/dashboard/drive-card"
import { TrackingDialog } from "@/components/dashboard/tracking-dialog"
import { GoogleMapView, type MapMarkerItem, type MapRouteItem } from "@/components/maps/google-map-view"
import { UrgencyBadge } from "@/components/status"
import { useStore } from "@/lib/store"
import { ITEM_CATEGORIES, ITEM_CONDITIONS, type Donation, type ItemCategory, type ItemCondition } from "@/lib/types"

const NAV: NavItem[] = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "donations", label: "My Donations", icon: Boxes },
  { key: "requests", label: "Community Needs", icon: ClipboardList },
  { key: "new", label: "New Donation", icon: Plus },
  { key: "drives", label: "Emergency Drives", icon: Siren },
]

export function DonorPortal() {
  const { user, donations, requests, drives, createDonation, matchDonation } = useStore()
  const [view, setView] = useState("overview")
  const [tracking, setTracking] = useState<Donation | null>(null)
  const [presetDrive, setPresetDrive] = useState<string | undefined>(undefined)
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all")

  const mine = useMemo(
    () => donations.filter((d) => d.donorId === user?.id),
    [donations, user?.id],
  )
  const activeCount = mine.filter((d) => !["Delivered", "Reviewed"].includes(d.status)).length
  const deliveredCount = mine.filter((d) => ["Delivered", "Reviewed"].includes(d.status)).length
  const inTransit = mine.filter((d) => d.status === "In-transit").length
  const contributed = mine.reduce((sum, d) => sum + d.quantity, 0)

  const openRequests = useMemo(() => {
    return requests.filter((r) => r.status === "Open")
  }, [requests])

  const filteredRequests = useMemo(() => {
    if (selectedCategoryFilter === "all") return openRequests
    return openRequests.filter((r) => r.category === selectedCategoryFilter)
  }, [openRequests, selectedCategoryFilter])

  // Map markers for Community Needs map
  const { donorMapMarkers, donorMapRoutes } = useMemo(() => {
    const markers: MapMarkerItem[] = []
    const routes: MapRouteItem[] = []

    // Plot recipient requests
    openRequests.forEach((req) => {
      markers.push({
        id: `req-${req.id}`,
        coords: req.coords || { lat: 30.26, lng: -97.68 },
        title: `Need: ${req.category}`,
        subtitle: `${req.recipientName} · Qty ${req.quantity}`,
        type: "recipient",
        status: req.status,
        badge: `${req.urgency} Urgency`,
        details: {
          address: req.deliveryAddress,
          category: req.category,
        },
      })
    })

    // Plot donor's active donations
    mine.forEach((d) => {
      markers.push({
        id: `mine-${d.id}`,
        coords: d.coords || { lat: 30.4, lng: -97.72 },
        title: `Your Supply: ${d.title}`,
        subtitle: `Qty ${d.quantity} · ${d.status}`,
        type: "donor",
        status: d.status,
        badge: d.status,
        details: {
          address: d.pickupLocation,
          category: d.category,
          quantity: d.quantity,
        },
      })
    })

    return { donorMapMarkers: markers, donorMapRoutes: routes }
  }, [openRequests, mine])

  const title =
    NAV.find((n) => n.key === view)?.label === "Overview" ? "Donor Overview" : NAV.find((n) => n.key === view)!.label

  return (
    <DashboardShell navItems={NAV} active={view} onNavigate={setView} title={title}>
      {view === "overview" && (
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Gauge} label="Active donations" value={activeCount} tone="primary" />
            <StatCard icon={Truck} label="In transit" value={inTransit} tone="warning" />
            <StatCard icon={PackageCheck} label="Delivered" value={deliveredCount} tone="success" />
            <StatCard icon={Boxes} label="Items contributed" value={contributed} tone="primary" />
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent donations</h2>
            <Button variant="outline" size="sm" onClick={() => setView("donations")}>
              View all
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {mine.slice(0, 4).map((d) => (
              <DonationCard key={d.id} donation={d} onClick={() => setTracking(d)} />
            ))}
          </div>

          <Card className="border-critical/30 bg-critical/5">
            <CardContent className="flex flex-col items-start gap-3 py-1 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-critical/12 text-critical">
                  <Siren className="size-5" />
                </span>
                <div>
                  <p className="font-semibold">{drives.filter((d) => d.active).length} active emergency drives</p>
                  <p className="text-sm text-muted-foreground">Your help is urgently needed.</p>
                </div>
              </div>
              <Button onClick={() => setView("drives")}>View drives</Button>
            </CardContent>
          </Card>
        </div>
      )}

      {view === "donations" && (
        <div className="grid gap-4 md:grid-cols-2">
          {mine.length === 0 && (
            <EmptyState onAction={() => setView("new")} />
          )}
          {mine.map((d) => (
            <DonationCard
              key={d.id}
              donation={d}
              footer={
                <Button variant="outline" size="sm" className="w-full" onClick={() => setTracking(d)}>
                  Track donation
                </Button>
              }
            />
          ))}
        </div>
      )}

      {view === "requests" && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-2xl font-semibold">Community Aid Needs & Requests</h2>
              <p className="text-sm text-muted-foreground">
                Browse open requests from neighbors and relief centers. Fulfill a request directly with your supplies.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="w-48 text-xs font-semibold"
              >
                <option value="all">All Categories ({openRequests.length})</option>
                {ITEM_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Interactive Map */}
          <div className="space-y-3">
            <GoogleMapView
              markers={donorMapMarkers}
              routes={donorMapRoutes}
              height="380px"
              className="shadow-lg"
            />
            <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground px-1">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-sky-500" /> Recipient Need Location
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-emerald-500" /> Your Listed Supplies
                </span>
              </div>
              <span>Click a pin to view recipient demand details</span>
            </div>
          </div>

          {/* Request Cards Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            {filteredRequests.length === 0 ? (
              <div className="col-span-full rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
                No open community requests found in this category.
              </div>
            ) : (
              filteredRequests.map((req) => {
                const matchingDonation = mine.find(
                  (d) => d.category === req.category && !d.matchedRequestId && d.verified,
                )

                return (
                  <Card key={req.id} className="hover:border-primary/40 transition-colors shadow-sm">
                    <CardContent className="flex flex-col gap-3 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-base text-foreground leading-tight">{req.category}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Needed: {req.quantity} units · Requested by {req.recipientName}
                          </p>
                        </div>
                        <UrgencyBadge urgency={req.urgency} />
                      </div>

                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3.5 text-primary shrink-0" />
                        <span className="truncate">{req.deliveryAddress}</span>
                      </div>

                      <div className="pt-2 border-t border-border flex items-center justify-between gap-2">
                        {matchingDonation ? (
                          <Button
                            size="sm"
                            className="w-full font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => {
                              matchDonation(matchingDonation.id, req.id, 98)
                              setView("donations")
                            }}
                          >
                            <HeartHandshake className="size-4 mr-1.5" /> Fulfill with &quot;{matchingDonation.title}&quot;
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full font-semibold"
                            onClick={() => setView("new")}
                          >
                            <Plus className="size-4 mr-1.5" /> Donate {req.category}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </div>
      )}

      {view === "new" && (
        <NewDonationForm
          drives={drives}
          presetDrive={presetDrive}
          onSubmit={(input) => {
            createDonation(input)
            setPresetDrive(undefined)
            setView("donations")
          }}
        />
      )}

      {view === "drives" && (
        <div className="grid gap-4 md:grid-cols-2">
          {drives.map((drive) => {
            const contributedToDrive = donations
              .filter((d) => d.driveId === drive.id)
              .reduce((s, d) => s + d.quantity, 0)
            return (
              <DriveCard
                key={drive.id}
                drive={drive}
                contributed={contributedToDrive}
                action={
                  drive.active && (
                    <Button
                      className="w-full"
                      onClick={() => {
                        setPresetDrive(drive.id)
                        setView("new")
                      }}
                    >
                      <HeartHandshake className="size-4" /> Donate to this drive
                    </Button>
                  )
                }
              />
            )
          })}
        </div>
      )}

      {tracking && <TrackingDialog donation={tracking} onClose={() => setTracking(null)} />}
    </DashboardShell>
  )
}

function EmptyState({ onAction }: { onAction: () => void }) {
  return (
    <Card className="col-span-full">
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Boxes className="size-6" />
        </span>
        <p className="font-medium">No donations yet</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          List your first item and we&apos;ll match it to someone who needs it.
        </p>
        <Button onClick={onAction}>
          <Plus className="size-4" /> New donation
        </Button>
      </CardContent>
    </Card>
  )
}

function NewDonationForm({
  drives,
  presetDrive,
  onSubmit,
}: {
  drives: { id: string; title: string; active: boolean }[]
  presetDrive?: string
  onSubmit: (input: {
    category: ItemCategory
    title: string
    quantity: number
    condition: ItemCondition
    pickupLocation: string
    driveId?: string
  }) => void
}) {
  const { user } = useStore()
  const [category, setCategory] = useState<ItemCategory>(ITEM_CATEGORIES[0])
  const [title, setTitle] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [condition, setCondition] = useState<ItemCondition>("New")
  const [pickupLocation, setPickupLocation] = useState(user?.location ?? "")
  const [driveId, setDriveId] = useState<string>(presetDrive ?? "")

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>List a new donation</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (!title.trim()) return
            onSubmit({
              category,
              title: title.trim(),
              quantity,
              condition,
              pickupLocation,
              driveId: driveId || undefined,
            })
          }}
        >
          <Field label="Item description">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Bottled water (24-pack cases)"
              required
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category">
              <Select value={category} onChange={(e) => setCategory(e.target.value as ItemCategory)}>
                {ITEM_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Condition">
              <Select value={condition} onChange={(e) => setCondition(e.target.value as ItemCondition)}>
                {ITEM_CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Quantity">
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
              />
            </Field>
            <Field label="Pickup location">
              <Input value={pickupLocation} onChange={(e) => setPickupLocation(e.target.value)} />
            </Field>
          </div>
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
            New items with quantity of 50 or fewer are auto-verified. Larger or used items go to the
            admin verification queue.
          </div>
          <Button type="submit" size="lg">
            <Plus className="size-4" /> List donation
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
