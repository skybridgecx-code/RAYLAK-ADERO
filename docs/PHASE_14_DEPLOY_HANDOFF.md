# Phase 14 Deploy Handoff

## Production URLs

- Raylak website/app: https://raylak.vercel.app
- Adero app: https://adero-disp.vercel.app

## Deployed Commit

- Commit: d4745d0 chore(phase-14d): defer Adero AWS storage setup

## Raylak Smoke Results

- `/`: HTTP 200
- `/book`: HTTP 200

## Adero Smoke Results

- Homepage: PASS, HTTP 200
- Admin login endpoint: PASS, HTTP 200
- Cron endpoint without x-cron-secret: PASS, HTTP 401
- Cron endpoint with wrong x-cron-secret: PASS, HTTP 401
- Cron endpoint with correct x-cron-secret: PASS, HTTP 200
- Deployed smoke script: PASS

## Deferred Work

- AWS/S3 storage is intentionally deferred.
- Portal file attachments are unavailable until real AWS/S3 storage is configured.
- Do not use dummy AWS values.

## Vercel Project Mapping

- Raylak Vercel project root: `apps/web`
- Adero Vercel project root: `apps/adero-web`

## Secret Handling

- Do not paste raw secrets in docs, tickets, screenshots, chats, or logs.
- `ADERO_ADMIN_SECRET` and `ADERO_CRON_SECRET` must remain different.
