# Release Checklist

## Required Command Before Release

Run:

```bash
pnpm validate
```

`pnpm validate` includes:

- Adero admin auth regression check
- Adero deployment env smoke check
- typecheck
- lint
- build

For production env requirements, see:

- `docs/ADERO_DEPLOYMENT_ENV_CHECKLIST.md`

## Release Steps

1. Confirm clean git tree: `git status -sb`
2. Run `pnpm validate`
3. Verify production env vars from `docs/ADERO_DEPLOYMENT_ENV_CHECKLIST.md`
4. Deploy
5. Smoke test Raylak public booking flow
6. Smoke test Adero admin login
7. Smoke test Adero cron endpoint with `x-cron-secret`
8. Monitor logs for first payment lifecycle run
