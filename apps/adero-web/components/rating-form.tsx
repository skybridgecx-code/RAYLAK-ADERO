"use client";

import { useActionState, useState } from "react";
import { submitRating, type RatingActionState } from "@/app/app/ratings/actions";

const initialState: RatingActionState = { error: null, success: null };

type RatingFormProps = {
  tripId: string;
  rateeUserId: string;
  raterRole: "requester" | "operator";
  rateeLabel: string;
};

function StarInput({
  name,
  label,
  value,
  onChange,
}: {
  name: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="block text-[11px] font-medium" style={{ color: "#94a3b8" }}>
        {label}
      </label>
      <div className="mt-1 flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="text-lg transition-transform hover:scale-110"
            style={{ color: star <= value ? "#facc15" : "#334155" }}
            aria-label={`${star} star`}
          >
            ★
          </button>
        ))}
        <input type="hidden" name={name} value={value || ""} />
      </div>
    </div>
  );
}

export function RatingForm({
  tripId,
  rateeUserId,
  raterRole,
  rateeLabel,
}: RatingFormProps) {
  const [state, action, isPending] = useActionState(submitRating, initialState);
  const [overall, setOverall] = useState(0);
  const [punctuality, setPunctuality] = useState(0);
  const [professionalism, setProfessionalism] = useState(0);
  const [vehicleCondition, setVehicleCondition] = useState(0);
  const [communication, setCommunication] = useState(0);

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
        Rate {rateeLabel}
      </p>
      <p className="mt-1 text-xs" style={{ color: "#64748b" }}>
        Share your experience to help improve the network.
      </p>

      <form action={action} className="mt-4 space-y-4">
        <input type="hidden" name="tripId" value={tripId} />
        <input type="hidden" name="rateeUserId" value={rateeUserId} />
        <input type="hidden" name="raterRole" value={raterRole} />

        <StarInput
          name="overallScore"
          label="Overall Rating *"
          value={overall}
          onChange={setOverall}
        />

        <div className="grid grid-cols-2 gap-3">
          <StarInput
            name="punctualityScore"
            label="Punctuality"
            value={punctuality}
            onChange={setPunctuality}
          />
          <StarInput
            name="professionalismScore"
            label="Professionalism"
            value={professionalism}
            onChange={setProfessionalism}
          />
          {raterRole === "requester" && (
            <StarInput
              name="vehicleConditionScore"
              label="Vehicle Condition"
              value={vehicleCondition}
              onChange={setVehicleCondition}
            />
          )}
          <StarInput
            name="communicationScore"
            label="Communication"
            value={communication}
            onChange={setCommunication}
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium" style={{ color: "#94a3b8" }}>
            Comment (optional)
          </label>
          <textarea
            name="comment"
            rows={3}
            maxLength={2000}
            placeholder="Any additional feedback..."
            className="mt-1 w-full resize-none rounded-md border px-3 py-2 text-xs outline-none"
            style={{
              borderColor: "rgba(255,255,255,0.1)",
              background: "#0f172a",
              color: "#e2e8f0",
            }}
          />
        </div>

        {state.error && (
          <p className="text-xs" style={{ color: "#f87171" }}>
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending || overall === 0}
          className="rounded-md px-4 py-2 text-xs font-medium transition-opacity disabled:opacity-50"
          style={{
            background: "rgba(99,102,241,0.16)",
            color: "#a5b4fc",
          }}
        >
          {isPending ? "Submitting..." : "Submit Rating"}
        </button>
      </form>
    </div>
  );
}
