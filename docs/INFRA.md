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
- `GH_DISPATCH_TOKEN` — GitHub PAT (fine-grained, repo `thinesrao/fpl-dashboard`, Actions: Read and write) for the Publish button to trigger `workflow_dispatch`.

## Plan 3 — Admin + scheduling

### Supabase Authentication
- Create a single admin user: **Authentication** → **Users** → **Add user** (email + password).
- The public Supabase anon key and project URL go in **Vercel** as:
  - `NEXT_PUBLIC_SUPABASE_URL` (Config type)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Config type)
- These enable the frontend admin panel (`/admin/login`) to authenticate against Supabase.

### GitHub Actions variable (not secret)
- Settings → **Secrets and variables** → **Actions** → **Variables**
- Create `DASHBOARD_URL` = the public Blob URL for `dashboard.json` (from `VERCEL_BLOB_READ_ONLY_TOKEN` setup).
- This allows the gate script (`scripts/should_run_gate.py`) to read the currently-published gameweek and decide whether to run the heavy pipeline.

### Scheduled pipeline (gated)
- The pipeline now runs on an **hourly** cron (`0 * * * *`), but the heavy steps (install, pipeline run, Node publish) are gated by `scripts/should_run_gate.py`.
- The gate watches for a new finalized gameweek in the published `dashboard.json` and only runs if the pipeline has new data to process.
- Manual **"Run workflow"** (or Actions → `workflow_dispatch`) always runs the pipeline, bypassing the gate — use this for immediate updates.
