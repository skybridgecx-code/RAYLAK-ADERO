# RAYLAK — Agent instructions

## Product

RAYLAK is a production-grade luxury transportation platform.
Build RAYLAK OS first. Adero Network is out of scope for now.

## Business context

Serves premium transportation clients: VIP, corporate, airport, event, long-distance.
Platform must be polished, private, reliable, operationally safe.
Not a consumer gig marketplace.

## Core surfaces

1. `app/(website)` — Public website + booking portal
2. `app/(dashboard)` — Operator dashboard (dispatcher + admin)
3. `app/(driver)` — Driver PWA (mobile-first)

## Out of scope for now

- Adero B2B overflow / affiliate network
- Native iOS / Android apps
- Speculative features not in the phase brief

## Canonical stack — no changes without approval

- Next.js 15 App Router
- TypeScript strict
- tRPC v11
- Drizzle ORM + PostgreSQL
- Redis
- Socket.io realtime server (reserved — `server/`)
- Clerk auth with RBAC
- Twilio (SMS), Resend (email), Google Maps, AWS S3+CloudFront, Stripe, Sentry
- Vercel (web) + Fly.io (realtime)

## Monorepo layout

- `apps/web` — Next.js app
- `packages/db` — Drizzle schema + client (`@raylak/db`)
- `packages/shared` — Enums, types, validators (`@raylak/shared`)
- `packages/ui` — shadcn/ui + utils (`@raylak/ui`)
- `server/` — Reserved for Socket.io realtime server

## Key files

- `packages/shared/src/enums.ts` — canonical enum definitions (roles, booking statuses, etc.)
- `packages/db/src/schema/` — Drizzle schema files
- `apps/web/lib/env.ts` — Zod env validation (add new env vars here)
- `apps/web/lib/trpc/trpc.ts` — tRPC init, context, and role-gated procedures
- `apps/web/lib/trpc/root.ts` — Root router (add feature routers here)
- `apps/web/middleware.ts` — Clerk route protection matrix

## Domain model (Phase 1 schema defined)

users, bookings, booking_stops, vehicles, driver_profiles, booking_status_log

## Booking status flow

new_request → quoted → confirmed → assigned → driver_en_route → driver_arrived → passenger_picked_up → completed
Also: canceled, no_show
**Transitions enforced server-side.** Transition map lives in `packages/shared/src/enums.ts`.

## RBAC roles (least privilege)

- `owner` — company owner
- `admin` — company level
- `dispatcher` — booking + dispatch ops
- `driver` — driver PWA only
- `customer` — booking portal only

## Execution rules

- Build in bounded phases; every phase must be independently deployable
- No scope drift — if it's not in the phase brief, don't build it
- Do not change stack without approval
- Do not remove driver app
- Do not weaken RBAC, audit logging, notifications, or dispatch depth
- Commit after each completed phase

## Schema extensibility notes

Tables have reserved comments where Adero multi-tenant `company_id` foreign keys will go.
Do not activate or implement multi-tenancy yet.

## Required output after every phase

1. What changed
2. Exact files changed
3. Validations run
4. Risks / follow-ups
5. Exact git commit command
