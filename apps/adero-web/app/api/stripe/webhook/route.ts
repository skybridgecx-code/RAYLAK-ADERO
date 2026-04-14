import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import {
  aderoInvoices,
  aderoOperatorStripeAccounts,
  aderoPayments,
  aderoPlatformFees,
  db,
} from "@raylak/db";
import { createNotification } from "@/lib/notifications";
import { env } from "@/lib/env";
import { getStripe } from "@/lib/stripe";

function formatUsd(value: string | number | null | undefined): string {
  const numeric = Number(value ?? 0);
  const rounded = Number.isFinite(numeric)
    ? Math.round((numeric + Number.EPSILON) * 100) / 100
    : 0;
  return `$${rounded.toFixed(2)}`;
}

function extractChargeId(
  latestCharge: string | Stripe.Charge | null,
): string | null {
  if (!latestCharge) return null;
  if (typeof latestCharge === "string") return latestCharge;
  return latestCharge.id;
}

function getWebhookSecrets(): string[] {
  return [
    env.STRIPE_WEBHOOK_SECRET,
    env.STRIPE_CONNECT_WEBHOOK_SECRET,
  ].filter((secret): secret is string => Boolean(secret));
}

function constructStripeEvent(
  payload: string,
  signature: string,
): Stripe.Event {
  const secrets = getWebhookSecrets();
  if (secrets.length === 0) {
    throw new Error(
      "Stripe webhook is not configured. Missing STRIPE_WEBHOOK_SECRET.",
    );
  }

  const stripe = getStripe();
  for (const secret of secrets) {
    try {
      return stripe.webhooks.constructEvent(payload, signature, secret);
    } catch {
    }
  }

  throw new Error("Stripe signature verification failed.");
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature." },
      { status: 400 },
    );
  }

  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = constructStripeEvent(payload, signature);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid webhook.";
    if (message.includes("configured")) {
      return NextResponse.json({ error: message }, { status: 500 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const metadataInvoiceId = paymentIntent.metadata?.["invoiceId"] ?? null;
        const [payment] = await db
          .select()
          .from(aderoPayments)
          .where(eq(aderoPayments.stripePaymentIntentId, paymentIntent.id))
          .limit(1);

        if (!payment) {
          if (metadataInvoiceId) {
            console.warn(
              `[adero/stripe-webhook] succeeded intent ${paymentIntent.id} has metadata invoice ${metadataInvoiceId} but no payment record.`,
            );
          }
          break;
        }

        const now = new Date();
        const chargeId = extractChargeId(paymentIntent.latest_charge);
        await db
          .update(aderoPayments)
          .set({
            status: "succeeded",
            stripeChargeId: chargeId,
            processedAt: now,
            failureReason: null,
            updatedAt: now,
          })
          .where(eq(aderoPayments.id, payment.id));

        const [invoice] = await db
          .select({
            id: aderoInvoices.id,
            invoiceNumber: aderoInvoices.invoiceNumber,
            totalAmount: aderoInvoices.totalAmount,
            requesterId: aderoInvoices.requesterId,
            operatorId: aderoInvoices.operatorId,
          })
          .from(aderoInvoices)
          .where(eq(aderoInvoices.id, payment.invoiceId))
          .limit(1);

        if (!invoice) break;

        await db
          .update(aderoInvoices)
          .set({
            paidAmount: invoice.totalAmount,
            status: "paid",
            paidAt: now,
            updatedAt: now,
          })
          .where(eq(aderoInvoices.id, invoice.id));

        await db
          .update(aderoPlatformFees)
          .set({ paymentId: payment.id })
          .where(eq(aderoPlatformFees.invoiceId, invoice.id));

        await Promise.all([
          createNotification(
            invoice.requesterId,
            "trip_status_changed",
            `Payment received — Invoice #${invoice.invoiceNumber}`,
            `Payment of ${formatUsd(invoice.totalAmount)} was received for your invoice.`,
            {
              invoiceId: invoice.id,
              paymentId: payment.id,
            },
          ),
          createNotification(
            invoice.operatorId,
            "trip_status_changed",
            `Payment confirmed — Invoice #${invoice.invoiceNumber}`,
            `Payment has been confirmed for invoice #${invoice.invoiceNumber}.`,
            {
              invoiceId: invoice.id,
              paymentId: payment.id,
            },
          ),
        ]);
        break;
      }
      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const [payment] = await db
          .select()
          .from(aderoPayments)
          .where(eq(aderoPayments.stripePaymentIntentId, paymentIntent.id))
          .limit(1);

        if (!payment) break;

        const failureReason =
          paymentIntent.last_payment_error?.message ?? "Payment failed.";

        await db
          .update(aderoPayments)
          .set({
            status: "failed",
            failureReason,
            updatedAt: new Date(),
          })
          .where(eq(aderoPayments.id, payment.id));

        const [invoice] = await db
          .select({
            id: aderoInvoices.id,
            invoiceNumber: aderoInvoices.invoiceNumber,
            requesterId: aderoInvoices.requesterId,
          })
          .from(aderoInvoices)
          .where(eq(aderoInvoices.id, payment.invoiceId))
          .limit(1);

        if (!invoice) break;

        await createNotification(
          invoice.requesterId,
          "trip_status_changed",
          "Payment failed — please try again",
          `Payment failed for invoice #${invoice.invoiceNumber}.`,
          {
            invoiceId: invoice.id,
            paymentId: payment.id,
            failureReason,
          },
        );
        break;
      }
      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        const [operatorStripeAccount] = await db
          .select({
            id: aderoOperatorStripeAccounts.id,
          })
          .from(aderoOperatorStripeAccounts)
          .where(eq(aderoOperatorStripeAccounts.stripeAccountId, account.id))
          .limit(1);

        if (!operatorStripeAccount) break;

        const chargesEnabled = Boolean(account.charges_enabled);
        const payoutsEnabled = Boolean(account.payouts_enabled);
        const detailsSubmitted = Boolean(account.details_submitted);
        const onboardingComplete =
          chargesEnabled && payoutsEnabled && detailsSubmitted;

        await db
          .update(aderoOperatorStripeAccounts)
          .set({
            chargesEnabled,
            payoutsEnabled,
            detailsSubmitted,
            onboardingComplete,
            updatedAt: new Date(),
          })
          .where(eq(aderoOperatorStripeAccounts.id, operatorStripeAccount.id));

        break;
      }
      default:
        break;
    }
  } catch (error) {
    console.error("[adero/stripe-webhook] handler error:", error);
    return NextResponse.json({ received: true, handled: false });
  }

  return NextResponse.json({ received: true });
}
