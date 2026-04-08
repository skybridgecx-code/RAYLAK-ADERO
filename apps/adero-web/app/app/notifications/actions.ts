"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, aderoNotifications } from "@raylak/db";
import { requireAderoUser } from "@/lib/auth";

export async function markNotificationRead(formData: FormData): Promise<void> {
  const aderoUser = await requireAderoUser();
  const notificationId = formData.get("notificationId");

  if (typeof notificationId !== "string" || notificationId.trim().length === 0) {
    return;
  }

  await db
    .update(aderoNotifications)
    .set({
      readAt: new Date(),
    })
    .where(
      and(
        eq(aderoNotifications.id, notificationId),
        eq(aderoNotifications.userId, aderoUser.id),
        isNull(aderoNotifications.readAt),
      ),
    );

  revalidatePath("/app/notifications");
  revalidatePath("/app");
}
