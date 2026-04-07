"use server";

import {
  aderoAuditLogs,
  aderoCompanyProfiles,
  aderoComplianceAssignments,
  aderoOperatorProfiles,
  db,
} from "@raylak/db";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { MEMBER_DOCUMENT_TYPES } from "~/lib/validators";
import { z } from "zod";

export type AssignmentActionState = {
  error: string | null;
  fieldErrors: Record<string, string[] | undefined>;
  saved: boolean;
};

const AssignComplianceInput = z.object({
  memberType: z.enum(["company", "operator"]),
  profileId: z.string().uuid(),
  documentType: z.enum(MEMBER_DOCUMENT_TYPES),
  assignedTo: z.string().trim().min(1, "Assignee name is required"),
  assignedBy: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

function emptyToNull(value: string | null | undefined) {
  return value?.trim() ? value.trim() : null;
}

function revalidateCompliancePaths(memberType: "company" | "operator", profileId: string) {
  revalidatePath("/admin/compliance");
  revalidatePath("/admin/profiles/documents");
  revalidatePath("/admin/profiles");
  revalidatePath(
    memberType === "company"
      ? `/admin/profiles/companies/${profileId}`
      : `/admin/profiles/operators/${profileId}`,
  );
}

export async function assignComplianceIssue(
  _prev: AssignmentActionState,
  formData: FormData,
): Promise<AssignmentActionState> {
  const result = AssignComplianceInput.safeParse({
    memberType: formData.get("memberType"),
    profileId: formData.get("profileId"),
    documentType: formData.get("documentType"),
    assignedTo: formData.get("assignedTo"),
    assignedBy: formData.get("assignedBy") ?? undefined,
    notes: formData.get("notes") ?? undefined,
  });

  if (!result.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: result.error.flatten().fieldErrors,
      saved: false,
    };
  }

  const data = result.data;
  const now = new Date();

  try {
    await db.transaction(async (tx) => {
      const member =
        data.memberType === "company"
          ? await (async () => {
              const [profile] = await tx
                .select()
                .from(aderoCompanyProfiles)
                .where(eq(aderoCompanyProfiles.id, data.profileId));

              if (!profile) throw new Error("Company profile not found.");

              return {
                applicationId: profile.applicationId,
                companyProfileId: profile.id,
                operatorProfileId: null as string | null,
                memberName: profile.companyName,
              };
            })()
          : await (async () => {
              const [profile] = await tx
                .select()
                .from(aderoOperatorProfiles)
                .where(eq(aderoOperatorProfiles.id, data.profileId));

              if (!profile) throw new Error("Operator profile not found.");

              return {
                applicationId: profile.applicationId,
                companyProfileId: null as string | null,
                operatorProfileId: profile.id,
                memberName: profile.fullName,
              };
            })();

      const assignedTo = data.assignedTo;
      const assignedBy = emptyToNull(data.assignedBy);
      const notes = emptyToNull(data.notes);

      // Upsert: one row per (member_type + profile_id + document_type).
      // Use the correct partial unique index as the conflict target.
      if (data.memberType === "company") {
        await tx
          .insert(aderoComplianceAssignments)
          .values({
            memberType: "company",
            companyProfileId: member.companyProfileId,
            operatorProfileId: null,
            documentType: data.documentType,
            assignedTo,
            assignedBy,
            notes,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: [
              aderoComplianceAssignments.companyProfileId,
              aderoComplianceAssignments.documentType,
            ],
            targetWhere: sql`"member_type" = 'company'`,
            set: { assignedTo, assignedBy, notes, updatedAt: now },
          });
      } else {
        await tx
          .insert(aderoComplianceAssignments)
          .values({
            memberType: "operator",
            companyProfileId: null,
            operatorProfileId: member.operatorProfileId,
            documentType: data.documentType,
            assignedTo,
            assignedBy,
            notes,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: [
              aderoComplianceAssignments.operatorProfileId,
              aderoComplianceAssignments.documentType,
            ],
            targetWhere: sql`"member_type" = 'operator'`,
            set: { assignedTo, assignedBy, notes, updatedAt: now },
          });
      }

      await tx.insert(aderoAuditLogs).values({
        entityType: `${data.memberType}_document_compliance`,
        entityId: data.profileId,
        applicationId: member.applicationId,
        companyProfileId: member.companyProfileId,
        operatorProfileId: member.operatorProfileId,
        action: "compliance_issue_assigned",
        actorName: assignedBy ?? "Adero admin",
        summary: `Compliance issue for ${data.documentType} assigned to ${assignedTo} on ${member.memberName}.`,
        details: notes ? `Notes: ${notes}` : null,
        createdAt: now,
      });
    });
  } catch (err) {
    console.error("[adero] assignComplianceIssue failed:", err);
    return {
      error: "Assignment failed. Please try again.",
      fieldErrors: {},
      saved: false,
    };
  }

  revalidateCompliancePaths(data.memberType, data.profileId);
  return { error: null, fieldErrors: {}, saved: true };
}
