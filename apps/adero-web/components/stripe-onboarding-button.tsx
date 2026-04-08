"use client";

import { useState, useTransition } from "react";
import { startStripeOnboarding } from "@/app/app/operator/payments/actions";

export function StripeOnboardingButton() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setMessage(null);
          setIsError(false);

          startTransition(async () => {
            try {
              const result = await startStripeOnboarding();

              if ("alreadyComplete" in result && result.alreadyComplete) {
                setMessage("Already connected.");
                return;
              }

              if ("onboardingUrl" in result && result.onboardingUrl) {
                window.location.href = result.onboardingUrl;
                return;
              }

              setIsError(true);
              setMessage("Could not start Stripe onboarding.");
            } catch (error) {
              setIsError(true);
              setMessage(error instanceof Error ? error.message : "Could not start Stripe onboarding.");
            }
          });
        }}
        className="rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50"
        style={{ background: "rgba(99,102,241,0.2)", color: "#c7d2fe" }}
      >
        {isPending ? "Connecting..." : "Connect with Stripe"}
      </button>

      {message && (
        <p className="text-xs" style={{ color: isError ? "#fda4af" : "#86efac" }}>
          {message}
        </p>
      )}
    </div>
  );
}
