/**
 * RAYLAK Realtime Server
 *
 * Socket.io server with Redis pub/sub backbone.
 * Deployed separately from the Next.js web app (Fly.io vs Vercel).
 *
 * Namespaces:
 *   /dispatch — operator dashboard (dispatcher | admin | owner)
 *   /rides    — driver PWA (driver)
 *
 * Event flow:
 *   apps/web (tRPC mutations) → Redis raylak:ops → this server → Socket.io clients
 */
import http from "http";
import { Server } from "socket.io";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from "@raylak/shared/events";
import { env } from "./env";
import { setupDispatchNamespace } from "./namespaces/dispatch";
import { setupRidesNamespace } from "./namespaces/rides";
import { startRedisSubscriber } from "./redis";

const httpServer = http.createServer((req, res) => {
  // Health check endpoint — used by Fly.io / load balancers
  if (req.method === "GET" && req.url === "/healthz") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", ts: Date.now() }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
  httpServer,
  {
    cors: {
      origin: env.WEB_APP_URL,
      credentials: true,
      methods: ["GET", "POST"],
    },
    // Prefer WebSocket; fall back to long-polling only if needed
    transports: ["websocket", "polling"],
    // Ping every 20s, disconnect if no pong within 5s
    pingInterval: 20_000,
    pingTimeout: 5_000,
  },
);

// Wire namespaces
setupDispatchNamespace(io.of("/dispatch"));
setupRidesNamespace(io.of("/rides"));

// Start Redis subscriber — routes Redis messages to Socket.io rooms
startRedisSubscriber(io);

httpServer.listen(env.PORT, () => {
  console.log(`[realtime] RAYLAK Realtime Server listening on :${env.PORT}`);
  console.log(`[realtime] CORS origin: ${env.WEB_APP_URL}`);
  console.log(`[realtime] Redis: ${env.REDIS_URL.replace(/:\/\/.*@/, "://***@")}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("[realtime] SIGTERM received — shutting down");
  io.close(() => {
    httpServer.close(() => {
      process.exit(0);
    });
  });
});
