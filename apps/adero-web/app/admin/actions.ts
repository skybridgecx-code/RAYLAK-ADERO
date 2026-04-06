"use server";

import { db, aderoCompanyApplications, aderoOperatorApplications } from "@raylak/db";
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
      if (status === "activated") {
        await db
          .update(aderoCompanyApplications)
          .set({ status, reviewedAt: now, updatedAt: now, reviewedBy, activatedAt: now })
          .where(eq(aderoCompanyApplications.id, id));
      } else {
        await db
          .update(aderoCompanyApplications)
          .set({ status, reviewedAt: now, updatedAt: now, reviewedBy })
          .where(eq(aderoCompanyApplications.id, id));
      }
    } else {
      if (status === "activated") {
        await db
          .update(aderoOperatorApplications)
          .set({ status, reviewedAt: now, updatedAt: now, reviewedBy, activatedAt: now })
          .where(eq(aderoOperatorApplications.id, id));
      } else {
        await db
          .update(aderoOperatorApplications)
          .set({ status, reviewedAt: now, updatedAt: now, reviewedBy })
          .where(eq(aderoOperatorApplications.id, id));
      }
    }
  } catch (err) {
    console.error("[adero] updateApplicationStatus failed:", err);
    return { error: "Update failed. Please try again." };
  }

  revalidatePath(`/admin/${type}/${id}`);
  revalidatePath("/admin");
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
