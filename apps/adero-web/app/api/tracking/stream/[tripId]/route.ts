import { eq } from "drizzle-orm";
import { aderoTrips, db } from "@raylak/db";
import {
  STALE_LOCATION_THRESHOLD_MS,
  getActiveTrackingSession,
  getLatestLocation,
} from "@/lib/tracking";
import { getLatestEta } from "@/lib/eta";
import {
  getAuthenticatedAderoUser,
  getAuthorizedTripForUser,
  toNumber,
} from "../../_helpers";

const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
} as const;

function jsonResponse(status: number, message: string): Response {
  return Response.json({ error: message }, { status });
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }

    const timeout = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timeout);
      cleanup();
      resolve();
    };

    const cleanup = () => signal.removeEventListener("abort", onAbort);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tripId: string }> },
) {
  const { tripId } = await params;

  let authorizedTrip: Awaited<ReturnType<typeof getAuthorizedTripForUser>>;
  try {
    const user = await getAuthenticatedAderoUser();
    authorizedTrip = await getAuthorizedTripForUser(tripId, user);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    if (message === "Unauthenticated") return jsonResponse(401, "Unauthenticated.");
    if (message === "Trip not found") return jsonResponse(404, "Trip not found.");
    if (message === "Forbidden") return jsonResponse(403, "Forbidden.");
    return jsonResponse(500, "Authorization failed.");
  }

  const encoder = new TextEncoder();
  let isClosed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const enqueueEvent = (payload: unknown): boolean => {
        if (isClosed || controller.desiredSize === null) {
          return false;
        }
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
        );
        return true;
      };

      const closeStream = () => {
        if (isClosed) return;
        isClosed = true;
        try {
          controller.close();
        } catch {
          // Stream may already be closed.
        }
      };

      const onAbort = () => {
        closeStream();
      };
      request.signal.addEventListener("abort", onAbort, { once: true });

      const run = async () => {
        try {
          while (!isClosed && !request.signal.aborted) {
            const [location, eta, session, tripRow] = await Promise.all([
              getLatestLocation(tripId),
              getLatestEta(tripId),
              getActiveTrackingSession(tripId),
              db
                .select({
                  status: aderoTrips.status,
                })
                .from(aderoTrips)
                .where(eq(aderoTrips.id, tripId))
                .limit(1),
            ]);

            const tripStatus = tripRow[0]?.status ?? authorizedTrip.tripStatus;
            const locationRecordedAt = location?.recordedAt ?? null;
            const isStale = !locationRecordedAt
              || Date.now() - locationRecordedAt.getTime() > STALE_LOCATION_THRESHOLD_MS;

            const payload = {
              type: "tracking_update",
              tripId,
              tripStatus,
              location: location
                ? {
                    latitude: toNumber(location.latitude),
                    longitude: toNumber(location.longitude),
                    heading: location.heading === null ? null : toNumber(location.heading),
                    speed: location.speed === null ? null : toNumber(location.speed),
                    accuracy: location.accuracy === null ? null : toNumber(location.accuracy),
                    recordedAt: location.recordedAt,
                  }
                : null,
              eta: eta
                ? {
                    status: eta.status,
                    estimatedArrivalAt: eta.estimatedArrivalAt,
                    estimatedDurationMinutes: eta.estimatedDurationMinutes,
                    distanceRemainingMiles:
                      eta.distanceRemainingMiles === null
                        ? null
                        : toNumber(eta.distanceRemainingMiles),
                    destinationType: eta.destinationType,
                  }
                : null,
              session: session
                ? {
                    isActive: true,
                    locationCount: session.locationCount,
                    totalDistanceMiles: toNumber(session.totalDistanceMiles),
                  }
                : null,
              isStale,
              timestamp: new Date().toISOString(),
            };

            if (!enqueueEvent(payload)) {
              break;
            }

            if (tripStatus === "completed" || tripStatus === "canceled") {
              enqueueEvent({
                type: "trip_ended",
                tripId,
                tripStatus,
                timestamp: new Date().toISOString(),
              });
              break;
            }

            await sleep(3000, request.signal);
          }
        } catch (error) {
          const message =
            error instanceof Error && error.message.trim().length > 0
              ? error.message
              : "Tracking stream failed.";

          enqueueEvent({
            type: "error",
            tripId,
            message,
            timestamp: new Date().toISOString(),
          });
        } finally {
          request.signal.removeEventListener("abort", onAbort);
          closeStream();
        }
      };

      void run();
    },
    cancel() {
      isClosed = true;
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
