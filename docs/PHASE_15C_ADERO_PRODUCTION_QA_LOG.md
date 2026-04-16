# Phase 15C - Adero Production QA Log Template

Use this template to record manual production QA results consistently after each deploy.

## Production URLs

- Raylak: https://raylak.vercel.app
- Adero: https://adero-disp.vercel.app

## QA Run Metadata

- Tester:
- Date:
- Deployed commit SHA:
- Vercel deployment URL:

## Severity Definitions

- `P0` blocks production
- `P1` blocks core workflow
- `P2` degraded/confusing
- `P3` polish

## Logging Table Format

| Area | URL | Expected | Actual | Status | Severity | Follow-up |
| --- | --- | --- | --- | --- | --- | --- |

`Status` recommendation: `PASS`, `FAIL`, `BLOCKED`, `N/A`

## Smoke Results

| Area | URL | Expected | Actual | Status | Severity | Follow-up |
| --- | --- | --- | --- | --- | --- | --- |
| Smoke: Raylak home | `https://raylak.vercel.app` | HTTP response is reachable and non-error. |  |  |  |  |
| Smoke: Raylak book | `https://raylak.vercel.app/book` | HTTP response is reachable and non-error. |  |  |  |  |
| Smoke: Adero home | `https://adero-disp.vercel.app` | HTTP response is reachable and non-error. |  |  |  |  |
| Smoke: Adero admin login | `https://adero-disp.vercel.app/admin/login` | Login route loads. |  |  |  |  |
| Smoke: Adero deployed script | `pnpm smoke:adero:deployed` | Script passes with configured env placeholders/secrets from secret manager. |  |  |  |  |

## Admin Login

| Area | URL | Expected | Actual | Status | Severity | Follow-up |
| --- | --- | --- | --- | --- | --- | --- |
| Admin login - wrong secret | `/admin/login` | Wrong secret is rejected. |  |  |  |  |
| Admin login - correct secret | `/admin/login` | Correct secret grants admin access. |  |  |  |  |

## Admin Health

| Area | URL | Expected | Actual | Status | Severity | Follow-up |
| --- | --- | --- | --- | --- | --- | --- |
| Admin health route | `/admin/health` | Route loads for admin session. |  |  |  |  |
| Admin health base URL | `/admin/health` | `Adero base URL configured` shows yes. |  |  |  |  |
| Admin health AWS deferred | `/admin/health` | AWS/S3 appears deferred if not configured, not failed. |  |  |  |  |
| Secret exposure check | `/admin/health` | No raw secret values visible. |  |  |  |  |

## Applications

| Area | URL | Expected | Actual | Status | Severity | Follow-up |
| --- | --- | --- | --- | --- | --- | --- |
| Applications queue | `/admin` | Queue and filters load with no fatal errors. |  |  |  |  |
| Company application detail | `/admin/company/<id>` | Detail page loads from queue. |  |  |  |  |
| Operator application detail | `/admin/operator/<id>` | Detail page loads from queue. |  |  |  |  |

## Members / Profiles

| Area | URL | Expected | Actual | Status | Severity | Follow-up |
| --- | --- | --- | --- | --- | --- | --- |
| Profiles landing | `/admin/profiles` | Profiles hub loads and links work. |  |  |  |  |
| Company profiles | `/admin/profiles/companies` | List and profile drill-down work. |  |  |  |  |
| Operator profiles | `/admin/profiles/operators` | List and profile drill-down work. |  |  |  |  |
| Document tracking | `/admin/profiles/documents` | Tracking view loads and is usable. |  |  |  |  |

## Compliance

| Area | URL | Expected | Actual | Status | Severity | Follow-up |
| --- | --- | --- | --- | --- | --- | --- |
| Compliance dashboard | `/admin/compliance` | Queue/actions/filters load without blockers. |  |  |  |  |

## Dispatch / Tracking

| Area | URL | Expected | Actual | Status | Severity | Follow-up |
| --- | --- | --- | --- | --- | --- | --- |
| Dispatch board | `/admin/dispatch` | Dispatch page loads and notices/actions work. |  |  |  |  |
| Tracking board | `/admin/tracking` | Tracking page loads and is usable. |  |  |  |  |
| Trip tracking detail | `/admin/tracking/<tripId>` | Detail page loads for valid trip IDs. |  |  |  |  |

## Pricing / Quotes / Invoices / Payments

| Area | URL | Expected | Actual | Status | Severity | Follow-up |
| --- | --- | --- | --- | --- | --- | --- |
| Pricing rules | `/admin/pricing` | Pricing page loads and controls render. |  |  |  |  |
| Quotes | `/admin/pricing/quotes` | Quotes page loads. |  |  |  |  |
| Invoices | `/admin/pricing/invoices` | Invoices page loads and is usable. |  |  |  |  |
| Payments | `/admin/pricing/payments` | Payments page loads and is usable. |  |  |  |  |

## Submissions

| Area | URL | Expected | Actual | Status | Severity | Follow-up |
| --- | --- | --- | --- | --- | --- | --- |
| Submissions inbox | `/admin/submissions` | Inbox and filters load and are usable. |  |  |  |  |
| Submission integrity | `/admin/submissions/integrity` | Integrity page loads and renders health state. |  |  |  |  |
| Submission detail | `/admin/submissions/<id>` | Timeline/detail page loads for valid IDs. |  |  |  |  |

## Quality / Disputes / Incidents

| Area | URL | Expected | Actual | Status | Severity | Follow-up |
| --- | --- | --- | --- | --- | --- | --- |
| Quality dashboard | `/admin/quality` | Quality overview loads. |  |  |  |  |
| Disputes queue | `/admin/quality/disputes` | Disputes list loads and links work. |  |  |  |  |
| Dispute detail | `/admin/quality/disputes/<id>` | Detail page loads for valid IDs. |  |  |  |  |
| Incidents queue | `/admin/quality/incidents` | Incidents list loads and links work. |  |  |  |  |
| Incident detail | `/admin/quality/incidents/<id>` | Detail page loads for valid IDs. |  |  |  |  |

## Deferred AWS/S3 Attachment Behavior

| Area | URL | Expected | Actual | Status | Severity | Follow-up |
| --- | --- | --- | --- | --- | --- | --- |
| AWS/S3 deferred mode | `/admin/health` and portal flows | Attachments intentionally unavailable until AWS/S3 is configured; non-file flows remain operational. |  |  |  |  |
| Attachment QA gating | `docs/ADERO_DEFERRED_AWS_STORAGE.md` | Upload/download QA stays blocked until AWS/S3 setup is complete. |  |  |  |  |

## Security Note

Never paste secrets into QA notes, screenshots, tickets, chat, or logs.
