# Phase 15A - Adero Production Health Page

## Route

- `/admin/health`

## Purpose

Provide an admin-only, operator-friendly readiness page for Adero production configuration.
The page reports safe yes/no/unknown status signals without exposing raw secrets.

## Safe fields shown

- App
- Environment (`production` or `development` from `NODE_ENV`)
- Adero base URL configured
- Database URL configured
- Clerk publishable key configured
- Clerk secret key configured
- Admin secret configured
- Cron secret configured
- Admin/Cron secrets are distinct (`yes`/`no`/`unknown`)
- Stripe configured
- Resend/email configured
- AWS/S3 storage configured
- File attachments state (`Enabled` or `Deferred`)

## Deferred AWS/S3 behavior

If storage is not configured, `/admin/health` shows:

`Deferred — portal submissions work, file attachments are unavailable until AWS/S3 is configured.`

This is informational and is not treated as a deploy blocker for first deploy.

## Validation commands

Run from repo root:

```bash
pnpm validate
SKIP_ENV_VALIDATION=1 pnpm build
```
