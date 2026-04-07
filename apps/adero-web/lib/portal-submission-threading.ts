import { MEMBER_DOCUMENT_TYPES, type MemberDocumentType } from "~/lib/validators";

export type PortalSubmissionThreadNode = {
  id: string;
  documentType: string;
  status: string;
  createdAt: Date;
  supersedesSubmissionId: string | null;
};

function compareByCreatedDesc<T extends { createdAt: Date; id: string }>(a: T, b: T) {
  const timeDiff = b.createdAt.getTime() - a.createdAt.getTime();
  if (timeDiff !== 0) return timeDiff;
  return b.id.localeCompare(a.id);
}

export function isAcceptedSubmissionStatus(status: string) {
  return status === "accepted" || status === "reviewed";
}

export function isRejectedSubmissionStatus(status: string) {
  return status === "rejected" || status === "dismissed";
}

export function isFollowUpSubmissionStatus(status: string) {
  return status === "needs_follow_up";
}

export function needsMemberResubmission(status: string) {
  return isRejectedSubmissionStatus(status) || isFollowUpSubmissionStatus(status);
}

export function toKnownDocumentType(value: string): MemberDocumentType | null {
  if (!MEMBER_DOCUMENT_TYPES.includes(value as MemberDocumentType)) return null;
  return value as MemberDocumentType;
}

export function getSupersededByMap<T extends PortalSubmissionThreadNode>(submissions: T[]) {
  const byId = new Map(submissions.map((submission) => [submission.id, submission]));
  const supersededBy = new Map<string, T>();

  for (const submission of submissions) {
    const supersededId = submission.supersedesSubmissionId;
    if (!supersededId) continue;
    if (!byId.has(supersededId)) continue;

    const existing = supersededBy.get(supersededId);
    if (!existing || compareByCreatedDesc(submission, existing) < 0) {
      supersededBy.set(supersededId, submission);
    }
  }

  return supersededBy;
}

export function getCurrentSubmissionByDocumentType<T extends PortalSubmissionThreadNode>(
  submissions: T[],
) {
  const supersededBy = getSupersededByMap(submissions);
  const byDocumentType = new Map<string, T[]>();

  for (const submission of submissions) {
    const list = byDocumentType.get(submission.documentType) ?? [];
    list.push(submission);
    byDocumentType.set(submission.documentType, list);
  }

  const currentByDocumentType = new Map<string, T>();

  for (const [documentType, list] of byDocumentType.entries()) {
    const heads = list.filter((submission) => !supersededBy.has(submission.id));
    const candidates = heads.length > 0 ? heads : list;
    const selected = [...candidates].sort(compareByCreatedDesc)[0];
    if (selected) currentByDocumentType.set(documentType, selected);
  }

  return currentByDocumentType;
}
