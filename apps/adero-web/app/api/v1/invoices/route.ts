import { desc } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { aderoInvoices, db } from "@raylak/db";
import { ApiAuthError, authenticateRequest } from "@/lib/api-auth";
import { getInvoicesForUser } from "@/lib/invoicing";
import { apiError, apiSuccess, getErrorMessage } from "@/app/api/v1/_utils";

export async function GET(_request: NextRequest) {
  try {
    const { user } = await authenticateRequest();

    if (user.role === "admin") {
      const invoices = await db
        .select()
        .from(aderoInvoices)
        .orderBy(desc(aderoInvoices.createdAt));
      return apiSuccess(invoices);
    }

    if (user.role === "requester" || user.role === "company") {
      const invoices = await getInvoicesForUser(user.id, "requester");
      return apiSuccess(invoices);
    }

    if (user.role === "operator") {
      const invoices = await getInvoicesForUser(user.id, "operator");
      return apiSuccess(invoices);
    }

    return apiSuccess([]);
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return apiError(error.message, error.status);
    }
    return apiError(getErrorMessage(error, "Failed to load invoices."), 500);
  }
}
