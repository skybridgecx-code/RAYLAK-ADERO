# Adero Deferred AWS Storage Setup

## Why AWS/S3 is deferred

AWS/S3 setup is intentionally deferred for the first Adero production deploy so the team can ship
core admin and cron flows without creating placeholder cloud credentials.

Do not use dummy AWS values.

## Product impact while deferred

Until AWS/S3 is configured:

- portal file attachments are unavailable
- admin attachment downloads are unavailable

Non-file portal submissions continue to work.

## Required future env vars

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `AWS_S3_BUCKET`

## Future validation checklist

1. Create a private S3 bucket for Adero portal attachments.
2. Confirm S3 Block Public Access is enabled.
3. Create IAM credentials scoped to that bucket with least privilege.
4. Set AWS env vars in production hosting (for `apps/adero-web`).
5. Redeploy Adero web.
6. Test portal file upload from a live portal token flow.
7. Test admin file download from submission/admin surfaces.
