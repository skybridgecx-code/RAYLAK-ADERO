"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { asc, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";
import {
  aderoInvoices,
  aderoOperatorStripeAccounts,
  aderoPayments,
  aderoPricingRules,
  aderoQuotes,
  aderoRequests,
  aderoUsers,
  db,
} from "@raylak/db";
import { cancelInvoice, markInvoiceOverdue } from "@/lib/invoicing";
import {
  checkAndExpireQuotes,
  checkAndMarkOverdueInvoices,
  getRevenueStats,
  sendPaymentReminder,
} from "@/lib/payment-lifecycle";
import { recordManualPayment } from "@/lib/stripe";

const CreatePricingRuleSchema = z.object({
  serviceType: z.string().trim().min(1),
  pricingTier: z.enum(["standard", "premium", "surge", "custom"]),
  baseFare: z.coerce.number().finite().min(0),
  perMileRate: z.coerce.number().finite().min(0),
  perMinuteRate: z.coerce.number().finite().min(0),
  minimumFare: z.coerce.number().finite().min(0),
  surgeMultiplier: z.coerce.number().finite().min(0),
});

const TogglePricingRuleSchema = z.object({
  ruleId: z.string().uuid(),
  isActive: z.boolean(),
});

const ManualPaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  amount: z.coerce.number().finite().positive(),
  method: z.enum(["bank_transfer", "manual"]),
  note: z.string().trim().optional(),
});

function toMoneyString(value: number): string {
  return (Math.round((value + Number.EPSILON) * 100) / 100).toFixed(2);
}

async function assertAdminAccess(): Promise<void> {
  const secret = process.env["ADERO_ADMIN_SECRET"];
  const cookieStore = await cookies();
  const session = cookieStore.get("adero_admin")?.value;

  if (!secret || session !== secret) {
    throw new Error("Admin access required.");
  }
}

export async function getPricingRules() {
  await assertAdminAccess();
  return db
    .select()
    .from(aderoPricingRules)
    .orderBy(
      asc(aderoPricingRules.serviceType),
      asc(aderoPricingRules.pricingTier),
      desc(aderoPricingRules.createdAt),
    );
}

export async function createPricingRule(
  formData: FormData,
): Promise<void> {
  await assertAdminAccess();

  const parsed = CreatePricingRuleSchema.safeParse({
    serviceType: formData.get("serviceType"),
    pricingTier: formData.get("pricingTier"),
    baseFare: formData.get("baseFare"),
    perMileRate: formData.get("perMileRate"),
    perMinuteRate: formData.get("perMinuteRate"),
    minimumFare: formData.get("minimumFare"),
    surgeMultiplier: formData.get("surgeMultiplier"),
  });

  if (!parsed.success) {
    throw new Error("Invalid pricing rule input.");
  }

  const data = parsed.data;
  const now = new Date();

  await db.insert(aderoPricingRules).values({
    serviceType: data.serviceType,
    pricingTier: data.pricingTier,
    baseFare: toMoneyString(data.baseFare),
    perMileRate: toMoneyString(data.perMileRate),
    perMinuteRate: toMoneyString(data.perMinuteRate),
    minimumFare: toMoneyString(data.minimumFare),
    surgeMultiplier: toMoneyString(data.surgeMultiplier),
    currency: "usd",
    isActive: true,
    effectiveFrom: now,
    createdAt: now,
    updatedAt: now,
  });

  revalidatePath("/admin/pricing");
}

export async function togglePricingRule(
  ruleId: string,
  isActive: boolean,
): Promise<void> {
  await assertAdminAccess();
  const parsed = TogglePricingRuleSchema.safeParse({ ruleId, isActive });
  if (!parsed.success) {
    throw new Error("Invalid pricing rule toggle payload.");
  }

  await db
    .update(aderoPricingRules)
    .set({
      isActive: parsed.data.isActive,
      updatedAt: new Date(),
    })
    .where(eq(aderoPricingRules.id, parsed.data.ruleId));

  revalidatePath("/admin/pricing");
}

export async function getAllQuotes() {
  await assertAdminAccess();
  return db
    .select({
      id: aderoQuotes.id,
      requestId: aderoQuotes.requestId,
      status: aderoQuotes.status,
      totalAmount: aderoQuotes.totalAmount,
      currency: aderoQuotes.currency,
      pickupAddress: aderoRequests.pickupAddress,
      dropoffAddress: aderoRequests.dropoffAddress,
      createdAt: aderoQuotes.createdAt,
      expiresAt: aderoQuotes.expiresAt,
    })
    .from(aderoQuotes)
    .innerJoin(aderoRequests, eq(aderoQuotes.requestId, aderoRequests.id))
    .orderBy(desc(aderoQuotes.createdAt));
}

export async function getAllInvoices() {
  await assertAdminAccess();
  const requester = alias(aderoUsers, "requester_user");
  const operator = alias(aderoUsers, "operator_user");

  return db
    .select({
      id: aderoInvoices.id,
      invoiceNumber: aderoInvoices.invoiceNumber,
      status: aderoInvoices.status,
      totalAmount: aderoInvoices.totalAmount,
      paidAmount: aderoInvoices.paidAmount,
      dueDate: aderoInvoices.dueDate,
      createdAt: aderoInvoices.createdAt,
      requesterEmail: requester.email,
      operatorEmail: operator.email,
    })
    .from(aderoInvoices)
    .innerJoin(requester, eq(aderoInvoices.requesterId, requester.id))
    .innerJoin(operator, eq(aderoInvoices.operatorId, operator.id))
    .orderBy(desc(aderoInvoices.createdAt));
}

export async function getAllPayments() {
  await assertAdminAccess();
  return db
    .select({
      id: aderoPayments.id,
      invoiceId: aderoPayments.invoiceId,
      invoiceNumber: aderoInvoices.invoiceNumber,
      method: aderoPayments.method,
      status: aderoPayments.status,
      amount: aderoPayments.amount,
      stripePaymentIntentId: aderoPayments.stripePaymentIntentId,
      processedAt: aderoPayments.processedAt,
      createdAt: aderoPayments.createdAt,
    })
    .from(aderoPayments)
    .innerJoin(aderoInvoices, eq(aderoPayments.invoiceId, aderoInvoices.id))
    .orderBy(desc(aderoPayments.createdAt));
}

export async function getOperatorStripeAccounts() {
  await assertAdminAccess();
  return db
    .select({
      id: aderoOperatorStripeAccounts.id,
      operatorEmail: aderoUsers.email,
      stripeAccountId: aderoOperatorStripeAccounts.stripeAccountId,
      chargesEnabled: aderoOperatorStripeAccounts.chargesEnabled,
      payoutsEnabled: aderoOperatorStripeAccounts.payoutsEnabled,
      onboardingComplete: aderoOperatorStripeAccounts.onboardingComplete,
      createdAt: aderoOperatorStripeAccounts.createdAt,
    })
    .from(aderoOperatorStripeAccounts)
    .innerJoin(aderoUsers, eq(aderoOperatorStripeAccounts.operatorId, aderoUsers.id))
    .orderBy(desc(aderoOperatorStripeAccounts.createdAt));
}

export async function adminCancelInvoice(invoiceId: string): Promise<void> {
  await assertAdminAccess();
  await cancelInvoice(invoiceId);
  revalidatePath("/admin/pricing/invoices");
}

export async function adminMarkOverdue(invoiceId: string): Promise<void> {
  await assertAdminAccess();
  await markInvoiceOverdue(invoiceId);
  revalidatePath("/admin/pricing/invoices");
}

export async function adminRecordManualPayment(formData: FormData): Promise<void> {
  await assertAdminAccess();
  const parsed = ManualPaymentSchema.safeParse({
    invoiceId: formData.get("invoiceId"),
    amount: formData.get("amount"),
    method: formData.get("method"),
    note: formData.get("note") ?? undefined,
  });

  if (!parsed.success) {
    throw new Error("Invalid manual payment payload.");
  }

  const note = parsed.data.note?.trim();
  await recordManualPayment(
    parsed.data.invoiceId,
    parsed.data.amount,
    parsed.data.method,
    note && note.length > 0 ? note : undefined,
  );

  revalidatePath("/admin/pricing/invoices");
  revalidatePath("/admin/pricing/payments");
}

export async function adminSendPaymentReminder(
  invoiceId: string,
): Promise<{ success: true }> {
  await assertAdminAccess();
  await sendPaymentReminder(invoiceId);
  revalidatePath("/admin/pricing/invoices");
  return { success: true };
}

export async function adminGetRevenueStats() {
  await assertAdminAccess();
  return getRevenueStats();
}

export async function adminRunOverdueCheck() {
  await assertAdminAccess();
  const overdueInvoices = await checkAndMarkOverdueInvoices();
  const expiredQuotes = await checkAndExpireQuotes();

  revalidatePath("/admin/pricing/invoices");
  revalidatePath("/admin/pricing/quotes");
  revalidatePath("/admin/pricing");

  return {
    overdueInvoices,
    expiredQuotes,
  };
}
