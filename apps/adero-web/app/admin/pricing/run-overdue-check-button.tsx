"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminRunOverdueCheck } from "./actions";

export function RunOverdueCheckButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setFeedback(null);
          setIsError(false);

          startTransition(async () => {
            try {
              const result = await adminRunOverdueCheck();
              setFeedback(
                `Marked ${result.overdueInvoices.markedCount} overdue invoice(s), expired ${result.expiredQuotes.expiredCount} quote(s).`,
              );
              router.refresh();
            } catch (error) {
              setIsError(true);
              setFeedback(
                error instanceof Error ? error.message : "Overdue check failed.",
              );
            }
          });
        }}
        className="rounded-md px-3 py-2 text-xs font-medium disabled:opacity-50"
        style={{ background: "rgba(234,179,8,0.2)", color: "#fde68a" }}
      >
        {isPending ? "Running..." : "Run Overdue Check"}
      </button>

      {feedback && (
        <p className="text-xs" style={{ color: isError ? "#fda4af" : "#86efac" }}>
          {feedback}
        </p>
      )}
    </div>
  );
}
