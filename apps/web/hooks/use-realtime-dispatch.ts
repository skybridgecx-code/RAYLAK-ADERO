"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { io, type Socket } from "socket.io-client";
import type {
  RaylakEvent,
  ServerToClientEvents,
  ClientToServerEvents,
} from "@raylak/shared/events";

const MAX_EVENTS = 50;

type DispatchSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export interface UseRealtimeDispatchResult {
  events: RaylakEvent[];
  connected: boolean;
}

/**
 * Connects to the realtime server's /dispatch namespace and collects events.
 * Returns an empty, disconnected result if NEXT_PUBLIC_REALTIME_URL is not set.
 *
 * Auth: sends Clerk JWT as socket auth.token; server verifies before accepting.
 */
export function useRealtimeDispatch(): UseRealtimeDispatchResult {
  const { getToken } = useAuth();
  const [events, setEvents] = useState<RaylakEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<DispatchSocket | null>(null);

  const realtimeUrl = process.env["NEXT_PUBLIC_REALTIME_URL"];

  useEffect(() => {
    if (!realtimeUrl) return;

    let socket: DispatchSocket;
    let cancelled = false;

    void getToken().then((token) => {
      if (cancelled || !token) return;

      socket = io(`${realtimeUrl}/dispatch`, {
        auth: { token },
        transports: ["websocket"],
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      }) as DispatchSocket;

      socket.on("connect", () => setConnected(true));
      socket.on("disconnect", () => setConnected(false));

      // Route all known event types into state
      const handleEvent = (event: RaylakEvent) => {
        setEvents((prev) => [event, ...prev].slice(0, MAX_EVENTS));
      };

      socket.on("booking.status_changed", handleEvent);
      socket.on("booking.assigned", handleEvent);
      socket.on("driver.location_updated", handleEvent);
      socket.on("driver.availability_changed", handleEvent);

      socketRef.current = socket;
    });

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [realtimeUrl, getToken]);

  return { events, connected };
}
