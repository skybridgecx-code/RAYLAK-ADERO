/**
 * SMS delivery via Twilio.
 *
 * All functions are fire-and-forget safe — call without await in the critical
 * path. If Twilio credentials are not configured the function logs intent and
 * returns immediately so the rest of the system continues unaffected.
 */
import "server-only";
import twilio from "twilio";

function getClient() {
  const sid = process.env["TWILIO_ACCOUNT_SID"];
  const token = process.env["TWILIO_AUTH_TOKEN"];
  if (!sid || !token) return null;
  return twilio(sid, token);
}

const FROM = process.env["TWILIO_PHONE_NUMBER"] ?? "";

async function send(to: string, body: string): Promise<void> {
  const client = getClient();
  if (!client || !FROM) {
    console.info(`[sms] Twilio not configured — skipping SMS to ${to}: "${body}"`);
    return;
  }
  await client.messages.create({ from: FROM, to, body });
}

export async function sendDriverAssignedSms(
  to: string,
  firstName: string,
  referenceCode: string,
  driverFirstName: string,
  vehicleMake: string,
  vehicleModel: string,
): Promise<void> {
  await send(
    to,
    `Hi ${firstName}, your RAYLAK driver ${driverFirstName} in a ${vehicleMake} ${vehicleModel} has been assigned to booking ${referenceCode}. Track your ride at raylak.com/track/${referenceCode}`,
  );
}

export async function sendDriverEnRouteSms(
  to: string,
  firstName: string,
  referenceCode: string,
): Promise<void> {
  await send(
    to,
    `Hi ${firstName}, your RAYLAK driver is on the way to your pickup location. Booking ${referenceCode}. Track: raylak.com/track/${referenceCode}`,
  );
}

export async function sendDriverArrivedSms(
  to: string,
  firstName: string,
): Promise<void> {
  await send(to, `Hi ${firstName}, your RAYLAK driver has arrived at your pickup location. Please proceed to your vehicle.`);
}

export async function sendRideCompletedSms(
  to: string,
  firstName: string,
): Promise<void> {
  await send(to, `Hi ${firstName}, thank you for choosing RAYLAK. Your ride is complete. We hope to serve you again soon.`);
}
