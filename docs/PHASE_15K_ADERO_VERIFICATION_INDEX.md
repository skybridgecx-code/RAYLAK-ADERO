# Phase 15K — Adero verification index

## Purpose

This doc is the quick entry point for Adero verification work.

Use it to find the right document for:
- post-fix manual confirmation
- admin secret operational handling
- local verification bootstrap
- repeatable local manual-offer verification

## Verification document map

### Phase 15G — Post-fix manual confirmation
File:
- `docs/PHASE_15G_POST_FIX_MANUAL_CONFIRMATION.md`

Use this when you need:
- the confirmed outcome of the admin manual-offer redirect/error-handling fix
- the known-good success criteria for the manual-offer path
- the verified answer on false `NEXT_REDIRECT` logging

Key result:
- manual offer succeeded
- redirect returned cleanly with success notice
- no false `NEXT_REDIRECT` / `createManualOffer failed` log on the success path
- no React Client Manifest / `app/app/error.tsx` noise reproduced on that path during confirmation

### Phase 15H — Admin secret rotation
File:
- `docs/PHASE_15H_ADERO_ADMIN_SECRET_ROTATION.md`

Use this when you need:
- operational history for the Adero admin secret rotation
- confirmation that local and deployed admin login worked after rotation

Rule:
- future admin secret/access problems should be treated as environment/configuration issues first

### Phase 15I — Local verification bootstrap
File:
- `docs/PHASE_15I_LOCAL_VERIFICATION_BOOTSTRAP.md`

Use this when you need:
- a fast local setup path for `/admin/dispatch` manual-offer verification
- a repeatable way to create a valid local submitted request without ad hoc SQL reconstruction

This is the setup step for local verification.

### Phase 15J — Local manual verification runbook
File:
- `docs/PHASE_15J_LOCAL_MANUAL_VERIFICATION_RUNBOOK.md`

Use this when you need:
- exact local commands and browser steps
- success/failure signals for the admin manual-offer check
- the shortest repeatable local verification flow

This is the execution step for local verification.

## Recommended order

### Fastest path for local manual-offer verification
1. Read `docs/PHASE_15I_LOCAL_VERIFICATION_BOOTSTRAP.md`
2. Run the bootstrap helper
3. Follow `docs/PHASE_15J_LOCAL_MANUAL_VERIFICATION_RUNBOOK.md`
4. Compare results against `docs/PHASE_15G_POST_FIX_MANUAL_CONFIRMATION.md`

### When debugging admin access
1. Check `docs/PHASE_15H_ADERO_ADMIN_SECRET_ROTATION.md`
2. Verify local/deployed env configuration before assuming product regression

## Guardrails

- Treat future admin secret problems as ops/configuration issues first.
- Treat any React Client Manifest / `app/app/error.tsx` issue as a new bug only if it is independently reproduced with clear evidence.
- Do not re-open dispatch/auth product work from verification docs alone.

## Outcome

Phase 15K makes the Adero verification path easy to locate:
- 15G = confirmed success criteria
- 15H = admin secret operational history
- 15I = local setup/bootstrap
- 15J = repeatable local manual verification runbook

