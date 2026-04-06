import { Resend } from "resend";
import type { ServiceType } from "@raylak/shared/enums";

const resend = process.env["RESEND_API_KEY"] ? new Resend(process.env["RESEND_API_KEY"]) : null;

const FROM_ADDRESS = "RAYLAK Reservations <reservations@raylak.com>";

const SERVICE_LABELS: Record<ServiceType, string> = {
  airport_transfer: "Airport Transfer",
  point_to_point: "Point-to-Point",
  hourly_charter: "Hourly Charter",
  event: "Event Transportation",
  corporate: "Corporate Transfer",
  long_distance: "Long Distance",
};

export interface BookingConfirmationData {
  to: string;
  firstName: string;
  referenceCode: string;
  serviceType: ServiceType;
  scheduledAt: Date;
  pickupAddress: string;
  dropoffAddress: string;
}

export async function sendBookingConfirmation(data: BookingConfirmationData): Promise<void> {
  if (!resend) {
    console.info("[email] RESEND_API_KEY not set — skipping confirmation email for", data.referenceCode);
    return;
  }

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(data.scheduledAt);

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f9f9f9;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#0c1830;padding:40px 40px 32px;">
      <p style="margin:0 0 8px;color:#c9a96e;font-size:12px;letter-spacing:3px;text-transform:uppercase;font-weight:600;">RAYLAK</p>
      <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:300;letter-spacing:-0.5px;">Booking Confirmed</h1>
    </div>
    <div style="padding:40px;">
      <p style="margin:0 0 24px;color:#333;font-size:16px;">Dear ${data.firstName},</p>
      <p style="margin:0 0 32px;color:#555;font-size:15px;line-height:1.6;">
        Thank you for choosing RAYLAK. Your reservation has been received and is being reviewed by our team.
        You will receive a quote confirmation shortly.
      </p>
      <div style="background:#f5f5f5;border-radius:6px;padding:24px;margin-bottom:32px;">
        <p style="margin:0 0 16px;color:#999;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">Reference Number</p>
        <p style="margin:0;color:#0c1830;font-size:28px;font-weight:700;letter-spacing:2px;">${data.referenceCode}</p>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #eee;color:#999;font-size:13px;width:40%;vertical-align:top;">Service</td>
          <td style="padding:12px 0;border-bottom:1px solid #eee;color:#333;font-size:13px;font-weight:500;">${SERVICE_LABELS[data.serviceType]}</td>
        </tr>
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #eee;color:#999;font-size:13px;vertical-align:top;">Date &amp; Time</td>
          <td style="padding:12px 0;border-bottom:1px solid #eee;color:#333;font-size:13px;font-weight:500;">${formattedDate}</td>
        </tr>
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #eee;color:#999;font-size:13px;vertical-align:top;">Pickup</td>
          <td style="padding:12px 0;border-bottom:1px solid #eee;color:#333;font-size:13px;font-weight:500;">${data.pickupAddress}</td>
        </tr>
        <tr>
          <td style="padding:12px 0;color:#999;font-size:13px;vertical-align:top;">Drop-off</td>
          <td style="padding:12px 0;color:#333;font-size:13px;font-weight:500;">${data.dropoffAddress}</td>
        </tr>
      </table>
      <p style="margin:32px 0 0;color:#777;font-size:13px;line-height:1.7;">
        Questions? Reply to this email or call us at <strong>(202) 555-0100</strong>.
        We're available 24/7.
      </p>
    </div>
    <div style="background:#0c1830;padding:24px 40px;text-align:center;">
      <p style="margin:0;color:#666;font-size:12px;">© ${new Date().getFullYear()} RAYLAK. Premium Transportation. DC Metro Area.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: data.to,
    subject: `Booking Received — ${data.referenceCode} | RAYLAK`,
    html,
  });
}

// ─── Booking confirmed ────────────────────────────────────────────────────────

export interface BookingConfirmedData {
  to: string;
  firstName: string;
  referenceCode: string;
  serviceType: ServiceType;
  scheduledAt: Date;
  pickupAddress: string;
  dropoffAddress: string;
}

export async function sendBookingConfirmedEmail(data: BookingConfirmedData): Promise<void> {
  if (!resend) {
    console.info("[email] RESEND_API_KEY not set — skipping confirmed email for", data.referenceCode);
    return;
  }

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    hour: "numeric", minute: "2-digit", timeZoneName: "short",
  }).format(data.scheduledAt);

  const html = `
<!DOCTYPE html><html><head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f9f9f9;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
    <div style="background:#0c1830;padding:40px 40px 32px;">
      <p style="margin:0 0 8px;color:#c9a96e;font-size:12px;letter-spacing:3px;text-transform:uppercase;font-weight:600;">RAYLAK</p>
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:300;">Your Reservation Is Confirmed</h1>
    </div>
    <div style="padding:40px;">
      <p style="margin:0 0 16px;color:#333;font-size:16px;">Dear ${data.firstName},</p>
      <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;">Great news — your booking has been confirmed. We are now assigning a driver and will notify you as soon as one is on the way.</p>
      <div style="background:#f5f5f5;border-radius:6px;padding:24px;margin-bottom:24px;">
        <p style="margin:0 0 8px;color:#999;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">Reference</p>
        <p style="margin:0;color:#0c1830;font-size:26px;font-weight:700;letter-spacing:2px;">${data.referenceCode}</p>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#999;font-size:13px;width:40%;">Service</td><td style="padding:10px 0;border-bottom:1px solid #eee;color:#333;font-size:13px;font-weight:500;">${SERVICE_LABELS[data.serviceType]}</td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#999;font-size:13px;">Date &amp; Time</td><td style="padding:10px 0;border-bottom:1px solid #eee;color:#333;font-size:13px;font-weight:500;">${formattedDate}</td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#999;font-size:13px;">Pickup</td><td style="padding:10px 0;border-bottom:1px solid #eee;color:#333;font-size:13px;font-weight:500;">${data.pickupAddress}</td></tr>
        <tr><td style="padding:10px 0;color:#999;font-size:13px;">Drop-off</td><td style="padding:10px 0;color:#333;font-size:13px;font-weight:500;">${data.dropoffAddress}</td></tr>
      </table>
    </div>
    <div style="background:#0c1830;padding:20px 40px;text-align:center;">
      <p style="margin:0;color:#666;font-size:12px;">© ${new Date().getFullYear()} RAYLAK. Premium Transportation.</p>
    </div>
  </div>
</body></html>`.trim();

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: data.to,
    subject: `Booking Confirmed — ${data.referenceCode} | RAYLAK`,
    html,
  });
}

// ─── Driver assigned ──────────────────────────────────────────────────────────

export interface DriverAssignedData {
  to: string;
  firstName: string;
  referenceCode: string;
  scheduledAt: Date;
  pickupAddress: string;
  driverFirstName: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleColor: string | null;
  vehicleYear: number | null;
  vehicleLicensePlate: string | null;
}

export async function sendDriverAssignedEmail(data: DriverAssignedData): Promise<void> {
  if (!resend) {
    console.info("[email] RESEND_API_KEY not set — skipping driver assigned email for", data.referenceCode);
    return;
  }

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", timeZoneName: "short",
  }).format(data.scheduledAt);

  const trackUrl = `${process.env["NEXT_PUBLIC_APP_URL"] ?? ""}/track/${data.referenceCode}`;

  const html = `
<!DOCTYPE html><html><head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f9f9f9;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
    <div style="background:#0c1830;padding:40px 40px 32px;">
      <p style="margin:0 0 8px;color:#c9a96e;font-size:12px;letter-spacing:3px;text-transform:uppercase;font-weight:600;">RAYLAK</p>
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:300;">Your Driver Is Assigned</h1>
    </div>
    <div style="padding:40px;">
      <p style="margin:0 0 16px;color:#333;font-size:16px;">Dear ${data.firstName},</p>
      <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;">Your driver has been assigned for your pickup on <strong>${formattedDate}</strong>.</p>
      <div style="background:#f5f5f5;border-radius:6px;padding:24px;margin-bottom:24px;">
        <p style="margin:0 0 12px;color:#999;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">Your Driver</p>
        <p style="margin:0;color:#0c1830;font-size:18px;font-weight:600;">${data.driverFirstName}</p>
        <p style="margin:8px 0 0;color:#555;font-size:14px;">${data.vehicleColor ? data.vehicleColor + " " : ""}${data.vehicleMake} ${data.vehicleModel}${data.vehicleYear ? " (" + data.vehicleYear + ")" : ""}${data.vehicleLicensePlate ? " · " + data.vehicleLicensePlate : ""}</p>
      </div>
      <p style="margin:0 0 24px;color:#555;font-size:14px;">Pickup: <strong>${data.pickupAddress}</strong></p>
      <a href="${trackUrl}" style="display:inline-block;background:#0c1830;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px;font-weight:500;">Track Your Ride →</a>
    </div>
    <div style="background:#0c1830;padding:20px 40px;text-align:center;">
      <p style="margin:0;color:#666;font-size:12px;">© ${new Date().getFullYear()} RAYLAK. Premium Transportation.</p>
    </div>
  </div>
</body></html>`.trim();

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: data.to,
    subject: `Your Driver Is Assigned — ${data.referenceCode} | RAYLAK`,
    html,
  });
}

// ─── Ride completed ───────────────────────────────────────────────────────────

export interface RideCompletedData {
  to: string;
  firstName: string;
  referenceCode: string;
}

export async function sendRideCompletedEmail(data: RideCompletedData): Promise<void> {
  if (!resend) {
    console.info("[email] RESEND_API_KEY not set — skipping ride completed email for", data.referenceCode);
    return;
  }

  const html = `
<!DOCTYPE html><html><head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f9f9f9;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
    <div style="background:#0c1830;padding:40px 40px 32px;">
      <p style="margin:0 0 8px;color:#c9a96e;font-size:12px;letter-spacing:3px;text-transform:uppercase;font-weight:600;">RAYLAK</p>
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:300;">Ride Complete — Thank You</h1>
    </div>
    <div style="padding:40px;">
      <p style="margin:0 0 16px;color:#333;font-size:16px;">Dear ${data.firstName},</p>
      <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;">Thank you for choosing RAYLAK for your journey. We hope you had an excellent experience and look forward to serving you again.</p>
      <p style="margin:0 0 8px;color:#999;font-size:12px;">Reference: <strong style="color:#0c1830;">${data.referenceCode}</strong></p>
      <p style="margin:32px 0 0;color:#777;font-size:13px;line-height:1.7;">Questions about your ride? Contact us at <strong>(202) 555-0100</strong> or reply to this email.</p>
    </div>
    <div style="background:#0c1830;padding:20px 40px;text-align:center;">
      <p style="margin:0;color:#666;font-size:12px;">© ${new Date().getFullYear()} RAYLAK. Premium Transportation.</p>
    </div>
  </div>
</body></html>`.trim();

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: data.to,
    subject: `Thank You for Riding with RAYLAK — ${data.referenceCode}`,
    html,
  });
}
