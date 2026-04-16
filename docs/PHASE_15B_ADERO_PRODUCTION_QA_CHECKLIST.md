# Phase 15B - Adero Production QA Checklist

Use this checklist for post-deploy production QA on every Adero release.

QA log template: `docs/PHASE_15C_ADERO_PRODUCTION_QA_LOG.md`

## Production URLs

- Raylak: https://raylak.vercel.app
- Adero: https://adero-disp.vercel.app

## Pre-QA Checks

1. Confirm clean tree:
   `git status -sb`
2. Confirm recent commits:
   `git log --oneline -5`
3. Run validation:
   `pnpm validate`
4. Confirm latest `main` is pushed to remote before QA signoff.

## Vercel Env Checks (Adero)

Required for production QA:

- `DATABASE_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `ADERO_ADMIN_SECRET`
- `ADERO_CRON_SECRET`
- `ADERO_BASE_URL=https://adero-disp.vercel.app`

Deferred (intentionally not required for first deploy):

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `AWS_S3_BUCKET`

## Smoke Commands

Run from your terminal:

```bash
curl -I https://raylak.vercel.app
curl -I https://raylak.vercel.app/book
curl -I https://adero-disp.vercel.app
curl -I https://adero-disp.vercel.app/admin/login
```

Run deployed Adero smoke helper with environment placeholders only:

```bash
ADERO_DEPLOYED_BASE_URL="https://adero-disp.vercel.app" \
ADERO_ADMIN_SECRET="<set-from-secret-manager>" \
ADERO_CRON_SECRET="<set-from-secret-manager>" \
pnpm smoke:adero:deployed
```

Never paste raw secrets into docs, chat, logs, screenshots, or tickets.

## Browser QA - Admin + Health

1. Open `https://adero-disp.vercel.app/admin/login`.
2. Submit wrong admin secret.
3. Submit correct admin secret.
4. Open `https://adero-disp.vercel.app/admin/health`.
5. Verify `Adero base URL configured` shows `yes`.
6. Verify AWS/S3 is shown as deferred (not a deploy failure).
7. Confirm no raw secret values appear anywhere on page/UI.

Expected outcomes:

- Wrong admin secret fails login.
- Correct admin secret grants admin access.
- `/admin/health` loads for admin users only.
- Deferred AWS is informational and does not block first deploy QA.

## Core Workflow QA

Use this table format during testing:

- Notes column: mark `PASS`, `FAIL`, and brief evidence.

### Applications

| URL/Path | What To Verify | Acceptable Result | Blocker Result | Notes |
| --- | --- | --- | --- | --- |
| `/admin` | Application queue loads with filters/search/status cards. | Page loads, list/filters respond, no critical errors. | 5xx, broken filters, or blank/error state without data reason. | [ ] |
| `/admin/company/<id>` | Company application detail opens from queue. | Detail view renders with expected metadata/actions. | Route fails, missing core application data, or hard error. | [ ] |
| `/admin/operator/<id>` | Operator application detail opens from queue. | Detail view renders with expected metadata/actions. | Route fails, missing core application data, or hard error. | [ ] |

### Members / Profiles

| URL/Path | What To Verify | Acceptable Result | Blocker Result | Notes |
| --- | --- | --- | --- | --- |
| `/admin/profiles` | Profiles landing loads with links/summary. | Loads and links to companies/operators/documents. | 5xx or broken navigation. | [ ] |
| `/admin/profiles/companies` | Company profiles list and drill-down links work. | List renders, profile pages open. | List/profile route fails. | [ ] |
| `/admin/profiles/operators` | Operator profiles list and drill-down links work. | List renders, profile pages open. | List/profile route fails. | [ ] |
| `/admin/profiles/documents` | Document tracking board loads and is readable. | Document status entries visible and actionable UI works. | 5xx or unusable tracking view. | [ ] |

### Compliance

| URL/Path | What To Verify | Acceptable Result | Blocker Result | Notes |
| --- | --- | --- | --- | --- |
| `/admin/compliance` | Compliance queue, assignments, and filters load. | Queue renders with expected issue rows and controls. | Queue unavailable or action controls broken. | [ ] |

### Dispatch / Tracking

| URL/Path | What To Verify | Acceptable Result | Blocker Result | Notes |
| --- | --- | --- | --- | --- |
| `/admin/dispatch` | Dispatch board and notices load. | Dispatch page renders; actions show success/error notices. | 5xx, broken page, or unusable dispatch controls. | [ ] |
| `/admin/tracking` | Fleet tracking page loads with current state. | Tracking list/map state loads without fatal errors. | Route fails or tracking UI unusable. | [ ] |
| `/admin/tracking/<tripId>` | Trip tracking detail route opens. | Trip detail view renders if trip exists. | Route consistently errors for valid trip links. | [ ] |

### Pricing / Quotes / Invoices / Payments

| URL/Path | What To Verify | Acceptable Result | Blocker Result | Notes |
| --- | --- | --- | --- | --- |
| `/admin/pricing` | Pricing rules page loads and controls render. | Rules table/actions visible and no fatal errors. | Pricing route unavailable or controls broken. | [ ] |
| `/admin/pricing/quotes` | Quotes view renders. | Quotes list/page loads normally. | 5xx or unusable quotes surface. | [ ] |
| `/admin/pricing/invoices` | Invoice operations page renders. | Invoices list/actions load without fatal errors. | 5xx or invoice workflow unusable. | [ ] |
| `/admin/pricing/payments` | Payments page renders. | Payment status/list view loads. | 5xx or payment admin route broken. | [ ] |

### Submissions

| URL/Path | What To Verify | Acceptable Result | Blocker Result | Notes |
| --- | --- | --- | --- | --- |
| `/admin/submissions` | Submission inbox loads and shows status filters. | List, filters, and timeline links work. | 5xx or inability to review submissions. | [ ] |
| `/admin/submissions/integrity` | Chain integrity page loads. | Integrity checks render with healthy/degraded indicators. | Route fails or integrity visibility unavailable. | [ ] |
| `/admin/submissions/<id>` | Submission timeline detail opens. | Timeline and review context render. | Route fails for valid submission links. | [ ] |

### Quality / Disputes / Incidents

| URL/Path | What To Verify | Acceptable Result | Blocker Result | Notes |
| --- | --- | --- | --- | --- |
| `/admin/quality` | Quality dashboard loads with dispute/incident summaries. | Dashboard renders and links work. | 5xx or broken quality dashboard. | [ ] |
| `/admin/quality/disputes` | Disputes queue loads. | List/status filters/detail links work. | Route fails or dispute queue unusable. | [ ] |
| `/admin/quality/disputes/<id>` | Dispute detail opens. | Detail renders and review actions are available. | Valid dispute route errors. | [ ] |
| `/admin/quality/incidents` | Incidents queue loads. | List/detail links work and data visible. | Route fails or queue unusable. | [ ] |
| `/admin/quality/incidents/<id>` | Incident detail opens. | Detail renders and notes/history are visible. | Valid incident route errors. | [ ] |

## Deferred AWS/S3 QA Note

- Portal file attachments are intentionally unavailable until AWS/S3 is configured.
- Portal non-file submissions should still work.
- File upload/download QA is blocked until AWS/S3 credentials and bucket config are complete.
- Reference: `docs/ADERO_DEFERRED_AWS_STORAGE.md`

## QA Handoff Template

- Tester:
- Date:
- Deployed commit SHA:
- Vercel deployment URL:
- Passed checks:
- Blockers:
- Follow-up issues:
