# RAYLAK Monorepo — Platform Guide

This repository contains two separate products sharing a common infrastructure layer.

---

## RAYLAK (`apps/web`)

**What it is:** The direct luxury transportation operations platform.

**Audience:** RAYLAK's own dispatchers, drivers, and customers.

**Surfaces:**
- `/(website)` — Public booking portal and marketing site
- `/(dashboard)` — Operator dispatch dashboard (dispatcher / admin / owner roles)
- `/(driver)` — Driver PWA for managing and executing rides

**Stack:** Next.js 15, Clerk auth, tRPC, Drizzle ORM, PostgreSQL, Redis, Socket.io

**URL (production):** `raylak.com`

---

## Adero (`apps/adero-web`)

**What it is:** A separate B2B dispatch network — infrastructure for the premium transportation industry.

**Audience:** Luxury transportation companies (overflow dispatch, backup capacity) and independent operators/chauffeurs (affiliate ride access).

**Not:** A consumer service, a gig platform, or a subsection of RAYLAK.

**Current phase:** Marketing foundation (Phase 9A). No auth, no DB, no cross-dispatch logic yet.

**Planned capabilities:**
- Company-to-company overflow dispatch routing
- Vetted affiliate chauffeur network
- Recurring B2B relationships and contracts
- Real-time availability and assignment for network members

**URL (production):** `adero.io`

---

## Shared Packages

| Package | Used by |
|---|---|
| `@raylak/shared` | Both apps |
| `@raylak/ui` | Both apps |
| `@raylak/db` | RAYLAK only (Adero has no DB access in Phase 9A) |

---

## Running Both Apps

```bash
# RAYLAK only (default port 3000)
pnpm --filter @raylak/web dev

# Adero only (port 3001)
pnpm --filter @adero/web dev

# Both (via Turborepo)
pnpm dev
```
