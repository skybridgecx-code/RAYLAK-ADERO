"use server";

import {
  aderoAuditLogs,
  aderoCompanyProfiles,
  aderoDocumentComplianceNotifications,
  aderoMemberDocuments,
  aderoOperatorProfiles,
  db,
} from "@raylak/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  MEMBER_DOCUMENT_COMPLIANCE_ACTIONS,
  MEMBER_DOCUMENT_COMPLIANCE_ACTION_LABELS,
  MEMBER_DOCUMENT_STATUSES,
  MEMBER_DOCUMENT_STATUS_LABELS,
  MEMBER_DOCUMENT_TYPES,
  MEMBER_DOCUMENT_TYPE_LABELS,
  PROFILE_STATUSES,
  VEHICLE_TYPES,
} from "~/lib/validators";
import { z } from "zod";

export type ProfileActionState = {
  error: string | null;
  fieldErrors: Record<string, string[] | undefined>;
  saved: boolean;
};

export type DocumentActionState = ProfileActionState;
export type ComplianceActionState = ProfileActionState;

const CompanyProfileInput = z.object({
  id: z.string().uuid(),
  companyName: z.string().trim().min(2, "Company name is required"),
  serviceArea: z.string().trim().min(2, "Service area is required"),
  contactName: z.string().trim().min(2, "Contact name is required"),
  email: z.string().trim().email("Valid email address required"),
  phone: z.string().trim().optional(),
  website: z.string().trim().url("Must be a valid URL").optional().or(z.literal("")),
  fleetSize: z.coerce
    .number()
    .int()
    .min(1, "Fleet size must be at least 1")
    .optional()
    .or(z.literal("")),
  serviceNotes: z.string().trim().optional(),
  activationStatus: z.enum(PROFILE_STATUSES),
  actorName: z.string().trim().optional(),
});

const OperatorProfileInput = z.object({
  id: z.string().uuid(),
  fullName: z.string().trim().min(2, "Full name is required"),
  city: z.string().trim().min(2, "City is required"),
  state: z.string().trim().optional(),
  email: z.string().trim().email("Valid email address required"),
  phone: z.string().trim().optional(),
  vehicleType: z.enum(VEHICLE_TYPES, { message: "Please select a vehicle type" }),
  vehicleYear: z.coerce
    .number()
    .int()
    .min(1990, "Vehicle year is too old")
    .max(new Date().getFullYear() + 1, "Vehicle year is too far in the future")
    .optional()
    .or(z.literal("")),
  yearsExperience: z.coerce
    .number()
    .int()
    .min(0, "Years of experience cannot be negative")
    .max(50, "Years of experience is too high")
    .optional()
    .or(z.literal("")),
  serviceNotes: z.string().trim().optional(),
  activationStatus: z.enum(PROFILE_STATUSES),
  actorName: z.string().trim().optional(),
});

const MemberDocumentInput = z.object({
  memberType: z.enum(["company", "operator"]),
  profileId: z.string().uuid(),
  documentId: z.string().uuid().optional(),
  title: z.string().trim().min(2, "Document title is required"),
  documentType: z.enum(MEMBER_DOCUMENT_TYPES),
  status: z.enum(MEMBER_DOCUMENT_STATUSES),
  expirationDate: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), "Use YYYY-MM-DD"),
  notes: z.string().trim().optional(),
  actorName: z.string().trim().optional(),
});

const MemberDocumentComplianceInput = z.object({
  memberType: z.enum(["company", "operator"]),
  profileId: z.string().uuid(),
  documentId: z.string().uuid().optional(),
  documentType: z.enum(MEMBER_DOCUMENT_TYPES),
  actionType: z.enum(MEMBER_DOCUMENT_COMPLIANCE_ACTIONS),
  notes: z.string().trim().optional(),
  actorName: z.string().trim().optional(),
});

function emptyToNull(value: string | null | undefined) {
  return value?.trim() ? value.trim() : null;
}

function optionalNumberToNull(value: number | "" | undefined) {
  return typeof value === "number" ? value : null;
}

function actorOrSystem(actorName: string | null | undefined) {
  return actorName?.trim() || "Adero admin";
}

function documentTypeLabel(documentType: string) {
  return (
    MEMBER_DOCUMENT_TYPE_LABELS[documentType as keyof typeof MEMBER_DOCUMENT_TYPE_LABELS] ??
    documentType
  );
}

function documentStatusLabel(status: string) {
  return (
    MEMBER_DOCUMENT_STATUS_LABELS[status as keyof typeof MEMBER_DOCUMENT_STATUS_LABELS] ?? status
  );
}

function normalizeExpirationDate(value: string | null | undefined) {
  return value?.trim() ? value.trim() : null;
}

function changedFields(changes: Array<[string, unknown, unknown]>) {
  return changes.filter(([, before, after]) => before !== after).map(([field]) => field);
}

function changeDetails(fields: string[]) {
  return fields.length > 0
    ? `Updated fields: ${fields.join(", ")}`
    : "Saved without field changes.";
}

function revalidateMemberDocumentPaths(memberType: "company" | "operator", profileId: string) {
  revalidatePath("/admin/profiles");
  revalidatePath("/admin/profiles/companies");
  revalidatePath("/admin/profiles/operators");
  revalidatePath("/admin/profiles/documents");
  revalidatePath(
    memberType === "company"
      ? `/admin/profiles/companies/${profileId}`
      : `/admin/profiles/operators/${profileId}`,
  );
}

export async function updateCompanyProfile(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const result = CompanyProfileInput.safeParse({
    id: formData.get("id"),
    companyName: formData.get("companyName"),
    serviceArea: formData.get("serviceArea"),
    contactName: formData.get("contactName"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? undefined,
    website: formData.get("website") ?? "",
    fleetSize: formData.get("fleetSize") ?? "",
    serviceNotes: formData.get("serviceNotes") ?? undefined,
    activationStatus: formData.get("activationStatus"),
    actorName: formData.get("actorName") ?? undefined,
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
  let applicationId: string | null = null;
  const next = {
    companyName: data.companyName,
    serviceArea: data.serviceArea,
    contactName: data.contactName,
    email: data.email,
    phone: emptyToNull(data.phone),
    website: emptyToNull(data.website),
    fleetSize: optionalNumberToNull(data.fleetSize),
    serviceNotes: emptyToNull(data.serviceNotes),
    activationStatus: data.activationStatus,
  };

  try {
    await db.transaction(async (tx) => {
      const [profile] = await tx
        .select()
        .from(aderoCompanyProfiles)
        .where(eq(aderoCompanyProfiles.id, data.id));

      if (!profile) throw new Error("Company profile not found.");
      applicationId = profile.applicationId;

      const fields = changedFields([
        ["company name", profile.companyName, next.companyName],
        ["service area", profile.serviceArea, next.serviceArea],
        ["contact name", profile.contactName, next.contactName],
        ["email", profile.email, next.email],
        ["phone", profile.phone, next.phone],
        ["website", profile.website, next.website],
        ["fleet size", profile.fleetSize, next.fleetSize],
        ["service notes", profile.serviceNotes, next.serviceNotes],
        ["profile status", profile.activationStatus, next.activationStatus],
      ]);

      await tx
        .update(aderoCompanyProfiles)
        .set({ ...next, updatedAt: now })
        .where(eq(aderoCompanyProfiles.id, data.id));

      await tx.insert(aderoAuditLogs).values({
        entityType: "company_profile",
        entityId: profile.id,
        applicationId: profile.applicationId,
        companyApplicationId: profile.applicationId,
        companyProfileId: profile.id,
        action:
          profile.activationStatus !== next.activationStatus
            ? "profile_status_changed"
            : "profile_updated",
        actorName: actorOrSystem(data.actorName),
        summary:
          profile.activationStatus !== next.activationStatus
            ? `Company profile status changed from ${profile.activationStatus} to ${next.activationStatus}.`
            : `Company profile updated for ${next.companyName}.`,
        details: changeDetails(fields),
        createdAt: now,
      });
    });
  } catch (err) {
    console.error("[adero] updateCompanyProfile failed:", err);
    return { error: "Profile update failed. Please try again.", fieldErrors: {}, saved: false };
  }

  revalidatePath("/admin/profiles");
  revalidatePath("/admin/profiles/companies");
  revalidatePath(`/admin/profiles/companies/${data.id}`);
  revalidatePath(`/admin/profiles/companies/${data.id}/edit`);
  if (applicationId) {
    revalidatePath(`/admin/company/${applicationId}`);
  }
  return { error: null, fieldErrors: {}, saved: true };
}

export async function updateOperatorProfile(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const result = OperatorProfileInput.safeParse({
    id: formData.get("id"),
    fullName: formData.get("fullName"),
    city: formData.get("city"),
    state: formData.get("state") ?? undefined,
    email: formData.get("email"),
    phone: formData.get("phone") ?? undefined,
    vehicleType: formData.get("vehicleType"),
    vehicleYear: formData.get("vehicleYear") ?? "",
    yearsExperience: formData.get("yearsExperience") ?? "",
    serviceNotes: formData.get("serviceNotes") ?? undefined,
    activationStatus: formData.get("activationStatus"),
    actorName: formData.get("actorName") ?? undefined,
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
  let applicationId: string | null = null;
  const next = {
    fullName: data.fullName,
    city: data.city,
    state: emptyToNull(data.state),
    email: data.email,
    phone: emptyToNull(data.phone),
    vehicleType: data.vehicleType,
    vehicleYear: optionalNumberToNull(data.vehicleYear),
    yearsExperience: optionalNumberToNull(data.yearsExperience),
    serviceNotes: emptyToNull(data.serviceNotes),
    activationStatus: data.activationStatus,
  };

  try {
    await db.transaction(async (tx) => {
      const [profile] = await tx
        .select()
        .from(aderoOperatorProfiles)
        .where(eq(aderoOperatorProfiles.id, data.id));

      if (!profile) throw new Error("Operator profile not found.");
      applicationId = profile.applicationId;

      const fields = changedFields([
        ["full name", profile.fullName, next.fullName],
        ["city", profile.city, next.city],
        ["state", profile.state, next.state],
        ["email", profile.email, next.email],
        ["phone", profile.phone, next.phone],
        ["vehicle type", profile.vehicleType, next.vehicleType],
        ["vehicle year", profile.vehicleYear, next.vehicleYear],
        ["years of experience", profile.yearsExperience, next.yearsExperience],
        ["service notes", profile.serviceNotes, next.serviceNotes],
        ["profile status", profile.activationStatus, next.activationStatus],
      ]);

      await tx
        .update(aderoOperatorProfiles)
        .set({ ...next, updatedAt: now })
        .where(eq(aderoOperatorProfiles.id, data.id));

      await tx.insert(aderoAuditLogs).values({
        entityType: "operator_profile",
        entityId: profile.id,
        applicationId: profile.applicationId,
        operatorApplicationId: profile.applicationId,
        operatorProfileId: profile.id,
        action:
          profile.activationStatus !== next.activationStatus
            ? "profile_status_changed"
            : "profile_updated",
        actorName: actorOrSystem(data.actorName),
        summary:
          profile.activationStatus !== next.activationStatus
            ? `Operator profile status changed from ${profile.activationStatus} to ${next.activationStatus}.`
            : `Operator profile updated for ${next.fullName}.`,
        details: changeDetails(fields),
        createdAt: now,
      });
    });
  } catch (err) {
    console.error("[adero] updateOperatorProfile failed:", err);
    return { error: "Profile update failed. Please try again.", fieldErrors: {}, saved: false };
  }

  revalidatePath("/admin/profiles");
  revalidatePath("/admin/profiles/operators");
  revalidatePath(`/admin/profiles/operators/${data.id}`);
  revalidatePath(`/admin/profiles/operators/${data.id}/edit`);
  if (applicationId) {
    revalidatePath(`/admin/operator/${applicationId}`);
  }
  return { error: null, fieldErrors: {}, saved: true };
}

export async function createMemberDocument(
  _prev: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const result = MemberDocumentInput.safeParse({
    memberType: formData.get("memberType"),
    profileId: formData.get("profileId"),
    title: formData.get("title"),
    documentType: formData.get("documentType"),
    status: formData.get("status"),
    expirationDate: formData.get("expirationDate") ?? undefined,
    notes: formData.get("notes") ?? undefined,
    actorName: formData.get("actorName") ?? undefined,
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
                operatorProfileId: null,
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
                companyProfileId: null,
                operatorProfileId: profile.id,
                memberName: profile.fullName,
              };
            })();
      const [document] = await tx
        .insert(aderoMemberDocuments)
        .values({
          memberType: data.memberType,
          companyProfileId: member.companyProfileId,
          operatorProfileId: member.operatorProfileId,
          title: data.title,
          documentType: data.documentType,
          status: data.status,
          expirationDate: normalizeExpirationDate(data.expirationDate),
          notes: emptyToNull(data.notes),
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      if (!document) throw new Error("Document creation failed.");

      await tx.insert(aderoAuditLogs).values({
        entityType: `${data.memberType}_document`,
        entityId: document.id,
        applicationId: member.applicationId,
        companyProfileId: member.companyProfileId,
        operatorProfileId: member.operatorProfileId,
        action: "member_document_created",
        actorName: actorOrSystem(data.actorName),
        summary: `${documentTypeLabel(data.documentType)} document added for ${member.memberName}.`,
        details: [
          `Title: ${document.title}`,
          `Status: ${documentStatusLabel(document.status)}`,
          document.expirationDate ? `Expiration: ${document.expirationDate}` : null,
          document.notes ? `Notes: ${document.notes}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
        createdAt: now,
      });
    });
  } catch (err) {
    console.error("[adero] createMemberDocument failed:", err);
    return {
      error: "Document save failed. Please try again.",
      fieldErrors: {},
      saved: false,
    };
  }

  revalidateMemberDocumentPaths(data.memberType, data.profileId);
  return { error: null, fieldErrors: {}, saved: true };
}

export async function createMemberDocumentComplianceAction(
  _prev: ComplianceActionState,
  formData: FormData,
): Promise<ComplianceActionState> {
  const result = MemberDocumentComplianceInput.safeParse({
    memberType: formData.get("memberType"),
    profileId: formData.get("profileId"),
    documentId: formData.get("documentId") ?? undefined,
    documentType: formData.get("documentType"),
    actionType: formData.get("actionType"),
    notes: formData.get("notes") ?? undefined,
    actorName: formData.get("actorName") ?? undefined,
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
                operatorProfileId: null,
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
                companyProfileId: null,
                operatorProfileId: profile.id,
                memberName: profile.fullName,
              };
            })();

      let documentId: string | null = null;
      if (data.documentId) {
        const [document] = await tx
          .select()
          .from(aderoMemberDocuments)
          .where(eq(aderoMemberDocuments.id, data.documentId));

        if (!document) throw new Error("Document not found.");
        if (
          document.memberType !== data.memberType ||
          document.documentType !== data.documentType ||
          document.companyProfileId !== member.companyProfileId ||
          document.operatorProfileId !== member.operatorProfileId
        ) {
          throw new Error("Document does not belong to this compliance issue.");
        }

        documentId = document.id;
      }

      const actionLabel = MEMBER_DOCUMENT_COMPLIANCE_ACTION_LABELS[data.actionType];
      const documentLabel = documentTypeLabel(data.documentType);
      const title = `${actionLabel}: ${documentLabel}`;
      const body = `${actionLabel} recorded for ${member.memberName}.`;
      const notes = emptyToNull(data.notes);

      await tx.insert(aderoDocumentComplianceNotifications).values({
        memberType: data.memberType,
        companyProfileId: member.companyProfileId,
        operatorProfileId: member.operatorProfileId,
        documentId,
        documentType: data.documentType,
        actionType: data.actionType,
        title,
        body,
        notes,
        actorName: actorOrSystem(data.actorName),
        createdAt: now,
      });

      await tx.insert(aderoAuditLogs).values({
        entityType: `${data.memberType}_document_compliance`,
        entityId: documentId ?? data.profileId,
        applicationId: member.applicationId,
        companyProfileId: member.companyProfileId,
        operatorProfileId: member.operatorProfileId,
        action: `document_compliance_${data.actionType}`,
        actorName: actorOrSystem(data.actorName),
        summary: `${actionLabel} recorded for ${documentLabel.toLowerCase()} on ${member.memberName}.`,
        details: notes ? `Notes: ${notes}` : null,
        createdAt: now,
      });
    });
  } catch (err) {
    console.error("[adero] createMemberDocumentComplianceAction failed:", err);
    return {
      error: "Compliance action failed. Please try again.",
      fieldErrors: {},
      saved: false,
    };
  }

  revalidateMemberDocumentPaths(data.memberType, data.profileId);
  return { error: null, fieldErrors: {}, saved: true };
}

export async function updateMemberDocument(
  _prev: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const result = MemberDocumentInput.safeParse({
    memberType: formData.get("memberType"),
    profileId: formData.get("profileId"),
    documentId: formData.get("documentId") ?? undefined,
    title: formData.get("title"),
    documentType: formData.get("documentType"),
    status: formData.get("status"),
    expirationDate: formData.get("expirationDate") ?? undefined,
    notes: formData.get("notes") ?? undefined,
    actorName: formData.get("actorName") ?? undefined,
  });

  if (!result.success || !result.data.documentId) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: result.success ? {} : result.error.flatten().fieldErrors,
      saved: false,
    };
  }

  const documentId = result.data.documentId;
  if (!documentId) {
    return { error: "Please fix the highlighted fields.", fieldErrors: {}, saved: false };
  }

  const data = { ...result.data, documentId };
  const now = new Date();
  const next = {
    title: data.title,
    documentType: data.documentType,
    status: data.status,
    expirationDate: normalizeExpirationDate(data.expirationDate),
    notes: emptyToNull(data.notes),
  };

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
                operatorProfileId: null,
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
                companyProfileId: null,
                operatorProfileId: profile.id,
                memberName: profile.fullName,
              };
            })();
      const [document] = await tx
        .select()
        .from(aderoMemberDocuments)
        .where(eq(aderoMemberDocuments.id, data.documentId));

      if (!document) throw new Error("Document not found.");
      if (
        document.memberType !== data.memberType ||
        document.companyProfileId !== member.companyProfileId ||
        document.operatorProfileId !== member.operatorProfileId
      ) {
        throw new Error("Document does not belong to this profile.");
      }

      const fields = changedFields([
        ["title", document.title, next.title],
        ["document type", document.documentType, next.documentType],
        ["status", document.status, next.status],
        ["expiration date", document.expirationDate, next.expirationDate],
        ["notes", document.notes, next.notes],
      ]);

      await tx
        .update(aderoMemberDocuments)
        .set({ ...next, updatedAt: now })
        .where(eq(aderoMemberDocuments.id, data.documentId));

      await tx.insert(aderoAuditLogs).values({
        entityType: `${data.memberType}_document`,
        entityId: document.id,
        applicationId: member.applicationId,
        companyProfileId: member.companyProfileId,
        operatorProfileId: member.operatorProfileId,
        action:
          document.status !== next.status
            ? "member_document_status_changed"
            : "member_document_updated",
        actorName: actorOrSystem(data.actorName),
        summary:
          document.status !== next.status
            ? `${documentTypeLabel(next.documentType)} document status changed from ${documentStatusLabel(document.status)} to ${documentStatusLabel(next.status)}.`
            : `${documentTypeLabel(next.documentType)} document updated for ${member.memberName}.`,
        details: changeDetails(fields),
        createdAt: now,
      });
    });
  } catch (err) {
    console.error("[adero] updateMemberDocument failed:", err);
    return {
      error: "Document update failed. Please try again.",
      fieldErrors: {},
      saved: false,
    };
  }

  revalidateMemberDocumentPaths(data.memberType, data.profileId);
  return { error: null, fieldErrors: {}, saved: true };
}
