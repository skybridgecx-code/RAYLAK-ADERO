# @raylak/realtime

> Reserved for Phase X — Socket.io real-time server

This directory is intentionally empty in Phase 1.

## Planned responsibilities

- Driver location broadcasting
- Booking status push events
- Dispatcher live board updates
- Customer ride tracking feed
- In-app notification delivery

## Planned stack

- Node.js + TypeScript
- Socket.io 4.x
- Redis pub/sub (reuses existing Redis instance)
- Deployed to Fly.io (separate from Vercel web app)

## Integration points

- `apps/web` connects via `REALTIME_SERVER_URL` env var
- Auth validated via shared Clerk session token
- Events namespaced by: `/rides`, `/dispatch`, `/drivers`
