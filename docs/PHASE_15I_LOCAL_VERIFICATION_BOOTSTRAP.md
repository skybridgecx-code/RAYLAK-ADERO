# Phase 15I — Adero local manual verification bootstrap

## Summary

Phase 15I adds a small dev-only bootstrap helper for local `/admin/dispatch` manual-offer verification.

It removes ad hoc SQL from the Phase 15E/15G flow by creating one known-good local requester/operator pair and one fresh `submitted` request in queue.

## Scope

Added:
- `apps/adero-web/scripts/bootstrap-dispatch-manual-check.mjs`
- `apps/adero-web/package.json` script alias: `bootstrap:dispatch-manual-check`

Not changed:
- dispatch runtime logic
- auth model
- production behavior
- compliance/document flows

## Usage

From repo root:

```bash
pnpm --filter @adero/web bootstrap:dispatch-manual-check
```

Optional local overrides:

```bash
ADERO_LOCAL_REQUESTER_EMAIL="requester@local.test" \
ADERO_LOCAL_OPERATOR_EMAIL="operator@local.test" \
pnpm --filter @adero/web bootstrap:dispatch-manual-check
```

The script:
- reads `DATABASE_URL` from process env, then `apps/adero-web/.env.local`, then `apps/adero-web/.env`
- ensures one requester user exists
- ensures one operator user exists and is marked `available`
- inserts one fresh `submitted` request for dispatch queue testing
- prints the created IDs and next manual verification steps

## Manual verification flow after bootstrap

1. Start Adero app on a free port (example):
```bash
pnpm --filter @adero/web dev -- --port 3011
```
2. Login at `/admin/login` with local `ADERO_ADMIN_SECRET`.
3. Open `/admin/dispatch`.
4. Create manual offer using the generated request/operator entries.
5. Confirm redirect/success notice and verify no false `NEXT_REDIRECT` failure log.

## Validation used for this phase

- `pnpm --filter @adero/web bootstrap:dispatch-manual-check`

