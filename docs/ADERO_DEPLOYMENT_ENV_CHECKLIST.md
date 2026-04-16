# Adero Deployment Env Checklist

Use this checklist before promoting `apps/adero-web` to production.

## Required for first deploy

Set these in your hosting provider for the first production deploy:

- `DATABASE_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `ADERO_ADMIN_SECRET` (admin login + admin cookie auth)
- `ADERO_CRON_SECRET` (cron route auth for payment lifecycle)

## Deferred / add later for portal file attachments

AWS/S3 setup is intentionally deferred. Before enabling production portal file attachments, create a
private S3 bucket, configure least-privilege credentials, set the AWS env vars, redeploy, and run
portal upload/download smoke tests. Do not use dummy AWS values.

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `AWS_S3_BUCKET`

Without these AWS vars:

- portal file uploads are unavailable
- attachment downloads in admin surfaces are unavailable

Stripe vars used by Adero:

- `STRIPE_SECRET_KEY` (server-side Stripe operations)
- `STRIPE_WEBHOOK_SECRET` (primary webhook signature)
- `STRIPE_CONNECT_WEBHOOK_SECRET` (Connect webhook signature)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (client payment UX; if missing, UI degrades to support flow)

Resend / email / URL vars used by Adero:

- `RESEND_API_KEY` (email sending; if missing, email sends are skipped)
- `ADERO_FROM_EMAIL` (optional sender override)
- `ADERO_BASE_URL` (recommended for absolute links + Stripe onboarding return URLs)

## Critical secret separation

Do **not** reuse `ADERO_ADMIN_SECRET` as `ADERO_CRON_SECRET`.

- `ADERO_ADMIN_SECRET` is for human/admin auth.
- `ADERO_CRON_SECRET` is for machine-to-machine cron auth.

## Cron call contract

- Endpoint: `/api/cron/payment-lifecycle`
- Header: `x-cron-secret: <ADERO_CRON_SECRET>`
- Wrong secret: `401 Unauthorized`
- Missing server env `ADERO_CRON_SECRET`: `500` server misconfiguration

Example request:

```bash
curl -i "https://<adero-domain>/api/cron/payment-lifecycle" \
  -H "x-cron-secret: <ADERO_CRON_SECRET>"
```

## Local validation before deploy

Run:

```bash
pnpm check:admin-auth
pnpm validate
```

`pnpm validate` runs:

```bash
pnpm check:admin-auth && pnpm check:adero-deploy && pnpm typecheck && pnpm lint && SKIP_ENV_VALIDATION=1 pnpm build
```

## Deployment checklist

1. Set first-deploy required env vars in the host (Production scope).
2. If you are enabling attachments, also set deferred AWS vars.
3. Deploy the target branch/release.
4. Verify Adero admin login works with `ADERO_ADMIN_SECRET`.
5. Verify cron endpoint auth with `x-cron-secret: <ADERO_CRON_SECRET>`.
6. Verify cron execution effects and review payment lifecycle logs.
7. If AWS is configured, verify portal attachment upload and admin download.
