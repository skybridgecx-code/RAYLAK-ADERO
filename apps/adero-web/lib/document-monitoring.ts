import type { AderoMemberDocument } from "@raylak/db";
import type {
  MemberDocumentDisplayStatus,
  MemberDocumentStatus,
  MemberDocumentType,
} from "./validators";

export type AderoMemberType = "company" | "operator";

export const DOCUMENT_EXPIRING_SOON_DAYS = 30;

export const REQUIRED_MEMBER_DOCUMENT_TYPES_BY_TYPE: Record<
  AderoMemberType,
  readonly MemberDocumentType[]
> = {
  company: ["insurance", "permit", "registration", "contract"],
  operator: ["insurance", "license", "registration", "contract"],
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseStoredDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

function normalizeStoredStatus(status: string): MemberDocumentStatus {
  switch (status) {
    case "approved":
    case "expired":
    case "rejected":
      return status;
    case "pending_review":
    default:
      return "pending_review";
  }
}

export function daysUntilExpiration(expirationDate: string, now = new Date()) {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor(
    (startOfDay(parseStoredDate(expirationDate)).getTime() - startOfDay(now).getTime()) / msPerDay,
  );
}

export function getRequiredDocumentTypes(memberType: AderoMemberType) {
  return REQUIRED_MEMBER_DOCUMENT_TYPES_BY_TYPE[memberType];
}

export function getDocumentDisplayStatus(
  document: Pick<AderoMemberDocument, "status" | "expirationDate">,
  now = new Date(),
): MemberDocumentDisplayStatus {
  const normalizedStatus = normalizeStoredStatus(document.status);

  if (normalizedStatus === "rejected") return "rejected";
  if (normalizedStatus === "expired") return "expired";

  if (document.expirationDate) {
    const daysRemaining = daysUntilExpiration(document.expirationDate, now);
    if (daysRemaining < 0) return "expired";
    if (daysRemaining <= DOCUMENT_EXPIRING_SOON_DAYS) return "expiring_soon";
  }

  return normalizedStatus;
}

export function getLatestDocumentsByType(documents: AderoMemberDocument[]) {
  const latest = new Map<MemberDocumentType, AderoMemberDocument>();

  for (const document of documents) {
    const documentType = document.documentType as MemberDocumentType;
    if (!latest.has(documentType)) {
      latest.set(documentType, document);
    }
  }

  return latest;
}

export function getMemberDocumentSummary(
  memberType: AderoMemberType,
  documents: AderoMemberDocument[],
  now = new Date(),
) {
  const requiredTypes = getRequiredDocumentTypes(memberType);
  const latestByType = getLatestDocumentsByType(documents);
  const requiredDocuments = requiredTypes.map((documentType) => {
    const document = latestByType.get(documentType) ?? null;
    const displayStatus: MemberDocumentDisplayStatus = document
      ? getDocumentDisplayStatus(document, now)
      : "missing";

    return { documentType, document, displayStatus };
  });

  const missingRequired = requiredDocuments.filter((entry) => entry.displayStatus === "missing");
  const presentRequiredCount = requiredDocuments.length - missingRequired.length;
  const expiringSoonDocuments = documents.filter(
    (document) => getDocumentDisplayStatus(document, now) === "expiring_soon",
  );
  const expiredDocuments = documents.filter(
    (document) => getDocumentDisplayStatus(document, now) === "expired",
  );

  return {
    requiredTypes,
    requiredDocuments,
    requiredCount: requiredDocuments.length,
    presentRequiredCount,
    missingRequiredCount: missingRequired.length,
    missingRequiredTypes: missingRequired.map((entry) => entry.documentType),
    expiringSoonDocuments,
    expiringSoonCount: expiringSoonDocuments.length,
    expiredDocuments,
    expiredCount: expiredDocuments.length,
    issueCount: missingRequired.length + expiringSoonDocuments.length + expiredDocuments.length,
  };
}
