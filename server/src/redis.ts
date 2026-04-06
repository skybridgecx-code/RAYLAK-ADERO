/**
 * Redis subscriber for the realtime server.
 *
 * Subscribes to the raylak:ops channel and routes incoming events to the
 * appropriate Socket.io namespace rooms.
 *
 * Separate Redis connection from any publisher — ioredis requires a dedicated
 * client for subscriptions (it cannot be used for other commands while subscribed).
 */
import { Redis } from "ioredis";
import type { BroadcastOperator, Server } from "socket.io";
import type {
  RaylakEvent,
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from "@raylak/shared/events";
import { REDIS_CHANNEL_OPS } from "@raylak/shared/events";
import { env } from "./env";

type DispatchRoom = BroadcastOperator<ServerToClientEvents, SocketData>;

/** Route a typed event to the correct Socket.io emit signature */
function routeToDispatch(room: DispatchRoom, event: RaylakEvent): void {
  switch (event.type) {
    case "booking.status_changed":
      room.emit("booking.status_changed", event);
      break;
    case "booking.assigned":
      room.emit("booking.assigned", event);
      break;
    case "driver.location_updated":
      room.emit("driver.location_updated", event);
      break;
    case "driver.availability_changed":
      room.emit("driver.availability_changed", event);
      break;
  }
}

export function startRedisSubscriber(
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
): void {
  const subscriber = new Redis(env.REDIS_URL, {
    retryStrategy: (times) => Math.min(times * 200, 5000),
  });

  subscriber.on("error", (err: Error) => {
    console.error("[redis:sub] Error:", err.message);
  });

  subscriber.on("connect", () => {
    console.log("[redis:sub] Connected to Redis");
  });

  subscriber.subscribe(REDIS_CHANNEL_OPS, (err) => {
    if (err) {
      console.error("[redis:sub] Subscribe failed:", err.message);
    } else {
      console.log(`[redis:sub] Subscribed to ${REDIS_CHANNEL_OPS}`);
    }
  });

  subscriber.on("message", (channel: string, message: string) => {
    if (channel !== REDIS_CHANNEL_OPS) return;

    let event: RaylakEvent;
    try {
      event = JSON.parse(message) as RaylakEvent;
    } catch {
      console.warn("[redis:sub] Received unparseable message:", message);
      return;
    }

    // Fan out to all connected operators in the "ops" room
    // Use type-safe routing via discriminated union
    routeToDispatch(io.of("/dispatch").to("ops"), event);

    // For assignment events, also push to the specific driver's personal room
    if (event.type === "booking.assigned") {
      // The driverProfileId is available; the driver's socket room is keyed to userId.
      // Full driver targeting (by userId) is wired in Phase 7 once the DB lookup
      // (driverProfileId → userId) is in place.  For now, the /rides namespace room
      // is reserved and the dispatch namespace carries all operator events.
    }

    if (env.NODE_ENV === "development") {
      console.log(`[redis:sub] Routed: ${event.type}`);
    }
  });
}
