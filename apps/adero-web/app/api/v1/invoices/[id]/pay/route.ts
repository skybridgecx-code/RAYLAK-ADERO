import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { aderoInvoices, db } from "@raylak/db";
import { ApiAuthError, authenticateRequest } from "@/lib/api-auth";
import { createPaymentForInvoice, getPaymentClientSecret } from "@/lib/stripe";
import { apiError, apiSuccess, getErrorMessage } from "@/app/api/v1/_utils";

const ParamsSchema = z.object({
  id: z.string().uuid(),
});

export async function POST(
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

    const [invoice] = await db
      .select({
        id: aderoInvoices.id,
        requesterId: aderoInvoices.requesterId,
      })
      .from(aderoInvoices)
      .where(eq(aderoInvoices.id, parsedParams.data.id))
      .limit(1);

    if (invoice === undefined) {
      return apiError("Invoice not found.", 404);
    }

    const canPay = user.role === "admin" || invoice.requesterId === user.id;
    if (canPay === false) {
      return apiError("Forbidden", 403);
    }

    const payment = await createPaymentForInvoice(invoice.id);
    const clientSecret = await getPaymentClientSecret(payment.id);

    return apiSuccess(
      {
        paymentId: payment.id,
        clientSecret,
      },
      201,
    );
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return apiError(error.message, error.status);
    }
    const message = getErrorMessage(error, "Failed to initiate payment.");
    if (
      message.includes("not found")
      || message.includes("not payable")
      || message.includes("in progress")
      || message.includes("zero-amount")
    ) {
      return apiError(message, 400);
    }
    return apiError(message, 500);
  }
}
