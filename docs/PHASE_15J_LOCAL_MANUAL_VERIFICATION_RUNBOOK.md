# Phase 15J — Local manual-offer verification runbook

## Prerequisites

- Run from repo root: `/Users/muhammadaatif/raylak`
- Local DB reachable via `DATABASE_URL` (env, `apps/adero-web/.env.local`, or `apps/adero-web/.env`)
- Local admin secret available for login: `ADERO_ADMIN_SECRET`
- Free local port (example below uses `3011`)

## 1) Bootstrap local verification data

```bash
pnpm --filter @adero/web bootstrap:dispatch-manual-check
```

Expected bootstrap success signals:
- `Adero local manual verification bootstrap complete.`
- `Created submitted request id: <uuid>`
- Printed requester/operator IDs and next steps

Expected bootstrap failure signal:
- `Bootstrap failed: ...` or `Missing DATABASE_URL. Set it in env or apps/adero-web/.env.local.`

## 2) Start local Adero web on a free port

```bash
pnpm --filter @adero/web dev -- --port 3011
```

## 3) Admin login path

Open:
- `http://localhost:3011/admin/login`

Authenticate using local `ADERO_ADMIN_SECRET`.

## 4) Dispatch/manual-offer verification flow

1. Open `http://localhost:3011/admin/dispatch`.
2. Find the newly created `submitted` request from the bootstrap run.
3. Select the bootstrap operator (available operator created/updated by the script).
4. Submit the manual offer form.

## 5) Expected success signals

- Browser redirects back to `/admin/dispatch` with success notice: `Manual offer created.`
- No false server error log for success path:
  - no `[adero] createManualOffer failed: ...`
  - no false `NEXT_REDIRECT` failure logging

## 6) Expected failure signals

- Redirect back to `/admin/dispatch` with `noticeType=error`, for example:
  - `Invalid manual offer payload.`
  - `Operator is not currently available.`
  - `An offer already exists for this operator on the request.`
- Server logs:
  - `[adero] createManualOffer failed: ...` (manual-offer failure path)

## 7) Repeat-run and cleanup notes

- Re-running bootstrap is safe for local verification:
  - requester/operator are reused by email (role/availability refreshed)
  - one fresh `submitted` request is inserted each run
- Preferred repeat pattern:
  1. stop dev server
  2. re-run bootstrap command
  3. restart dev server on a free port
  4. verify against the newest request ID printed by bootstrap
