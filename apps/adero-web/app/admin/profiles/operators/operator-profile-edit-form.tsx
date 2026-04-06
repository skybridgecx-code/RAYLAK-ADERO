"use client";

import type { AderoOperatorProfile } from "@raylak/db";
import { useActionState } from "react";
import {
  PROFILE_STATUS_LABELS,
  PROFILE_STATUSES,
  VEHICLE_TYPE_LABELS,
  VEHICLE_TYPES,
} from "~/lib/validators";
import { updateOperatorProfile, type ProfileActionState } from "../actions";

const initialProfileActionState: ProfileActionState = {
  error: null,
  fieldErrors: {},
  saved: false,
};

function FieldError({ messages }: { messages: string[] | undefined }) {
  if (!messages?.length) return null;
  return (
    <p className="mt-1 text-xs" style={{ color: "#f87171" }}>
      {messages[0]}
    </p>
  );
}

export function OperatorProfileEditForm({ profile }: { profile: AderoOperatorProfile }) {
  const [state, formAction, isPending] = useActionState(
    updateOperatorProfile,
    initialProfileActionState,
  );
  const currentStatus = PROFILE_STATUSES.includes(
    profile.activationStatus as (typeof PROFILE_STATUSES)[number],
  )
    ? profile.activationStatus
    : "active";

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="id" value={profile.id} />

      <section>
        <h2
          className="mb-4 text-xs font-semibold uppercase tracking-[3px]"
          style={{ color: "#475569" }}
        >
          Operator
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label
              className="mb-1.5 block text-xs font-medium"
              htmlFor="fullName"
              style={{ color: "#64748b" }}
            >
              Full name
            </label>
            <input
              id="fullName"
              name="fullName"
              defaultValue={profile.fullName}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{
                borderColor: "rgba(255,255,255,0.12)",
                background: "#1e293b",
                color: "#f1f5f9",
              }}
            />
            <FieldError messages={state.fieldErrors["fullName"]} />
          </div>

          <div>
            <label
              className="mb-1.5 block text-xs font-medium"
              htmlFor="activationStatus"
              style={{ color: "#64748b" }}
            >
              Profile status
            </label>
            <select
              id="activationStatus"
              name="activationStatus"
              defaultValue={currentStatus}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{
                borderColor: "rgba(255,255,255,0.12)",
                background: "#1e293b",
                color: "#f1f5f9",
              }}
            >
              {PROFILE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {PROFILE_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
            <FieldError messages={state.fieldErrors["activationStatus"]} />
          </div>

          <div className="md:col-span-2">
            <label
              className="mb-1.5 block text-xs font-medium"
              htmlFor="actorName"
              style={{ color: "#64748b" }}
            >
              Your name
            </label>
            <input
              id="actorName"
              name="actorName"
              placeholder="Optional — for audit history"
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{
                borderColor: "rgba(255,255,255,0.12)",
                background: "#1e293b",
                color: "#f1f5f9",
              }}
            />
            <FieldError messages={state.fieldErrors["actorName"]} />
          </div>

          <div>
            <label
              className="mb-1.5 block text-xs font-medium"
              htmlFor="city"
              style={{ color: "#64748b" }}
            >
              City
            </label>
            <input
              id="city"
              name="city"
              defaultValue={profile.city}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{
                borderColor: "rgba(255,255,255,0.12)",
                background: "#1e293b",
                color: "#f1f5f9",
              }}
            />
            <FieldError messages={state.fieldErrors["city"]} />
          </div>

          <div>
            <label
              className="mb-1.5 block text-xs font-medium"
              htmlFor="state"
              style={{ color: "#64748b" }}
            >
              State / region
            </label>
            <input
              id="state"
              name="state"
              defaultValue={profile.state ?? ""}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{
                borderColor: "rgba(255,255,255,0.12)",
                background: "#1e293b",
                color: "#f1f5f9",
              }}
            />
            <FieldError messages={state.fieldErrors["state"]} />
          </div>

          <div>
            <label
              className="mb-1.5 block text-xs font-medium"
              htmlFor="email"
              style={{ color: "#64748b" }}
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={profile.email}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{
                borderColor: "rgba(255,255,255,0.12)",
                background: "#1e293b",
                color: "#f1f5f9",
              }}
            />
            <FieldError messages={state.fieldErrors["email"]} />
          </div>

          <div>
            <label
              className="mb-1.5 block text-xs font-medium"
              htmlFor="phone"
              style={{ color: "#64748b" }}
            >
              Phone
            </label>
            <input
              id="phone"
              name="phone"
              defaultValue={profile.phone ?? ""}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{
                borderColor: "rgba(255,255,255,0.12)",
                background: "#1e293b",
                color: "#f1f5f9",
              }}
            />
            <FieldError messages={state.fieldErrors["phone"]} />
          </div>
        </div>
      </section>

      <section>
        <h2
          className="mb-4 text-xs font-semibold uppercase tracking-[3px]"
          style={{ color: "#475569" }}
        >
          Vehicle And Service
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label
              className="mb-1.5 block text-xs font-medium"
              htmlFor="vehicleType"
              style={{ color: "#64748b" }}
            >
              Vehicle type
            </label>
            <select
              id="vehicleType"
              name="vehicleType"
              defaultValue={profile.vehicleType}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{
                borderColor: "rgba(255,255,255,0.12)",
                background: "#1e293b",
                color: "#f1f5f9",
              }}
            >
              {VEHICLE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {VEHICLE_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
            <FieldError messages={state.fieldErrors["vehicleType"]} />
          </div>

          <div>
            <label
              className="mb-1.5 block text-xs font-medium"
              htmlFor="vehicleYear"
              style={{ color: "#64748b" }}
            >
              Vehicle year
            </label>
            <input
              id="vehicleYear"
              name="vehicleYear"
              type="number"
              min="1990"
              defaultValue={profile.vehicleYear ?? ""}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{
                borderColor: "rgba(255,255,255,0.12)",
                background: "#1e293b",
                color: "#f1f5f9",
              }}
            />
            <FieldError messages={state.fieldErrors["vehicleYear"]} />
          </div>

          <div>
            <label
              className="mb-1.5 block text-xs font-medium"
              htmlFor="yearsExperience"
              style={{ color: "#64748b" }}
            >
              Years of experience
            </label>
            <input
              id="yearsExperience"
              name="yearsExperience"
              type="number"
              min="0"
              defaultValue={profile.yearsExperience ?? ""}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{
                borderColor: "rgba(255,255,255,0.12)",
                background: "#1e293b",
                color: "#f1f5f9",
              }}
            />
            <FieldError messages={state.fieldErrors["yearsExperience"]} />
          </div>
        </div>

        <div className="mt-4">
          <label
            className="mb-1.5 block text-xs font-medium"
            htmlFor="serviceNotes"
            style={{ color: "#64748b" }}
          >
            Service notes
          </label>
          <textarea
            id="serviceNotes"
            name="serviceNotes"
            rows={6}
            defaultValue={profile.serviceNotes ?? ""}
            className="w-full resize-y rounded-lg border px-3 py-2.5 text-sm outline-none"
            style={{
              borderColor: "rgba(255,255,255,0.12)",
              background: "#1e293b",
              color: "#f1f5f9",
            }}
          />
          <FieldError messages={state.fieldErrors["serviceNotes"]} />
        </div>
      </section>

      {state.error && (
        <p className="text-sm" style={{ color: "#f87171" }}>
          {state.error}
        </p>
      )}
      {state.saved && (
        <p className="text-sm" style={{ color: "#22c55e" }}>
          Profile saved.
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg px-5 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
        style={{ background: "#14b8a6", color: "#042f2e" }}
      >
        {isPending ? "Saving..." : "Save operator profile"}
      </button>
    </form>
  );
}
