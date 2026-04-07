import type { AderoDocumentComplianceNotification } from "@raylak/db";
import type { AderoMemberType } from "./document-monitoring";
import type { MemberDocumentComplianceAction, MemberDocumentType } from "./validators";

export function getComplianceProfileId(
  memberType: AderoMemberType,
  item: Pick<AderoDocumentComplianceNotification, "companyProfileId" | "operatorProfileId">,
) {
  return memberType === "company" ? item.companyProfileId : item.operatorProfileId;
}

export function getComplianceIssueKey({
  memberType,
  profileId,
  documentType,
}: {
  memberType: AderoMemberType;
  profileId: string;
  documentType: string;
}) {
  return `${memberType}:${profileId}:${documentType}`;
}

export function groupComplianceNotificationsByIssue(
  notifications: AderoDocumentComplianceNotification[],
) {
  const grouped = new Map<string, AderoDocumentComplianceNotification[]>();

  for (const notification of notifications) {
    const profileId = getComplianceProfileId(
      notification.memberType as AderoMemberType,
      notification,
    );
    if (!profileId) continue;

    const key = getComplianceIssueKey({
      memberType: notification.memberType as AderoMemberType,
      profileId,
      documentType: notification.documentType,
    });
    const existing = grouped.get(key) ?? [];
    existing.push(notification);
    grouped.set(key, existing);
  }

  return grouped;
}

export function getLatestComplianceNotification(
  notifications: AderoDocumentComplianceNotification[],
  memberType: AderoMemberType,
  profileId: string,
  documentType: MemberDocumentType,
) {
  const grouped = groupComplianceNotificationsByIssue(notifications);
  const key = getComplianceIssueKey({ memberType, profileId, documentType });
  return grouped.get(key)?.[0] ?? null;
}

export function getCurrentComplianceAction(
  notifications: AderoDocumentComplianceNotification[],
  memberType: AderoMemberType,
  profileId: string,
  documentType: MemberDocumentType,
): MemberDocumentComplianceAction | null {
  const latest = getLatestComplianceNotification(
    notifications,
    memberType,
    profileId,
    documentType,
  );
  return latest ? (latest.actionType as MemberDocumentComplianceAction) : null;
}
