import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { aderoNotifications, db } from "@raylak/db";
import { ApiAuthError, authenticateRequest } from "@/lib/api-auth";
import { apiError, apiSuccess, getErrorMessage } from "@/app/api/v1/_utils";

const MarkReadSchema = z.object({
  notificationIds: z.array(z.string().uuid()).min(1),
});

export async function GET(request: NextRequest) {
  try {
    const { user } = await authenticateRequest();
    const unread = request.nextUrl.searchParams.get("unread");

    const notifications = await db
      .select()
      .from(aderoNotifications)
      .where(
        unread === "true"
          ? and(
              eq(aderoNotifications.userId, user.id),
              isNull(aderoNotifications.readAt),
            )
          : eq(aderoNotifications.userId, user.id),
      )
      .orderBy(desc(aderoNotifications.createdAt));

    return apiSuccess(notifications);
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return apiError(error.message, error.status);
    }
    return apiError(getErrorMessage(error, "Failed to load notifications."), 500);
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

    const parsed = MarkReadSchema.safeParse(body);
    if (parsed.success === false) {
      return apiError("Invalid notification payload.", 400);
    }

    const updatedRows = await db
      .update(aderoNotifications)
      .set({
        readAt: new Date(),
      })
      .where(
        and(
          eq(aderoNotifications.userId, user.id),
          inArray(aderoNotifications.id, parsed.data.notificationIds),
          isNull(aderoNotifications.readAt),
        ),
      )
      .returning({ id: aderoNotifications.id });

    return apiSuccess({
      markedCount: updatedRows.length,
      notificationIds: updatedRows.map((row) => row.id),
    });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return apiError(error.message, error.status);
    }
    return apiError(getErrorMessage(error, "Failed to update notifications."), 500);
  }
}
