import type { NextRequest } from "next/server";
import { getTrustScore } from "@/lib/trust-score";
import { ApiAuthError, authenticateRequest } from "@/lib/api-auth";
import { apiError, apiSuccess, getErrorMessage } from "@/app/api/v1/_utils";

export async function GET(_request: NextRequest) {
  try {
    const { user } = await authenticateRequest();
    const trustScore = await getTrustScore(user.id);
    return apiSuccess({ user, trustScore });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return apiError(error.message, error.status);
    }
    return apiError(getErrorMessage(error, "Failed to load profile."), 500);
  }
}
