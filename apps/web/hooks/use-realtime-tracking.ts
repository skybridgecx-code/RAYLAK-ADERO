"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { ServerToClientEvents, ClientToServerEvents, BookingStatusChangedEvent } from "@raylak/shared/events";

type TrackSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export interface UseRealtimeTrackingResult {
  latestEvent: BookingStatusChangedEvent | null;
  connected: boolean;
}

/**
 * Connects to the realtime server's /track namespace as an unauthenticated
 * customer. Supplies the booking reference code as the access credential.
 *
 * Returns null gracefully if NEXT_PUBLIC_REALTIME_URL is not set.
 *
 * Security: the server validates the code format and scopes the socket to a
 * room for that specific booking — no cross-booking data leakage.
 */
export function useRealtimeTracking(referenceCode: string): UseRealtimeTrackingResult {
  const [latestEvent, setLatestEvent] = useState<BookingStatusChangedEvent | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<TrackSocket | null>(null);

  const realtimeUrl = process.env["NEXT_PUBLIC_REALTIME_URL"];

  useEffect(() => {
    if (!realtimeUrl || !referenceCode) return;

    const socket = io(`${realtimeUrl}/track`, {
      auth: { code: referenceCode },
      transports: ["websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
    }) as TrackSocket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("booking.status_changed", (event) => {
      // Only accept events for our reference code (defensive check)
      if (event.referenceCode === referenceCode) {
        setLatestEvent(event);
      }
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [realtimeUrl, referenceCode]);

  return { latestEvent, connected };
}
