import "server-only";

import { randomBytes } from "node:crypto";
import { and, desc, eq, gt, isNull, lte, or } from "drizzle-orm";
import {
  aderoPricingRules,
  aderoQuotes,
  aderoRequests,
  db,
} from "@raylak/db";

export const DEFAULT_TAX_RATE = 0.0;
export const QUOTE_EXPIRY_HOURS = 24;
export const PLATFORM_FEE_PERCENT = 0.15;

type PricingTier = "standard" | "premium" | "surge" | "custom";

export type QuoteCalculationInput = {
  serviceType: string;
  estimatedDistanceMiles: number | null;
  estimatedDurationMinutes: number | null;
  pricingTier?: PricingTier;
  tolls?: number;
  gratuity?: number;
  discount?: number;
  taxRate?: number;
  notes?: string;
};

export type QuoteCalculationResult = {
  pricingRuleId: string | null;
  baseFare: number;
  distanceCharge: number;
  timeCharge: number;
  surgeCharge: number;
  tolls: number;
  gratuity: number;
  discount: number;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  estimatedDistanceMiles: number | null;
  estimatedDurationMinutes: number | null;
  pricingTier: string;
  currency: string;
};

function toMoney(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error("Pricing calculation produced a non-finite number.");
  }
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toNumericString(value: number): string {
  return toMoney(value).toFixed(2);
}

function toDbNumeric(value: string | null): number {
  if (value === null) return 0;
  return Number(value);
}

export async function findActivePricingRule(
  serviceType: string,
  pricingTier?: string,
): Promise<typeof aderoPricingRules.$inferSelect | null> {
  const now = new Date();
  const tier = pricingTier ?? "standard";

  const [rule] = await db
    .select()
    .from(aderoPricingRules)
    .where(
      and(
        eq(aderoPricingRules.serviceType, serviceType),
        eq(aderoPricingRules.pricingTier, tier as PricingTier),
        eq(aderoPricingRules.isActive, true),
        lte(aderoPricingRules.effectiveFrom, now),
        orActiveUntil(now),
      ),
    )
    .orderBy(desc(aderoPricingRules.effectiveFrom))
    .limit(1);

  return rule ?? null;
}

function orActiveUntil(now: Date) {
  return or(isNull(aderoPricingRules.effectiveTo), gt(aderoPricingRules.effectiveTo, now));
}

export async function calculateQuote(
  input: QuoteCalculationInput,
): Promise<QuoteCalculationResult> {
  const rule = await findActivePricingRule(input.serviceType, input.pricingTier);

  if (!rule) {
    const requestedTier = input.pricingTier ?? "standard";
    throw new Error(
      `No active pricing rule found for service type "${input.serviceType}" and tier "${requestedTier}".`,
    );
  }

  const baseFare = toMoney(toDbNumeric(rule.baseFare));
  const perMileRate = toDbNumeric(rule.perMileRate);
  const perMinuteRate = toDbNumeric(rule.perMinuteRate);
  const minimumFare = toDbNumeric(rule.minimumFare);
  const surgeMultiplier = toDbNumeric(rule.surgeMultiplier);

  const estimatedDistanceMiles = input.estimatedDistanceMiles ?? null;
  const estimatedDurationMinutes = input.estimatedDurationMinutes ?? null;

  const tolls = toMoney(input.tolls ?? 0);
  const gratuity = toMoney(input.gratuity ?? 0);
  const discount = toMoney(input.discount ?? 0);
  const taxRate = input.taxRate ?? DEFAULT_TAX_RATE;

  const distanceCharge = toMoney(
    perMileRate * (estimatedDistanceMiles === null ? 0 : estimatedDistanceMiles),
  );
  const timeCharge = toMoney(
    perMinuteRate * (estimatedDurationMinutes === null ? 0 : estimatedDurationMinutes),
  );

  const rawSubtotal = toMoney(baseFare + distanceCharge + timeCharge);
  const surgeCharge = toMoney(rawSubtotal * (surgeMultiplier - 1));

  let subtotal = toMoney(rawSubtotal + surgeCharge + tolls + gratuity - discount);
  subtotal = toMoney(Math.max(subtotal, minimumFare));

  const taxAmount = toMoney(subtotal * taxRate);
  const totalAmount = toMoney(subtotal + taxAmount);

  return {
    pricingRuleId: rule.id,
    baseFare,
    distanceCharge,
    timeCharge,
    surgeCharge,
    tolls,
    gratuity,
    discount,
    subtotal,
    taxRate,
    taxAmount,
    totalAmount,
    estimatedDistanceMiles,
    estimatedDurationMinutes,
    pricingTier: rule.pricingTier,
    currency: rule.currency,
  };
}

export async function createQuoteForRequest(
  requestId: string,
  input: Partial<QuoteCalculationInput> & { sendImmediately?: boolean },
): Promise<typeof aderoQuotes.$inferSelect> {
  const [request] = await db
    .select({
      id: aderoRequests.id,
      serviceType: aderoRequests.serviceType,
    })
    .from(aderoRequests)
    .where(eq(aderoRequests.id, requestId))
    .limit(1);

  if (!request) {
    throw new Error(`Request not found for id: ${requestId}`);
  }

  const calculationInput: QuoteCalculationInput = {
    serviceType: request.serviceType,
    estimatedDistanceMiles: input.estimatedDistanceMiles ?? null,
    estimatedDurationMinutes: input.estimatedDurationMinutes ?? null,
  };

  if (input.pricingTier !== undefined) calculationInput.pricingTier = input.pricingTier;
  if (input.tolls !== undefined) calculationInput.tolls = input.tolls;
  if (input.gratuity !== undefined) calculationInput.gratuity = input.gratuity;
  if (input.discount !== undefined) calculationInput.discount = input.discount;
  if (input.taxRate !== undefined) calculationInput.taxRate = input.taxRate;
  if (input.notes !== undefined) calculationInput.notes = input.notes;

  const calculation = await calculateQuote(calculationInput);

  const now = new Date();
  const sendImmediately = input.sendImmediately ?? false;
  const status = sendImmediately ? "sent" : "draft";
  const sentAt = sendImmediately ? now : null;
  const expiresAt = new Date(Date.now() + QUOTE_EXPIRY_HOURS * 60 * 60 * 1000);

  const [quote] = await db
    .insert(aderoQuotes)
    .values({
      requestId: request.id,
      pricingRuleId: calculation.pricingRuleId,
      status,
      baseFare: toNumericString(calculation.baseFare),
      distanceCharge: toNumericString(calculation.distanceCharge),
      timeCharge: toNumericString(calculation.timeCharge),
      surgeCharge: toNumericString(calculation.surgeCharge),
      tolls: toNumericString(calculation.tolls),
      gratuity: toNumericString(calculation.gratuity),
      discount: toNumericString(calculation.discount),
      subtotal: toNumericString(calculation.subtotal),
      taxRate: Number(calculation.taxRate).toFixed(4),
      taxAmount: toNumericString(calculation.taxAmount),
      totalAmount: toNumericString(calculation.totalAmount),
      currency: calculation.currency,
      estimatedDistanceMiles:
        calculation.estimatedDistanceMiles === null
          ? null
          : toNumericString(calculation.estimatedDistanceMiles),
      estimatedDurationMinutes: calculation.estimatedDurationMinutes,
      notes: input.notes ?? null,
      sentAt,
      expiresAt,
    })
    .returning();

  if (!quote) {
    throw new Error("Failed to create quote for request.");
  }

  return quote;
}

export async function approveQuote(
  quoteId: string,
): Promise<typeof aderoQuotes.$inferSelect> {
  const [quote] = await db
    .select({
      id: aderoQuotes.id,
      status: aderoQuotes.status,
    })
    .from(aderoQuotes)
    .where(eq(aderoQuotes.id, quoteId))
    .limit(1);

  if (!quote) {
    throw new Error(`Quote not found for id: ${quoteId}`);
  }

  if (quote.status !== "sent" && quote.status !== "draft") {
    throw new Error(`Cannot approve quote in status "${quote.status}".`);
  }

  const [updatedQuote] = await db
    .update(aderoQuotes)
    .set({
      status: "approved",
      approvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(aderoQuotes.id, quoteId))
    .returning();

  if (!updatedQuote) {
    throw new Error(`Failed to approve quote: ${quoteId}`);
  }

  return updatedQuote;
}

export async function rejectQuote(
  quoteId: string,
): Promise<typeof aderoQuotes.$inferSelect> {
  const [quote] = await db
    .select({
      id: aderoQuotes.id,
      status: aderoQuotes.status,
    })
    .from(aderoQuotes)
    .where(eq(aderoQuotes.id, quoteId))
    .limit(1);

  if (!quote) {
    throw new Error(`Quote not found for id: ${quoteId}`);
  }

  if (quote.status !== "sent" && quote.status !== "draft") {
    throw new Error(`Cannot reject quote in status "${quote.status}".`);
  }

  const [updatedQuote] = await db
    .update(aderoQuotes)
    .set({
      status: "rejected",
      rejectedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(aderoQuotes.id, quoteId))
    .returning();

  if (!updatedQuote) {
    throw new Error(`Failed to reject quote: ${quoteId}`);
  }

  return updatedQuote;
}

export function generateInvoiceNumber(): string {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const suffix = randomBytes(2).toString("hex");

  return `ADR-INV-${year}${month}${day}-${suffix}`;
}

export function calculatePlatformFee(
  invoiceTotal: number,
): { feePercent: number; feeAmount: number } {
  return {
    feePercent: PLATFORM_FEE_PERCENT,
    feeAmount: toMoney(invoiceTotal * PLATFORM_FEE_PERCENT),
  };
}
