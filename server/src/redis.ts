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

type RidesRoom = BroadcastOperator<ServerToClientEvents, SocketData>;

/** Route assignment/status events to a specific driver's personal room */
function routeToDriver(room: RidesRoom, event: RaylakEvent): void {
  switch (event.type) {
    case "booking.assigned":
      room.emit("booking.assigned", event);
      break;
    case "booking.status_changed":
      room.emit("booking.status_changed", event);
      break;
    default:
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

    // Push assignment events to the specific driver's personal room
    if (event.type === "booking.assigned") {
      // driverUserId is embedded in the event payload (added in Phase 7)
      // Drivers join room "driver:{userId}" at connection time in setupRidesNamespace
      routeToDriver(io.of("/rides").to(`driver:${event.driverUserId}`), event);
    }

    // Push booking status changes to the customer tracking room keyed by reference code
    if (event.type === "booking.status_changed" && event.referenceCode) {
      io.of("/track")
        .to(`track:${event.referenceCode.toUpperCase()}`)
        .emit("booking.status_changed", event);
    }

    if (env.NODE_ENV === "development") {
      console.log(`[redis:sub] Routed: ${event.type}`);
    }
  });
}
