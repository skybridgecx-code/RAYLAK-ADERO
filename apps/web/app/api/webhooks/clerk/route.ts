import { headers } from "next/headers";
import { Webhook } from "svix";
import { eq } from "drizzle-orm";
import { db } from "@raylak/db";
import { users } from "@raylak/db";

interface ClerkEmailAddress {
  email_address: string;
  id: string;
}

interface ClerkUserPayload {
  id: string;
  email_addresses: ClerkEmailAddress[];
  primary_email_address_id: string;
  first_name: string | null;
  last_name: string | null;
  phone_numbers: Array<{ phone_number: string }>;
  public_metadata: { role?: string };
}

interface WebhookEvent {
  type: string;
  data: ClerkUserPayload;
}

export async function POST(req: Request) {
  const webhookSecret = process.env["CLERK_WEBHOOK_SECRET"];

  if (!webhookSecret) {
    console.warn("[clerk-webhook] CLERK_WEBHOOK_SECRET not set — skipping verification");
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  const body = await req.text();

  // Verify signature when secret is configured
  if (webhookSecret) {
    if (!svixId || !svixTimestamp || !svixSignature) {
      return new Response("Missing svix headers", { status: 400 });
    }
    try {
      const wh = new Webhook(webhookSecret);
      wh.verify(body, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      });
    } catch {
      return new Response("Invalid webhook signature", { status: 401 });
    }
  }

  let event: WebhookEvent;
  try {
    event = JSON.parse(body) as WebhookEvent;
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  if (event.type === "user.created" || event.type === "user.updated") {
    await upsertClerkUser(event.data);
  }

  return new Response("OK", { status: 200 });
}

async function upsertClerkUser(data: ClerkUserPayload) {
  const primaryEmail = data.email_addresses.find(
    (e) => e.id === data.primary_email_address_id,
  )?.email_address;

  if (!primaryEmail) {
    console.warn("[clerk-webhook] No primary email for user", data.id);
    return;
  }

  const role = (data.public_metadata?.role as string | undefined) ?? "customer";
  const phone = data.phone_numbers?.[0]?.phone_number ?? null;
  const email = primaryEmail.toLowerCase().trim();

  // Try to link to an existing guest record created during booking intake
  const existingByEmail = await db.query.users.findFirst({
    where: eq(users.email, email),
    columns: { id: true, clerkId: true },
  });

  if (existingByEmail) {
    await db
      .update(users)
      .set({
        clerkId: data.id,
        firstName: data.first_name ?? undefined,
        lastName: data.last_name ?? undefined,
        phone: phone ?? undefined,
        role: role as typeof users.$inferSelect.role,
        updatedAt: new Date(),
      })
      .where(eq(users.id, existingByEmail.id));
  } else {
    await db
      .insert(users)
      .values({
        clerkId: data.id,
        email,
        firstName: data.first_name ?? undefined,
        lastName: data.last_name ?? undefined,
        phone: phone ?? undefined,
        role: role as typeof users.$inferSelect.role,
      })
      .onConflictDoUpdate({
        target: users.clerkId,
        set: {
          email,
          firstName: data.first_name ?? undefined,
          lastName: data.last_name ?? undefined,
          phone: phone ?? undefined,
          role: role as typeof users.$inferSelect.role,
          updatedAt: new Date(),
        },
      });
  }
}
