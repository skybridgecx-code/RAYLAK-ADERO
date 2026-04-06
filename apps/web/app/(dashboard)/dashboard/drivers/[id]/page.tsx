import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerCaller } from "~/lib/trpc/server";
import { DriverForm } from "@/components/dashboard/driver-form";
import { DriverClerkLink } from "@/components/dashboard/driver-clerk-link";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const caller = await createServerCaller();
    const d = await caller.driver.getById({ id });
    return { title: `${d.firstName ?? ""} ${d.lastName ?? ""}`.trim() || "Driver" };
  } catch {
    return { title: "Edit Driver" };
  }
}

export default async function EditDriverPage({ params }: PageProps) {
  const { id } = await params;
  const caller = await createServerCaller();

  let driver: Awaited<ReturnType<typeof caller.driver.getById>>;
  let status: Awaited<ReturnType<typeof caller.driver.getStatus>>;
  try {
    [driver, status] = await Promise.all([
      caller.driver.getById({ id }),
      caller.driver.getStatus({ id }),
    ]);
  } catch {
    notFound();
  }

  const hasLocation = status.lastLat !== null && status.lastLng !== null;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/dashboard/drivers" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
          ← Drivers
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <h1 className="text-xl font-semibold text-[#0c1830]">
            {driver.firstName ?? ""} {driver.lastName ?? ""}
          </h1>
          <div className="flex gap-1.5">
            {driver.isVerified && (
              <span className="rounded border bg-blue-50 text-blue-700 border-blue-200 px-2 py-0.5 text-xs font-medium">Verified</span>
            )}
            {driver.isOnline && (
              <span className="rounded border bg-teal-50 text-teal-700 border-teal-200 px-2 py-0.5 text-xs font-medium">Online</span>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">{driver.email}</p>
      </div>

      {/* Last known location */}
      {hasLocation && (
        <div className="bg-white rounded-lg border border-gray-100 p-6 space-y-2">
          <h2 className="text-sm font-semibold text-[#0c1830]">Last Known Location</h2>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-gray-400">Coordinates</span>
              <p className="font-mono text-gray-700 mt-0.5">
                {Number(status.lastLat).toFixed(6)}, {Number(status.lastLng).toFixed(6)}
              </p>
            </div>
            {status.lastSpeed !== null && (
              <div>
                <span className="text-gray-400">Speed</span>
                <p className="text-gray-700 mt-0.5">{Number(status.lastSpeed).toFixed(0)} km/h</p>
              </div>
            )}
            {status.lastHeading !== null && (
              <div>
                <span className="text-gray-400">Heading</span>
                <p className="text-gray-700 mt-0.5">{status.lastHeading}°</p>
              </div>
            )}
            {status.lastLocationAt && (
              <div>
                <span className="text-gray-400">Updated</span>
                <p className="text-gray-700 mt-0.5">
                  {new Date(status.lastLocationAt).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Clerk account link */}
      <DriverClerkLink
        driverProfileId={id}
        currentClerkId={status.clerkId}
      />

      {/* Edit form */}
      <div className="bg-white rounded-lg border border-gray-100 p-6">
        <DriverForm driver={driver} />
      </div>
    </div>
  );
}
