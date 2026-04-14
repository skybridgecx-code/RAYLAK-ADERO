"use server";

import {
  aderoAuditLogs,
  aderoCompanyProfiles,
  aderoMemberNotes,
  aderoOperatorProfiles,
  db,
} from "@raylak/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export type NoteActionState = {
  error: string | null;
  saved: boolean;
};

const AddNoteInput = z.object({
  memberType: z.enum(["company", "operator"]),
  profileId: z.string().uuid(),
  body: z.string().trim().min(1, "Note cannot be empty").max(2000, "Note is too long"),
  actorName: z.string().trim().optional(),
});

function actorOrSystem(actorName: string | null | undefined) {
  return actorName?.trim() || "Adero admin";
}

export async function addMemberNote(
  _prev: NoteActionState,
  formData: FormData,
): Promise<NoteActionState> {
  const result = AddNoteInput.safeParse({
    memberType: formData.get("memberType"),
    profileId: formData.get("profileId"),
    body: formData.get("body"),
    actorName: formData.get("actorName") ?? undefined,
  });

  if (!result.success) {
    const first = result.error.errors[0]?.message ?? "Invalid input.";
    return { error: first, saved: false };
  }

  const { memberType, profileId, body, actorName } = result.data;
  const actor = actorOrSystem(actorName);
  const now = new Date();

  try {
    await db.transaction(async (tx) => {
      if (memberType === "company") {
        const [profile] = await tx
          .select({ id: aderoCompanyProfiles.id, applicationId: aderoCompanyProfiles.applicationId })
          .from(aderoCompanyProfiles)
          .where(eq(aderoCompanyProfiles.id, profileId));

        if (!profile) throw new Error("Company profile not found.");

        await tx.insert(aderoMemberNotes).values({
          memberType: "company",
          companyProfileId: profile.id,
          operatorProfileId: null,
          body,
          actorName: actor,
          createdAt: now,
        });

        await tx.insert(aderoAuditLogs).values({
          entityType: "company_profile",
          entityId: profile.id,
          applicationId: profile.applicationId,
          companyApplicationId: profile.applicationId,
          companyProfileId: profile.id,
          action: "member_note_added",
          actorName: actor,
          summary: "Internal note added to company profile.",
          details: body.length > 200 ? `${body.slice(0, 200)}…` : body,
          createdAt: now,
        });
      } else {
        const [profile] = await tx
          .select({ id: aderoOperatorProfiles.id, applicationId: aderoOperatorProfiles.applicationId })
          .from(aderoOperatorProfiles)
          .where(eq(aderoOperatorProfiles.id, profileId));

        if (!profile) throw new Error("Operator profile not found.");

        await tx.insert(aderoMemberNotes).values({
          memberType: "operator",
          companyProfileId: null,
          operatorProfileId: profile.id,
          body,
          actorName: actor,
          createdAt: now,
        });

        await tx.insert(aderoAuditLogs).values({
          entityType: "operator_profile",
          entityId: profile.id,
          applicationId: profile.applicationId,
          operatorApplicationId: profile.applicationId,
          operatorProfileId: profile.id,
          action: "member_note_added",
          actorName: actor,
          summary: "Internal note added to operator profile.",
          details: body.length > 200 ? `${body.slice(0, 200)}…` : body,
          createdAt: now,
        });
      }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Note could not be saved.";
    console.error("[adero] addMemberNote failed:", err);
    return { error: message, saved: false };
  }

  revalidatePath(
    memberType === "company"
      ? `/admin/profiles/companies/${profileId}`
      : `/admin/profiles/operators/${profileId}`,
  );
  return { error: null, saved: true };
}
