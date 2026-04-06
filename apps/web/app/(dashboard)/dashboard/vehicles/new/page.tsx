import type { Metadata } from "next";
import Link from "next/link";
import { VehicleForm } from "@/components/dashboard/vehicle-form";

export const metadata: Metadata = { title: "Add Vehicle" };

export default function NewVehiclePage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/dashboard/vehicles" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
          ← Vehicles
        </Link>
        <h1 className="text-xl font-semibold text-[#0c1830] mt-2">Add Vehicle</h1>
      </div>
      <div className="bg-white rounded-lg border border-gray-100 p-6">
        <VehicleForm />
      </div>
    </div>
  );
}
