# Adero Production Deploy Runbook

This runbook turns the checklist into exact operator steps for production deploys of `apps/adero-web`.

Reference: `docs/ADERO_DEPLOYMENT_ENV_CHECKLIST.md`

## 1. Pre-Deploy Local Verification

Run these from repo root before any deploy:

```bash
git status -sb
git log --oneline -8
pnpm validate
```

Release blocker: any failed command above.

## 2. Required Production Env Vars

Set these in your hosting provider for the Adero production environment.

### Clerk

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

### Adero Admin/Cron

- `ADERO_ADMIN_SECRET`
- `ADERO_CRON_SECRET`

### Stripe

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_CONNECT_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### Email/Base URL

- `RESEND_API_KEY`
- `ADERO_FROM_EMAIL`
- `ADERO_BASE_URL`

### Database/Shared Infra

- `DATABASE_URL`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_S3_BUCKET`
- `AWS_REGION`

## 3. Critical Secret Separation

`ADERO_ADMIN_SECRET` and `ADERO_CRON_SECRET` must be different.

- `ADERO_ADMIN_SECRET` is for human admin login only.
- `ADERO_CRON_SECRET` is for the cron endpoint only.

## 4. Deploy Steps

1. Set/update all production env vars in the hosting provider.
2. Deploy the Adero web app (`apps/adero-web` deployment target).
3. Confirm the deployed URL (store it for smoke tests and handoff).
4. Do not expose secrets in terminal output, logs, screenshots, PR comments, or docs.

## 5. Post-Deploy Smoke Tests

Primary smoke path: run the scripted post-deploy checks.

```bash
ADERO_DEPLOYED_BASE_URL="https://<your-adero-prod-domain>" \
ADERO_ADMIN_SECRET="..." \
ADERO_CRON_SECRET="..." \
./scripts/adero_deployed_smoke_check.sh
```

Never commit secrets. Do not paste smoke command output if it includes provider logs or secrets.

Manual fallback checks (if needed):

```bash
export ADERO_BASE_URL="https://<your-adero-prod-domain>"
export ADERO_CRON_SECRET="<from-secret-manager>"
export WRONG_SECRET="invalid-smoke-secret"
```

### 5.1 Homepage Reachability

```bash
curl -i "$ADERO_BASE_URL/"
```

Acceptable: `200` or expected redirect (`301`/`302`) to the canonical URL.
Blocker: `5xx`, DNS/TLS failure, or broken redirect loop.

### 5.2 Admin Login Screen

Open in browser:

```text
$ADERO_BASE_URL/admin/login
```

Acceptable: login page renders.
Blocker: `404`, `5xx`, or broken page load.

### 5.3 Admin Login Negative Test (Wrong Secret)

In browser, submit an incorrect admin secret.

Acceptable: login is rejected, user remains on admin login flow.
Blocker: wrong secret grants admin access.

### 5.4 Admin Login Positive Test (Correct Secret)

In browser, submit the correct `ADERO_ADMIN_SECRET`.

Acceptable: user enters admin area.
Blocker: valid secret cannot access admin area.

### 5.5 Cron Endpoint Without Header (Must Fail)

```bash
curl -i "$ADERO_BASE_URL/api/cron/payment-lifecycle"
```

Acceptable: auth failure response (typically `401`), or `500` if env is missing.
Blocker: unauthenticated request succeeds.

### 5.6 Cron Endpoint With Wrong Header (Must Fail)

```bash
curl -i \
  -H "x-cron-secret: $WRONG_SECRET" \
  "$ADERO_BASE_URL/api/cron/payment-lifecycle"
```

Acceptable: auth failure (`401`).
Blocker: wrong secret succeeds.

### 5.7 Cron Endpoint With Correct Header

```bash
curl -i \
  -H "x-cron-secret: $ADERO_CRON_SECRET" \
  "$ADERO_BASE_URL/api/cron/payment-lifecycle"
```

Acceptable: `200` JSON response (success path) or a safe application-level response (for example `429` rate-limit if retried too quickly).
Blocker: repeated `401` with correct secret, or unhandled `5xx` failures.

## 6. Rollback

1. Revert to the last known-good hosting deployment.
2. Rotate secrets immediately if any secret exposure is suspected.
3. Review deployment/runtime logs to identify failure cause.
4. Re-run `pnpm validate` locally before any subsequent redeploy.

## 7. Handoff

Record the following in the release handoff note:

- Deployed URL
- Commit SHA
- `pnpm validate` result
- Smoke-test results (pass/fail per step)

Never paste raw secrets in docs, tickets, chat, screenshots, or logs.
