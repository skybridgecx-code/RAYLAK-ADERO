import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { aderoRequests, db } from "@raylak/db";
import { ApiAuthError, authenticateRequest } from "@/lib/api-auth";
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
    if (!parsedParams.success) {
      return apiError("Invalid request id.", 400);
    }

    const { user } = await authenticateRequest();

    const [requestRow] = await db
      .select()
      .from(aderoRequests)
      .where(eq(aderoRequests.id, parsedParams.data.id))
      .limit(1);

    if (!requestRow) {
      return apiError("Request not found.", 404);
    }

    const canView = user.role === "admin" || requestRow.requesterId === user.id;
    if (!canView) {
      return apiError("Forbidden", 403);
    }

    return apiSuccess(requestRow);
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return apiError(error.message, error.status);
    }
    return apiError(getErrorMessage(error, "Failed to load request."), 500);
  }
}
