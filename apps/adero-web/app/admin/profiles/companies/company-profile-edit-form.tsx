"use client";

import type { AderoCompanyProfile } from "@raylak/db";
import { useActionState } from "react";
import { PROFILE_STATUS_LABELS, PROFILE_STATUSES } from "~/lib/validators";
import { updateCompanyProfile, type ProfileActionState } from "../actions";

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

export function CompanyProfileEditForm({ profile }: { profile: AderoCompanyProfile }) {
  const [state, formAction, isPending] = useActionState(
    updateCompanyProfile,
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
          Company
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label
              className="mb-1.5 block text-xs font-medium"
              htmlFor="companyName"
              style={{ color: "#64748b" }}
            >
              Company name
            </label>
            <input
              id="companyName"
              name="companyName"
              defaultValue={profile.companyName}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{
                borderColor: "rgba(255,255,255,0.12)",
                background: "#1e293b",
                color: "#f1f5f9",
              }}
            />
            <FieldError messages={state.fieldErrors["companyName"]} />
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

          <div>
            <label
              className="mb-1.5 block text-xs font-medium"
              htmlFor="serviceArea"
              style={{ color: "#64748b" }}
            >
              Service area
            </label>
            <input
              id="serviceArea"
              name="serviceArea"
              defaultValue={profile.serviceArea}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{
                borderColor: "rgba(255,255,255,0.12)",
                background: "#1e293b",
                color: "#f1f5f9",
              }}
            />
            <FieldError messages={state.fieldErrors["serviceArea"]} />
          </div>

          <div>
            <label
              className="mb-1.5 block text-xs font-medium"
              htmlFor="fleetSize"
              style={{ color: "#64748b" }}
            >
              Fleet size
            </label>
            <input
              id="fleetSize"
              name="fleetSize"
              type="number"
              min="1"
              defaultValue={profile.fleetSize ?? ""}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{
                borderColor: "rgba(255,255,255,0.12)",
                background: "#1e293b",
                color: "#f1f5f9",
              }}
            />
            <FieldError messages={state.fieldErrors["fleetSize"]} />
          </div>

          <div className="md:col-span-2">
            <label
              className="mb-1.5 block text-xs font-medium"
              htmlFor="website"
              style={{ color: "#64748b" }}
            >
              Website
            </label>
            <input
              id="website"
              name="website"
              type="url"
              defaultValue={profile.website ?? ""}
              placeholder="https://example.com"
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{
                borderColor: "rgba(255,255,255,0.12)",
                background: "#1e293b",
                color: "#f1f5f9",
              }}
            />
            <FieldError messages={state.fieldErrors["website"]} />
          </div>
        </div>
      </section>

      <section>
        <h2
          className="mb-4 text-xs font-semibold uppercase tracking-[3px]"
          style={{ color: "#475569" }}
        >
          Contact
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label
              className="mb-1.5 block text-xs font-medium"
              htmlFor="contactName"
              style={{ color: "#64748b" }}
            >
              Contact name
            </label>
            <input
              id="contactName"
              name="contactName"
              defaultValue={profile.contactName}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{
                borderColor: "rgba(255,255,255,0.12)",
                background: "#1e293b",
                color: "#f1f5f9",
              }}
            />
            <FieldError messages={state.fieldErrors["contactName"]} />
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

          <div className="md:col-span-2">
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
          style={{ borderColor: "rgba(255,255,255,0.12)", background: "#1e293b", color: "#f1f5f9" }}
        />
        <FieldError messages={state.fieldErrors["serviceNotes"]} />
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
        style={{ background: "#6366f1", color: "#fff" }}
      >
        {isPending ? "Saving..." : "Save company profile"}
      </button>
    </form>
  );
}
