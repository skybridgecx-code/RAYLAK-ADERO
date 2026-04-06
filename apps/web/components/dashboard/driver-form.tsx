"use client";

import { useForm, type SubmitHandler, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { trpc } from "~/lib/trpc/client";
import { DriverSchema, type DriverInput } from "@raylak/shared/validators";

interface DriverData {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  isActive: boolean | null;
  isVerified: boolean;
  licenseNumber: string | null;
  licenseState: string | null;
  licenseExpiry: Date | string | null;
  defaultVehicleId: string | null;
  bio: string | null;
  notes: string | null;
}

interface Props {
  driver?: DriverData;
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

export function DriverForm({ driver }: Props) {
  const router = useRouter();
  const isEdit = !!driver;

  const { register, handleSubmit, formState } = useForm<DriverInput>({
    resolver: zodResolver(DriverSchema) as Resolver<DriverInput>,
    defaultValues: driver
      ? {
          firstName: driver.firstName ?? "",
          lastName: driver.lastName ?? "",
          email: driver.email ?? "",
          phone: driver.phone ?? undefined,
          licenseNumber: driver.licenseNumber ?? undefined,
          licenseState: driver.licenseState ?? undefined,
          licenseExpiry: driver.licenseExpiry ? new Date(driver.licenseExpiry) : undefined,
          defaultVehicleId: driver.defaultVehicleId ?? undefined,
          isVerified: driver.isVerified,
          isActive: driver.isActive ?? true,
          bio: driver.bio ?? undefined,
          notes: driver.notes ?? undefined,
        }
      : { isVerified: false, isActive: true },
  });

  const createMutation = trpc.driver.create.useMutation({
    onSuccess: (data) => router.push(`/dashboard/drivers/${data.id}`),
  });
  const updateMutation = trpc.driver.update.useMutation({
    onSuccess: () => router.refresh(),
  });

  const onSubmit: SubmitHandler<DriverInput> = async (data) => {
    if (isEdit && driver) {
      await updateMutation.mutateAsync({ ...data, id: driver.id });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const mutation = isEdit ? updateMutation : createMutation;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <fieldset>
        <legend className="text-sm font-semibold text-[#0c1830] mb-4 pb-2 border-b border-gray-100 w-full">
          Personal Information
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label required>First Name</Label>
            <input {...register("firstName")} placeholder="Michael" className={inputClass} />
            <FieldError message={formState.errors.firstName?.message} />
          </div>
          <div>
            <Label required>Last Name</Label>
            <input {...register("lastName")} placeholder="Davis" className={inputClass} />
            <FieldError message={formState.errors.lastName?.message} />
          </div>
          <div>
            <Label required>Email</Label>
            <input {...register("email")} type="email" placeholder="driver@example.com" className={inputClass} disabled={isEdit} />
            {isEdit && <p className="mt-1 text-xs text-gray-400">Email cannot be changed after creation.</p>}
            <FieldError message={formState.errors.email?.message} />
          </div>
          <div>
            <Label>Phone</Label>
            <input {...register("phone")} type="tel" placeholder="+1 (202) 555-0100" className={inputClass} />
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-semibold text-[#0c1830] mb-4 pb-2 border-b border-gray-100 w-full">
          License
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label>License Number</Label>
            <input {...register("licenseNumber")} placeholder="DL-123456" className={inputClass} />
          </div>
          <div>
            <Label>State</Label>
            <input {...register("licenseState")} placeholder="VA" maxLength={2} className={inputClass} />
          </div>
          <div>
            <Label>Expiry Date</Label>
            <input {...register("licenseExpiry")} type="date" className={inputClass} />
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-semibold text-[#0c1830] mb-4 pb-2 border-b border-gray-100 w-full">
          Status &amp; Notes
        </legend>
        <div className="space-y-4">
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input {...register("isActive")} type="checkbox" className="h-4 w-4 rounded border-gray-300 accent-[#0c1830]" />
              <span className="text-sm text-[#0c1830]">Active</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input {...register("isVerified")} type="checkbox" className="h-4 w-4 rounded border-gray-300 accent-[#0c1830]" />
              <span className="text-sm text-[#0c1830]">Verified (background check complete)</span>
            </label>
          </div>
          <div>
            <Label>Bio (customer-visible)</Label>
            <textarea {...register("bio")} rows={2} placeholder="Brief driver bio…" className={`${inputClass} resize-none`} />
          </div>
          <div>
            <Label>Internal Notes</Label>
            <textarea {...register("notes")} rows={2} placeholder="Dispatcher notes (not shown to customers)…" className={`${inputClass} resize-none`} />
          </div>
        </div>
      </fieldset>

      {mutation.error && <p className="text-sm text-red-600">{mutation.error.message}</p>}
      {mutation.isSuccess && (
        <p className="text-sm text-green-600 font-medium">{isEdit ? "Driver updated." : "Driver created."}</p>
      )}

      <button
        type="submit"
        disabled={formState.isSubmitting || mutation.isPending}
        className="rounded bg-[#0c1830] px-6 py-2.5 text-sm text-white font-semibold hover:bg-[#0e2040] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {mutation.isPending ? "Saving…" : isEdit ? "Save Changes" : "Create Driver"}
      </button>
    </form>
  );
}
