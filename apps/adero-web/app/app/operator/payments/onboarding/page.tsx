import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAderoUser } from "@/lib/auth";
import { getStripeAccountStatus } from "../actions";
import { StripeOnboardingButton } from "@/components/stripe-onboarding-button";

export const metadata: Metadata = {
  title: "Stripe Onboarding - Adero",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function OperatorPaymentsOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [aderoUser, query] = await Promise.all([
    requireAderoUser().catch(() => notFound()),
    searchParams,
  ]);

  if (aderoUser.role !== "operator") {
    notFound();
  }

  const refresh = query["refresh"] === "true";
  const stripeStatus = await getStripeAccountStatus().catch(() => null);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link
          href="/app/operator/payments"
          className="text-xs transition-opacity hover:opacity-70"
          style={{ color: "#475569" }}
        >
          ← Back to payments
        </Link>
        <h1 className="text-2xl font-light tracking-tight" style={{ color: "#f1f5f9" }}>
          Stripe Onboarding
        </h1>
      </div>

      {refresh ? (
        <div
          className="rounded-xl border p-5"
          style={{
            borderColor: "rgba(239,68,68,0.25)",
            background: "rgba(239,68,68,0.08)",
          }}
        >
          <p className="text-sm" style={{ color: "#fda4af" }}>
            Onboarding incomplete — please try again.
          </p>
          <div className="mt-3">
            <StripeOnboardingButton />
          </div>
        </div>
      ) : stripeStatus?.onboardingComplete ? (
        <div
          className="rounded-xl border p-5"
          style={{
            borderColor: "rgba(34,197,94,0.25)",
            background: "rgba(34,197,94,0.08)",
          }}
        >
          <p className="text-sm font-medium" style={{ color: "#86efac" }}>
            Stripe account setup complete!
          </p>
          <Link
            href="/app/operator/payments"
            className="mt-3 inline-block rounded-md px-3 py-2 text-sm font-medium"
            style={{ background: "rgba(34,197,94,0.2)", color: "#86efac" }}
          >
            Go to Payments
          </Link>
        </div>
      ) : (
        <div
          className="rounded-xl border p-5"
          style={{
            borderColor: "rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <p className="text-sm" style={{ color: "#94a3b8" }}>
            Your Stripe setup is still incomplete. Continue onboarding to enable payouts.
          </p>
          <div className="mt-3">
            <StripeOnboardingButton />
          </div>
        </div>
      )}
    </div>
  );
}
