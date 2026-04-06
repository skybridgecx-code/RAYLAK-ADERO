/**
 * /dispatch namespace — for operators (dispatcher | admin | owner).
 *
 * Clients in this namespace receive all operational events published to
 * the raylak:ops Redis channel.  Role enforcement happens at connect time;
 * non-operator connections are immediately dropped.
 */
import type { Namespace } from "socket.io";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from "@raylak/shared/events";
import { clerkAuthMiddleware } from "../auth";

const OPERATOR_ROLES = new Set(["dispatcher", "admin", "owner"]);

export function setupDispatchNamespace(
  ns: Namespace<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
): void {
  // Verify Clerk JWT on every connection
  ns.use((socket, next) => {
    void clerkAuthMiddleware(socket as Parameters<typeof clerkAuthMiddleware>[0], next);
  });

  ns.on("connection", (socket) => {
    if (!OPERATOR_ROLES.has(socket.data.role)) {
      console.warn(`[dispatch] Rejected connection from role "${socket.data.role}" (${socket.data.userId})`);
      socket.disconnect(true);
      return;
    }

    console.log(`[dispatch] ${socket.data.role} connected: ${socket.data.userId}`);

    // All operators join the shared "ops" room — Redis fan-out targets this room
    void socket.join("ops");

    socket.on("disconnect", (reason) => {
      console.log(`[dispatch] ${socket.data.userId} disconnected: ${reason}`);
    });
  });
}
