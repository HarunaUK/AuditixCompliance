# Auditix

Multi-tenant GRC workspace (ISO/IEC 27001:2022, Cyber Essentials, SOC 2, GDPR, ISO 42001) with registers, statement of applicability, readiness scoring, a Virtual CISO assistant and AI policy drafting.

## Run locally

```bash
npm install
npm run db:start       # Prisma dev Postgres on :51214
npm run db:push
npm run db:seed
npm run serve          # production build supervisor on :8077
```

`npm run serve:dev` runs `next dev` behind the same supervisor (slower, hot reload).

Demo sign-in: `auditix@faseel.app` / `2Uk_EF8YKydydHcs27S9VVPnA9!` (see `.env` for overrides).

## Registers, imports and exports

Every register exports to CSV from one permission-checked endpoint:

```
GET /api/v1/export/policies|risks|suppliers|incidents|actions|training|evidence
GET /api/v1/export/<register>?template=1   # blank sheet with the expected headings
GET /api/v1/policies/<id>/export           # single policy as Markdown
GET /api/soa/export                        # statement of applicability
GET /api/v1/audit-package                  # auditor ZIP: SoA, controls, risks, evidence, policies, readiness, manifest
```

Policies and risks also import from CSV (`POST /api/v1/import/policies|risks`, accepting a
file upload, `{ "csv": "…" }` JSON or a raw `text/csv` body). Imported policies are always
DRAFTs, imported risks are scored from likelihood × impact, and every import is written to the
audit trail. `/reports` lists all of these in one screen.

## AI

The Virtual CISO and the policy generator speak the OpenAI chat-completions API, so any
compatible provider works.

Defaults in `.env` are keyless: they point at Pollinations (`https://text.pollinations.ai/openai`,
model `openai-fast`), which needs no account. That free tier allows roughly one reply every
45 seconds per IP; the UI reports the limit instead of failing silently. `AI_REASONING_EFFORT="low"`
stops the reasoning model from spending its whole reply budget deliberating.

For unlimited, higher-quality output, set:

| Variable | Example |
| --- | --- |
| `AI_KEYLESS` | `0` |
| `AI_API_KEY` | your provider key |
| `AI_BASE_URL` | `https://api.openai.com/v1`, `https://api.z.ai/api/paas/v4`, `https://api.groq.com/openai/v1`, `https://openrouter.ai/api/v1` |
| `AI_MODEL` | `gpt-4o-mini`, `glm-4.6`, `llama-3.3-70b-versatile` |
| `AI_REASONING_EFFORT` | leave empty for non-reasoning models |

## Deploying to Render

[render.yaml](render.yaml) describes the whole stack, so **New → Blueprint → this repo**
provisions a Node web service plus a Postgres database and wires `DATABASE_URL` for you
(Render prompts only for `DEMO_PASSWORD`).

If the service already exists, set it up by hand instead:

| Setting | Value |
| --- | --- |
| Runtime / Language | **Node** (not Python) |
| Build command | `npm install && npm run build` |
| Start command | `node scripts/bootstrap.mjs && npm start` |
| Health check path | `/api/v1/health` |

Then create a Postgres instance, copy its **internal** connection string into `DATABASE_URL`,
and add `AUTH_SECRET` (`openssl rand -base64 32`), `DEMO_EMAIL`, `DEMO_PASSWORD` and
`AI_KEYLESS=1`.

`npm start` runs `scripts/start.mjs`, which reads `PORT` and then starts `next start` on it. A
hardcoded port makes Render's port scan fail even when the build succeeds, and passing `PORT`
straight through is unsafe because a *blank* value makes Next exit with `value '' from env
'PORT' is invalid`. The script treats a blank or non-numeric `PORT` as unset and falls back to
8077, so if you see that error, also delete any empty `PORT` variable from the dashboard.

`scripts/bootstrap.mjs` applies `prisma migrate deploy` on every boot and seeds the demo
workspace only when the database is empty, so no manual migration step is needed. To seed or
reset deliberately, run `npm run db:seed` from a Render shell.

Free instance caveats: the service sleeps after inactivity (first request is slow), the free
Postgres expires after 30 days, and uploads written with `STORAGE_DRIVER=local` are lost on
every redeploy — configure the `S3_*` variables for anything you need to keep.

## Deploying to Vercel

The repository root is the app, so leave **Root Directory** empty and keep the **Next.js**
preset. Vercel runs `npm install` (which generates the Prisma client) and `npm run build`.

**1. Database.** Create a free Postgres (Neon is the quickest) and copy its *pooled*
connection string. Locally, apply the schema and demo data once against it:

```bash
DATABASE_URL="postgres://…-pooler…" npm run db:deploy
DATABASE_URL="postgres://…-pooler…" npm run db:seed
```

The schema has no `directUrl`, so the pooled string is fine for both steps.

**2. Environment variables** (Project → Settings → Environment Variables):

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Neon **pooled** connection string (`?sslmode=require`) |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | `https://<your-project>.vercel.app` |
| `STORAGE_DRIVER` | `local` to start; `s3` + `S3_*` for durable evidence uploads |
| `DEMO_EMAIL` / `DEMO_PASSWORD` | the seeded demo account |
| `AI_KEYLESS` | `1` for the free keyless endpoint, `0` with `AI_API_KEY` for a provider |

**3. Redeploy** after adding variables so the build picks them up.

Evidence files: serverless filesystems are read-only apart from `/tmp`, so `STORAGE_DRIVER=local`
uploads live only until the function recycles. Configure an S3-compatible bucket (Cloudflare R2
has a free tier) for anything you want to keep.

AI replies can take 40–60 seconds on the free keyless tier. Vercel's Hobby plan caps function
duration at 60s; the assistant route declares `maxDuration = 60` and policy drafting runs as a
server action under the same cap. A slower provider needs Pro or a faster model.
