/**
 * /track namespace — unauthenticated customer ride tracking.
 *
 * Customers supply their booking reference code in socket.handshake.auth.code.
 * They join a room keyed to that code and receive booking status change events.
 *
 * No Clerk auth — reference codes are the access token. Clients only receive
 * status events for their own booking code room.
 */
import type { Namespace } from "socket.io";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from "@raylak/shared/events";

export function setupTrackNamespace(
  ns: Namespace<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
): void {
  ns.on("connection", (socket) => {
    const code = socket.handshake.auth["code"] as string | undefined;

    if (!code || typeof code !== "string" || code.length < 4 || code.length > 30) {
      console.warn("[track] Connection rejected: invalid or missing booking code");
      socket.disconnect(true);
      return;
    }

    // Sanitise: only allow alphanumeric and dash (reference code format)
    if (!/^[A-Z0-9\-]+$/i.test(code)) {
      console.warn("[track] Connection rejected: code contains invalid characters");
      socket.disconnect(true);
      return;
    }

    const room = `track:${code.toUpperCase()}`;
    void socket.join(room);

    // Track room is read-only — no client→server events accepted
    socket.on("disconnect", (reason) => {
      if (process.env["NODE_ENV"] === "development") {
        console.log(`[track] Client disconnected (code=${code}): ${reason}`);
      }
    });
  });
}
