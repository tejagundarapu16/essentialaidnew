"use client"

import { useMemo, useState } from "react"
import {
  Boxes,
  CalendarClock,
  LayoutGrid,
  MapPin,
  Package,
  Truck,
  Warehouse,
  Map as MapIcon,
  Navigation,
  CheckCircle2,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, Input, Select } from "@/components/ui/field"
import { DashboardShell, type NavItem } from "@/components/dashboard/dashboard-shell"
import { StatCard } from "@/components/dashboard/stat-card"
import { DonationCard } from "@/components/dashboard/donation-card"
import { StatusBadge } from "@/components/status"
import { GoogleMapView, type MapMarkerItem, type MapRouteItem } from "@/components/maps/google-map-view"
import { getDonationDeliveryPosition } from "@/lib/geo"
import { useStore } from "@/lib/store"
import type { Donation, PickupMethod } from "@/lib/types"

const PICKUP_METHODS: { value: PickupMethod; label: string; hint: string }[] = [
  { value: "Self-pickup", label: "Self-pickup", hint: "Recipient collects directly" },
  { value: "Volunteer delivery", label: "Volunteer delivery", hint: "Assigned volunteer driver" },
  { value: "Third-party courier", label: "Third-party courier", hint: "External courier service" },
]

function ScheduleForm({ donation }: { donation: Donation }) {
  const { assignPickup } = useStore()
  const [method, setMethod] = useState<PickupMethod>("Volunteer delivery")
  const [window, setWindow] = useState("")

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-secondary/40 p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Pickup method">
          <Select value={method} onChange={(e) => setMethod(e.target.value as PickupMethod)}>
            {PICKUP_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Delivery window">
          <Input
            type="text"
            placeholder="e.g. Tue 2-4 PM"
            value={window}
            onChange={(e) => setWindow(e.target.value)}
          />
        </Field>
      </div>
      <Button
        size="sm"
        className="w-fit font-semibold"
        disabled={!window.trim()}
        onClick={() => assignPickup(donation.id, method, window.trim())}
      >
        <CalendarClock className="size-4 mr-1.5" /> Schedule pickup
      </Button>
    </div>
  )
}

export function LogisticsPortal() {
  const { donations, requests, advanceDonation } = useStore()
  const [tab, setTab] = useState<"overview" | "map" | "queue" | "active" | "inventory">("overview")
  const [selectedDonationId, setSelectedDonationId] = useState<string | null>(null)

  const awaitingPickup = useMemo(
    () => donations.filter((d) => d.status === "Matched"),
    [donations],
  )
  const inMotion = useMemo(
    () => donations.filter((d) => d.status === "Picked-up" || d.status === "In-transit"),
    [donations],
  )
  const inventory = useMemo(
    () => donations.filter((d) => d.verified && d.status !== "Reviewed"),
    [donations],
  )

  const stats = {
    pickups: awaitingPickup.length,
    transit: donations.filter((d) => d.status === "In-transit").length,
    inventory: inventory.reduce((sum, d) => sum + d.quantity, 0),
    delivered: donations.filter((d) => d.status === "Delivered" || d.status === "Reviewed").length,
  }

  const nav: NavItem[] = [
    { key: "overview", label: "Overview", icon: LayoutGrid },
    { key: "map", label: "Fleet & Route Map", icon: MapIcon, badge: inMotion.length || undefined },
    { key: "queue", label: "Pickup Queue", icon: CalendarClock, badge: awaitingPickup.length || undefined },
    { key: "active", label: "In Motion", icon: Truck, badge: inMotion.length || undefined },
    { key: "inventory", label: "Inventory", icon: Warehouse, badge: inventory.length || undefined },
  ]

  // Prepare map markers for all relevant items
  const { mapMarkers, mapRoutes } = useMemo(() => {
    const markers: MapMarkerItem[] = []
    const routes: MapRouteItem[] = []

    const relevant = donations.filter((d) => ["Matched", "Picked-up", "In-transit", "Delivered"].includes(d.status))

    relevant.forEach((d) => {
      const req = requests.find((r) => r.id === d.matchedRequestId)
      const data = getDonationDeliveryPosition(d, req)

      // Donor pin
      markers.push({
        id: `donor-${d.id}`,
        coords: data.donorCoords,
        title: `Donor: ${d.donorName}`,
        subtitle: `${d.title} (${d.quantity} units)`,
        type: "donor",
        status: d.status,
        badge: "Pickup Origin",
        details: {
          address: d.pickupLocation,
          category: d.category,
          quantity: d.quantity,
        },
      })

      // Recipient pin if matched
      if (req) {
        markers.push({
          id: `recipient-${req.id}`,
          coords: data.recipientCoords,
          title: `Recipient: ${req.recipientName}`,
          subtitle: `${req.category} · ${req.urgency} Urgency`,
          type: "recipient",
          status: req.status,
          badge: "Delivery Destination",
          details: {
            address: req.deliveryAddress,
            category: req.category,
          },
        })

        // Route line
        routes.push({
          id: `route-${d.id}`,
          from: data.donorCoords,
          to: data.recipientCoords,
          currentPosition: data.currentCoords,
          status: d.status,
          color: data.isDelivered ? "#10b981" : "#0284c7",
        })
      }

      // Live vehicle marker if in-transit or picked up
      if (data.isInTransit && !data.isDelivered) {
        markers.push({
          id: `driver-${d.id}`,
          coords: data.currentCoords,
          title: `Driver: ${d.title}`,
          subtitle: `${d.pickupMethod || "Courier"} · ${data.stageLabel}`,
          type: "driver",
          status: d.status,
          badge: "Live Dispatch",
          details: {
            address: `En route to ${req?.deliveryAddress || "Recipient"}`,
            category: d.category,
          },
        })
      }
    })

    return { mapMarkers: markers, mapRoutes: routes }
  }, [donations, requests])

  const selectedDonation = useMemo(() => {
    return donations.find((d) => d.id === selectedDonationId) || inMotion[0] || awaitingPickup[0] || null
  }, [donations, selectedDonationId, inMotion, awaitingPickup])

  const selectedMatchedReq = useMemo(() => {
    return requests.find((r) => r.id === selectedDonation?.matchedRequestId)
  }, [requests, selectedDonation])

  return (
    <DashboardShell navItems={nav} active={tab} onNavigate={(k) => setTab(k as typeof tab)} title="Logistics Control">
    <div className="flex flex-col gap-6">
      {tab === "overview" && (
        <>
          <div>
            <h2 className="font-serif text-2xl font-semibold">Logistics control</h2>
            <p className="text-sm text-muted-foreground">
              Assign pickups, move shipments, and keep inventory flowing.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard icon={CalendarClock} label="Awaiting pickup" value={stats.pickups} tone="warning" />
            <StatCard icon={Truck} label="In transit" value={stats.transit} tone="primary" />
            <StatCard icon={Warehouse} label="Units in inventory" value={stats.inventory} tone="success" />
            <StatCard icon={Package} label="Delivered" value={stats.delivered} tone="success" />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Next up in the pickup queue</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {awaitingPickup.length === 0 ? (
                <EmptyState message="No matched donations are waiting for pickup." />
              ) : (
                awaitingPickup
                  .slice(0, 3)
                  .map((d) => (
                    <DonationCard key={d.id} donation={d} showDonor footer={<ScheduleForm donation={d} />} />
                  ))
              )}
            </CardContent>
          </Card>
        </>
      )}

      {tab === "map" && (
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="font-serif text-2xl font-semibold">Live Fleet & Route Dispatch</h2>
            <p className="text-sm text-muted-foreground">
              Real-time geographic visualization of all active donor pickups, volunteer couriers, and recipient deliveries.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Live Map View Canvas */}
            <div className="lg:col-span-2 space-y-3">
              <GoogleMapView
                markers={mapMarkers}
                routes={mapRoutes}
                height="460px"
                className="shadow-lg border-border"
                onSelectMarker={(m) => {
                  if (m) {
                    const rawId = m.id.replace(/^(donor-|recipient-|driver-)/, "")
                    setSelectedDonationId(rawId)
                  }
                }}
              />
              <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground px-1">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-emerald-500" /> Donor Pickup
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-amber-500" /> Courier In-Motion
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-sky-500" /> Recipient Destination
                  </span>
                </div>
                <span>Click any marker to inspect shipment</span>
              </div>
            </div>

            {/* Selected Shipment Dispatch Control Card */}
            <div className="space-y-4">
              <Card className="border-border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>Dispatch Controls</span>
                    {selectedDonation && <StatusBadge status={selectedDonation.status} />}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedDonation ? (
                    <>
                      <div>
                        <h4 className="font-bold text-base text-foreground leading-tight">
                          {selectedDonation.title}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {selectedDonation.category} · Qty {selectedDonation.quantity} · ID {selectedDonation.id}
                        </p>
                      </div>

                      <div className="space-y-2.5 rounded-xl border border-border bg-muted/30 p-3 text-xs">
                        <div className="flex items-start gap-2">
                          <MapPin className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-foreground">Donor: {selectedDonation.donorName}</p>
                            <p className="text-muted-foreground">{selectedDonation.pickupLocation}</p>
                          </div>
                        </div>

                        {selectedMatchedReq && (
                          <div className="flex items-start gap-2 border-t border-border/60 pt-2">
                            <Navigation className="size-3.5 text-sky-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold text-foreground">
                                Recipient: {selectedMatchedReq.recipientName}
                              </p>
                              <p className="text-muted-foreground">{selectedMatchedReq.deliveryAddress}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {selectedDonation.deliveryWindow && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <CalendarClock className="size-3.5 text-primary" />
                          <span>
                            {selectedDonation.pickupMethod} — {selectedDonation.deliveryWindow}
                          </span>
                        </p>
                      )}

                      <div className="space-y-2 pt-2 border-t border-border">
                        {selectedDonation.status === "Matched" && (
                          <ScheduleForm donation={selectedDonation} />
                        )}

                        {selectedDonation.status === "Picked-up" && (
                          <Button
                            className="w-full font-semibold"
                            onClick={() => advanceDonation(selectedDonation.id, "In-transit", "Out for delivery")}
                          >
                            <Truck className="size-4 mr-2" /> Mark In Transit
                          </Button>
                        )}

                        {selectedDonation.status === "In-transit" && (
                          <Button
                            className="w-full font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => advanceDonation(selectedDonation.id, "Delivered", "Delivered to recipient")}
                          >
                            <CheckCircle2 className="size-4 mr-2" /> Confirm Delivery
                          </Button>
                        )}

                        {selectedDonation.status === "Delivered" && (
                          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-2.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="size-4 shrink-0" />
                            <span>Successfully delivered to recipient destination</span>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <EmptyState message="Select an active shipment on the map to manage dispatch." />
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {tab === "queue" && (
        <div className="flex flex-col gap-4">
          {awaitingPickup.length === 0 ? (
            <EmptyState message="No matched donations are waiting for pickup." />
          ) : (
            awaitingPickup.map((d) => (
              <DonationCard
                key={d.id}
                donation={d}
                showDonor
                footer={<ScheduleForm donation={d} />}
              />
            ))
          )}
        </div>
      )}

      {tab === "active" && (
        <div className="grid gap-4 md:grid-cols-2">
          {inMotion.length === 0 ? (
            <EmptyState message="Nothing in transit right now." />
          ) : (
            inMotion.map((d) => (
              <DonationCard
                key={d.id}
                donation={d}
                showDonor
                footer={
                  <div className="flex flex-col gap-2">
                    {d.deliveryWindow && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarClock className="size-3.5" /> {d.pickupMethod} — {d.deliveryWindow}
                      </p>
                    )}
                    {d.status === "Picked-up" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => advanceDonation(d.id, "In-transit", "Out for delivery")}
                      >
                        <Truck className="size-4" /> Mark in transit
                      </Button>
                    )}
                    {d.status === "In-transit" && (
                      <Button
                        size="sm"
                        onClick={() => advanceDonation(d.id, "Delivered", "Delivered to recipient")}
                      >
                        Confirm delivery
                      </Button>
                    )}
                  </div>
                }
              />
            ))
          )}
        </div>
      )}

      {tab === "inventory" && (
        <Card>
          <CardHeader>
            <CardTitle>Verified inventory</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {inventory.length === 0 ? (
              <EmptyState message="No verified inventory available." />
            ) : (
              inventory.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                      <Package className="size-4" />
                    </span>
                    <div>
                      <p className="text-sm font-medium leading-tight">{d.title}</p>
                      <p className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Boxes className="size-3" /> Qty {d.quantity}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3" /> {d.pickupLocation}
                        </span>
                        <span>{d.category}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {d.driveId && <Badge variant="critical">Emergency</Badge>}
                    <StatusBadge status={d.status} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
    </DashboardShell>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-12 text-center">
      <Warehouse className="size-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
