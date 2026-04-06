/**
 * Clerk JWT verification for Socket.io connections.
 *
 * The browser client sends a Clerk session token in socket.handshake.auth.token.
 * We verify it server-side using @clerk/backend and attach userId + role to the
 * socket's data bag for use in namespace handlers.
 */
import { verifyToken } from "@clerk/backend";
import type { Socket } from "socket.io";
import type { SocketData } from "@raylak/shared/events";
import { env } from "./env";

/**
 * Socket.io middleware: verifies the Clerk JWT and populates socket.data.
 * Call this via namespace.use(clerkAuthMiddleware) before the connection handler.
 */
export async function clerkAuthMiddleware(
  socket: Socket<Record<string, never>, Record<string, never>, Record<string, never>, SocketData>,
  next: (err?: Error) => void,
): Promise<void> {
  const token = socket.handshake.auth["token"] as string | undefined;

  if (!token) {
    return next(new Error("Authentication required: no token provided."));
  }

  try {
    // verifyToken validates the JWT signature, expiry, and azp claim
    const payload = await verifyToken(token, { secretKey: env.CLERK_SECRET_KEY });

    socket.data.userId = payload.sub;

    // publicMetadata.role is set by the Clerk dashboard / webhook sync
    const metadata = payload["publicMetadata"] as Record<string, unknown> | undefined;
    socket.data.role = (metadata?.["role"] as string | undefined) ?? "customer";

    return next();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid token";
    return next(new Error(`Authentication failed: ${message}`));
  }
}
