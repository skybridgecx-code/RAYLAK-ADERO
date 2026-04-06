"use client";

import { useEffect, useState } from "react";
import { useForm, type SubmitHandler, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "~/lib/trpc/client";
import { BookingIntakeSchema, type BookingIntakeInput } from "@raylak/shared/validators";

const SERVICE_OPTIONS = [
  { value: "airport_transfer", label: "Airport Transfer" },
  { value: "point_to_point", label: "Point-to-Point" },
  { value: "hourly_charter", label: "Hourly Charter" },
  { value: "event", label: "Event Transportation" },
  { value: "corporate", label: "Corporate Transfer" },
  { value: "long_distance", label: "Long Distance" },
] as const;

function FieldError({ message }: { message: string | undefined }) {
  if (!message) return null;
  return <p className="mt-1.5 text-xs text-red-500">{message}</p>;
}

function FormLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-widest text-[#0c1830] mb-2">
      {children}
      {required && <span className="text-[#c9a96e] ml-1">*</span>}
    </label>
  );
}

const inputClass =
  "w-full rounded border border-gray-200 bg-white px-4 py-3 text-sm text-[#0c1830] placeholder-gray-300 focus:border-[#c9a96e] focus:outline-none focus:ring-1 focus:ring-[#c9a96e]/30 transition-colors";

export function BookingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<BookingIntakeInput>({
    resolver: zodResolver(BookingIntakeSchema) as Resolver<BookingIntakeInput>,
    defaultValues: { passengerCount: 1 },
  });

  const { register, handleSubmit, watch, setValue, formState } = form;
  const errors = formState.errors;
  const serviceType = watch("serviceType");
  const isAirport = serviceType === "airport_transfer";

  // Pre-fill from URL params (airport pages pass ?source= and ?service=)
  useEffect(() => {
    const source = searchParams.get("source");
    const service = searchParams.get("service");
    if (source) setValue("acquisitionSource", source);
    if (service && SERVICE_OPTIONS.some((o) => o.value === service)) {
      setValue("serviceType", service as BookingIntakeInput["serviceType"]);
    }
  }, [searchParams, setValue]);

  const mutation = trpc.booking.createIntake.useMutation({
    onSuccess: (data) => {
      setSubmitted(true);
      router.push(`/book/confirmation/${data.referenceCode}`);
    },
  });

  const onSubmit: SubmitHandler<BookingIntakeInput> = async (data) => {
    await mutation.mutateAsync(data);
  };

  if (submitted) {
    return (
      <div className="text-center py-16">
        <p className="text-[#c9a96e] text-xs tracking-[4px] uppercase font-semibold mb-4">
          Processing
        </p>
        <p className="text-[#0c1830] text-xl font-light">Confirming your reservation…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-10">
      {/* ── Contact info ─────────────────────────────────────────── */}
      <fieldset>
        <legend className="text-[#0c1830] font-semibold text-lg mb-6 pb-3 border-b border-gray-100 w-full">
          Your Information
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <FormLabel required>First Name</FormLabel>
            <input
              {...register("firstName")}
              placeholder="James"
              className={inputClass}
              autoComplete="given-name"
            />
            <FieldError message={errors.firstName?.message} />
          </div>
          <div>
            <FormLabel required>Last Name</FormLabel>
            <input
              {...register("lastName")}
              placeholder="Richardson"
              className={inputClass}
              autoComplete="family-name"
            />
            <FieldError message={errors.lastName?.message} />
          </div>
          <div>
            <FormLabel required>Email</FormLabel>
            <input
              {...register("email")}
              type="email"
              placeholder="you@company.com"
              className={inputClass}
              autoComplete="email"
            />
            <FieldError message={errors.email?.message} />
          </div>
          <div>
            <FormLabel required>Phone</FormLabel>
            <input
              {...register("phone")}
              type="tel"
              placeholder="+1 (202) 555-0100"
              className={inputClass}
              autoComplete="tel"
            />
            <FieldError message={errors.phone?.message} />
          </div>
        </div>
      </fieldset>

      {/* ── Trip details ─────────────────────────────────────────── */}
      <fieldset>
        <legend className="text-[#0c1830] font-semibold text-lg mb-6 pb-3 border-b border-gray-100 w-full">
          Trip Details
        </legend>
        <div className="space-y-5">
          <div>
            <FormLabel required>Service Type</FormLabel>
            <select {...register("serviceType")} className={inputClass}>
              <option value="">Select a service…</option>
              {SERVICE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <FieldError message={errors.serviceType?.message} />
          </div>

          <div>
            <FormLabel required>Pickup Address</FormLabel>
            <input
              {...register("pickupAddress")}
              placeholder="1600 Pennsylvania Ave NW, Washington, DC"
              className={inputClass}
            />
            <FieldError message={errors.pickupAddress?.message} />
          </div>

          <div>
            <FormLabel required>Drop-off Address</FormLabel>
            <input
              {...register("dropoffAddress")}
              placeholder="Washington Dulles International Airport (IAD)"
              className={inputClass}
            />
            <FieldError message={errors.dropoffAddress?.message} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <FormLabel required>Date &amp; Time</FormLabel>
              <input
                {...register("scheduledAt")}
                type="datetime-local"
                className={inputClass}
                min={new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16)}
              />
              <FieldError message={errors.scheduledAt?.message} />
            </div>

            <div>
              <FormLabel required>Passengers</FormLabel>
              <input
                {...register("passengerCount", { valueAsNumber: true })}
                type="number"
                min={1}
                max={20}
                placeholder="1"
                className={inputClass}
              />
              <FieldError message={errors.passengerCount?.message} />
            </div>
          </div>

          {isAirport && (
            <div>
              <FormLabel>Flight Number</FormLabel>
              <input
                {...register("flightNumber")}
                placeholder="AA 1234"
                className={inputClass}
              />
              <p className="mt-1.5 text-xs text-gray-400">
                Optional — we use this to track your flight.
              </p>
              <FieldError message={errors.flightNumber?.message} />
            </div>
          )}

          <div>
            <FormLabel>Special Instructions</FormLabel>
            <textarea
              {...register("specialInstructions")}
              placeholder="Luggage requirements, accessibility needs, VIP notes…"
              rows={3}
              className={`${inputClass} resize-none`}
            />
            <FieldError message={errors.specialInstructions?.message} />
          </div>
        </div>
      </fieldset>

      {/* Hidden acquisition source (set from URL params) */}
      <input type="hidden" {...register("acquisitionSource")} />

      {/* Error message */}
      {mutation.error && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {mutation.error.message ??
            "Something went wrong. Please try again or call us directly."}
        </div>
      )}

      {/* Submit */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={formState.isSubmitting || mutation.isPending}
          className="w-full rounded bg-[#0c1830] py-4 text-white text-sm font-semibold tracking-wide hover:bg-[#0e2040] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {mutation.isPending ? "Submitting…" : "Submit Reservation Request"}
        </button>
        <p className="mt-4 text-center text-xs text-gray-400">
          You&apos;ll receive a confirmation email and quote within the hour. No payment required now.
        </p>
      </div>
    </form>
  );
}
