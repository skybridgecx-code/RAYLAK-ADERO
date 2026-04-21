# Adero verification

## Purpose

This is the stable entrypoint for Adero verification work.

Use this doc when you need the fastest path to:
- local manual-offer verification
- post-fix success criteria
- admin secret operational history
- verification document navigation

## Fastest local verification path

1. Run the local bootstrap:
   - `docs/PHASE_15I_LOCAL_VERIFICATION_BOOTSTRAP.md`
2. Follow the local manual verification runbook:
   - `docs/PHASE_15J_LOCAL_MANUAL_VERIFICATION_RUNBOOK.md`
3. Compare the observed outcome against the confirmed success criteria:
   - `docs/PHASE_15G_POST_FIX_MANUAL_CONFIRMATION.md`

## Verification map

- Verification index:
  - `docs/PHASE_15K_ADERO_VERIFICATION_INDEX.md`
- Local bootstrap:
  - `docs/PHASE_15I_LOCAL_VERIFICATION_BOOTSTRAP.md`
- Local manual verification runbook:
  - `docs/PHASE_15J_LOCAL_MANUAL_VERIFICATION_RUNBOOK.md`
- Post-fix confirmation:
  - `docs/PHASE_15G_POST_FIX_MANUAL_CONFIRMATION.md`
- Admin secret rotation history:
  - `docs/PHASE_15H_ADERO_ADMIN_SECRET_ROTATION.md`

## Guardrails

- Treat admin secret/login problems as ops or environment issues first.
- Treat React Client Manifest / `app/app/error.tsx` issues as new bugs only if independently reproduced with clear evidence.
- Do not reopen dispatch/auth product work from verification docs alone.

