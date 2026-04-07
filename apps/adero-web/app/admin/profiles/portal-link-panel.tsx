"use client";

import { useActionState, useState, useTransition } from "react";
import type { AderoAuditLog } from "@raylak/db";
import type { AderoMemberType } from "~/lib/document-monitoring";
import {
  expirePortalToken,
  logPortalDeliveryEvent,
  rotatePortalToken,
  sendPortalLinkByEmail,
  type PortalActionState,
} from "./portal-actions";

const initialState: PortalActionState = { error: null, saved: false };

function fmtTimestamp(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const EVENT_LABELS: Record<string, string> = {
  portal_link_copied: "Link copied",
  portal_link_shared: "Marked as shared",
  portal_link_emailed: "Emailed to member",
  renewal_outreach_emailed: "Renewal outreach sent",
  portal_token_rotated: "Token rotated",
  portal_token_expired: "Token expired",
};

function TokenStateBadge({ expiresAt }: { expiresAt: Date | null }) {
  const now = new Date();
  if (expiresAt && expiresAt <= now) {
    return (
      <span
        className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
        style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}
      >
        Expired · {fmtTimestamp(expiresAt)}
      </span>
    );
  }
  return (
    <span
      className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{ background: "rgba(34,197,94,0.1)", color: "#4ade80" }}
    >
      Active
    </span>
  );
}

export function PortalLinkPanel({
  memberType,
  profileId,
  memberName,
  memberEmail,
  portalToken,
  portalTokenExpiresAt,
  recentEvents,
}: {
  memberType: AderoMemberType;
  profileId: string;
  memberName: string;
  memberEmail: string;
  portalToken: string;
  portalTokenExpiresAt: Date | null;
  recentEvents: AderoAuditLog[];
}) {
  const [copied, setCopied] = useState(false);
  const [shareLogged, setShareLogged] = useState(false);
  const [isConfirmingRotate, setIsConfirmingRotate] = useState(false);
  const [isConfirmingExpire, setIsConfirmingExpire] = useState(false);
  const [, startTransition] = useTransition();
  const [rotateState, rotateAction, isRotating] = useActionState(
    rotatePortalToken,
    initialState,
  );
  const [expireState, expireAction, isExpiring] = useActionState(
    expirePortalToken,
    initialState,
  );
  const [emailState, emailAction, isSendingEmail] = useActionState(
    sendPortalLinkByEmail,
    initialState,
  );

  const portalPath = `/portal/${portalToken}`;
  const now = new Date();
  const isExpired = portalTokenExpiresAt !== null && portalTokenExpiresAt <= now;

  function buildDeliveryFormData(eventType: "link_copied" | "link_shared") {
    const fd = new FormData();
    fd.set("memberType", memberType);
    fd.set("profileId", profileId);
    fd.set("memberName", memberName);
    fd.set("eventType", eventType);
    return fd;
  }

  async function handleCopy() {
    const url = `${window.location.origin}${portalPath}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the input text
    }
    startTransition(() => {
      void logPortalDeliveryEvent(buildDeliveryFormData("link_copied"));
    });
  }

  function handleMarkShared() {
    setShareLogged(true);
    setTimeout(() => setShareLogged(false), 3000);
    startTransition(() => {
      void logPortalDeliveryEvent(buildDeliveryFormData("link_shared"));
    });
  }

  return (
    <div
      className="rounded-xl border p-5 space-y-5"
      style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[3px]" style={{ color: "#475569" }}>
          Member Portal Link
        </p>
        <TokenStateBadge expiresAt={portalTokenExpiresAt} />
      </div>

      {/* Expired notice */}
      {isExpired && (
        <div
          className="rounded-lg border px-3 py-2.5"
          style={{ borderColor: "rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.05)" }}
        >
          <p className="text-xs" style={{ color: "#f87171" }}>
            This portal link is expired. The member cannot access it. Rotate the token below to
            issue a new active link.
          </p>
        </div>
      )}

      {/* Portal path display */}
      <div className="space-y-2">
        <p className="text-[11px]" style={{ color: "#475569" }}>
          Share this link with{" "}
          <span style={{ color: "#94a3b8" }}>{memberName}</span> so they can view their document
          status.
        </p>

        <div
          className="flex items-center gap-2 rounded-lg border px-3 py-2"
          style={{ borderColor: "rgba(255,255,255,0.1)", background: "#0f172a" }}
        >
          <code
            className="min-w-0 flex-1 truncate text-xs"
            style={{ color: isExpired ? "#475569" : "#6366f1" }}
          >
            {portalPath}
          </code>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleCopy}
            disabled={isExpired}
            className="rounded-md px-3 py-1.5 text-xs font-medium transition-opacity disabled:opacity-40"
            style={{
              background: copied ? "rgba(34,197,94,0.15)" : "rgba(99,102,241,0.15)",
              color: copied ? "#4ade80" : "#818cf8",
            }}
          >
            {copied ? "Copied!" : "Copy link"}
          </button>

          <button
            type="button"
            onClick={handleMarkShared}
            disabled={shareLogged || isExpired}
            className="rounded-md px-3 py-1.5 text-xs font-medium transition-opacity disabled:opacity-60"
            style={{
              background: shareLogged ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.06)",
              color: shareLogged ? "#4ade80" : "#64748b",
            }}
          >
            {shareLogged ? "Logged as shared" : "Mark as shared"}
          </button>
        </div>
      </div>

      {/* Send by email */}
      <div className="border-t space-y-3 pt-4" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <p className="text-[11px] font-semibold uppercase tracking-[2px]" style={{ color: "#334155" }}>
          Email to Member
        </p>

        {emailState.saved ? (
          <p className="text-xs" style={{ color: "#4ade80" }}>
            Portal link emailed to{" "}
            <span style={{ color: "#94a3b8" }}>{memberEmail}</span>.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-[11px]" style={{ color: "#475569" }}>
              Send the current portal link directly to{" "}
              <span style={{ color: "#94a3b8" }}>{memberEmail}</span>.
            </p>

            <form action={emailAction}>
              <input type="hidden" name="memberType" value={memberType} />
              <input type="hidden" name="profileId" value={profileId} />

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="submit"
                  disabled={isSendingEmail || isExpired}
                  className="rounded-md px-3 py-1.5 text-xs font-medium transition-opacity disabled:opacity-50"
                  style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8" }}
                >
                  {isSendingEmail ? "Sending…" : "Send link by email"}
                </button>
              </div>

              {emailState.error && (
                <p className="mt-2 text-xs" style={{ color: "#f87171" }}>
                  {emailState.error}
                </p>
              )}
            </form>
          </div>
        )}
      </div>

      {/* Expire now */}
      {!isExpired && (
        <div className="border-t space-y-3 pt-4" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <p className="text-[11px] font-semibold uppercase tracking-[2px]" style={{ color: "#334155" }}>
            Expire Link
          </p>

          {expireState.saved ? (
            <p className="text-xs" style={{ color: "#4ade80" }}>
              Link expired. The member can no longer access the portal with this URL. Rotate the
              token below to issue a new link.
            </p>
          ) : isConfirmingExpire ? (
            <div className="space-y-3">
              <p className="text-xs" style={{ color: "#f87171" }}>
                This will immediately block{" "}
                <span style={{ color: "#94a3b8" }}>{memberName}</span> from accessing the portal.
                The link URL stays the same but becomes invalid. You can issue a new link by
                rotating the token.
              </p>

              <form action={expireAction} className="space-y-2">
                <input type="hidden" name="memberType" value={memberType} />
                <input type="hidden" name="profileId" value={profileId} />

                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={isExpiring}
                    className="rounded-md px-3 py-1.5 text-xs font-medium transition-opacity disabled:opacity-50"
                    style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}
                  >
                    {isExpiring ? "Expiring…" : "Yes, expire now"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsConfirmingExpire(false)}
                    className="rounded-md px-3 py-1.5 text-xs transition-opacity"
                    style={{ color: "#475569" }}
                  >
                    Cancel
                  </button>
                </div>

                {expireState.error && (
                  <p className="text-xs" style={{ color: "#f87171" }}>
                    {expireState.error}
                  </p>
                )}
              </form>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[11px]" style={{ color: "#475569" }}>
                Immediately invalidate this link without issuing a new one.
              </p>
              <button
                type="button"
                onClick={() => setIsConfirmingExpire(true)}
                className="rounded-md px-3 py-1.5 text-xs font-medium transition-opacity"
                style={{
                  background: "rgba(239,68,68,0.08)",
                  color: "#ef4444",
                  border: "1px solid rgba(239,68,68,0.15)",
                }}
              >
                Expire link now
              </button>
            </div>
          )}
        </div>
      )}

      {/* Rotate token */}
      <div className="border-t space-y-3 pt-4" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <p className="text-[11px] font-semibold uppercase tracking-[2px]" style={{ color: "#334155" }}>
          Token Rotation
        </p>

        {rotateState.saved ? (
          <p className="text-xs" style={{ color: "#4ade80" }}>
            Token rotated. The previous link is now invalid. Copy the new link above.
          </p>
        ) : isConfirmingRotate ? (
          <div className="space-y-3">
            <p className="text-xs" style={{ color: "#f87171" }}>
              This will generate a new portal URL and invalidate the current one.{" "}
              <span style={{ color: "#94a3b8" }}>{memberName}</span> will need the new URL to
              access their status page. The new token will have no expiry set.
            </p>

            <form action={rotateAction} className="space-y-2">
              <input type="hidden" name="memberType" value={memberType} />
              <input type="hidden" name="profileId" value={profileId} />

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={isRotating}
                  className="rounded-md px-3 py-1.5 text-xs font-medium transition-opacity disabled:opacity-50"
                  style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}
                >
                  {isRotating ? "Rotating…" : "Yes, rotate token"}
                </button>

                <button
                  type="button"
                  onClick={() => setIsConfirmingRotate(false)}
                  className="rounded-md px-3 py-1.5 text-xs transition-opacity"
                  style={{ color: "#475569" }}
                >
                  Cancel
                </button>
              </div>

              {rotateState.error && (
                <p className="text-xs" style={{ color: "#f87171" }}>
                  {rotateState.error}
                </p>
              )}
            </form>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[11px]" style={{ color: "#475569" }}>
              {isExpired
                ? "Generate a new active link. The expired link will remain invalid."
                : "If the current link has been compromised, rotate the token to invalidate it."}
            </p>
            <button
              type="button"
              onClick={() => setIsConfirmingRotate(true)}
              className="rounded-md px-3 py-1.5 text-xs font-medium transition-opacity"
              style={{
                background: "rgba(255,255,255,0.05)",
                color: "#64748b",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              Rotate portal token
            </button>
          </div>
        )}
      </div>

      {/* Delivery history */}
      {recentEvents.length > 0 && (
        <div className="border-t space-y-3 pt-4" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <p className="text-[11px] font-semibold uppercase tracking-[2px]" style={{ color: "#334155" }}>
            Delivery History
          </p>
          <div className="space-y-2">
            {recentEvents.map((event) => (
              <div key={event.id} className="flex items-start gap-3">
                <span
                  className="mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                  style={{ background: "rgba(99,102,241,0.1)", color: "#818cf8" }}
                >
                  {EVENT_LABELS[event.action] ?? event.action.replace(/_/g, " ")}
                </span>
                <div className="min-w-0">
                  <p className="text-[11px]" style={{ color: "#475569" }}>
                    {fmtTimestamp(event.createdAt)}
                    {event.actorName ? ` · ${event.actorName}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
