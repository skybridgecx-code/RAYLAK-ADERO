"use client";

import { useActionState } from "react";
import {
  ADERO_INCIDENT_CATEGORIES,
  ADERO_INCIDENT_CATEGORY_LABELS,
  ADERO_INCIDENT_SEVERITIES,
  ADERO_INCIDENT_SEVERITY_LABELS,
} from "@raylak/shared";
import { reportIncident, type IncidentActionState } from "@/app/app/incidents/actions";

type IncidentFormProps = {
  tripId?: string;
};

const initialState: IncidentActionState = {
  error: null,
  success: null,
};

export function IncidentForm({ tripId }: IncidentFormProps) {
  const [state, action, isPending] = useActionState(reportIncident, initialState);

  if (state.success) {
    return (
      <div
        className="rounded-xl border p-5"
        style={{
          borderColor: "rgba(74,222,128,0.2)",
          background: "rgba(74,222,128,0.05)",
        }}
      >
        <p className="text-sm" style={{ color: "#4ade80" }}>
          {state.success}
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border p-5"
      style={{
        borderColor: "rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
      }}
    >
      <p className="text-xs font-semibold uppercase tracking-[2px]" style={{ color: "#475569" }}>
        Report Incident
      </p>

      <form action={action} className="mt-4 space-y-4">
        <input type="hidden" name="tripId" value={tripId ?? ""} />

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-[11px] font-medium" style={{ color: "#94a3b8" }}>
              Severity
            </label>
            <select
              name="severity"
              required
              defaultValue=""
              className="mt-1 w-full rounded-md border px-3 py-2 text-xs outline-none"
              style={{
                borderColor: "rgba(255,255,255,0.1)",
                background: "#0f172a",
                color: "#f1f5f9",
              }}
            >
              <option value="" disabled>
                Select severity
              </option>
              {ADERO_INCIDENT_SEVERITIES.map((severity) => (
                <option key={severity} value={severity}>
                  {ADERO_INCIDENT_SEVERITY_LABELS[severity]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium" style={{ color: "#94a3b8" }}>
              Category
            </label>
            <select
              name="category"
              required
              defaultValue=""
              className="mt-1 w-full rounded-md border px-3 py-2 text-xs outline-none"
              style={{
                borderColor: "rgba(255,255,255,0.1)",
                background: "#0f172a",
                color: "#f1f5f9",
              }}
            >
              <option value="" disabled>
                Select category
              </option>
              {ADERO_INCIDENT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {ADERO_INCIDENT_CATEGORY_LABELS[category]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-medium" style={{ color: "#94a3b8" }}>
            Title
          </label>
          <input
            name="title"
            required
            maxLength={255}
            className="mt-1 w-full rounded-md border px-3 py-2 text-xs outline-none"
            style={{
              borderColor: "rgba(255,255,255,0.1)",
              background: "#0f172a",
              color: "#f1f5f9",
            }}
            placeholder="Short incident title"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium" style={{ color: "#94a3b8" }}>
            Description
          </label>
          <textarea
            name="description"
            required
            rows={4}
            maxLength={5000}
            className="mt-1 w-full resize-none rounded-md border px-3 py-2 text-xs outline-none"
            style={{
              borderColor: "rgba(255,255,255,0.1)",
              background: "#0f172a",
              color: "#f1f5f9",
            }}
            placeholder="Describe the incident in detail"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium" style={{ color: "#94a3b8" }}>
            Location
          </label>
          <input
            name="location"
            maxLength={500}
            className="mt-1 w-full rounded-md border px-3 py-2 text-xs outline-none"
            style={{
              borderColor: "rgba(255,255,255,0.1)",
              background: "#0f172a",
              color: "#f1f5f9",
            }}
            placeholder="Optional location details"
          />
        </div>

        {state.error && (
          <p className="text-xs" style={{ color: "#f87171" }}>
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-md px-4 py-2 text-xs font-medium transition-opacity disabled:opacity-50"
          style={{
            background: "rgba(99,102,241,0.16)",
            color: "#a5b4fc",
          }}
        >
          {isPending ? "Submitting..." : "Submit Incident"}
        </button>
      </form>
    </div>
  );
}
