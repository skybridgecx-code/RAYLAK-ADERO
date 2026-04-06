/**
 * RAYLAK notification service.
 *
 * Abstraction layer for all notification channels.
 * In this phase, only in-app (DB record) and email (via Resend) are partially
 * wired.  SMS (Twilio) and push (FCM) are stubbed — they log intent and no-op.
 *
 * Call createNotification() to persist a record; delivery happens based on
 * the requested channel.  In-app notifications are also published to Redis so
 * the realtime server can surface them immediately to connected clients.
 */
import "server-only";
import { db } from "@raylak/db";
import { notifications } from "@raylak/db";
import { redis } from "./redis";

export type NotificationChannel = "in_app" | "email" | "sms" | "push";

export interface CreateNotificationParams {
  userId: string;
  type: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  channel?: NotificationChannel;
}

/**
 * Persist a notification record and attempt delivery on the requested channel.
 * Errors in delivery channels are caught and logged — they never throw.
 */
export async function createNotification(params: CreateNotificationParams): Promise<void> {
  const channel = params.channel ?? "in_app";
  const now = new Date();

  try {
    await db.insert(notifications).values({
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body ?? null,
      data: params.data ?? null,
      channel,
      sentAt: now,
    });
  } catch (err) {
    console.error("[notifications] DB insert failed:", err);
    return;
  }

  // Deliver based on channel
  switch (channel) {
    case "in_app":
      publishInApp(params.userId, { type: params.type, title: params.title, ...(params.body !== undefined && { body: params.body }) });
      break;
    case "email":
      // Handled separately by apps/web/lib/email.ts for rich templates
      // This scaffold records intent; callers invoke sendBookingConfirmation etc. directly
      break;
    case "sms":
      deliverSms(params).catch((err: unknown) => {
        console.error("[notifications] SMS delivery failed:", err);
      });
      break;
    case "push":
      deliverPush(params).catch((err: unknown) => {
        console.error("[notifications] Push delivery failed:", err);
      });
      break;
  }
}

// ─── In-app: publish to Redis for realtime delivery ──────────────────────────

function publishInApp(
  userId: string,
  payload: { type: string; title: string; body?: string },
): void {
  const channel = `raylak:user:${userId}:notifications`;
  redis.publish(channel, JSON.stringify({ ...payload, ts: Date.now() })).catch((err: unknown) => {
    console.error("[notifications] Redis publish failed:", (err as Error).message);
  });
}

// ─── SMS stub (Twilio — Phase 7+) ────────────────────────────────────────────

async function deliverSms(params: CreateNotificationParams): Promise<void> {
  // TODO Phase 7: integrate Twilio
  // const twilio = getTwilioClient();
  // await twilio.messages.create({ to: phoneNumber, body: params.body, from: env.TWILIO_PHONE_NUMBER });
  console.log(`[notifications] SMS stub — would send to user ${params.userId}: "${params.title}"`);
}

// ─── Push stub (FCM — Phase 7+) ───────────────────────────────────────────────

async function deliverPush(params: CreateNotificationParams): Promise<void> {
  // TODO Phase 7: integrate FCM / web-push
  console.log(`[notifications] Push stub — would notify user ${params.userId}: "${params.title}"`);
}
