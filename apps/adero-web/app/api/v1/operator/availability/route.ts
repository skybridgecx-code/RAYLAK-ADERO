import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { aderoOperatorAvailability, db } from "@raylak/db";
import { ADERO_OPERATOR_AVAILABILITY_STATUSES } from "@raylak/db/schema";
import { ApiAuthError, authenticateRequest } from "@/lib/api-auth";
import { apiError, apiSuccess, getErrorMessage } from "@/app/api/v1/_utils";

const BodySchema = z.object({
  status: z.enum(ADERO_OPERATOR_AVAILABILITY_STATUSES),
  serviceArea: z.string().trim().max(255).optional(),
});

export async function GET(_request: NextRequest) {
  try {
    const { user } = await authenticateRequest();
    if (user.role !== "operator" && user.role !== "admin") {
      return apiError("Forbidden", 403);
    }

    const [availability] = await db
      .select()
      .from(aderoOperatorAvailability)
      .where(eq(aderoOperatorAvailability.userId, user.id))
      .limit(1);

    return apiSuccess(
      availability ?? {
        userId: user.id,
        availabilityStatus: "offline",
        serviceArea: null,
      },
    );
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return apiError(error.message, error.status);
    }
    return apiError(getErrorMessage(error, "Failed to load availability."), 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { user } = await authenticateRequest();
    if (user.role !== "operator" && user.role !== "admin") {
      return apiError("Forbidden", 403);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("Invalid JSON body.", 400);
    }

    const parsedBody = BodySchema.safeParse(body);
    if (parsedBody.success === false) {
      return apiError("Invalid availability payload.", 400);
    }

    const now = new Date();
    const serviceArea = parsedBody.data.serviceArea?.trim() || null;
    const [updated] = await db
      .insert(aderoOperatorAvailability)
      .values({
        userId: user.id,
        availabilityStatus: parsedBody.data.status,
        serviceArea,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: aderoOperatorAvailability.userId,
        set: {
          availabilityStatus: parsedBody.data.status,
          serviceArea,
          updatedAt: now,
        },
      })
      .returning();

    if (updated === undefined) {
      return apiError("Failed to update availability.", 500);
    }

    return apiSuccess(updated);
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return apiError(error.message, error.status);
    }
    return apiError(getErrorMessage(error, "Failed to update availability."), 500);
  }
}
