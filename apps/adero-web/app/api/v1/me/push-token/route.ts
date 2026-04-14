import type { NextRequest } from "next/server";
import { z } from "zod";
import { ApiAuthError, authenticateRequest } from "@/lib/api-auth";
import { apiError, apiSuccess, getErrorMessage } from "@/app/api/v1/_utils";

const BodySchema = z.object({
  expoPushToken: z.string().trim().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const { user } = await authenticateRequest();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("Invalid JSON body.", 400);
    }

    const parsed = BodySchema.safeParse(body);
    if (parsed.success === false) {
      return apiError("Invalid push token payload.", 400);
    }

    console.info("[adero/api/v1/me/push-token] registered expo push token", {
      userId: user.id,
      expoPushToken: parsed.data.expoPushToken,
    });

    return apiSuccess({ success: true });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return apiError(error.message, error.status);
    }
    return apiError(getErrorMessage(error, "Failed to save push token."), 500);
  }
}

export async function DELETE(_request: NextRequest) {
  try {
    const { user } = await authenticateRequest();

    console.info("[adero/api/v1/me/push-token] removed expo push token", {
      userId: user.id,
    });

    return apiSuccess({ success: true });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return apiError(error.message, error.status);
    }
    return apiError(getErrorMessage(error, "Failed to remove push token."), 500);
  }
}
