"use client";

import { useForm, type SubmitHandler, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { trpc } from "~/lib/trpc/client";
import { VehicleSchema, type VehicleInput } from "@raylak/shared/validators";
import { VEHICLE_TYPES } from "@raylak/shared/enums";
import type { Vehicle } from "@raylak/db";

interface Props {
  vehicle?: Vehicle;
}

const inputClass =
  "w-full rounded border border-gray-200 px-3 py-2 text-sm focus:border-[#c9a96e] focus:outline-none focus:ring-1 focus:ring-[#c9a96e]/20 transition-colors";

function FieldError({ message }: { message: string | undefined }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-500">{message}</p>;
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-widest text-[#0c1830] mb-1.5">
      {children}{required && <span className="text-[#c9a96e] ml-0.5">*</span>}
    </label>
  );
}

export function VehicleForm({ vehicle }: Props) {
  const router = useRouter();
  const isEdit = !!vehicle;

  const { register, handleSubmit, formState } = useForm<VehicleInput>({
    resolver: zodResolver(VehicleSchema) as Resolver<VehicleInput>,
    defaultValues: vehicle
      ? {
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          type: vehicle.type,
          licensePlate: vehicle.licensePlate,
          vin: vehicle.vin ?? undefined,
          color: vehicle.color ?? undefined,
          capacity: vehicle.capacity,
          luggageCapacity: vehicle.luggageCapacity ?? undefined,
          amenities: vehicle.amenities ?? undefined,
          isActive: vehicle.isActive,
          notes: vehicle.notes ?? undefined,
        }
      : { isActive: true, capacity: 4 },
  });

  const createMutation = trpc.vehicle.create.useMutation({
    onSuccess: (data) => router.push(`/dashboard/vehicles/${data.id}`),
  });
  const updateMutation = trpc.vehicle.update.useMutation({
    onSuccess: () => router.refresh(),
  });

  const onSubmit: SubmitHandler<VehicleInput> = async (data) => {
    if (isEdit && vehicle) {
      await updateMutation.mutateAsync({ ...data, id: vehicle.id });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const mutation = isEdit ? updateMutation : createMutation;
  const error = mutation.error?.message;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <fieldset>
        <legend className="text-sm font-semibold text-[#0c1830] mb-4 pb-2 border-b border-gray-100 w-full">
          Vehicle Identity
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label required>Make</Label>
            <input {...register("make")} placeholder="Mercedes-Benz" className={inputClass} />
            <FieldError message={formState.errors.make?.message} />
          </div>
          <div>
            <Label required>Model</Label>
            <input {...register("model")} placeholder="E-Class" className={inputClass} />
            <FieldError message={formState.errors.model?.message} />
          </div>
          <div>
            <Label required>Year</Label>
            <input {...register("year")} type="number" placeholder="2024" className={inputClass} />
            <FieldError message={formState.errors.year?.message} />
          </div>
          <div>
            <Label required>Type</Label>
            <select {...register("type")} className={inputClass}>
              <option value="">Select type…</option>
              {VEHICLE_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
              ))}
            </select>
            <FieldError message={formState.errors.type?.message} />
          </div>
          <div>
            <Label required>License Plate</Label>
            <input {...register("licensePlate")} placeholder="ABC-1234" className={inputClass} />
            <FieldError message={formState.errors.licensePlate?.message} />
          </div>
          <div>
            <Label>VIN</Label>
            <input {...register("vin")} placeholder="Optional" className={inputClass} />
            <FieldError message={formState.errors.vin?.message} />
          </div>
          <div>
            <Label>Color</Label>
            <input {...register("color")} placeholder="Obsidian Black" className={inputClass} />
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-semibold text-[#0c1830] mb-4 pb-2 border-b border-gray-100 w-full">
          Capacity &amp; Amenities
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label required>Passenger Capacity</Label>
            <input {...register("capacity")} type="number" min={1} max={100} placeholder="4" className={inputClass} />
            <FieldError message={formState.errors.capacity?.message} />
          </div>
          <div>
            <Label>Luggage Capacity</Label>
            <input {...register("luggageCapacity")} type="number" min={0} max={50} placeholder="3" className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <Label>Amenities</Label>
            <input {...register("amenities")} placeholder="WiFi, Water, USB Chargers, Privacy Partition" className={inputClass} />
            <p className="mt-1 text-xs text-gray-400">Comma-separated list</p>
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-semibold text-[#0c1830] mb-4 pb-2 border-b border-gray-100 w-full">
          Status &amp; Notes
        </legend>
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input {...register("isActive")} type="checkbox" className="h-4 w-4 rounded border-gray-300 accent-[#0c1830]" />
            <span className="text-sm text-[#0c1830]">Active (available for dispatch)</span>
          </label>
          <div>
            <Label>Internal Notes</Label>
            <textarea {...register("notes")} rows={3} placeholder="Maintenance history, known issues…" className={`${inputClass} resize-none`} />
          </div>
        </div>
      </fieldset>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {mutation.isSuccess && (
        <p className="text-sm text-green-600 font-medium">{isEdit ? "Vehicle updated." : "Vehicle created."}</p>
      )}

      <button
        type="submit"
        disabled={formState.isSubmitting || mutation.isPending}
        className="rounded bg-[#0c1830] px-6 py-2.5 text-sm text-white font-semibold hover:bg-[#0e2040] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {mutation.isPending ? "Saving…" : isEdit ? "Save Changes" : "Create Vehicle"}
      </button>
    </form>
  );
}
