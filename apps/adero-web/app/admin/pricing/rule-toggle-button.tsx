"use client";

import { useTransition } from "react";
import { togglePricingRule } from "./actions";

export function RuleToggleButton({
  ruleId,
  isActive,
}: {
  ruleId: string;
  isActive: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => {
        startTransition(async () => {
          await togglePricingRule(ruleId, !isActive);
        });
      }}
      disabled={isPending}
      className="rounded-md px-2.5 py-1 text-xs font-medium disabled:opacity-50"
      style={{
        background: isActive ? "rgba(34,197,94,0.18)" : "rgba(148,163,184,0.16)",
        color: isActive ? "#86efac" : "#cbd5e1",
      }}
    >
      {isPending ? "Saving…" : isActive ? "Set inactive" : "Set active"}
    </button>
  );
}
