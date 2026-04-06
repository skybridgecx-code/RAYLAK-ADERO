import type { Metadata } from "next";
import { createServerCaller } from "~/lib/trpc/server";
import { DispatchMapWrapper } from "@/components/dashboard/dispatch-map-wrapper";
import type { MapDriver } from "@/components/dashboard/dispatch-map";

export const metadata: Metadata = { title: "Live Map" };

export default async function LiveMapPage() {
  const caller = await createServerCaller();
  const drivers = await caller.driver.listForMap();

  const mapDrivers: MapDriver[] = drivers.map((d) => ({
    id: d.id,
    firstName: d.firstName,
    lastName: d.lastName,
    isOnline: d.isOnline,
    availabilityStatus: d.availabilityStatus,
    lastLat: d.lastLat,
    lastLng: d.lastLng,
    lastHeading: d.lastHeading,
    lastSpeed: d.lastSpeed,
    lastLocationAt: d.lastLocationAt,
  }));

  const onlineCount = mapDrivers.filter((d) => d.isOnline).length;
  const locatedCount = mapDrivers.filter((d) => d.lastLat).length;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] gap-0">
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-100 flex-shrink-0">
        <div>
          <h1 className="text-base font-semibold text-[#0c1830]">Live Driver Map</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {onlineCount} online · {locatedCount} with location · updates live
          </p>
        </div>

        {locatedCount === 0 && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-1.5">
            No driver locations yet. Drivers appear once they open the app.
          </p>
        )}
      </div>

      {/* Map fills remaining height */}
      <div className="flex-1 relative">
        <DispatchMapWrapper initialDrivers={mapDrivers} />
      </div>
    </div>
  );
}
