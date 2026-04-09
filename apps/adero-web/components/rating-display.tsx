import { ADERO_RATING_CATEGORY_LABELS } from "@raylak/shared";

type RatingData = {
  id: string;
  raterRole: string;
  overallScore: number;
  punctualityScore: number | null;
  professionalismScore: number | null;
  vehicleConditionScore: number | null;
  communicationScore: number | null;
  comment: string | null;
  isVisible: boolean;
  createdAt: Date;
};

function Stars({ score }: { score: number }) {
  return (
    <span style={{ color: "#facc15", letterSpacing: "1px" }}>
      {"★".repeat(score)}
      <span style={{ color: "#334155" }}>{"★".repeat(5 - score)}</span>
    </span>
  );
}

function SubScore({ label, score }: { label: string; score: number | null }) {
  if (score === null) return null;
  return (
    <span className="text-xs" style={{ color: "#94a3b8" }}>
      {label}: <Stars score={score} />
    </span>
  );
}

export function RatingDisplay({ ratings }: { ratings: RatingData[] }) {
  const visible = ratings.filter((r) => r.isVisible);

  if (visible.length === 0) {
    return (
      <div
        className="rounded-xl border p-5"
        style={{
          borderColor: "rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.03)",
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-[2px]" style={{ color: "#475569" }}>
          Ratings
        </p>
        <p className="mt-3 text-xs" style={{ color: "#64748b" }}>
          No ratings submitted yet.
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
        Ratings ({visible.length})
      </p>
      <div className="mt-3 space-y-3">
        {visible.map((r) => (
          <div
            key={r.id}
            className="rounded-lg border px-3 py-2"
            style={{
              borderColor: "rgba(255,255,255,0.08)",
              background: "rgba(15,23,42,0.5)",
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Stars score={r.overallScore} />
                <span className="text-xs" style={{ color: "#64748b" }}>
                  by {r.raterRole}
                </span>
              </div>
              <span className="text-[10px]" style={{ color: "#475569" }}>
                {r.createdAt.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap gap-3">
              <SubScore
                label={ADERO_RATING_CATEGORY_LABELS.punctuality}
                score={r.punctualityScore}
              />
              <SubScore
                label={ADERO_RATING_CATEGORY_LABELS.professionalism}
                score={r.professionalismScore}
              />
              <SubScore
                label={ADERO_RATING_CATEGORY_LABELS.vehicleCondition}
                score={r.vehicleConditionScore}
              />
              <SubScore
                label={ADERO_RATING_CATEGORY_LABELS.communication}
                score={r.communicationScore}
              />
            </div>
            {r.comment && (
              <p className="mt-2 text-xs" style={{ color: "#cbd5e1" }}>
                {r.comment}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
