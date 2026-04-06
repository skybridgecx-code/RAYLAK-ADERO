import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerCaller } from "~/lib/trpc/server";
import { VehicleForm } from "@/components/dashboard/vehicle-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const caller = await createServerCaller();
    const v = await caller.vehicle.getById({ id });
    return { title: `${v.year} ${v.make} ${v.model}` };
  } catch {
    return { title: "Edit Vehicle" };
  }
}

export default async function EditVehiclePage({ params }: PageProps) {
  const { id } = await params;
  const caller = await createServerCaller();

  let vehicle: Awaited<ReturnType<typeof caller.vehicle.getById>>;
  try {
    vehicle = await caller.vehicle.getById({ id });
  } catch {
    notFound();
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/dashboard/vehicles" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
          ← Vehicles
        </Link>
        <h1 className="text-xl font-semibold text-[#0c1830] mt-2">
          {vehicle.year} {vehicle.make} {vehicle.model}
        </h1>
        <p className="text-xs text-gray-400 mt-0.5 font-mono">{vehicle.licensePlate}</p>
      </div>
      <div className="bg-white rounded-lg border border-gray-100 p-6">
        <VehicleForm vehicle={vehicle} />
      </div>
    </div>
  );
}
