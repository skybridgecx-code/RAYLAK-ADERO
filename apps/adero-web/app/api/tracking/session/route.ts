import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { aderoTrackingSessions, aderoTrips, aderoUsers, db } from "@raylak/db";
import { endTrackingSession, startTrackingSession } from "@/lib/tracking";
import { startTrackingSchema } from "@/lib/validators";

const EndTrackingSchema = z.object({
  sessionId: z.string().uuid(),
});

async function resolveAderoUserFromClerk() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return { error: "Unauthenticated.", status: 401 as const, user: null };
  }

  const [aderoUser] = await db
    .select({
      id: aderoUsers.id,
      role: aderoUsers.role,
    })
    .from(aderoUsers)
    .where(eq(aderoUsers.clerkId, clerkId))
    .limit(1);

  if (!aderoUser) {
    return { error: "Adero user not found.", status: 403 as const, user: null };
  }

  if (aderoUser.role !== "operator") {
    return { error: "Forbidden.", status: 403 as const, user: null };
  }

  return { error: null, status: 200 as const, user: aderoUser };
}

export async function POST(request: Request) {
  const authResult = await resolveAderoUserFromClerk();
  if (!authResult.user) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = startTrackingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid session payload.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const session = await startTrackingSession(parsed.data.tripId, authResult.user.id);
    return NextResponse.json({ session });
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim().length > 0
        ? error.message
        : "Failed to start tracking session.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const authResult = await resolveAderoUserFromClerk();
  if (!authResult.user) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  let sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    try {
      const body = (await request.json()) as { sessionId?: unknown };
      if (typeof body.sessionId === "string") {
        sessionId = body.sessionId;
      }
    } catch {
      // sessionId may have been passed via query string.
    }
  }

  const parsed = EndTrackingSchema.safeParse({ sessionId });
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "sessionId is required and must be a UUID.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const [session] = await db
    .select({
      id: aderoTrackingSessions.id,
      operatorId: aderoTrips.operatorId,
    })
    .from(aderoTrackingSessions)
    .innerJoin(aderoTrips, eq(aderoTrackingSessions.tripId, aderoTrips.id))
    .where(eq(aderoTrackingSessions.id, parsed.data.sessionId))
    .limit(1);

  if (!session) {
    return NextResponse.json({ error: "Tracking session not found." }, { status: 404 });
  }

  if (session.operatorId !== authResult.user.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const endedSession = await endTrackingSession(parsed.data.sessionId);
    return NextResponse.json({ session: endedSession });
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim().length > 0
        ? error.message
        : "Failed to end tracking session.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
