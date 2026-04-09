import "server-only";

import { desc, eq } from "drizzle-orm";
import { db, aderoIncidents, aderoUsers } from "@raylak/db";
import { ADERO_INCIDENT_STATUS_LABELS, ADERO_INCIDENT_STATUS_TRANSITIONS } from "@raylak/shared";
import {
  createIncidentSchema,
  updateIncidentStatusSchema,
  type CreateIncidentInput,
  type UpdateIncidentStatusInput,
} from "@/lib/validators";
import { createNotification } from "@/lib/notifications";

function isValidIncidentTransition(currentStatus: string, nextStatus: string): boolean {
  const allowed = ADERO_INCIDENT_STATUS_TRANSITIONS[currentStatus as keyof typeof ADERO_INCIDENT_STATUS_TRANSITIONS] ?? [];
  return allowed.includes(nextStatus as never);
}

export async function createIncident(reportedByUserId: string, input: CreateIncidentInput) {
  const parsed = createIncidentSchema.parse(input);

  const [incident] = await db
    .insert(aderoIncidents)
    .values({
      tripId: parsed.tripId ?? null,
      reportedByUserId,
      severity: parsed.severity,
      category: parsed.category,
      status: "reported",
      title: parsed.title,
      description: parsed.description,
      location: parsed.location ?? null,
      latitude: parsed.latitude?.toFixed(7),
      longitude: parsed.longitude?.toFixed(7),
      updatedAt: new Date(),
    })
    .returning();

  if (!incident) {
    throw new Error("Failed to create incident.");
  }

  try {
    const admins = await db
      .select({ id: aderoUsers.id })
      .from(aderoUsers)
      .where(eq(aderoUsers.role, "admin"));

    if (admins.length === 0) {
      console.info("[adero/incidents] no admins found for incident notification");
    }

    for (const admin of admins) {
      await createNotification(
        admin.id,
        "incident_reported" as never,
        "Incident reported",
        `A new ${parsed.severity} incident was reported: ${parsed.title}`,
        {
          incidentId: incident.id,
          category: parsed.category,
          severity: parsed.severity,
        },
      );
    }
  } catch (error) {
    console.error("[adero/incidents] admin notification failed:", error);
  }

  return incident;
}

export async function getIncidentsForUser(userId: string) {
  return db
    .select()
    .from(aderoIncidents)
    .where(eq(aderoIncidents.reportedByUserId, userId))
    .orderBy(desc(aderoIncidents.createdAt));
}

export async function getIncidentById(id: string) {
  const [incident] = await db
    .select()
    .from(aderoIncidents)
    .where(eq(aderoIncidents.id, id))
    .limit(1);

  return incident ?? null;
}

export async function updateIncidentStatus(
  incidentId: string,
  actorId: string,
  input: UpdateIncidentStatusInput,
) {
  const parsed = updateIncidentStatusSchema.parse({
    incidentId,
    status: input.status,
    adminNotes: input.adminNotes,
  });

  const [current] = await db
    .select()
    .from(aderoIncidents)
    .where(eq(aderoIncidents.id, parsed.incidentId))
    .limit(1);

  if (!current) {
    throw new Error("Incident not found.");
  }

  if (!isValidIncidentTransition(current.status, parsed.status)) {
    throw new Error(`Invalid incident status transition: ${current.status} -> ${parsed.status}`);
  }

  const now = new Date();
  const shouldResolve = parsed.status === "action_taken" || parsed.status === "closed";

  const [updated] = await db
    .update(aderoIncidents)
    .set({
      status: parsed.status,
      adminNotes: parsed.adminNotes ?? current.adminNotes,
      resolvedByUserId: shouldResolve ? actorId : current.resolvedByUserId,
      resolvedAt: shouldResolve ? now : current.resolvedAt,
      updatedAt: now,
    })
    .where(eq(aderoIncidents.id, parsed.incidentId))
    .returning();

  if (!updated) {
    throw new Error("Failed to update incident.");
  }

  try {
    const label = ADERO_INCIDENT_STATUS_LABELS[parsed.status as keyof typeof ADERO_INCIDENT_STATUS_LABELS] ?? parsed.status;
    await createNotification(
      updated.reportedByUserId,
      "incident_status_updated" as never,
      "Incident updated",
      `Your incident is now ${label}.`,
      {
        incidentId: updated.id,
        status: parsed.status,
      },
    );
  } catch (error) {
    console.error("[adero/incidents] status notification failed:", error);
  }

  return updated;
}
