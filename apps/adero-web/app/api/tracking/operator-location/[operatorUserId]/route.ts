import { getOperatorLastLocation } from "@/lib/tracking";
import { getAuthenticatedAderoUser, toNumber } from "../../_helpers";

function jsonResponse(status: number, message: string): Response {
  return Response.json({ error: message }, { status });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ operatorUserId: string }> },
) {
  const { operatorUserId } = await params;

  let user: Awaited<ReturnType<typeof getAuthenticatedAderoUser>>;
  try {
    user = await getAuthenticatedAderoUser();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    if (message === "Unauthenticated") return jsonResponse(401, "Unauthenticated.");
    return jsonResponse(403, "Forbidden.");
  }

  if (user.role !== "admin") {
    return jsonResponse(403, "Forbidden.");
  }

  const location = await getOperatorLastLocation(operatorUserId);

  return Response.json({
    operatorUserId,
    location: location
      ? {
          id: location.id,
          latitude: toNumber(location.latitude),
          longitude: toNumber(location.longitude),
          heading: location.heading === null ? null : toNumber(location.heading),
          speed: location.speed === null ? null : toNumber(location.speed),
          accuracy: location.accuracy === null ? null : toNumber(location.accuracy),
          activeTripId: location.activeTripId,
          updatedAt: location.updatedAt,
        }
      : null,
    timestamp: new Date().toISOString(),
  });
}
