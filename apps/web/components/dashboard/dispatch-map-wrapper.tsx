"use client";

import dynamic from "next/dynamic";
import type { MapDriver } from "./dispatch-map";

// Leaflet is browser-only — must be dynamically imported with ssr: false.
// This client component is the boundary Next.js needs to allow the flag.
const DispatchMap = dynamic(
  () => import("./dispatch-map").then((m) => m.DispatchMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-400">Loading map…</p>
      </div>
    ),
  },
);

interface Props {
  initialDrivers: MapDriver[];
}

export function DispatchMapWrapper({ initialDrivers }: Props) {
  return <DispatchMap initialDrivers={initialDrivers} />;
}
