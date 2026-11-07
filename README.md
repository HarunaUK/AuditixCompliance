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

## Deploying to Vercel

1. Import the repo, set **Root Directory** to `auditix` and **Framework Preset** to Next.js.
2. Add the AI variables above (keyless defaults are fine to start).
3. Point `DATABASE_URL` at a hosted Postgres (Neon, Supabase, Vercel Postgres). The local
   Prisma dev database does not exist on Vercel; run `prisma db push` and `npm run db:seed`
   against the hosted database once.
4. Set `AUTH_SECRET` and `AUTH_URL` to the deployed origin.

Policy generation can take 40–60 seconds on the free tier, so use a Pro/Enterprise plan or a
longer `maxDuration` for those routes before relying on it in production.
