import "server-only";

import { Resend } from "resend";
import {
  db,
  aderoNotifications,
  aderoUsers,
} from "@raylak/db";
import type {
  AderoNotificationType,
  AderoTripStatus,
} from "@raylak/db/schema";
import { ADERO_TRIP_STATUS_LABELS } from "@raylak/db/schema";
import { eq } from "drizzle-orm";
import { env } from "./env";

type NotificationMetadata = Record<string, string | number | boolean | null>;

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  if (resendClient) return resendClient;
  if (!env.RESEND_API_KEY) return null;
  resendClient = new Resend(env.RESEND_API_KEY);
  return resendClient;
}

function getBaseUrl(): string {
  return env.ADERO_BASE_URL ?? "https://adero.network";
}

function getFromAddress(): string {
  return env.ADERO_FROM_EMAIL ?? "Adero <portal@adero.network>";
}

function formatOperatorName(input: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}): string {
  const fullName = [input.firstName, input.lastName].filter(Boolean).join(" ").trim();
  return fullName.length > 0 ? fullName : input.email;
}

export async function createNotification(
  userId: string,
  type: AderoNotificationType,
  title: string,
  message: string,
  metadata?: NotificationMetadata,
): Promise<void> {
  await db.insert(aderoNotifications).values({
    userId,
    type,
    title,
    message,
    metadata: metadata ? JSON.stringify(metadata) : null,
  });
}

export async function sendNotificationEmail(
  to: string,
  subject: string,
  body: string,
): Promise<void> {
  const resend = getResendClient();
  if (!resend) {
    console.info("[adero/notifications] RESEND_API_KEY not set, skipping email to", to);
    return;
  }

  await resend.emails.send({
    from: getFromAddress(),
    to,
    subject,
    text: body,
  });
}

export async function notifyOfferReceived(
  operatorUserId: string,
  requestId: string,
): Promise<void> {
  await createNotification(
    operatorUserId,
    "offer_received",
    "New Dispatch Offer",
    `You received a new dispatch offer for request ${requestId.slice(0, 8)}.`,
    { requestId },
  );

  const [operator] = await db
    .select({
      email: aderoUsers.email,
    })
    .from(aderoUsers)
    .where(eq(aderoUsers.id, operatorUserId))
    .limit(1);

  if (!operator) return;

  const offerUrl = `${getBaseUrl()}/app/operator`;
  await sendNotificationEmail(
    operator.email,
    "New Adero dispatch offer",
    `You have a new dispatch offer in Adero.\n\nRequest ID: ${requestId}\nOpen dashboard: ${offerUrl}`,
  );
}

export async function notifyRequestMatched(
  requesterUserId: string,
  requestId: string,
  offerCount: number,
): Promise<void> {
  await createNotification(
    requesterUserId,
    "request_matched",
    "Request Matched",
    `${offerCount} operator${offerCount === 1 ? " has" : "s have"} been notified for your request.`,
    { requestId, offerCount },
  );
}

export async function notifyRequestAccepted(
  requesterUserId: string,
  requestId: string,
  operatorName: string,
): Promise<void> {
  await createNotification(
    requesterUserId,
    "request_accepted",
    "Request Accepted",
    `${operatorName} accepted your request.`,
    { requestId, operatorName },
  );

  const [requester] = await db
    .select({
      email: aderoUsers.email,
    })
    .from(aderoUsers)
    .where(eq(aderoUsers.id, requesterUserId))
    .limit(1);

  if (!requester) return;

  const tripUrl = `${getBaseUrl()}/app/requester`;
  await sendNotificationEmail(
    requester.email,
    "Your Adero request was accepted",
    `${operatorName} accepted your request.\n\nRequest ID: ${requestId}\nOpen dashboard: ${tripUrl}`,
  );
}

export async function notifyTripStatusChanged(
  requesterUserId: string,
  tripId: string,
  newStatus: AderoTripStatus,
): Promise<void> {
  const label = ADERO_TRIP_STATUS_LABELS[newStatus] ?? newStatus;
  const type: AderoNotificationType =
    newStatus === "completed"
      ? "trip_completed"
      : newStatus === "canceled"
        ? "trip_canceled"
        : "trip_status_changed";

  await createNotification(
    requesterUserId,
    type,
    "Trip Status Updated",
    `Your trip is now ${label}.`,
    { tripId, newStatus },
  );
}

export async function resolveOperatorDisplayName(userId: string): Promise<string> {
  const [operator] = await db
    .select({
      firstName: aderoUsers.firstName,
      lastName: aderoUsers.lastName,
      email: aderoUsers.email,
    })
    .from(aderoUsers)
    .where(eq(aderoUsers.id, userId))
    .limit(1);

  if (!operator) {
    return "Your operator";
  }

  return formatOperatorName(operator);
}
