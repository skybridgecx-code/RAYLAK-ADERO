import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerCaller } from "~/lib/trpc/server";
import { DriverForm } from "@/components/dashboard/driver-form";

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
  try {
    driver = await caller.driver.getById({ id });
  } catch {
    notFound();
  }

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
      <div className="bg-white rounded-lg border border-gray-100 p-6">
        <DriverForm driver={driver} />
      </div>
    </div>
  );
}
