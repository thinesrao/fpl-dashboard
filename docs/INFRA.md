# Infrastructure & Secrets

## Supabase
- Project: `fpl-dashboard`
- Env vars (pipeline, server-side only):
  - `SUPABASE_URL` — Project URL
  - `SUPABASE_SERVICE_ROLE_KEY` — service_role secret key (bypasses RLS; NEVER ship to a browser)
- `SUPABASE_ANON_KEY` is used later by the frontend admin (Plan 3), not the pipeline.
- Schema migrations: `supabase/migrations/`.

## Vercel Blob
- Env var (pipeline publish step): `BLOB_READ_WRITE_TOKEN` (read-write token from the Blob store).
- Public output object: `dashboard.json` (stable URL).
  - TODO(user): record the dashboard.json Blob URL after first CI publish

## GitHub Actions secrets (Settings → Secrets and variables → Actions)
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BLOB_READ_WRITE_TOKEN`
- (existing) `GCP_CREDENTIALS`
