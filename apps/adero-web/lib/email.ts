import { Resend } from "resend";
import { env } from "./env";

// Lazy singleton — only instantiated when RESEND_API_KEY is present.
let _resend: Resend | null = null;
function getResend(): Resend | null {
  if (_resend) return _resend;
  if (!env.RESEND_API_KEY) return null;
  _resend = new Resend(env.RESEND_API_KEY);
  return _resend;
}

const DEFAULT_FROM = "Adero <portal@adero.network>";

function getFromAddress(): string {
  return env.ADERO_FROM_EMAIL ?? DEFAULT_FROM;
}

function getBaseUrl(): string {
  return env.ADERO_BASE_URL ?? "https://adero.network";
}

// ─── Shared HTML helpers ──────────────────────────────────────────────────────

function emailShell(headerTitle: string, bodyHtml: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <div style="background:#0c1425;padding:36px 40px 28px;">
      <p style="margin:0 0 6px;color:#6366f1;font-size:11px;letter-spacing:4px;text-transform:uppercase;font-weight:700;">Adero Network</p>
      <h1 style="margin:0;color:#f1f5f9;font-size:22px;font-weight:300;letter-spacing:-0.3px;">${headerTitle}</h1>
    </div>
    <div style="padding:36px 40px;">${bodyHtml}</div>
    <div style="background:#0c1425;padding:20px 40px;text-align:center;">
      <p style="margin:0;color:#334155;font-size:11px;">Adero Network · Member services</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

function ctaButton(url: string, label: string): string {
  return `
    <div style="margin:0 0 28px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px 24px;">
      <p style="margin:0 0 12px;color:#94a3b8;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">Your Portal Link</p>
      <a href="${url}" style="display:inline-block;background:#6366f1;color:#ffffff;text-decoration:none;padding:11px 22px;border-radius:7px;font-size:14px;font-weight:500;letter-spacing:0.1px;">${label}</a>
      <p style="margin:14px 0 0;word-break:break-all;color:#94a3b8;font-size:11px;">${url}</p>
    </div>
  `;
}

function privacyFooter(): string {
  return `<p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">This link is private — do not share it. If you believe it has been compromised, contact your Adero representative to request a new link. Do not reply to this email.</p>`;
}

// ─── Portal link email ────────────────────────────────────────────────────────

export interface PortalLinkEmailData {
  to: string;
  memberName: string;
  portalToken: string;
}

export async function sendPortalLinkEmail(data: PortalLinkEmailData): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.info(
      "[adero/email] RESEND_API_KEY not set — skipping portal link email for",
      data.memberName,
    );
    return;
  }

  const portalUrl = `${getBaseUrl()}/portal/${data.portalToken}`;

  const body = `
    <p style="margin:0 0 20px;color:#334155;font-size:15px;">Hello ${data.memberName},</p>
    <p style="margin:0 0 28px;color:#475569;font-size:14px;line-height:1.7;">
      Your Adero member portal link is ready. Use it to view your current document and
      compliance status, and to submit document updates to your Adero representative.
    </p>
    ${ctaButton(portalUrl, "Open Member Portal →")}
    ${privacyFooter()}
  `;

  await resend.emails.send({
    from: getFromAddress(),
    to: data.to,
    subject: "Your Adero Member Portal Link",
    html: emailShell("Your Member Portal", body),
  });
}

// ─── Renewal outreach email ───────────────────────────────────────────────────

export interface RenewalOutreachEmailData {
  to: string;
  memberName: string;
  portalToken: string;
  expiredDocumentLabels: string[];
  expiringSoonDocumentLabels: string[];
}

export async function sendRenewalOutreachEmail(data: RenewalOutreachEmailData): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.info(
      "[adero/email] RESEND_API_KEY not set — skipping renewal outreach email for",
      data.memberName,
    );
    return;
  }

  const portalUrl = `${getBaseUrl()}/portal/${data.portalToken}`;

  const docRows = [
    ...data.expiredDocumentLabels.map(
      (label) =>
        `<tr><td style="padding:7px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;">${label}</td>` +
        `<td style="padding:7px 0;border-bottom:1px solid #f1f5f9;text-align:right;"><span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:4px;background:#fee2e2;color:#b91c1c;">Expired</span></td></tr>`,
    ),
    ...data.expiringSoonDocumentLabels.map(
      (label) =>
        `<tr><td style="padding:7px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;">${label}</td>` +
        `<td style="padding:7px 0;border-bottom:1px solid #f1f5f9;text-align:right;"><span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:4px;background:#ffedd5;color:#c2410c;">Expiring Soon</span></td></tr>`,
    ),
  ].join("");

  const totalCount = data.expiredDocumentLabels.length + data.expiringSoonDocumentLabels.length;
  const hasExpired = data.expiredDocumentLabels.length > 0;

  const body = `
    <p style="margin:0 0 20px;color:#334155;font-size:15px;">Hello ${data.memberName},</p>
    <p style="margin:0 0 20px;color:#475569;font-size:14px;line-height:1.7;">
      ${
        hasExpired
          ? "One or more of your Adero documents have expired and require renewal."
          : "One or more of your Adero documents are expiring soon and should be renewed."
      }
      Please review the details below and submit updated documentation via your member portal.
    </p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 28px;">
      <thead>
        <tr>
          <th style="text-align:left;padding:0 0 8px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#94a3b8;font-weight:600;border-bottom:2px solid #e2e8f0;">Document</th>
          <th style="text-align:right;padding:0 0 8px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#94a3b8;font-weight:600;border-bottom:2px solid #e2e8f0;">Status</th>
        </tr>
      </thead>
      <tbody>${docRows}</tbody>
    </table>
    <p style="margin:0 0 28px;color:#475569;font-size:13px;line-height:1.7;">
      ${totalCount === 1 ? "This document requires" : `These ${totalCount} documents require`} your attention. Use the button below to open your member portal and submit your renewal documentation.
    </p>
    ${ctaButton(portalUrl, "Submit Renewal Documentation →")}
    ${privacyFooter()}
  `;

  const subject = hasExpired
    ? `Action required: Adero document renewal — ${data.memberName}`
    : `Upcoming renewal: Adero documents expiring soon — ${data.memberName}`;

  await resend.emails.send({
    from: getFromAddress(),
    to: data.to,
    subject,
    html: emailShell(hasExpired ? "Document Renewal Required" : "Document Renewal Reminder", body),
  });
}
