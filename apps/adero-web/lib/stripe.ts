import "server-only";

import Stripe from "stripe";
import { and, eq, inArray } from "drizzle-orm";
import {
  aderoInvoices,
  aderoOperatorStripeAccounts,
  aderoPayments,
  db,
} from "@raylak/db";
import { calculatePlatformFee } from "@/lib/pricing";
import { env } from "./env";

let stripeClient: Stripe | null = null;

function toNumber(value: string | number | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toMoney(value: string | number | null | undefined): number {
  return Math.round((toNumber(value) + Number.EPSILON) * 100) / 100;
}

function toMoneyString(value: string | number | null | undefined): string {
  return toMoney(value).toFixed(2);
}

function getBaseUrl(): string {
  return env.ADERO_BASE_URL ?? "http://localhost:3001";
}

export function getStripe(): Stripe {
  if (stripeClient) {
    return stripeClient;
  }

  if (!env.STRIPE_SECRET_KEY) {
    throw new Error(
      "Stripe is not configured. Missing STRIPE_SECRET_KEY.",
    );
  }

  stripeClient = new Stripe(env.STRIPE_SECRET_KEY);
  return stripeClient;
}

export async function createConnectAccount(
  operatorId: string,
  email: string,
): Promise<{ stripeAccountId: string; onboardingUrl: string }> {
  const existing = await db
    .select()
    .from(aderoOperatorStripeAccounts)
    .where(eq(aderoOperatorStripeAccounts.operatorId, operatorId))
    .limit(1);

  if (existing[0]) {
    const onboardingUrl = await getConnectOnboardingLink(operatorId);
    if (!onboardingUrl) {
      throw new Error("Operator Stripe onboarding is already complete.");
    }
    return {
      stripeAccountId: existing[0].stripeAccountId,
      onboardingUrl,
    };
  }

  const stripe = getStripe();
  const account = await stripe.accounts.create({
    type: "express",
    email,
    metadata: { operatorId },
  });

  const now = new Date();
  await db.insert(aderoOperatorStripeAccounts).values({
    operatorId,
    stripeAccountId: account.id,
    chargesEnabled: false,
    payoutsEnabled: false,
    detailsSubmitted: false,
    onboardingComplete: false,
    metadata: { createdVia: "createConnectAccount" },
    createdAt: now,
    updatedAt: now,
  });

  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    type: "account_onboarding",
    refresh_url: `${getBaseUrl()}/app/operator/payments/onboarding?refresh=true`,
    return_url: `${getBaseUrl()}/app/operator/payments?onboarding=complete`,
  });

  return { stripeAccountId: account.id, onboardingUrl: accountLink.url };
}

export async function getConnectOnboardingLink(
  operatorId: string,
): Promise<string | null> {
  const [record] = await db
    .select()
    .from(aderoOperatorStripeAccounts)
    .where(eq(aderoOperatorStripeAccounts.operatorId, operatorId))
    .limit(1);

  if (!record) {
    return null;
  }

  if (record.onboardingComplete) {
    return null;
  }

  const stripe = getStripe();
  const accountLink = await stripe.accountLinks.create({
    account: record.stripeAccountId,
    type: "account_onboarding",
    refresh_url: `${getBaseUrl()}/app/operator/payments/onboarding?refresh=true`,
    return_url: `${getBaseUrl()}/app/operator/payments?onboarding=complete`,
  });

  return accountLink.url;
}

export async function refreshConnectAccountStatus(
  operatorId: string,
): Promise<typeof aderoOperatorStripeAccounts.$inferSelect | null> {
  const [record] = await db
    .select()
    .from(aderoOperatorStripeAccounts)
    .where(eq(aderoOperatorStripeAccounts.operatorId, operatorId))
    .limit(1);

  if (!record) {
    return null;
  }

  const stripe = getStripe();
  const account = await stripe.accounts.retrieve(record.stripeAccountId);

  const chargesEnabled = Boolean(account.charges_enabled);
  const payoutsEnabled = Boolean(account.payouts_enabled);
  const detailsSubmitted = Boolean(account.details_submitted);
  const onboardingComplete =
    chargesEnabled && payoutsEnabled && detailsSubmitted;

  const [updated] = await db
    .update(aderoOperatorStripeAccounts)
    .set({
      chargesEnabled,
      payoutsEnabled,
      detailsSubmitted,
      onboardingComplete,
      updatedAt: new Date(),
    })
    .where(eq(aderoOperatorStripeAccounts.id, record.id))
    .returning();

  return updated ?? null;
}

export async function createPaymentForInvoice(
  invoiceId: string,
): Promise<typeof aderoPayments.$inferSelect> {
  const [invoice] = await db
    .select()
    .from(aderoInvoices)
    .where(eq(aderoInvoices.id, invoiceId))
    .limit(1);

  if (!invoice) {
    throw new Error("Invoice not found.");
  }

  if (invoice.status !== "issued" && invoice.status !== "overdue") {
    throw new Error(
      `Invoice is not payable in status "${invoice.status}".`,
    );
  }

  const totalAmount = toMoney(invoice.totalAmount);
  if (totalAmount <= 0) {
    throw new Error("Cannot create Stripe payment for zero-amount invoice.");
  }

  const [existingInFlightPayment] = await db
    .select({ id: aderoPayments.id })
    .from(aderoPayments)
    .where(
      and(
        eq(aderoPayments.invoiceId, invoice.id),
        inArray(aderoPayments.status, ["pending", "processing"]),
      ),
    )
    .limit(1);

  if (existingInFlightPayment) {
    throw new Error("A payment is already in progress for this invoice.");
  }

  const [operatorStripeAccount] = await db
    .select()
    .from(aderoOperatorStripeAccounts)
    .where(eq(aderoOperatorStripeAccounts.operatorId, invoice.operatorId))
    .limit(1);

  const stripe = getStripe();
  const fee = calculatePlatformFee(totalAmount);
  const totalAmountCents = Math.round(totalAmount * 100);
  const feeAmountCents = Math.round(toMoney(fee.feeAmount) * 100);

  const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
    amount: totalAmountCents,
    currency: invoice.currency.toLowerCase(),
    metadata: {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      tripId: invoice.tripId,
    },
  };

  if (operatorStripeAccount?.chargesEnabled) {
    paymentIntentParams.application_fee_amount = feeAmountCents;
    paymentIntentParams.transfer_data = {
      destination: operatorStripeAccount.stripeAccountId,
    };
  }

  const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

  const [payment] = await db
    .insert(aderoPayments)
    .values({
      invoiceId: invoice.id,
      status: "pending",
      method: "stripe",
      amount: toMoneyString(totalAmount),
      currency: invoice.currency,
      stripePaymentIntentId: paymentIntent.id,
      refundedAmount: "0.00",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  if (!payment) {
    throw new Error("Payment record could not be created.");
  }

  return payment;
}

export async function getPaymentClientSecret(paymentId: string): Promise<string> {
  const [payment] = await db
    .select({
      id: aderoPayments.id,
      stripePaymentIntentId: aderoPayments.stripePaymentIntentId,
    })
    .from(aderoPayments)
    .where(eq(aderoPayments.id, paymentId))
    .limit(1);

  if (!payment) {
    throw new Error("Payment not found.");
  }

  if (!payment.stripePaymentIntentId) {
    throw new Error("Payment is not associated with a Stripe PaymentIntent.");
  }

  const stripe = getStripe();
  const paymentIntent = await stripe.paymentIntents.retrieve(
    payment.stripePaymentIntentId,
  );

  if (!paymentIntent.client_secret) {
    throw new Error("Stripe PaymentIntent client secret is not available.");
  }

  return paymentIntent.client_secret;
}

export async function recordManualPayment(
  invoiceId: string,
  amount: number,
  method: "bank_transfer" | "manual",
  note?: string,
): Promise<typeof aderoPayments.$inferSelect> {
  const [invoice] = await db
    .select({
      id: aderoInvoices.id,
      totalAmount: aderoInvoices.totalAmount,
      paidAmount: aderoInvoices.paidAmount,
      currency: aderoInvoices.currency,
    })
    .from(aderoInvoices)
    .where(eq(aderoInvoices.id, invoiceId))
    .limit(1);

  if (!invoice) {
    throw new Error("Invoice not found.");
  }

  const roundedAmount = toMoney(amount);
  if (roundedAmount <= 0) {
    throw new Error("Manual payment amount must be greater than zero.");
  }

  const now = new Date();
  const [payment] = await db
    .insert(aderoPayments)
    .values({
      invoiceId: invoice.id,
      status: "succeeded",
      method,
      amount: toMoneyString(roundedAmount),
      currency: invoice.currency,
      metadata: note ? { note } : null,
      processedAt: now,
      refundedAmount: "0.00",
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (!payment) {
    throw new Error("Manual payment could not be recorded.");
  }

  const nextPaidAmount = toMoney(toNumber(invoice.paidAmount) + roundedAmount);
  const totalAmount = toMoney(invoice.totalAmount);

  await db
    .update(aderoInvoices)
    .set({
      paidAmount: toMoneyString(nextPaidAmount),
      status:
        nextPaidAmount >= totalAmount
          ? "paid"
          : nextPaidAmount > 0
            ? "partially_paid"
            : "issued",
      paidAt: nextPaidAmount >= totalAmount ? now : null,
      updatedAt: now,
    })
    .where(eq(aderoInvoices.id, invoice.id));

  return payment;
}
