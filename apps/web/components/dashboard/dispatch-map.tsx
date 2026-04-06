"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useRealtimeDispatch } from "~/hooks/use-realtime-dispatch";
import type { DriverLocationUpdatedEvent } from "@raylak/shared/events";

// Fix Leaflet's default marker icon path (broken in Next.js/webpack builds)
// by pointing to the CDN copies, which are reliably available.
function fixLeafletIcons() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}

const activeIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:14px;height:14px;border-radius:50%;background:#0c1830;border:3px solid #c9a96e;box-shadow:0 0 0 2px rgba(12,24,48,.3)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const offlineIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:12px;height:12px;border-radius:50%;background:#9ca3af;border:2px solid #d1d5db;"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

export interface MapDriver {
  id: string;
  firstName: string | null;
  lastName: string | null;
  isOnline: boolean;
  availabilityStatus: string;
  lastLat: string | null;
  lastLng: string | null;
  lastHeading: number | null;
  lastSpeed: string | null;
  lastLocationAt: Date | null;
}

interface LivePosition {
  lat: number;
  lng: number;
  heading: number | null;
  speed: number | null;
  ts: number;
}

// Recenter map to fit all driver markers when data changes
function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 0) return;
    if (positions.length === 1) {
      map.setView(positions[0]!, 13);
    } else {
      map.fitBounds(positions, { padding: [40, 40] });
    }
  // Only run on mount / when driver count changes — avoid thrashing on live updates
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positions.length]);
  return null;
}

interface Props {
  initialDrivers: MapDriver[];
}

export function DispatchMap({ initialDrivers }: Props) {
  const [iconsFixed, setIconsFixed] = useState(false);

  useEffect(() => {
    fixLeafletIcons();
    setIconsFixed(true);
  }, []);

  // Live overrides from Socket.io events — keyed by driverProfileId
  const [livePositions, setLivePositions] = useState<Record<string, LivePosition>>({});

  const { events } = useRealtimeDispatch();

  // Process incoming location events
  const processedCountRef = useRef(0);
  useEffect(() => {
    const newEvents = events.slice(0, events.length - processedCountRef.current);
    processedCountRef.current = events.length;

    for (const ev of newEvents) {
      if (ev.type === "driver.location_updated") {
        const e = ev as DriverLocationUpdatedEvent;
        setLivePositions((prev) => ({
          ...prev,
          [e.driverProfileId]: { lat: e.lat, lng: e.lng, heading: e.heading, speed: e.speed, ts: e.ts },
        }));
      }
    }
  }, [events]);

  // Merge server-fetched positions with live overrides
  const drivers = useMemo(() => {
    return initialDrivers.map((d) => {
      const live = livePositions[d.id];
      if (live) {
        return {
          ...d,
          lastLat: String(live.lat),
          lastLng: String(live.lng),
          lastHeading: live.heading,
          lastSpeed: live.speed !== null ? String(live.speed) : d.lastSpeed,
          lastLocationAt: new Date(live.ts),
        };
      }
      return d;
    });
  }, [initialDrivers, livePositions]);

  const positioned = drivers.filter((d) => d.lastLat && d.lastLng);
  const positions: [number, number][] = positioned.map((d) => [
    Number(d.lastLat),
    Number(d.lastLng),
  ]);

  // Default center (DC metro area) when no drivers have reported location
  const defaultCenter: [number, number] = [38.9072, -77.0369];

  if (!iconsFixed) return null;

  return (
    <MapContainer
      center={positioned.length === 0 ? defaultCenter : [Number(positioned[0]!.lastLat), Number(positioned[0]!.lastLng)]}
      zoom={11}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {positioned.length > 0 && <FitBounds positions={positions} />}

      {positioned.map((driver) => (
        <Marker
          key={driver.id}
          position={[Number(driver.lastLat), Number(driver.lastLng)]}
          icon={driver.isOnline ? activeIcon : offlineIcon}
        >
          <Popup>
            <div className="text-xs space-y-1 min-w-[120px]">
              <p className="font-semibold text-sm text-[#0c1830]">
                {driver.firstName} {driver.lastName}
              </p>
              <p className={`font-medium ${driver.isOnline ? "text-teal-600" : "text-gray-400"}`}>
                {driver.availabilityStatus}
              </p>
              {driver.lastSpeed && (
                <p className="text-gray-500">{Number(driver.lastSpeed).toFixed(0)} km/h</p>
              )}
              {driver.lastLocationAt && (
                <p className="text-gray-400">
                  {new Date(driver.lastLocationAt).toLocaleTimeString()}
                </p>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
