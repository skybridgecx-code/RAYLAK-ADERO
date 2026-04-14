"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createRequest, type RequestActionState } from "../actions";
import { ADERO_SERVICE_TYPE_LABELS, ADERO_SERVICE_TYPES } from "@raylak/db/schema";

const initialState: RequestActionState = {
  error: null,
  fieldErrors: {},
  savedId: null,
  dispatchedOffers: null,
};

function FieldError({ errors }: { errors?: string[] | undefined }) {
  if (!errors?.length) return null;
  return (
    <p className="mt-1 text-[11px]" style={{ color: "#f87171" }}>
      {errors[0]}
    </p>
  );
}

export function RequestForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [state, action, isPending] = useActionState(createRequest, initialState);

  useEffect(() => {
    if (state.savedId) {
      const timer = setTimeout(() => {
        router.push(redirectTo);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [state.savedId, redirectTo, router]);

  const inputStyle = {
    borderColor: "rgba(255,255,255,0.1)",
    background: "#0f172a",
    color: "#e2e8f0",
  } as const;

  return (
    <form action={action} className="space-y-6">
      {/* Service type */}
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: "#94a3b8" }}>
          Service Type <span style={{ color: "#f87171" }}>*</span>
        </label>
        <select
          name="serviceType"
          required
          className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
          style={inputStyle}
          defaultValue=""
        >
          <option value="" disabled>Select a service type</option>
          {ADERO_SERVICE_TYPES.map((t) => (
            <option key={t} value={t}>
              {ADERO_SERVICE_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <FieldError errors={state.fieldErrors["serviceType"]} />
      </div>

      {/* Pickup + dropoff */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "#94a3b8" }}>
            Pickup Address <span style={{ color: "#f87171" }}>*</span>
          </label>
          <input
            name="pickupAddress"
            type="text"
            required
            placeholder="123 Main St, City, State"
            className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
            style={inputStyle}
          />
          <FieldError errors={state.fieldErrors["pickupAddress"]} />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "#94a3b8" }}>
            Drop-off Address <span style={{ color: "#f87171" }}>*</span>
          </label>
          <input
            name="dropoffAddress"
            type="text"
            required
            placeholder="456 Airport Blvd, City, State"
            className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
            style={inputStyle}
          />
          <FieldError errors={state.fieldErrors["dropoffAddress"]} />
        </div>
      </div>

      {/* Pickup datetime + passenger count */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "#94a3b8" }}>
            Pickup Date &amp; Time <span style={{ color: "#f87171" }}>*</span>
          </label>
          <input
            name="pickupAt"
            type="datetime-local"
            required
            className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
            style={inputStyle}
          />
          <FieldError errors={state.fieldErrors["pickupAt"]} />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "#94a3b8" }}>
            Passenger Count <span style={{ color: "#f87171" }}>*</span>
          </label>
          <input
            name="passengerCount"
            type="number"
            required
            min={1}
            max={100}
            defaultValue={1}
            className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
            style={inputStyle}
          />
          <FieldError errors={state.fieldErrors["passengerCount"]} />
        </div>
      </div>

      {/* Vehicle preference */}
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: "#94a3b8" }}>
          Vehicle Preference <span style={{ color: "#475569" }}>(optional)</span>
        </label>
        <input
          name="vehiclePreference"
          type="text"
          placeholder="e.g. Black SUV, Mercedes S-Class"
          className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
          style={inputStyle}
        />
        <FieldError errors={state.fieldErrors["vehiclePreference"]} />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: "#94a3b8" }}>
          Notes <span style={{ color: "#475569" }}>(optional)</span>
        </label>
        <textarea
          name="notes"
          rows={3}
          maxLength={1000}
          placeholder="Any special instructions, meet and greet requirements, luggage details, etc."
          className="w-full resize-none rounded-lg border px-3 py-2.5 text-sm outline-none"
          style={inputStyle}
        />
        <FieldError errors={state.fieldErrors["notes"]} />
      </div>

      {/* Error */}
      {state.error && (
        <p className="text-sm" style={{ color: "#f87171" }}>
          {state.error}
        </p>
      )}
      {state.savedId && (
        <div
          className="rounded-lg border px-3 py-2 text-sm"
          style={{
            borderColor: "rgba(34,197,94,0.25)",
            background: "rgba(34,197,94,0.08)",
            color: "#86efac",
          }}
        >
          {state.dispatchedOffers && state.dispatchedOffers > 0
            ? `Request submitted. ${state.dispatchedOffers} operator${
                state.dispatchedOffers === 1 ? " was" : "s were"
              } notified.`
            : "Request submitted. No operators are currently available; dispatch will be retried later."}{" "}
          Redirecting...
        </div>
      )}

      <button
        type="submit"
        disabled={isPending || Boolean(state.savedId)}
        className="rounded-lg px-6 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
        style={{ background: "#6366f1", color: "#fff" }}
      >
        {isPending ? "Submitting…" : "Submit Request"}
      </button>
    </form>
  );
}
