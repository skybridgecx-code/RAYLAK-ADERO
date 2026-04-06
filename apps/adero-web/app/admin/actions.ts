"use server";

import {
  aderoCompanyApplications,
  aderoCompanyProfiles,
  aderoOperatorApplications,
  aderoOperatorProfiles,
  db,
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
    if (status !== "activated") {
      await tx
        .update(aderoCompanyApplications)
        .set({ status, reviewedAt: now, updatedAt: now, reviewedBy })
        .where(eq(aderoCompanyApplications.id, id));

      await tx
        .update(aderoCompanyProfiles)
        .set({ activationStatus: status, updatedAt: now })
        .where(eq(aderoCompanyProfiles.applicationId, id));

      return;
    }

    const [app] = await tx
      .select()
      .from(aderoCompanyApplications)
      .where(eq(aderoCompanyApplications.id, id));

    if (!app) {
      throw new Error("Company application not found.");
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
      activationStatus: status,
      activatedAt,
      updatedAt: now,
    };

    await tx
      .update(aderoCompanyApplications)
      .set({ status, reviewedAt: now, updatedAt: now, reviewedBy, activatedAt })
      .where(eq(aderoCompanyApplications.id, id));

    await tx.insert(aderoCompanyProfiles).values(profileValues).onConflictDoUpdate({
      target: aderoCompanyProfiles.applicationId,
      set: profileValues,
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
    if (status !== "activated") {
      await tx
        .update(aderoOperatorApplications)
        .set({ status, reviewedAt: now, updatedAt: now, reviewedBy })
        .where(eq(aderoOperatorApplications.id, id));

      await tx
        .update(aderoOperatorProfiles)
        .set({ activationStatus: status, updatedAt: now })
        .where(eq(aderoOperatorProfiles.applicationId, id));

      return;
    }

    const [app] = await tx
      .select()
      .from(aderoOperatorApplications)
      .where(eq(aderoOperatorApplications.id, id));

    if (!app) {
      throw new Error("Operator application not found.");
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
      activationStatus: status,
      activatedAt,
      updatedAt: now,
    };

    await tx
      .update(aderoOperatorApplications)
      .set({ status, reviewedAt: now, updatedAt: now, reviewedBy, activatedAt })
      .where(eq(aderoOperatorApplications.id, id));

    await tx.insert(aderoOperatorProfiles).values(profileValues).onConflictDoUpdate({
      target: aderoOperatorProfiles.applicationId,
      set: profileValues,
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
});

export async function addApplicationNote(
  _prev: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const result = AddNoteInput.safeParse({
    type: formData.get("type"),
    id: formData.get("id"),
    note: formData.get("note"),
  });

  if (!result.success) {
    return { error: result.error.errors[0]?.message ?? "Invalid input." };
  }

  const { type, id, note } = result.data;
  const now = new Date();

  try {
    if (type === "company") {
      const [row] = await db
        .select({ internalNotes: aderoCompanyApplications.internalNotes })
        .from(aderoCompanyApplications)
        .where(eq(aderoCompanyApplications.id, id));
      const existing = row?.internalNotes ?? null;
      const newNotes = existing ? `${existing}\n---\n${note}` : note;
      await db
        .update(aderoCompanyApplications)
        .set({ internalNotes: newNotes, updatedAt: now })
        .where(eq(aderoCompanyApplications.id, id));
    } else {
      const [row] = await db
        .select({ internalNotes: aderoOperatorApplications.internalNotes })
        .from(aderoOperatorApplications)
        .where(eq(aderoOperatorApplications.id, id));
      const existing = row?.internalNotes ?? null;
      const newNotes = existing ? `${existing}\n---\n${note}` : note;
      await db
        .update(aderoOperatorApplications)
        .set({ internalNotes: newNotes, updatedAt: now })
        .where(eq(aderoOperatorApplications.id, id));
    }
  } catch (err) {
    console.error("[adero] addApplicationNote failed:", err);
    return { error: "Failed to save note. Please try again." };
  }

  revalidatePath(`/admin/${type}/${id}`);
  return { error: null };
}
