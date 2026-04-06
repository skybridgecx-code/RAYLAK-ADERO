/**
 * /rides namespace — for drivers.
 *
 * Each driver joins a personal room keyed to their userId.
 * Assignment events and ride updates can be targeted to a specific driver's room.
 *
 * In this phase, drivers receive no server-initiated pushes — the namespace
 * exists to establish the auth + room pattern for Phase 7 (push to driver on
 * assignment, dispatch instructions, etc.).
 */
import type { Namespace } from "socket.io";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from "@raylak/shared/events";
import { clerkAuthMiddleware } from "../auth";

export function setupRidesNamespace(
  ns: Namespace<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
): void {
  ns.use((socket, next) => {
    void clerkAuthMiddleware(socket as Parameters<typeof clerkAuthMiddleware>[0], next);
  });

  ns.on("connection", (socket) => {
    if (socket.data.role !== "driver") {
      console.warn(`[rides] Rejected non-driver connection from role "${socket.data.role}"`);
      socket.disconnect(true);
      return;
    }

    console.log(`[rides] Driver connected: ${socket.data.userId}`);

    // Personal room for targeted driver pushes (assignment, cancellation, etc.)
    void socket.join(`driver:${socket.data.userId}`);

    socket.on("disconnect", (reason) => {
      console.log(`[rides] Driver ${socket.data.userId} disconnected: ${reason}`);
    });
  });
}
