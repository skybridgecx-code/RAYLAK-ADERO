import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { aderoTrackingSessions, aderoTrips, aderoUsers, db } from "@raylak/db";
import { recordLocation } from "@/lib/tracking";
import type { LocationUpdate } from "@/lib/tracking";
import { recordLocationSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
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
    return NextResponse.json({ error: "Adero user not found." }, { status: 403 });
  }

  if (aderoUser.role !== "operator") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = recordLocationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid location payload.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const [session] = await db
    .select({
      id: aderoTrackingSessions.id,
      tripId: aderoTrackingSessions.tripId,
      operatorId: aderoTrips.operatorId,
    })
    .from(aderoTrackingSessions)
    .innerJoin(aderoTrips, eq(aderoTrackingSessions.tripId, aderoTrips.id))
    .where(eq(aderoTrackingSessions.id, parsed.data.sessionId))
    .limit(1);

  if (!session) {
    return NextResponse.json({ error: "Tracking session not found." }, { status: 404 });
  }

  if (session.operatorId !== aderoUser.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const locationInput: LocationUpdate = {
    latitude: parsed.data.location.latitude,
    longitude: parsed.data.location.longitude,
    recordedAt: new Date(parsed.data.location.recordedAt),
  };
  if (parsed.data.location.altitude !== undefined) {
    locationInput.altitude = parsed.data.location.altitude;
  }
  if (parsed.data.location.heading !== undefined) {
    locationInput.heading = parsed.data.location.heading;
  }
  if (parsed.data.location.speed !== undefined) {
    locationInput.speed = parsed.data.location.speed;
  }
  if (parsed.data.location.accuracy !== undefined) {
    locationInput.accuracy = parsed.data.location.accuracy;
  }
  if (parsed.data.location.source !== undefined) {
    locationInput.source = parsed.data.location.source;
  }

  try {
    const result = await recordLocation(parsed.data.sessionId, locationInput);

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim().length > 0
        ? error.message
        : "Failed to record location.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
