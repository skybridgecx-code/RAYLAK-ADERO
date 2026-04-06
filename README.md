# RAYLAK

Production-grade luxury transportation platform.

---

## Monorepo structure

```
raylak/
├── apps/
│   └── web/                    # Next.js 15 App Router (Vercel)
│       ├── app/
│       │   ├── (website)/      # Public marketing & booking portal
│       │   ├── (dashboard)/    # Operator dashboard (dispatcher + admin)
│       │   └── (driver)/       # Driver PWA (mobile-first)
│       ├── lib/
│       │   ├── env.ts          # Zod-validated env
│       │   ├── auth.ts         # Clerk RBAC helpers
│       │   ├── redis.ts        # Redis singleton
│       │   └── trpc/           # tRPC router + client
│       └── components/
├── packages/
│   ├── db/                     # Drizzle ORM + schema + migrations
│   ├── shared/                 # Enums, types, Zod validators (shared across all packages)
│   └── ui/                     # shadcn/ui + utility functions
├── server/                     # Reserved — Socket.io realtime server (Phase X)
├── turbo.json
└── pnpm-workspace.yaml
```

---

## Tech stack

| Layer                   | Technology                       |
| ----------------------- | -------------------------------- |
| Framework               | Next.js 15 App Router            |
| Language                | TypeScript (strict)              |
| API                     | tRPC v11                         |
| ORM                     | Drizzle ORM                      |
| Database                | PostgreSQL                       |
| Cache / Realtime bridge | Redis                            |
| Realtime                | Socket.io (Phase X, Fly.io)      |
| Auth                    | Clerk with RBAC                  |
| SMS                     | Twilio (Phase X)                 |
| Email                   | Resend (Phase X)                 |
| Maps                    | Google Maps (Phase X)            |
| Payments                | Stripe (Phase X)                 |
| Storage                 | AWS S3 + CloudFront (Phase X)    |
| Monitoring              | Sentry (Phase X)                 |
| Deploy                  | Vercel (web) + Fly.io (realtime) |

---

## Getting started

### Prerequisites

- Node.js 22+
- pnpm 10+
- PostgreSQL (local or remote)
- Redis (local or remote)
- Clerk account

### Setup

```bash
# Install dependencies
pnpm install

# Copy env
cp .env.example apps/web/.env.local
# Fill in required values: DATABASE_URL, REDIS_URL, CLERK_*

# Generate DB migrations
pnpm db:generate

# Apply migrations
pnpm db:migrate

# Start development
pnpm dev
```

### Common commands

| Command            | Description                 |
| ------------------ | --------------------------- |
| `pnpm dev`         | Start all apps in dev mode  |
| `pnpm build`       | Build all apps              |
| `pnpm lint`        | Lint all packages           |
| `pnpm typecheck`   | Type-check all packages     |
| `pnpm format`      | Prettier format all files   |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:migrate`  | Apply migrations            |
| `pnpm db:studio`   | Open Drizzle Studio         |

---

## RBAC roles

| Role          | Access                                     |
| ------------- | ------------------------------------------ |
| `owner`       | Company owner, full operator access        |
| `admin`       | Company-level admin, all operator features |
| `dispatcher`  | Booking, dispatch, driver assignment       |
| `driver`      | Driver PWA only                            |
| `customer`    | Booking portal only                        |

Roles are stored in Clerk `publicMetadata.role` and synced to the `users` table.

---

## Booking status flow

```
new_request → quoted → confirmed → assigned
  → driver_en_route → driver_arrived → passenger_picked_up → completed

Also: canceled (from most states), no_show (from driver_arrived)
```

Transitions are enforced server-side via `BOOKING_STATUS_TRANSITIONS` in `packages/shared/src/enums.ts`.

---

## Phase log

| Phase                               | Status   | Scope                                     |
| ----------------------------------- | -------- | ----------------------------------------- |
| 1 — Foundation                      | Complete | Monorepo, schema, shells, tRPC, auth, env |
| 2 — Booking intake + dashboard      | Planned  |                                           |
| 3 — Dispatch + driver assignment    | Planned  |                                           |
| 4 — Driver PWA + ride workflow      | Planned  |                                           |
| 5 — Realtime (Socket.io)            | Planned  |                                           |
| 6 — Notifications (Twilio + Resend) | Planned  |                                           |
| 7 — Pricing engine + rate cards     | Planned  |                                           |
| 8 — Payments (Stripe)               | Planned  |                                           |
| 9 — Analytics + reporting           | Planned  |                                           |
