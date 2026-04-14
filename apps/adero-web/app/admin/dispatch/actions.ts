"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  db,
  aderoOperatorAvailability,
  aderoRequestOffers,
  aderoRequests,
  aderoUsers,
} from "@raylak/db";
import { requireAderoRole } from "@/lib/auth";
import { dispatchRequest } from "@/lib/dispatch";
import {
  notifyOfferReceived,
  notifyRequestMatched,
} from "@/lib/notifications";

const DispatchRequestSchema = z.object({
  requestId: z.string().uuid(),
});

const ManualOfferSchema = z.object({
  requestId: z.string().uuid(),
  operatorId: z.string().uuid(),
});

function noticeUrl(message: string, type: "success" | "info" | "error"): string {
  const params = new URLSearchParams();
  params.set("notice", message);
  params.set("noticeType", type);
  return `/admin/dispatch?${params.toString()}`;
}

function revalidateDispatchSurfaces() {
  revalidatePath("/admin/dispatch");
  revalidatePath("/app/operator");
  revalidatePath("/app/requester");
}

export async function triggerRequestDispatch(formData: FormData): Promise<void> {
  try {
    await requireAderoRole(["admin"]);
  } catch {
    redirect(noticeUrl("Admin access required.", "error"));
  }

  const parsed = DispatchRequestSchema.safeParse({
    requestId: formData.get("requestId"),
  });

  if (!parsed.success) {
    redirect(noticeUrl("Invalid dispatch request payload.", "error"));
  }

  try {
    const offersCreated = await dispatchRequest(parsed.data.requestId);
    revalidateDispatchSurfaces();

    if (offersCreated > 0) {
      redirect(
        noticeUrl(`Dispatch succeeded. ${offersCreated} offer(s) created.`, "success"),
      );
    }

    redirect(
      noticeUrl(
        "No eligible available operators were found. Request remains submitted or matched.",
        "info",
      ),
    );
  } catch (error) {
    console.error("[adero] triggerRequestDispatch failed:", error);
    redirect(noticeUrl("Dispatch failed. Please retry.", "error"));
  }
}

export async function createManualOffer(formData: FormData): Promise<void> {
  try {
    await requireAderoRole(["admin"]);
  } catch {
    redirect(noticeUrl("Admin access required.", "error"));
  }

  const parsed = ManualOfferSchema.safeParse({
    requestId: formData.get("requestId"),
    operatorId: formData.get("operatorId"),
  });

  if (!parsed.success) {
    redirect(noticeUrl("Invalid manual offer payload.", "error"));
  }

  const { requestId, operatorId } = parsed.data;
  const now = new Date();
  let requesterUserId: string | null = null;
  let shouldNotifyMatched = false;

  try {
    await db.transaction(async (tx) => {
      const [request] = await tx
        .select({
          id: aderoRequests.id,
          requesterId: aderoRequests.requesterId,
          status: aderoRequests.status,
        })
        .from(aderoRequests)
        .where(eq(aderoRequests.id, requestId))
        .limit(1);

      if (!request) {
        throw new Error("Request not found.");
      }

      if (request.status !== "submitted" && request.status !== "matched") {
        throw new Error(`Request is ${request.status} and cannot be dispatched.`);
      }

      requesterUserId = request.requesterId;
      shouldNotifyMatched = request.status === "submitted";

      const [operator] = await tx
        .select({
          id: aderoUsers.id,
          role: aderoUsers.role,
          availabilityStatus: aderoOperatorAvailability.availabilityStatus,
        })
        .from(aderoUsers)
        .innerJoin(
          aderoOperatorAvailability,
          eq(aderoOperatorAvailability.userId, aderoUsers.id),
        )
        .where(eq(aderoUsers.id, operatorId))
        .limit(1);

      if (!operator || operator.role !== "operator") {
        throw new Error("Operator not found.");
      }

      if (operator.availabilityStatus !== "available") {
        throw new Error("Operator is not currently available.");
      }

      const [existingOffer] = await tx
        .select({ id: aderoRequestOffers.id })
        .from(aderoRequestOffers)
        .where(
          and(
            eq(aderoRequestOffers.requestId, request.id),
            eq(aderoRequestOffers.operatorId, operator.id),
          ),
        )
        .limit(1);

      if (existingOffer) {
        throw new Error("An offer already exists for this operator on the request.");
      }

      await tx.insert(aderoRequestOffers).values({
        requestId: request.id,
        operatorId: operator.id,
        status: "pending",
        offeredAt: now,
        createdAt: now,
      });

      if (request.status === "submitted") {
        await tx
          .update(aderoRequests)
          .set({
            status: "matched",
            updatedAt: now,
          })
          .where(
            and(
              eq(aderoRequests.id, request.id),
              eq(aderoRequests.status, "submitted"),
            ),
          );
      }
    });

    try {
      await notifyOfferReceived(operatorId, requestId);
      if (requesterUserId && shouldNotifyMatched) {
        await notifyRequestMatched(requesterUserId, requestId, 1);
      }
    } catch (notificationError) {
      console.error("[adero] createManualOffer notifications failed:", notificationError);
    }

    revalidateDispatchSurfaces();
    redirect(noticeUrl("Manual offer created.", "success"));
  } catch (error) {
    console.error("[adero] createManualOffer failed:", error);
    const message =
      error instanceof Error && error.message.trim().length > 0
        ? error.message
        : "Manual offer creation failed.";
    redirect(noticeUrl(message, "error"));
  }
}
