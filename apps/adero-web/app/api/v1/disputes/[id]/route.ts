import type { NextRequest } from "next/server";
import { z } from "zod";
import { ApiAuthError, authenticateRequest } from "@/lib/api-auth";
import { getDisputeById, getDisputeMessages } from "@/lib/disputes";
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
      return apiError("Invalid dispute id.", 400);
    }

    const { user } = await authenticateRequest();
    const dispute = await getDisputeById(parsedParams.data.id);

    if (dispute === null) {
      return apiError("Dispute not found.", 404);
    }

    const canView =
      user.role === "admin"
      || dispute.filedByUserId === user.id
      || dispute.filedAgainstUserId === user.id;

    if (canView === false) {
      return apiError("Forbidden", 403);
    }

    const messages = await getDisputeMessages(dispute.id);
    return apiSuccess({ dispute, messages });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return apiError(error.message, error.status);
    }
    return apiError(getErrorMessage(error, "Failed to load dispute."), 500);
  }
}
