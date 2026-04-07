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

function compareByCreatedAsc<T extends { createdAt: Date; id: string }>(a: T, b: T) {
  const timeDiff = a.createdAt.getTime() - b.createdAt.getTime();
  if (timeDiff !== 0) return timeDiff;
  return a.id.localeCompare(b.id);
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

export function getChainTimelineForSubmission<T extends PortalSubmissionThreadNode>({
  submissions,
  submissionId,
}: {
  submissions: T[];
  submissionId: string;
}) {
  const byId = new Map(submissions.map((submission) => [submission.id, submission]));
  const target = byId.get(submissionId) ?? null;
  if (!target) return { timeline: [] as T[], warnings: ["Submission not found in chain scope."] };

  const supersededBy = getSupersededByMap(submissions);
  const warnings: string[] = [];

  const ancestorVisited = new Set<string>([target.id]);
  let root = target;
  while (root.supersedesSubmissionId) {
    const parent = byId.get(root.supersedesSubmissionId);
    if (!parent) {
      warnings.push(`Missing parent submission ${root.supersedesSubmissionId}.`);
      break;
    }
    if (ancestorVisited.has(parent.id)) {
      warnings.push("Cycle detected while traversing parent links.");
      break;
    }
    ancestorVisited.add(parent.id);
    root = parent;
  }

  const timeline: T[] = [];
  const timelineVisited = new Set<string>();
  let cursor: T | null = root;
  while (cursor) {
    if (timelineVisited.has(cursor.id)) {
      warnings.push("Cycle detected while traversing successor links.");
      break;
    }
    timelineVisited.add(cursor.id);
    timeline.push(cursor);
    cursor = supersededBy.get(cursor.id) ?? null;
  }

  if (!timelineVisited.has(target.id)) {
    timeline.push(target);
    timeline.sort(compareByCreatedAsc);
    warnings.push("Selected submission is disconnected from computed chain path.");
  }

  const sortedTimeline = [...timeline].sort(compareByCreatedAsc);
  return { timeline: sortedTimeline, warnings };
}
