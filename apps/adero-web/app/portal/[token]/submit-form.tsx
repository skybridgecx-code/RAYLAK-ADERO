"use client";

import { useState, useTransition } from "react";
import type { MemberDocumentType } from "~/lib/validators";
import { MEMBER_DOCUMENT_TYPE_LABELS } from "~/lib/validators";
import { MAX_FILE_BYTES } from "~/lib/s3";
import { submitPortalDocument } from "./submit-actions";

type UploadPhase = "idle" | "uploading" | "submitting" | "done" | "error";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PortalSubmitForm({
  token,
  memberType,
  profileId,
  allowedDocumentTypes,
  storageConfigured,
}: {
  token: string;
  memberType: "company" | "operator";
  profileId: string;
  allowedDocumentTypes: MemberDocumentType[];
  storageConfigured: boolean;
}) {
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const isPending = phase === "uploading" || phase === "submitting";

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!storageConfigured) {
      setSelectedFile(null);
      setFileError(null);
      e.target.value = "";
      return;
    }

    const file = e.target.files?.[0] ?? null;
    setFileError(null);
    if (!file) {
      setSelectedFile(null);
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setFileError(`File is too large (max ${formatBytes(MAX_FILE_BYTES)}).`);
      setSelectedFile(null);
      e.target.value = "";
      return;
    }
    setSelectedFile(file);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    // Step 1: upload file if one was selected
    if (selectedFile) {
      if (!storageConfigured) {
        setError("File attachments are not available yet.");
        setPhase("error");
        return;
      }
      setPhase("uploading");
      try {
        const params = new URLSearchParams({
          token,
          contentType: selectedFile.type,
        });
        const resp = await fetch(`/api/portal/presign?${params.toString()}`);
        if (!resp.ok) {
          const body = (await resp.json()) as { error?: string };
          throw new Error(body.error ?? "Upload URL request failed.");
        }
        const { uploadUrl, fileKey } = (await resp.json()) as {
          uploadUrl: string;
          fileKey: string;
        };

        const putResp = await fetch(uploadUrl, {
          method: "PUT",
          body: selectedFile,
          headers: { "Content-Type": selectedFile.type },
        });
        if (!putResp.ok) throw new Error("File upload to storage failed.");

        fd.append("fileKey", fileKey);
        fd.append("fileName", selectedFile.name);
        fd.append("fileSizeBytes", String(selectedFile.size));
      } catch (err) {
        setError(err instanceof Error ? err.message : "File upload failed. Please try again.");
        setPhase("error");
        return;
      }
    }

    // Step 2: save submission via server action
    setPhase("submitting");
    startTransition(async () => {
      const result = await submitPortalDocument({ error: null, submitted: false }, fd);
      if (result.submitted) {
        setPhase("done");
      } else {
        setError(result.error ?? "Submission failed. Please try again.");
        setPhase("error");
      }
    });
  }

  if (phase === "done") {
    return (
      <div
        className="rounded-xl border px-5 py-4 space-y-1"
        style={{ borderColor: "rgba(34,197,94,0.2)", background: "rgba(34,197,94,0.04)" }}
      >
        <p className="text-sm font-medium" style={{ color: "#4ade80" }}>
          Submission received.
        </p>
        <p className="text-xs" style={{ color: "#64748b" }}>
          Your update has been sent to your Adero representative for review.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="memberType" value={memberType} />
      <input type="hidden" name="profileId" value={profileId} />

      {/* Document type */}
      <div className="space-y-1.5">
        <label
          htmlFor="ps-documentType"
          className="block text-xs font-medium"
          style={{ color: "#94a3b8" }}
        >
          Document type
        </label>
        <select
          id="ps-documentType"
          name="documentType"
          required
          disabled={isPending}
          defaultValue=""
          className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none disabled:opacity-60"
          style={{ borderColor: "rgba(255,255,255,0.1)", color: "#e2e8f0", background: "#0f172a" }}
        >
          <option value="" disabled style={{ background: "#0f172a" }}>
            Select a document type…
          </option>
          {allowedDocumentTypes.map((t) => (
            <option key={t} value={t} style={{ background: "#0f172a" }}>
              {MEMBER_DOCUMENT_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      {/* Note */}
      <div className="space-y-1.5">
        <label
          htmlFor="ps-memberNote"
          className="block text-xs font-medium"
          style={{ color: "#94a3b8" }}
        >
          Describe your submission
        </label>
        <textarea
          id="ps-memberNote"
          name="memberNote"
          rows={3}
          required
          disabled={isPending}
          placeholder="e.g. Policy #12345, insurer ABC, expires Jan 2027."
          className="w-full rounded-lg border bg-transparent px-3 py-2.5 text-sm outline-none resize-none disabled:opacity-60 placeholder:text-slate-700"
          style={{ borderColor: "rgba(255,255,255,0.1)", color: "#e2e8f0" }}
        />
      </div>

      {/* File attachment (optional) */}
      <div className="space-y-1.5">
        <label
          htmlFor="ps-file"
          className="block text-xs font-medium"
          style={{ color: "#94a3b8" }}
        >
          Attach a file{" "}
          <span style={{ color: "#334155" }}>(optional — PDF, JPEG, PNG, DOCX, max 10 MB)</span>
        </label>
        {storageConfigured ? (
          <input
            id="ps-file"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
            disabled={isPending}
            onChange={handleFileChange}
            className="block w-full text-xs disabled:opacity-60"
            style={{ color: "#64748b" }}
          />
        ) : (
          <p className="text-xs" style={{ color: "#64748b" }}>
            File attachments are not available yet.
          </p>
        )}
        {fileError && (
          <p className="text-xs" style={{ color: "#f87171" }}>
            {fileError}
          </p>
        )}
        {selectedFile && !fileError && (
          <p className="text-[11px]" style={{ color: "#475569" }}>
            {selectedFile.name} · {formatBytes(selectedFile.size)}
          </p>
        )}
      </div>

      <p className="text-[11px]" style={{ color: "#334155" }}>
        Do not include sensitive personal or payment information.
      </p>

      {error && (
        <p className="text-xs" style={{ color: "#f87171" }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending || !!fileError}
        className="rounded-lg px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-50"
        style={{ background: "#6366f1", color: "#fff" }}
      >
        {phase === "uploading"
          ? "Uploading file…"
          : phase === "submitting"
            ? "Submitting…"
            : "Submit update"}
      </button>
    </form>
  );
}
