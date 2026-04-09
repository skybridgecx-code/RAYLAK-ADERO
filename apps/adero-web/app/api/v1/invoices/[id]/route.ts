import { desc, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  aderoInvoices,
  aderoPayments,
  aderoPlatformFees,
  aderoQuotes,
  aderoTrips,
  db,
} from "@raylak/db";
import { ApiAuthError, authenticateRequest } from "@/lib/api-auth";
import { getPaymentSummaryForInvoice } from "@/lib/payment-lifecycle";
import { apiError, apiSuccess, getErrorMessage } from "@/app/api/v1/_utils";

const ParamsSchema = z.object({
  id: z.string().uuid(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const routeParams = await params;
    const parsedParams = ParamsSchema.safeParse(routeParams);
    if (parsedParams.success === false) {
      return apiError("Invalid invoice id.", 400);
    }

    const { user } = await authenticateRequest();
    const invoiceId = parsedParams.data.id;

    const [invoice] = await db
      .select()
      .from(aderoInvoices)
      .where(eq(aderoInvoices.id, invoiceId))
      .limit(1);

    if (invoice === undefined) {
      return apiError("Invoice not found.", 404);
    }

    const isOwner =
      user.role === "admin"
      || invoice.requesterId === user.id
      || invoice.operatorId === user.id;

    if (isOwner === false) {
      return apiError("Forbidden", 403);
    }

    const [quote, trip, platformFee, payments, paymentSummary] = await Promise.all([
      invoice.quoteId
        ? db
            .select()
            .from(aderoQuotes)
            .where(eq(aderoQuotes.id, invoice.quoteId))
            .limit(1)
            .then((rows) => rows[0] ?? null)
        : Promise.resolve(null),
      db
        .select()
        .from(aderoTrips)
        .where(eq(aderoTrips.id, invoice.tripId))
        .limit(1)
        .then((rows) => rows[0] ?? null),
      db
        .select()
        .from(aderoPlatformFees)
        .where(eq(aderoPlatformFees.invoiceId, invoice.id))
        .orderBy(desc(aderoPlatformFees.createdAt))
        .limit(1)
        .then((rows) => rows[0] ?? null),
      db
        .select()
        .from(aderoPayments)
        .where(eq(aderoPayments.invoiceId, invoice.id))
        .orderBy(desc(aderoPayments.createdAt)),
      getPaymentSummaryForInvoice(invoice.id),
    ]);

    return apiSuccess({
      invoice,
      quote,
      trip,
      platformFee,
      payments,
      paymentSummary,
    });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return apiError(error.message, error.status);
    }
    return apiError(getErrorMessage(error, "Failed to load invoice."), 500);
  }
}
