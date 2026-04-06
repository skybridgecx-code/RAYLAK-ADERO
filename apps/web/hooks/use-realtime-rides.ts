"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { io, type Socket } from "socket.io-client";
import type { ServerToClientEvents, ClientToServerEvents } from "@raylak/shared/events";

type RidesSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export interface UseRealtimeRidesResult {
  connected: boolean;
}

/**
 * Connects to the realtime server's /rides namespace as a driver.
 * On receiving assignment or status events, triggers a router refresh so the
 * driver's queue and ride detail pages update without a manual reload.
 *
 * Returns disconnected gracefully if NEXT_PUBLIC_REALTIME_URL is not set.
 *
 * Auth: sends Clerk JWT as socket auth.token; server role-checks for "driver".
 */
export function useRealtimeRides(): UseRealtimeRidesResult {
  const { getToken } = useAuth();
  const router = useRouter();
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<RidesSocket | null>(null);

  const realtimeUrl = process.env["NEXT_PUBLIC_REALTIME_URL"];

  useEffect(() => {
    if (!realtimeUrl) return;

    let socket: RidesSocket;
    let cancelled = false;

    void getToken().then((token) => {
      if (cancelled || !token) return;

      socket = io(`${realtimeUrl}/rides`, {
        auth: { token },
        transports: ["websocket"],
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      }) as RidesSocket;

      socket.on("connect", () => setConnected(true));
      socket.on("disconnect", () => setConnected(false));

      // Refresh the current route so queue / detail data is up to date
      socket.on("booking.assigned", () => {
        router.refresh();
      });
      socket.on("booking.status_changed", () => {
        router.refresh();
      });

      socketRef.current = socket;
    });

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [realtimeUrl, getToken, router]);

  return { connected };
}
