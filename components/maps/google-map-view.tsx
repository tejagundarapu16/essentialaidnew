"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import {
  MapPin,
  Truck,
  Building2,
  HeartHandshake,
  Layers,
  Maximize2,
  Minimize2,
  Navigation,
  Plus,
  Minus,
  Sparkles,
  ExternalLink,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Coords, DonationStatus } from "@/lib/types"
import { DEFAULT_MAP_CENTER } from "@/lib/geo"

export interface MapMarkerItem {
  id: string
  coords: Coords
  title: string
  subtitle?: string
  type: "donor" | "recipient" | "driver" | "hub" | "general"
  status?: DonationStatus | string
  badge?: string
  details?: {
    contact?: string
    address?: string
    quantity?: number
    category?: string
  }
}

export interface MapRouteItem {
  id: string
  from: Coords
  to: Coords
  currentPosition?: Coords
  label?: string
  status?: DonationStatus
  color?: string
}

interface GoogleMapViewProps {
  center?: Coords
  zoom?: number
  markers?: MapMarkerItem[]
  routes?: MapRouteItem[]
  selectedMarkerId?: string
  onSelectMarker?: (marker: MapMarkerItem | null) => void
  height?: string
  className?: string
  showControls?: boolean
  interactive?: boolean
}

export function GoogleMapView({
  center = DEFAULT_MAP_CENTER,
  zoom = 13,
  markers = [],
  routes = [],
  selectedMarkerId,
  onSelectMarker,
  height = "380px",
  className = "",
  showControls = true,
  interactive = true,
}: GoogleMapViewProps) {
  const [mapZoom, setMapZoom] = useState(zoom)
  const [mapCenter, setMapCenter] = useState<Coords>(center)
  const [mapMode, setMapMode] = useState<"standard" | "satellite" | "terrain">("standard")
  const [activeMarker, setActiveMarker] = useState<MapMarkerItem | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isGoogleMapsReady, setIsGoogleMapsReady] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, initialOffset: { x: 0, y: 0 } })
  const containerRef = useRef<HTMLDivElement>(null)
  const googleMapDivRef = useRef<HTMLDivElement>(null)
  const googleMapInstance = useRef<{
    setCenter: (c: { lat: number; lng: number }) => void
    setZoom: (z: number) => void
    setMapTypeId: (t: string) => void
  } | null>(null)

  // Sync selected marker from parent props
  useEffect(() => {
    if (selectedMarkerId) {
      const found = markers.find((m) => m.id === selectedMarkerId)
      if (found) {
        setActiveMarker(found)
        setMapCenter(found.coords)
      }
    }
  }, [selectedMarkerId, markers])

  // Center update when prop changes
  useEffect(() => {
    setMapCenter(center)
  }, [center])

  // Google Maps JavaScript API Dynamic Script Loader
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      return
    }

    const win = typeof window !== "undefined" ? (window as unknown as { google?: { maps?: unknown } }) : undefined
    if (win?.google?.maps) {
      setIsGoogleMapsReady(true)
      return
    }

    const existingScript = document.getElementById("google-maps-script")
    if (!existingScript) {
      const script = document.createElement("script")
      script.id = "google-maps-script"
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`
      script.async = true
      script.defer = true
      script.onload = () => setIsGoogleMapsReady(true)
      document.head.appendChild(script)
    } else {
      existingScript.addEventListener("load", () => setIsGoogleMapsReady(true))
    }
  }, [])

  // Initialize native Google Map when API is available
  useEffect(() => {
    if (!isGoogleMapsReady || !googleMapDivRef.current) return

    try {
      const win = window as unknown as {
        google?: {
          maps?: {
            Map: new (
              el: HTMLElement,
              opts: unknown,
            ) => {
              setCenter: (c: { lat: number; lng: number }) => void
              setZoom: (z: number) => void
              setMapTypeId: (t: string) => void
            }
          }
        }
      }

      if (!googleMapInstance.current && win.google?.maps?.Map) {
        googleMapInstance.current = new win.google.maps.Map(googleMapDivRef.current, {
          center: { lat: mapCenter.lat, lng: mapCenter.lng },
          zoom: mapZoom,
          mapTypeId: mapMode === "satellite" ? "satellite" : "roadmap",
          disableDefaultUI: !showControls,
          zoomControl: showControls,
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }],
            },
          ],
        })
      } else if (googleMapInstance.current) {
        googleMapInstance.current.setCenter({ lat: mapCenter.lat, lng: mapCenter.lng })
        googleMapInstance.current.setZoom(mapZoom)
        googleMapInstance.current.setMapTypeId(mapMode === "satellite" ? "satellite" : "roadmap")
      }
    } catch {
      // Fallback seamlessly to vector map
      setIsGoogleMapsReady(false)
    }
  }, [isGoogleMapsReady, mapCenter, mapZoom, mapMode, showControls])

  // Coordinate to Canvas/SVG projection converter
  const projectCoords = useCallback(
    (coords: Coords) => {
      // Scale factor relative to center and zoom
      const zoomFactor = Math.pow(2, mapZoom - 12)
      const scaleX = 2200 * zoomFactor
      const scaleY = 2600 * zoomFactor

      const x = 50 + (coords.lng - mapCenter.lng) * scaleX + dragOffset.x
      const y = 50 - (coords.lat - mapCenter.lat) * scaleY + dragOffset.y
      return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }
    },
    [mapCenter, mapZoom, dragOffset],
  )

  // Pan / Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!interactive) return
    setIsDragging(true)
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      initialOffset: { ...dragOffset },
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !interactive) return
    const dx = ((e.clientX - dragStart.current.x) / (containerRef.current?.clientWidth || 500)) * 100
    const dy = ((e.clientY - dragStart.current.y) / (containerRef.current?.clientHeight || 400)) * 100
    setDragOffset({
      x: dragStart.current.initialOffset.x + dx,
      y: dragStart.current.initialOffset.y + dy,
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleMarkerClick = (marker: MapMarkerItem) => {
    setActiveMarker(marker)
    if (onSelectMarker) onSelectMarker(marker)
  }

  const handleRecenter = () => {
    setMapCenter(center)
    setDragOffset({ x: 0, y: 0 })
    setMapZoom(zoom)
  }

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev)
  }

  // Google Maps external link generator
  const getGoogleMapsDirectionsUrl = (dest: Coords) => {
    return `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}`
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-2xl border border-border bg-slate-900 text-slate-100 shadow-md select-none transition-all ${
        isFullscreen ? "fixed inset-4 z-50 h-[calc(100vh-2rem)]" : ""
      } ${className}`}
      style={{ height: isFullscreen ? "calc(100vh - 2rem)" : height }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* If Google Maps JS API is ready, mount native container */}
      {isGoogleMapsReady ? (
        <div ref={googleMapDivRef} className="h-full w-full" />
      ) : (
        /* High-Fidelity Vector Interactive Map Rendering */
        <div className={`relative h-full w-full cursor-grab overflow-hidden ${isDragging ? "cursor-grabbing" : ""}`}>
          {/* Map Base Canvas / Grid Background */}
          <div
            className={`absolute inset-0 transition-colors duration-500 ${
              mapMode === "satellite"
                ? "bg-[#0b192c]"
                : mapMode === "terrain"
                ? "bg-[#18231c]"
                : "bg-[#0f172a]"
            }`}
          >
            {/* Simulated Road Grid Pattern */}
            <svg className="absolute inset-0 h-full w-full opacity-30" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="road-grid" width="60" height="60" patternUnits="userSpaceOnUse">
                  <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#334155" strokeWidth="1.5" />
                  <path d="M 0 30 L 60 30" fill="none" stroke="#1e293b" strokeWidth="0.8" />
                  <path d="M 30 0 L 30 60" fill="none" stroke="#1e293b" strokeWidth="0.8" />
                </pattern>
                <pattern id="highway-grid" width="180" height="180" patternUnits="userSpaceOnUse">
                  <path d="M 0 90 Q 90 60 180 90" fill="none" stroke="#475569" strokeWidth="2.5" strokeDasharray="4 2" />
                  <path d="M 90 0 Q 110 90 90 180" fill="none" stroke="#475569" strokeWidth="2.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#road-grid)" />
              <rect width="100%" height="100%" fill="url(#highway-grid)" opacity="0.6" />
            </svg>

            {/* Simulated River / Waterway Feature */}
            <svg className="absolute inset-0 h-full w-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M -20 220 C 140 240, 260 180, 420 210 S 680 190, 900 240"
                fill="none"
                stroke="#0284c7"
                strokeWidth="24"
                strokeOpacity="0.25"
                strokeLinecap="round"
              />
              <path
                d="M -20 220 C 140 240, 260 180, 420 210 S 680 190, 900 240"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="10"
                strokeOpacity="0.4"
                strokeLinecap="round"
              />
            </svg>
          </div>

          {/* Route Trajectory Polylines */}
          <svg className="absolute inset-0 h-full w-full pointer-events-none">
            {routes.map((route) => {
              const start = projectCoords(route.from)
              const end = projectCoords(route.to)

              const isDelivered = route.status === "Delivered" || route.status === "Reviewed"
              const lineColor = route.color || (isDelivered ? "#10b981" : "#0284c7")

              // Quadratic Bezier control point for a natural realistic street route curve
              const midX = (start.x + end.x) / 2 + (end.y - start.y) * 0.15
              const midY = (start.y + end.y) / 2 - (end.x - start.x) * 0.15

              return (
                <g key={route.id}>
                  {/* Outer Glow Path */}
                  <path
                    d={`M ${start.x}% ${start.y}% Q ${midX}% ${midY}% ${end.x}% ${end.y}%`}
                    fill="none"
                    stroke={lineColor}
                    strokeWidth="8"
                    strokeOpacity="0.2"
                    strokeLinecap="round"
                  />
                  {/* Solid Base Route */}
                  <path
                    d={`M ${start.x}% ${start.y}% Q ${midX}% ${midY}% ${end.x}% ${end.y}%`}
                    fill="none"
                    stroke={lineColor}
                    strokeWidth="3.5"
                    strokeOpacity="0.75"
                    strokeLinecap="round"
                  />
                  {/* Animated Trajectory Dashes for In-Transit Movement */}
                  {!isDelivered && (
                    <path
                      d={`M ${start.x}% ${start.y}% Q ${midX}% ${midY}% ${end.x}% ${end.y}%`}
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="2.5"
                      strokeDasharray="6 8"
                      strokeLinecap="round"
                      className="animate-[dash_1.8s_linear_infinite]"
                    />
                  )}
                </g>
              )
            })}
          </svg>

          {/* Render All Dynamic Markers */}
          {markers.map((m) => {
            const pos = projectCoords(m.coords)
            const isSelected = activeMarker?.id === m.id
            const isDelivered = m.status === "Delivered" || m.status === "Reviewed"

            return (
              <div
                key={m.id}
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform duration-200 hover:scale-125 z-20"
                onClick={(e) => {
                  e.stopPropagation()
                  handleMarkerClick(m)
                }}
              >
                {/* Marker Pulse Ring */}
                <div
                  className={`absolute -inset-2 rounded-full opacity-60 animate-ping ${
                    m.type === "driver"
                      ? "bg-amber-400"
                      : m.type === "recipient"
                      ? "bg-sky-400"
                      : m.type === "hub"
                      ? "bg-rose-500"
                      : isDelivered
                      ? "bg-emerald-400"
                      : "bg-emerald-500"
                  }`}
                />

                {/* Marker Pin Icon */}
                <div
                  className={`relative flex size-9 items-center justify-center rounded-full border-2 shadow-xl transition-all ${
                    isSelected ? "ring-4 ring-white scale-110" : ""
                  } ${
                    m.type === "driver"
                      ? "border-amber-300 bg-amber-500 text-slate-950"
                      : m.type === "recipient"
                      ? "border-sky-300 bg-sky-600 text-white"
                      : m.type === "hub"
                      ? "border-rose-300 bg-rose-600 text-white"
                      : isDelivered
                      ? "border-emerald-300 bg-emerald-600 text-white"
                      : "border-emerald-400 bg-emerald-700 text-white"
                  }`}
                >
                  {m.type === "driver" ? (
                    <Truck className="size-5" />
                  ) : m.type === "recipient" ? (
                    <MapPin className="size-5" />
                  ) : m.type === "hub" ? (
                    <Building2 className="size-5" />
                  ) : (
                    <HeartHandshake className="size-5" />
                  )}
                </div>

                {/* Compact Marker Title Tag */}
                <div className="absolute top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-950/90 px-2 py-0.5 text-[11px] font-semibold text-slate-200 shadow border border-slate-700 pointer-events-none">
                  {m.title}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Map Header Overlay / Mode Indicators */}
      <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-1.5 text-xs font-semibold text-slate-200 backdrop-blur shadow-md">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Live GPS Tracking</span>
          {isGoogleMapsReady && (
            <span className="rounded bg-sky-500/20 px-1 py-0.2 text-[10px] text-sky-400 font-bold">
              Google Maps
            </span>
          )}
        </div>
      </div>

      {/* Interactive Map Controls Overlay */}
      {showControls && (
        <div className="absolute top-3 right-3 z-30 flex flex-col gap-1.5">
          <Button
            size="icon"
            variant="secondary"
            className="size-8 rounded-lg bg-slate-900/90 border border-slate-700 text-slate-200 hover:bg-slate-800"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </Button>

          <Button
            size="icon"
            variant="secondary"
            className="size-8 rounded-lg bg-slate-900/90 border border-slate-700 text-slate-200 hover:bg-slate-800"
            onClick={handleRecenter}
            title="Recenter Map"
          >
            <Navigation className="size-4" />
          </Button>

          <div className="flex flex-col rounded-lg border border-slate-700 bg-slate-900/90 overflow-hidden shadow">
            <button
              type="button"
              className="flex size-8 items-center justify-center text-slate-200 hover:bg-slate-800 transition-colors"
              onClick={() => setMapZoom((z) => Math.min(18, z + 1))}
              title="Zoom In"
            >
              <Plus className="size-4" />
            </button>
            <div className="h-[1px] bg-slate-700" />
            <button
              type="button"
              className="flex size-8 items-center justify-center text-slate-200 hover:bg-slate-800 transition-colors"
              onClick={() => setMapZoom((z) => Math.max(8, z - 1))}
              title="Zoom Out"
            >
              <Minus className="size-4" />
            </button>
          </div>

          <Button
            size="icon"
            variant="secondary"
            className={`size-8 rounded-lg border border-slate-700 bg-slate-900/90 text-slate-200 hover:bg-slate-800 ${
              mapMode === "satellite" ? "text-sky-400" : ""
            }`}
            onClick={() =>
              setMapMode((m) => (m === "standard" ? "satellite" : m === "satellite" ? "terrain" : "standard"))
            }
            title={`Layer: ${mapMode}`}
          >
            <Layers className="size-4" />
          </Button>
        </div>
      )}

      {/* Selected Marker Detail Card Popup Overlay */}
      {activeMarker && (
        <div className="absolute bottom-3 left-3 right-3 z-30 sm:left-3 sm:right-auto sm:max-w-sm rounded-xl border border-slate-700 bg-slate-950/95 p-4 text-slate-100 shadow-2xl backdrop-blur animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div
                className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${
                  activeMarker.type === "driver"
                    ? "bg-amber-500/20 text-amber-400"
                    : activeMarker.type === "recipient"
                    ? "bg-sky-500/20 text-sky-400"
                    : "bg-emerald-500/20 text-emerald-400"
                }`}
              >
                {activeMarker.type === "driver" ? (
                  <Truck className="size-4" />
                ) : activeMarker.type === "recipient" ? (
                  <MapPin className="size-4" />
                ) : (
                  <HeartHandshake className="size-4" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white">{activeMarker.title}</h4>
                  {activeMarker.badge && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-slate-600">
                      {activeMarker.badge}
                    </Badge>
                  )}
                </div>
                {activeMarker.subtitle && (
                  <p className="text-xs text-slate-400 mt-0.5">{activeMarker.subtitle}</p>
                )}
              </div>
            </div>

            <button
              onClick={() => setActiveMarker(null)}
              className="text-slate-400 hover:text-white text-xs font-semibold p-1"
            >
              ✕
            </button>
          </div>

          {activeMarker.details && (
            <div className="mt-3 space-y-1 text-xs border-t border-slate-800 pt-2 text-slate-300">
              {activeMarker.details.address && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="size-3 text-slate-400 shrink-0" />
                  <span className="truncate">{activeMarker.details.address}</span>
                </div>
              )}
              {activeMarker.details.category && (
                <div className="flex items-center gap-1.5">
                  <Sparkles className="size-3 text-slate-400 shrink-0" />
                  <span>Category: {activeMarker.details.category}</span>
                </div>
              )}
            </div>
          )}

          <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800/80">
            <a
              href={getGoogleMapsDirectionsUrl(activeMarker.coords)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-400 hover:text-sky-300 transition-colors"
            >
              <ExternalLink className="size-3" /> Open in Google Maps
            </a>
            <span className="text-[11px] text-slate-500 font-mono">
              {activeMarker.coords.lat.toFixed(4)}, {activeMarker.coords.lng.toFixed(4)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
