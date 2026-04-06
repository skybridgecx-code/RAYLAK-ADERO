"use server";

import {
  aderoAuditLogs,
  aderoCompanyApplications,
  aderoCompanyProfiles,
  aderoOperatorApplications,
  aderoOperatorProfiles,
  db,
  type AderoCompanyApplication,
  type AderoOperatorApplication,
} from "@raylak/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { APPLICATION_STATUSES } from "~/lib/validators";
import { z } from "zod";

// ─── Update status ────────────────────────────────────────────────────────────

const UpdateStatusInput = z.object({
  type: z.enum(["company", "operator"]),
  id: z.string().uuid(),
  status: z.enum(APPLICATION_STATUSES),
  reviewerName: z.string().optional(),
});

function buildOperatorServiceNotes(app: AderoOperatorApplication) {
  const notes = [];

  if (app.currentAffiliations) {
    notes.push(`Current affiliations: ${app.currentAffiliations}`);
  }

  if (app.bio) {
    notes.push(app.bio);
  }

  return notes.length > 0 ? notes.join("\n\n") : null;
}

function actorOrSystem(actorName: string | null) {
  return actorName || "Adero admin";
}

function applicationStatusSummary(fromStatus: string, toStatus: string) {
  return fromStatus === toStatus
    ? `Application status saved as ${toStatus}.`
    : `Application status changed from ${fromStatus} to ${toStatus}.`;
}

async function updateCompanyStatus({
  id,
  status,
  reviewedBy,
  now,
}: {
  id: string;
  status: (typeof APPLICATION_STATUSES)[number];
  reviewedBy: string | null;
  now: Date;
}) {
  await db.transaction(async (tx) => {
    const [app] = await tx
      .select()
      .from(aderoCompanyApplications)
      .where(eq(aderoCompanyApplications.id, id));

    if (!app) {
      throw new Error("Company application not found.");
    }

    if (status !== "activated") {
      await tx
        .update(aderoCompanyApplications)
        .set({ status, reviewedAt: now, updatedAt: now, reviewedBy })
        .where(eq(aderoCompanyApplications.id, id));

      await tx.insert(aderoAuditLogs).values({
        entityType: "company_application",
        entityId: app.id,
        applicationId: app.id,
        companyApplicationId: app.id,
        action: "application_status_changed",
        actorName: actorOrSystem(reviewedBy),
        summary: applicationStatusSummary(app.status, status),
        details: reviewedBy ? `Reviewer: ${reviewedBy}` : null,
        createdAt: now,
      });

      return;
    }

    const activatedAt = app.activatedAt ?? now;
    const profileValues = {
      applicationId: app.id,
      companyName: app.companyName,
      serviceArea: app.serviceMarkets,
      contactName: `${app.contactFirstName} ${app.contactLastName}`,
      email: app.email,
      phone: app.phone,
      website: app.website,
      fleetSize: app.fleetSize,
      serviceNotes: app.overflowNeeds,
      activationStatus: "active",
      activatedAt,
      updatedAt: now,
    };

    await tx
      .update(aderoCompanyApplications)
      .set({ status, reviewedAt: now, updatedAt: now, reviewedBy, activatedAt })
      .where(eq(aderoCompanyApplications.id, id));

    const [profile] = await tx
      .insert(aderoCompanyProfiles)
      .values(profileValues)
      .onConflictDoUpdate({
        target: aderoCompanyProfiles.applicationId,
        set: profileValues,
      })
      .returning({ id: aderoCompanyProfiles.id });

    await tx.insert(aderoAuditLogs).values({
      entityType: "company_application",
      entityId: app.id,
      applicationId: app.id,
      companyApplicationId: app.id,
      companyProfileId: profile?.id ?? null,
      action: "application_activated",
      actorName: actorOrSystem(reviewedBy),
      summary:
        app.status === "activated"
          ? "Company application activation refreshed."
          : `Company application activated from ${app.status}.`,
      details: profile?.id ? `Company profile: ${profile.id}` : null,
      createdAt: now,
    });
  });
}

async function updateOperatorStatus({
  id,
  status,
  reviewedBy,
  now,
}: {
  id: string;
  status: (typeof APPLICATION_STATUSES)[number];
  reviewedBy: string | null;
  now: Date;
}) {
  await db.transaction(async (tx) => {
    const [app] = await tx
      .select()
      .from(aderoOperatorApplications)
      .where(eq(aderoOperatorApplications.id, id));

    if (!app) {
      throw new Error("Operator application not found.");
    }

    if (status !== "activated") {
      await tx
        .update(aderoOperatorApplications)
        .set({ status, reviewedAt: now, updatedAt: now, reviewedBy })
        .where(eq(aderoOperatorApplications.id, id));

      await tx.insert(aderoAuditLogs).values({
        entityType: "operator_application",
        entityId: app.id,
        applicationId: app.id,
        operatorApplicationId: app.id,
        action: "application_status_changed",
        actorName: actorOrSystem(reviewedBy),
        summary: applicationStatusSummary(app.status, status),
        details: reviewedBy ? `Reviewer: ${reviewedBy}` : null,
        createdAt: now,
      });

      return;
    }

    const activatedAt = app.activatedAt ?? now;
    const profileValues = {
      applicationId: app.id,
      fullName: `${app.firstName} ${app.lastName}`,
      city: app.city,
      state: app.state,
      email: app.email,
      phone: app.phone,
      vehicleType: app.vehicleType,
      vehicleYear: app.vehicleYear,
      yearsExperience: app.yearsExperience,
      serviceNotes: buildOperatorServiceNotes(app),
      activationStatus: "active",
      activatedAt,
      updatedAt: now,
    };

    await tx
      .update(aderoOperatorApplications)
      .set({ status, reviewedAt: now, updatedAt: now, reviewedBy, activatedAt })
      .where(eq(aderoOperatorApplications.id, id));

    const [profile] = await tx
      .insert(aderoOperatorProfiles)
      .values(profileValues)
      .onConflictDoUpdate({
        target: aderoOperatorProfiles.applicationId,
        set: profileValues,
      })
      .returning({ id: aderoOperatorProfiles.id });

    await tx.insert(aderoAuditLogs).values({
      entityType: "operator_application",
      entityId: app.id,
      applicationId: app.id,
      operatorApplicationId: app.id,
      operatorProfileId: profile?.id ?? null,
      action: "application_activated",
      actorName: actorOrSystem(reviewedBy),
      summary:
        app.status === "activated"
          ? "Operator application activation refreshed."
          : `Operator application activated from ${app.status}.`,
      details: profile?.id ? `Operator profile: ${profile.id}` : null,
      createdAt: now,
    });
  });
}

export async function updateApplicationStatus(
  _prev: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const result = UpdateStatusInput.safeParse({
    type: formData.get("type"),
    id: formData.get("id"),
    status: formData.get("status"),
    reviewerName: formData.get("reviewerName") ?? undefined,
  });

  if (!result.success) {
    return { error: "Invalid input." };
  }

  const { type, id, status, reviewerName } = result.data;
  const now = new Date();
  const reviewedBy = reviewerName?.trim() || null;

  try {
    if (type === "company") {
      await updateCompanyStatus({ id, status, reviewedBy, now });
    } else {
      await updateOperatorStatus({ id, status, reviewedBy, now });
    }
  } catch (err) {
    console.error("[adero] updateApplicationStatus failed:", err);
    return { error: "Update failed. Please try again." };
  }

  revalidatePath(`/admin/${type}/${id}`);
  revalidatePath("/admin");
  revalidatePath("/admin/profiles");
  revalidatePath("/admin/profiles/companies");
  revalidatePath("/admin/profiles/operators");
  return { error: null };
}

// ─── Add note ─────────────────────────────────────────────────────────────────

const AddNoteInput = z.object({
  type: z.enum(["company", "operator"]),
  id: z.string().uuid(),
  note: z.string().min(1, "Note cannot be empty"),
  actorName: z.string().optional(),
});

function applicationName(
  type: "company" | "operator",
  row: AderoCompanyApplication | AderoOperatorApplication,
) {
  return type === "company"
    ? (row as AderoCompanyApplication).companyName
    : `${(row as AderoOperatorApplication).firstName} ${
        (row as AderoOperatorApplication).lastName
      }`;
}

export async function addApplicationNote(
  _prev: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const result = AddNoteInput.safeParse({
    type: formData.get("type"),
    id: formData.get("id"),
    note: formData.get("note"),
    actorName: formData.get("actorName") ?? undefined,
  });

  if (!result.success) {
    return { error: result.error.errors[0]?.message ?? "Invalid input." };
  }

  const { type, id, note, actorName } = result.data;
  const now = new Date();
  const actor = actorName?.trim() || null;

  try {
    await db.transaction(async (tx) => {
      if (type === "company") {
        const [row] = await tx
          .select()
          .from(aderoCompanyApplications)
          .where(eq(aderoCompanyApplications.id, id));

        if (!row) throw new Error("Company application not found.");

        const existing = row.internalNotes ?? null;
        const newNotes = existing ? `${existing}\n---\n${note}` : note;
        await tx
          .update(aderoCompanyApplications)
          .set({ internalNotes: newNotes, updatedAt: now })
          .where(eq(aderoCompanyApplications.id, id));

        await tx.insert(aderoAuditLogs).values({
          entityType: "company_application",
          entityId: row.id,
          applicationId: row.id,
          companyApplicationId: row.id,
          action: "application_note_added",
          actorName: actorOrSystem(actor),
          summary: `Internal note added to ${applicationName(type, row)}.`,
          details: note,
          createdAt: now,
        });
      } else {
        const [row] = await tx
          .select()
          .from(aderoOperatorApplications)
          .where(eq(aderoOperatorApplications.id, id));

        if (!row) throw new Error("Operator application not found.");

        const existing = row.internalNotes ?? null;
        const newNotes = existing ? `${existing}\n---\n${note}` : note;
        await tx
          .update(aderoOperatorApplications)
          .set({ internalNotes: newNotes, updatedAt: now })
          .where(eq(aderoOperatorApplications.id, id));

        await tx.insert(aderoAuditLogs).values({
          entityType: "operator_application",
          entityId: row.id,
          applicationId: row.id,
          operatorApplicationId: row.id,
          action: "application_note_added",
          actorName: actorOrSystem(actor),
          summary: `Internal note added to ${applicationName(type, row)}.`,
          details: note,
          createdAt: now,
        });
      }
    });
  } catch (err) {
    console.error("[adero] addApplicationNote failed:", err);
    return { error: "Failed to save note. Please try again." };
  }

  revalidatePath(`/admin/${type}/${id}`);
  return { error: null };
}
