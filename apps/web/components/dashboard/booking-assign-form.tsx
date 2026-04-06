"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "~/lib/trpc/client";

interface Driver {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  isVerified: boolean;
  isOnline: boolean;
  hasConflict: boolean;
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  color: string | null;
  capacity: number;
  hasConflict: boolean;
}

interface BookingAssignFormProps {
  bookingId: string;
  drivers: Driver[];
  vehicles: Vehicle[];
}

export function BookingAssignForm({ bookingId, drivers, vehicles }: BookingAssignFormProps) {
  const router = useRouter();
  const [driverProfileId, setDriverProfileId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const assign = trpc.booking.assign.useMutation({
    onSuccess: () => {
      router.refresh();
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!driverProfileId) { setError("Please select a driver."); return; }
    if (!vehicleId) { setError("Please select a vehicle."); return; }

    assign.mutate({ bookingId, driverProfileId, vehicleId, note: note || undefined });
  }

  const availableDrivers = drivers.filter((d) => !d.hasConflict);
  const conflictedDrivers = drivers.filter((d) => d.hasConflict);
  const availableVehicles = vehicles.filter((v) => !v.hasConflict);
  const conflictedVehicles = vehicles.filter((v) => v.hasConflict);

  function driverLabel(d: Driver) {
    const name = `${d.firstName ?? ""} ${d.lastName ?? ""}`.trim() || d.email || d.id;
    const tags = [];
    if (d.isVerified) tags.push("✓ Verified");
    if (d.isOnline) tags.push("Online");
    return tags.length > 0 ? `${name} — ${tags.join(", ")}` : name;
  }

  function vehicleLabel(v: Vehicle) {
    return `${v.year} ${v.make} ${v.model}${v.color ? ` (${v.color})` : ""} · ${v.licensePlate} · ${v.capacity} pax`;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Driver */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Driver</label>
        <select
          value={driverProfileId}
          onChange={(e) => setDriverProfileId(e.target.value)}
          className="w-full rounded border border-gray-200 px-3 py-2 text-sm focus:border-[#c9a96e] focus:outline-none"
        >
          <option value="">Select a driver…</option>
          {availableDrivers.length > 0 && (
            <optgroup label="Available">
              {availableDrivers.map((d) => (
                <option key={d.id} value={d.id}>{driverLabel(d)}</option>
              ))}
            </optgroup>
          )}
          {conflictedDrivers.length > 0 && (
            <optgroup label="⚠ Conflict — already booked nearby">
              {conflictedDrivers.map((d) => (
                <option key={d.id} value={d.id}>{driverLabel(d)}</option>
              ))}
            </optgroup>
          )}
          {drivers.length === 0 && (
            <option disabled>No active drivers</option>
          )}
        </select>
      </div>

      {/* Vehicle */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Vehicle</label>
        <select
          value={vehicleId}
          onChange={(e) => setVehicleId(e.target.value)}
          className="w-full rounded border border-gray-200 px-3 py-2 text-sm focus:border-[#c9a96e] focus:outline-none"
        >
          <option value="">Select a vehicle…</option>
          {availableVehicles.length > 0 && (
            <optgroup label="Available">
              {availableVehicles.map((v) => (
                <option key={v.id} value={v.id}>{vehicleLabel(v)}</option>
              ))}
            </optgroup>
          )}
          {conflictedVehicles.length > 0 && (
            <optgroup label="⚠ Conflict — already booked nearby">
              {conflictedVehicles.map((v) => (
                <option key={v.id} value={v.id}>{vehicleLabel(v)}</option>
              ))}
            </optgroup>
          )}
          {vehicles.length === 0 && (
            <option disabled>No active vehicles</option>
          )}
        </select>
      </div>

      {/* Note */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Dispatch note (optional)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={2000}
          placeholder="Any notes for the driver or record…"
          className="w-full rounded border border-gray-200 px-3 py-2 text-sm focus:border-[#c9a96e] focus:outline-none resize-none"
        />
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 rounded px-3 py-2 border border-red-100">{error}</p>
      )}

      <button
        type="submit"
        disabled={assign.isPending}
        className="w-full rounded bg-[#0c1830] px-4 py-2 text-sm font-medium text-white hover:bg-[#0e2040] transition-colors disabled:opacity-50"
      >
        {assign.isPending ? "Assigning…" : "Assign & Dispatch"}
      </button>
    </form>
  );
}
