import "server-only";

import { asc, desc, eq, or } from "drizzle-orm";
import { db, aderoDisputes, aderoDisputeMessages, aderoRequests, aderoTrips } from "@raylak/db";
import { ADERO_DISPUTE_STATUS_LABELS, ADERO_DISPUTE_STATUS_TRANSITIONS } from "@raylak/shared";
import {
  createDisputeSchema,
  createDisputeMessageSchema,
  updateDisputeStatusSchema,
  type CreateDisputeInput,
  type CreateDisputeMessageInput,
  type UpdateDisputeStatusInput,
} from "@/lib/validators";
import { createNotification } from "@/lib/notifications";

function getOtherParticipantId(dispute: {
  filedByUserId: string;
  filedAgainstUserId: string | null;
}, senderUserId: string | null): string | null {
  if (!senderUserId) return null;
  if (senderUserId === dispute.filedByUserId) {
    return dispute.filedAgainstUserId;
  }
  return dispute.filedByUserId;
}

function isValidDisputeTransition(currentStatus: string, nextStatus: string): boolean {
  const allowed = ADERO_DISPUTE_STATUS_TRANSITIONS[currentStatus as keyof typeof ADERO_DISPUTE_STATUS_TRANSITIONS] ?? [];
  return allowed.includes(nextStatus as never);
}

export async function createDispute(filedByUserId: string, input: CreateDisputeInput) {
  const parsed = createDisputeSchema.parse(input);

  const [trip] = await db
    .select({
      id: aderoTrips.id,
      requestId: aderoTrips.requestId,
      operatorId: aderoTrips.operatorId,
      requesterId: aderoRequests.requesterId,
    })
    .from(aderoTrips)
    .innerJoin(aderoRequests, eq(aderoTrips.requestId, aderoRequests.id))
    .where(eq(aderoTrips.id, parsed.tripId))
    .limit(1);

  if (!trip) {
    throw new Error("Trip not found.");
  }

  let filedAgainstUserId = parsed.filedAgainstUserId ?? null;

  if (!filedAgainstUserId) {
    if (filedByUserId === trip.requesterId) {
      filedAgainstUserId = trip.operatorId;
    } else if (filedByUserId === trip.operatorId) {
      filedAgainstUserId = trip.requesterId;
    }
  }

  if (filedAgainstUserId && filedAgainstUserId === filedByUserId) {
    throw new Error("You cannot file a dispute against yourself.");
  }

  if (
    filedAgainstUserId
    && filedAgainstUserId !== trip.requesterId
    && filedAgainstUserId !== trip.operatorId
  ) {
    throw new Error("Filed-against user must be part of the trip.");
  }

  const [dispute] = await db
    .insert(aderoDisputes)
    .values({
      tripId: parsed.tripId,
      requestId: trip.requestId,
      filedByUserId,
      filedAgainstUserId,
      category: parsed.category,
      priority: parsed.priority ?? "medium",
      subject: parsed.subject,
      description: parsed.description,
      status: "open",
      updatedAt: new Date(),
    })
    .returning();

  if (!dispute) {
    throw new Error("Failed to create dispute.");
  }

  if (filedAgainstUserId) {
    try {
      await createNotification(
        filedAgainstUserId,
        "dispute_filed" as never,
        "Dispute filed",
        `A dispute has been filed regarding trip #${parsed.tripId.slice(0, 8)}.`,
        {
          disputeId: dispute.id,
          tripId: parsed.tripId,
          category: parsed.category,
        },
      );
    } catch (error) {
      console.error("[adero/disputes] filed-against notification failed:", error);
    }
  }

  return dispute;
}

export async function getDisputesForUser(userId: string) {
  return db
    .select()
    .from(aderoDisputes)
    .where(
      or(
        eq(aderoDisputes.filedByUserId, userId),
        eq(aderoDisputes.filedAgainstUserId, userId),
      ),
    )
    .orderBy(desc(aderoDisputes.createdAt));
}

export async function getDisputeById(id: string) {
  const [dispute] = await db
    .select()
    .from(aderoDisputes)
    .where(eq(aderoDisputes.id, id))
    .limit(1);

  return dispute ?? null;
}

export async function updateDisputeStatus(
  disputeId: string,
  actorId: string,
  input: UpdateDisputeStatusInput,
) {
  const parsed = updateDisputeStatusSchema.parse({
    disputeId,
    status: input.status,
    resolution: input.resolution,
  });

  const [current] = await db
    .select()
    .from(aderoDisputes)
    .where(eq(aderoDisputes.id, parsed.disputeId))
    .limit(1);

  if (!current) {
    throw new Error("Dispute not found.");
  }

  if (!isValidDisputeTransition(current.status, parsed.status)) {
    throw new Error(`Invalid dispute status transition: ${current.status} -> ${parsed.status}`);
  }

  const now = new Date();
  const shouldResolve = parsed.status === "resolved" || parsed.status === "dismissed";

  const [updated] = await db
    .update(aderoDisputes)
    .set({
      status: parsed.status,
      resolution: parsed.resolution ?? current.resolution,
      resolvedByUserId: shouldResolve ? actorId : current.resolvedByUserId,
      resolvedAt: shouldResolve ? now : current.resolvedAt,
      updatedAt: now,
    })
    .where(eq(aderoDisputes.id, parsed.disputeId))
    .returning();

  if (!updated) {
    throw new Error("Failed to update dispute.");
  }

  try {
    const statusLabel = ADERO_DISPUTE_STATUS_LABELS[parsed.status as keyof typeof ADERO_DISPUTE_STATUS_LABELS] ?? parsed.status;
    await createNotification(
      updated.filedByUserId,
      "dispute_status_updated" as never,
      "Dispute updated",
      `Your dispute is now ${statusLabel}.`,
      {
        disputeId: updated.id,
        status: parsed.status,
      },
    );
  } catch (error) {
    console.error("[adero/disputes] status notification failed:", error);
  }

  return updated;
}

export async function addDisputeMessage(
  senderUserId: string | null,
  senderRole: string,
  input: CreateDisputeMessageInput,
) {
  const parsed = createDisputeMessageSchema.parse(input);

  const [dispute] = await db
    .select({
      id: aderoDisputes.id,
      filedByUserId: aderoDisputes.filedByUserId,
      filedAgainstUserId: aderoDisputes.filedAgainstUserId,
    })
    .from(aderoDisputes)
    .where(eq(aderoDisputes.id, parsed.disputeId))
    .limit(1);

  if (!dispute) {
    throw new Error("Dispute not found.");
  }

  const [message] = await db
    .insert(aderoDisputeMessages)
    .values({
      disputeId: parsed.disputeId,
      senderUserId,
      senderRole,
      message: parsed.message,
      attachmentUrl: parsed.attachmentUrl ?? null,
    })
    .returning();

  if (!message) {
    throw new Error("Failed to add dispute message.");
  }

  const recipients = new Set<string>();
  const recipient = getOtherParticipantId(dispute, senderUserId);
  if (recipient) {
    recipients.add(recipient);
  } else {
    recipients.add(dispute.filedByUserId);
    if (dispute.filedAgainstUserId) {
      recipients.add(dispute.filedAgainstUserId);
    }
  }

  if (senderUserId) {
    recipients.delete(senderUserId);
  }

  for (const userId of recipients) {
    try {
      await createNotification(
        userId,
        "dispute_message" as never,
        "New dispute message",
        "A new message was added to your dispute thread.",
        {
          disputeId: parsed.disputeId,
          messageId: message.id,
          senderRole,
        },
      );
    } catch (error) {
      console.error("[adero/disputes] message notification failed:", error);
    }
  }

  return message;
}

export async function getDisputeMessages(disputeId: string) {
  return db
    .select()
    .from(aderoDisputeMessages)
    .where(eq(aderoDisputeMessages.disputeId, disputeId))
    .orderBy(asc(aderoDisputeMessages.createdAt));
}
