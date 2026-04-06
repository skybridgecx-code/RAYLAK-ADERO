import type { Metadata } from "next";
import Link from "next/link";
import { DriverForm } from "@/components/dashboard/driver-form";

export const metadata: Metadata = { title: "Add Driver" };

export default function NewDriverPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/dashboard/drivers" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
          ← Drivers
        </Link>
        <h1 className="text-xl font-semibold text-[#0c1830] mt-2">Add Driver</h1>
      </div>
      <div className="bg-white rounded-lg border border-gray-100 p-6">
        <DriverForm />
      </div>
    </div>
  );
}
