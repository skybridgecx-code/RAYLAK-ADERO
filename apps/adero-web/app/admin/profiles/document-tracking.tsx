"use client";

import type { AderoDocumentComplianceNotification, AderoMemberDocument } from "@raylak/db";
import { useActionState } from "react";
import { StatusBadge } from "~/components/status-badge";
import { getCurrentComplianceAction } from "~/lib/document-compliance";
import {
  getDocumentDisplayStatus,
  getMemberDocumentSummary,
  type AderoMemberType,
} from "~/lib/document-monitoring";
import {
  MEMBER_DOCUMENT_STATUSES,
  MEMBER_DOCUMENT_STATUS_LABELS,
  MEMBER_DOCUMENT_TYPES,
  MEMBER_DOCUMENT_TYPE_LABELS,
  type MemberDocumentType,
  type MemberDocumentDisplayStatus,
} from "~/lib/validators";
import { createMemberDocument, type DocumentActionState, updateMemberDocument } from "./actions";
import { DocumentComplianceActionForm } from "./document-compliance-action-form";

const initialDocumentActionState: DocumentActionState = {
  error: null,
  fieldErrors: {},
  saved: false,
};

function FieldError({ messages }: { messages: string[] | undefined }) {
  if (!messages?.length) return null;
  return (
    <p className="mt-1 text-xs" style={{ color: "#f87171" }}>
      {messages[0]}
    </p>
  );
}

function fmtTimestamp(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDate(value: string | null) {
  if (!value) return "-";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const DOCUMENT_STATUS_COLORS: Record<MemberDocumentDisplayStatus, { bg: string; color: string }> = {
  missing: { bg: "rgba(148,163,184,0.15)", color: "#94a3b8" },
  expiring_soon: { bg: "rgba(249,115,22,0.15)", color: "#fb923c" },
  pending_review: { bg: "rgba(234,179,8,0.15)", color: "#facc15" },
  approved: { bg: "rgba(34,197,94,0.2)", color: "#22c55e" },
  expired: { bg: "rgba(239,68,68,0.15)", color: "#f87171" },
  rejected: { bg: "rgba(239,68,68,0.15)", color: "#f87171" },
};

function DocumentStatusBadge({ status }: { status: MemberDocumentDisplayStatus }) {
  const colors = DOCUMENT_STATUS_COLORS[status];

  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ background: colors.bg, color: colors.color }}
    >
      {MEMBER_DOCUMENT_STATUS_LABELS[status]}
    </span>
  );
}

function DocumentSummary({
  memberType,
  profileId,
  documents,
  complianceNotifications,
}: {
  memberType: AderoMemberType;
  profileId: string;
  documents: AderoMemberDocument[];
  complianceNotifications: AderoDocumentComplianceNotification[];
}) {
  const summary = getMemberDocumentSummary(memberType, documents);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div
          className="rounded-xl border p-4"
          style={{
            borderColor: "rgba(255,255,255,0.07)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-[3px]"
            style={{ color: "#475569" }}
          >
            Required Present
          </p>
          <p className="mt-3 text-2xl font-light" style={{ color: "#f1f5f9" }}>
            {summary.presentRequiredCount}/{summary.requiredCount}
          </p>
        </div>

        <div
          className="rounded-xl border p-4"
          style={{
            borderColor: "rgba(255,255,255,0.07)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-[3px]"
            style={{ color: "#475569" }}
          >
            Missing Required
          </p>
          <p className="mt-3 text-2xl font-light" style={{ color: "#f1f5f9" }}>
            {summary.missingRequiredCount}
          </p>
        </div>

        <div
          className="rounded-xl border p-4"
          style={{
            borderColor: "rgba(255,255,255,0.07)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-[3px]"
            style={{ color: "#475569" }}
          >
            Expiring Soon
          </p>
          <p className="mt-3 text-2xl font-light" style={{ color: "#f1f5f9" }}>
            {summary.expiringSoonCount}
          </p>
        </div>

        <div
          className="rounded-xl border p-4"
          style={{
            borderColor: "rgba(255,255,255,0.07)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-[3px]"
            style={{ color: "#475569" }}
          >
            Expired
          </p>
          <p className="mt-3 text-2xl font-light" style={{ color: "#f1f5f9" }}>
            {summary.expiredCount}
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {summary.requiredDocuments.map(({ documentType, document, displayStatus }) => {
          const currentComplianceAction = getCurrentComplianceAction(
            complianceNotifications,
            memberType,
            profileId,
            documentType as MemberDocumentType,
          );

          return (
            <div
              key={documentType}
              className="rounded-xl border p-4"
              style={{
                borderColor: "rgba(255,255,255,0.07)",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-[3px]"
                style={{ color: "#475569" }}
              >
                {MEMBER_DOCUMENT_TYPE_LABELS[documentType]}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <DocumentStatusBadge status={displayStatus} />
                {currentComplianceAction ? <StatusBadge status={currentComplianceAction} /> : null}
              </div>
              <p className="mt-3 text-xs" style={{ color: "#64748b" }}>
                {document ? document.title : "No tracked record"}
              </p>
              <p className="mt-1 text-[11px]" style={{ color: "#475569" }}>
                {document?.expirationDate
                  ? `Expires ${fmtDate(document.expirationDate)}`
                  : "No expiration"}
              </p>
              {!document ? (
                <div className="mt-4">
                  <DocumentComplianceActionForm
                    memberType={memberType}
                    profileId={profileId}
                    documentType={documentType as MemberDocumentType}
                    notifications={complianceNotifications}
                    compact
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NewDocumentForm({
  memberType,
  profileId,
  accent,
}: {
  memberType: AderoMemberType;
  profileId: string;
  accent: { bg: string; color: string; border: string };
}) {
  const [state, formAction, isPending] = useActionState(
    createMemberDocument,
    initialDocumentActionState,
  );

  return (
    <form
      action={formAction}
      className="rounded-xl border p-5"
      style={{ borderColor: accent.border, background: "rgba(255,255,255,0.02)" }}
    >
      <input type="hidden" name="memberType" value={memberType} />
      <input type="hidden" name="profileId" value={profileId} />

      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium" style={{ color: "#f1f5f9" }}>
            Add tracked document
          </p>
          <p className="mt-1 text-xs" style={{ color: "#475569" }}>
            Record internal status and metadata only.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label
            className="mb-1.5 block text-xs font-medium"
            htmlFor={`new-title-${profileId}`}
            style={{ color: "#64748b" }}
          >
            Title
          </label>
          <input
            id={`new-title-${profileId}`}
            name="title"
            placeholder="General liability policy"
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{
              borderColor: "rgba(255,255,255,0.12)",
              background: "#1e293b",
              color: "#f1f5f9",
            }}
          />
          <FieldError messages={state.fieldErrors["title"]} />
        </div>

        <div>
          <label
            className="mb-1.5 block text-xs font-medium"
            htmlFor={`new-document-type-${profileId}`}
            style={{ color: "#64748b" }}
          >
            Type
          </label>
          <select
            id={`new-document-type-${profileId}`}
            name="documentType"
            defaultValue="insurance"
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{
              borderColor: "rgba(255,255,255,0.12)",
              background: "#1e293b",
              color: "#f1f5f9",
            }}
          >
            {MEMBER_DOCUMENT_TYPES.map((documentType) => (
              <option key={documentType} value={documentType}>
                {MEMBER_DOCUMENT_TYPE_LABELS[documentType]}
              </option>
            ))}
          </select>
          <FieldError messages={state.fieldErrors["documentType"]} />
        </div>

        <div>
          <label
            className="mb-1.5 block text-xs font-medium"
            htmlFor={`new-status-${profileId}`}
            style={{ color: "#64748b" }}
          >
            Status
          </label>
          <select
            id={`new-status-${profileId}`}
            name="status"
            defaultValue="pending_review"
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{
              borderColor: "rgba(255,255,255,0.12)",
              background: "#1e293b",
              color: "#f1f5f9",
            }}
          >
            {MEMBER_DOCUMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {MEMBER_DOCUMENT_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          <FieldError messages={state.fieldErrors["status"]} />
        </div>

        <div>
          <label
            className="mb-1.5 block text-xs font-medium"
            htmlFor={`new-expiration-${profileId}`}
            style={{ color: "#64748b" }}
          >
            Expiration date
          </label>
          <input
            id={`new-expiration-${profileId}`}
            name="expirationDate"
            type="date"
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{
              borderColor: "rgba(255,255,255,0.12)",
              background: "#1e293b",
              color: "#f1f5f9",
            }}
          />
          <FieldError messages={state.fieldErrors["expirationDate"]} />
        </div>

        <div>
          <label
            className="mb-1.5 block text-xs font-medium"
            htmlFor={`new-actor-${profileId}`}
            style={{ color: "#64748b" }}
          >
            Your name
          </label>
          <input
            id={`new-actor-${profileId}`}
            name="actorName"
            placeholder="Optional"
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{
              borderColor: "rgba(255,255,255,0.12)",
              background: "#1e293b",
              color: "#f1f5f9",
            }}
          />
          <FieldError messages={state.fieldErrors["actorName"]} />
        </div>

        <div className="md:col-span-2">
          <label
            className="mb-1.5 block text-xs font-medium"
            htmlFor={`new-notes-${profileId}`}
            style={{ color: "#64748b" }}
          >
            Notes
          </label>
          <textarea
            id={`new-notes-${profileId}`}
            name="notes"
            rows={3}
            placeholder="Internal notes, exceptions, reviewer context..."
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{
              borderColor: "rgba(255,255,255,0.12)",
              background: "#1e293b",
              color: "#f1f5f9",
            }}
          />
          <FieldError messages={state.fieldErrors["notes"]} />
        </div>
      </div>

      {state.error && (
        <p className="mt-4 text-xs" style={{ color: "#f87171" }}>
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="mt-5 rounded-lg px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-50"
        style={{ background: accent.bg, color: accent.color }}
      >
        {isPending ? "Saving..." : "Add document"}
      </button>
    </form>
  );
}

function ExistingDocumentForm({
  document,
  memberType,
  profileId,
  accent,
  complianceNotifications,
}: {
  document: AderoMemberDocument;
  memberType: AderoMemberType;
  profileId: string;
  accent: { bg: string; color: string; border: string };
  complianceNotifications: AderoDocumentComplianceNotification[];
}) {
  const [state, formAction, isPending] = useActionState(
    updateMemberDocument,
    initialDocumentActionState,
  );
  const displayStatus = getDocumentDisplayStatus(document);

  return (
    <form
      action={formAction}
      className="rounded-xl border p-5"
      style={{
        borderColor: "rgba(255,255,255,0.07)",
        background: "rgba(255,255,255,0.02)",
      }}
    >
      <input type="hidden" name="memberType" value={memberType} />
      <input type="hidden" name="profileId" value={profileId} />
      <input type="hidden" name="documentId" value={document.id} />

      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium" style={{ color: "#f1f5f9" }}>
            {document.title}
          </p>
          <p className="mt-1 text-xs" style={{ color: "#475569" }}>
            Updated {fmtTimestamp(document.updatedAt)}
          </p>
        </div>
        <DocumentStatusBadge status={displayStatus} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label
            className="mb-1.5 block text-xs font-medium"
            htmlFor={`document-title-${document.id}`}
            style={{ color: "#64748b" }}
          >
            Title
          </label>
          <input
            id={`document-title-${document.id}`}
            name="title"
            defaultValue={document.title}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{
              borderColor: "rgba(255,255,255,0.12)",
              background: "#1e293b",
              color: "#f1f5f9",
            }}
          />
          <FieldError messages={state.fieldErrors["title"]} />
        </div>

        <div>
          <label
            className="mb-1.5 block text-xs font-medium"
            htmlFor={`document-type-${document.id}`}
            style={{ color: "#64748b" }}
          >
            Type
          </label>
          <select
            id={`document-type-${document.id}`}
            name="documentType"
            defaultValue={document.documentType}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{
              borderColor: "rgba(255,255,255,0.12)",
              background: "#1e293b",
              color: "#f1f5f9",
            }}
          >
            {MEMBER_DOCUMENT_TYPES.map((documentType) => (
              <option key={documentType} value={documentType}>
                {MEMBER_DOCUMENT_TYPE_LABELS[documentType]}
              </option>
            ))}
          </select>
          <FieldError messages={state.fieldErrors["documentType"]} />
        </div>

        <div>
          <label
            className="mb-1.5 block text-xs font-medium"
            htmlFor={`document-status-${document.id}`}
            style={{ color: "#64748b" }}
          >
            Status
          </label>
          <select
            id={`document-status-${document.id}`}
            name="status"
            defaultValue={document.status}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{
              borderColor: "rgba(255,255,255,0.12)",
              background: "#1e293b",
              color: "#f1f5f9",
            }}
          >
            {MEMBER_DOCUMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {MEMBER_DOCUMENT_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          <FieldError messages={state.fieldErrors["status"]} />
        </div>

        <div>
          <label
            className="mb-1.5 block text-xs font-medium"
            htmlFor={`document-expiration-${document.id}`}
            style={{ color: "#64748b" }}
          >
            Expiration date
          </label>
          <input
            id={`document-expiration-${document.id}`}
            name="expirationDate"
            type="date"
            defaultValue={document.expirationDate ?? ""}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{
              borderColor: "rgba(255,255,255,0.12)",
              background: "#1e293b",
              color: "#f1f5f9",
            }}
          />
          <FieldError messages={state.fieldErrors["expirationDate"]} />
        </div>

        <div>
          <label
            className="mb-1.5 block text-xs font-medium"
            htmlFor={`document-actor-${document.id}`}
            style={{ color: "#64748b" }}
          >
            Your name
          </label>
          <input
            id={`document-actor-${document.id}`}
            name="actorName"
            placeholder="Optional"
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{
              borderColor: "rgba(255,255,255,0.12)",
              background: "#1e293b",
              color: "#f1f5f9",
            }}
          />
          <FieldError messages={state.fieldErrors["actorName"]} />
        </div>

        <div className="md:col-span-2">
          <label
            className="mb-1.5 block text-xs font-medium"
            htmlFor={`document-notes-${document.id}`}
            style={{ color: "#64748b" }}
          >
            Notes
          </label>
          <textarea
            id={`document-notes-${document.id}`}
            name="notes"
            rows={3}
            defaultValue={document.notes ?? ""}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{
              borderColor: "rgba(255,255,255,0.12)",
              background: "#1e293b",
              color: "#f1f5f9",
            }}
          />
          <FieldError messages={state.fieldErrors["notes"]} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs" style={{ color: "#64748b" }}>
          Expires {fmtDate(document.expirationDate)}
        </p>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-50"
          style={{ background: accent.bg, color: accent.color }}
        >
          {isPending ? "Saving..." : "Save changes"}
        </button>
      </div>

      {state.error && (
        <p className="mt-4 text-xs" style={{ color: "#f87171" }}>
          {state.error}
        </p>
      )}

      <DocumentComplianceActionForm
        memberType={memberType}
        profileId={profileId}
        documentType={document.documentType as MemberDocumentType}
        documentId={document.id}
        notifications={complianceNotifications}
      />
    </form>
  );
}

export function DocumentTracking({
  documents,
  complianceNotifications,
  memberType,
  profileId,
}: {
  documents: AderoMemberDocument[];
  complianceNotifications: AderoDocumentComplianceNotification[];
  memberType: AderoMemberType;
  profileId: string;
}) {
  const accent =
    memberType === "company"
      ? { bg: "#6366f1", color: "#fff", border: "rgba(99,102,241,0.25)" }
      : { bg: "#14b8a6", color: "#042f2e", border: "rgba(20,184,166,0.25)" };

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-[3px]" style={{ color: "#475569" }}>
          Document Tracking
        </h2>
        <p className="mt-2 text-sm" style={{ color: "#64748b" }}>
          Track required documents and internal review status for this member.
        </p>
      </div>

      <DocumentSummary
        memberType={memberType}
        profileId={profileId}
        documents={documents}
        complianceNotifications={complianceNotifications}
      />

      <NewDocumentForm memberType={memberType} profileId={profileId} accent={accent} />

      {documents.length === 0 ? (
        <p className="text-sm" style={{ color: "#334155" }}>
          No document records tracked yet.
        </p>
      ) : (
        <div className="space-y-4">
          {documents.map((document) => (
            <ExistingDocumentForm
              key={document.id}
              document={document}
              memberType={memberType}
              profileId={profileId}
              accent={accent}
              complianceNotifications={complianceNotifications}
            />
          ))}
        </div>
      )}
    </section>
  );
}
