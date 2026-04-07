import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import {
  aderoCompanyProfiles,
  aderoOperatorProfiles,
  aderoPortalSubmissions,
  db,
} from "@raylak/db";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * A pending submission that has been superseded by a newer submission.
 * Because the review guard blocks review of superseded submissions, these
 * are permanently stuck and cannot be resolved through normal admin flow.
 */
export type StalePendingRow = {
  submissionId: string;
  memberType: "company" | "operator";
  documentType: string;
  profileId: string;
  memberName: string;
  createdAt: Date;
  successorId: string;
  successorStatus: string;
};

/**
 * A pending submission that is a chain head (not superseded by anything).
 * Used to identify lanes with more than one concurrent pending head.
 */
export type PendingHeadRow = {
  submissionId: string;
  memberType: "company" | "operator";
  documentType: string;
  profileId: string;
  memberName: string;
  createdAt: Date;
};

/**
 * A lane (member × document type) that has more than one independent pending
 * chain head. This should not occur in normal operation but can appear if the
 * portal submission guard was bypassed.
 */
export type MultiPendingLane = {
  memberType: "company" | "operator";
  profileId: string;
  memberName: string;
  documentType: string;
  heads: PendingHeadRow[];
};

/**
 * A submission whose supersedesSubmissionId points to a submission in a
 * different lane (different member, profile, or document type). This indicates
 * a data integrity corruption.
 */
export type CrossLaneRow = {
  submissionId: string;
  memberType: string;
  documentType: string;
  profileId: string;
  parentId: string;
  parentMemberType: string;
  parentDocumentType: string;
  parentProfileId: string;
};

export type ChainIntegrityReport = {
  stalePending: StalePendingRow[];
  multiPendingLanes: MultiPendingLane[];
  crossLane: CrossLaneRow[];
  totalAnomalies: number;
};

// ─── Report loader ─────────────────────────────────────────────────────────────

export async function loadChainIntegrityReport(): Promise<ChainIntegrityReport> {
  const successorSubs = alias(aderoPortalSubmissions, "successor_subs");
  const parentSubs = alias(aderoPortalSubmissions, "parent_subs");

  // ── 1. All pending submissions with their successor (if any) ──────────────
  //    Stale pending  = pending + successorId IS NOT NULL
  //    Pending head   = pending + successorId IS NULL
  const pendingRows = await db
    .select({
      id: aderoPortalSubmissions.id,
      memberType: aderoPortalSubmissions.memberType,
      documentType: aderoPortalSubmissions.documentType,
      companyProfileId: aderoPortalSubmissions.companyProfileId,
      operatorProfileId: aderoPortalSubmissions.operatorProfileId,
      createdAt: aderoPortalSubmissions.createdAt,
      successorId: successorSubs.id,
      successorStatus: successorSubs.status,
      companyName: aderoCompanyProfiles.companyName,
      operatorName: aderoOperatorProfiles.fullName,
    })
    .from(aderoPortalSubmissions)
    .leftJoin(
      successorSubs,
      eq(successorSubs.supersedesSubmissionId, aderoPortalSubmissions.id),
    )
    .leftJoin(
      aderoCompanyProfiles,
      eq(aderoPortalSubmissions.companyProfileId, aderoCompanyProfiles.id),
    )
    .leftJoin(
      aderoOperatorProfiles,
      eq(aderoPortalSubmissions.operatorProfileId, aderoOperatorProfiles.id),
    )
    .where(eq(aderoPortalSubmissions.status, "pending"))
    .orderBy(aderoPortalSubmissions.createdAt);

  // ── 2. Classify each pending row ──────────────────────────────────────────
  const stalePending: StalePendingRow[] = [];
  const pendingHeads: PendingHeadRow[] = [];

  for (const row of pendingRows) {
    const memberType = row.memberType as "company" | "operator";
    const profileId =
      memberType === "company"
        ? (row.companyProfileId ?? "")
        : (row.operatorProfileId ?? "");
    const memberName =
      memberType === "company"
        ? (row.companyName ?? "Unknown company")
        : (row.operatorName ?? "Unknown operator");

    if (row.successorId && row.successorStatus) {
      stalePending.push({
        submissionId: row.id,
        memberType,
        documentType: row.documentType,
        profileId,
        memberName,
        createdAt: row.createdAt,
        successorId: row.successorId,
        successorStatus: row.successorStatus,
      });
    } else {
      pendingHeads.push({
        submissionId: row.id,
        memberType,
        documentType: row.documentType,
        profileId,
        memberName,
        createdAt: row.createdAt,
      });
    }
  }

  // ── 3. Find lanes with multiple concurrent pending heads ──────────────────
  const headsByLane = new Map<string, PendingHeadRow[]>();
  for (const head of pendingHeads) {
    const key = `${head.memberType}|${head.profileId}|${head.documentType}`;
    const list = headsByLane.get(key) ?? [];
    list.push(head);
    headsByLane.set(key, list);
  }

  const multiPendingLanes: MultiPendingLane[] = [];
  for (const heads of headsByLane.values()) {
    if (heads.length < 2) continue;
    const first = heads[0]!;
    multiPendingLanes.push({
      memberType: first.memberType,
      profileId: first.profileId,
      memberName: first.memberName,
      documentType: first.documentType,
      heads,
    });
  }

  // ── 4. Cross-lane supersessions ───────────────────────────────────────────
  //    Detects submissions whose supersedesSubmissionId points to a submission
  //    in a different lane (member type, profile, or document type mismatch).
  const crossLaneRows = await db
    .select({
      submissionId: aderoPortalSubmissions.id,
      memberType: aderoPortalSubmissions.memberType,
      documentType: aderoPortalSubmissions.documentType,
      companyProfileId: aderoPortalSubmissions.companyProfileId,
      operatorProfileId: aderoPortalSubmissions.operatorProfileId,
      parentId: parentSubs.id,
      parentMemberType: parentSubs.memberType,
      parentDocumentType: parentSubs.documentType,
      parentCompanyProfileId: parentSubs.companyProfileId,
      parentOperatorProfileId: parentSubs.operatorProfileId,
    })
    .from(aderoPortalSubmissions)
    .innerJoin(parentSubs, eq(parentSubs.id, aderoPortalSubmissions.supersedesSubmissionId))
    .where(
      sql`(
        ${aderoPortalSubmissions.memberType} != ${parentSubs.memberType}
        OR ${aderoPortalSubmissions.documentType} != ${parentSubs.documentType}
        OR (${aderoPortalSubmissions.memberType} = 'company'  AND ${aderoPortalSubmissions.companyProfileId}  IS DISTINCT FROM ${parentSubs.companyProfileId})
        OR (${aderoPortalSubmissions.memberType} = 'operator' AND ${aderoPortalSubmissions.operatorProfileId} IS DISTINCT FROM ${parentSubs.operatorProfileId})
      )`,
    )
    .orderBy(aderoPortalSubmissions.createdAt);

  const crossLane: CrossLaneRow[] = crossLaneRows.map((r) => ({
    submissionId: r.submissionId,
    memberType: r.memberType,
    documentType: r.documentType,
    profileId:
      r.memberType === "company"
        ? (r.companyProfileId ?? "")
        : (r.operatorProfileId ?? ""),
    parentId: r.parentId,
    parentMemberType: r.parentMemberType,
    parentDocumentType: r.parentDocumentType,
    parentProfileId:
      r.parentMemberType === "company"
        ? (r.parentCompanyProfileId ?? "")
        : (r.parentOperatorProfileId ?? ""),
  }));

  const totalAnomalies =
    stalePending.length +
    multiPendingLanes.reduce((sum, lane) => sum + lane.heads.length, 0) +
    crossLane.length;

  return { stalePending, multiPendingLanes, crossLane, totalAnomalies };
}
