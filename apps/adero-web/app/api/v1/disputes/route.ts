import type { NextRequest } from "next/server";
import { ApiAuthError, authenticateRequest } from "@/lib/api-auth";
import { createDispute, getDisputesForUser } from "@/lib/disputes";
import { createDisputeSchema } from "@/lib/validators";
import { apiError, apiSuccess, getErrorMessage } from "@/app/api/v1/_utils";

export async function GET(_request: NextRequest) {
  try {
    const { user } = await authenticateRequest();
    const disputes = await getDisputesForUser(user.id);
    return apiSuccess(disputes);
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return apiError(error.message, error.status);
    }
    return apiError(getErrorMessage(error, "Failed to load disputes."), 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await authenticateRequest();
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("Invalid JSON body.", 400);
    }

    const parsed = createDisputeSchema.safeParse(body);
    if (parsed.success === false) {
      return apiError("Invalid dispute payload.", 400);
    }

    const dispute = await createDispute(user.id, parsed.data);
    return apiSuccess(dispute, 201);
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return apiError(error.message, error.status);
    }
    return apiError(getErrorMessage(error, "Failed to file dispute."), 500);
  }
}
