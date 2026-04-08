"use server";

import { eq } from "drizzle-orm";
import { aderoOperatorStripeAccounts, db } from "@raylak/db";
import { requireAderoUser } from "@/lib/auth";
import {
  createConnectAccount,
  getConnectOnboardingLink,
  refreshConnectAccountStatus,
} from "@/lib/stripe";

async function requireOperator() {
  const user = await requireAderoUser();
  if (user.role !== "operator") {
    throw new Error("Forbidden: operator role required.");
  }
  return user;
}

export async function startStripeOnboarding() {
  const operator = await requireOperator();

  const [existing] = await db
    .select()
    .from(aderoOperatorStripeAccounts)
    .where(eq(aderoOperatorStripeAccounts.operatorId, operator.id))
    .limit(1);

  if (existing) {
    if (existing.onboardingComplete) {
      return { alreadyComplete: true as const };
    }

    const onboardingUrl = await getConnectOnboardingLink(operator.id);
    if (!onboardingUrl) {
      throw new Error("Could not create Stripe onboarding link.");
    }

    return { onboardingUrl };
  }

  const { onboardingUrl } = await createConnectAccount(operator.id, operator.email);
  return { onboardingUrl };
}

export async function getStripeAccountStatus() {
  const operator = await requireOperator();
  return refreshConnectAccountStatus(operator.id);
}
