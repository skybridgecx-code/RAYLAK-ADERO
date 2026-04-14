import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { aderoRequests, aderoTrips, aderoUsers, db } from "@raylak/db";

type AderoUserAuth = {
  id: string;
  role: string;
};

export type AuthorizedTrip = {
  tripId: string;
  operatorId: string;
  requesterId: string;
  tripStatus: string;
};

export function toNumber(value: string | number | null | undefined): number {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

export async function getAuthenticatedAderoUser(): Promise<AderoUserAuth> {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    throw new Error("Unauthenticated");
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
    throw new Error("Adero user not found");
  }

  return aderoUser;
}

export async function getAuthorizedTripForUser(
  tripId: string,
  user: AderoUserAuth,
): Promise<AuthorizedTrip> {
  const [trip] = await db
    .select({
      tripId: aderoTrips.id,
      operatorId: aderoTrips.operatorId,
      requesterId: aderoRequests.requesterId,
      tripStatus: aderoTrips.status,
    })
    .from(aderoTrips)
    .innerJoin(aderoRequests, eq(aderoTrips.requestId, aderoRequests.id))
    .where(eq(aderoTrips.id, tripId))
    .limit(1);

  if (!trip) {
    throw new Error("Trip not found");
  }

  const isAuthorized =
    user.role === "admin"
    || trip.operatorId === user.id
    || trip.requesterId === user.id;

  if (!isAuthorized) {
    throw new Error("Forbidden");
  }

  return trip;
}
