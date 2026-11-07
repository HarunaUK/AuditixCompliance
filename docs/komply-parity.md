# Komply parity review and replication plan

Reviewed the signed-in demo at `https://komply.faseel.app` on 7 November 2026. The workspace was a fresh demo organisation at 0%, so the review covered every route, form field, empty state, navigation group and computed readiness rule. No records were created, edited or deleted in the reference account.

Our comparison target is the Auditix build in `auditix/` (Next.js 15, Prisma/PostgreSQL, server actions plus `/api/v1`).

---

## 1. What the reference actually contains

The application is broader than a policy-and-risk register. It is a full multi-framework GRC workspace with **47 authenticated routes** in seven groups.

### Foundation

| Route | What it does | Data captured |
| --- | --- | --- |
| `/onboarding` | Organisation intake; completeness ring; drafts policies, scope and risks | company, industry, headcount, geography, data types, cloud, SaaS, key systems |
| `/context` | Clause 4.1/4.2 register | type (internal / external / party), party, description, needs, relevance |
| `/scope` | Clause 4.3 statement generated from intake, then editable | generated statement |
| `/policies` | Policy library, versions, approvals, review dates, control mapping | title, category, summary, content, status, version, owner, review date |
| `/soa` | Statement of Applicability | per-control applicable/excluded decision + justification |
| `/risks` | Risk register | scenario, category, likelihood, impact, score, treatment, status, owner, due date, controls, actions |
| `/risk-methodology` | Clause 6.1.2 method | process, likelihood scale, impact scale, acceptance criteria, review frequency |
| `/bia` | Business impact analysis | function, owner, priority, RTO/RPO/MTPD, five impact dimensions, dependencies, recovery resources |
| `/assets` | Asset register | name, type, classification, IP/URL, Cyber Essentials scope |
| `/evidence` | Evidence repository with expiry and control mapping | upload, kind, expiry, control/policy/risk links |
| `/integrations` | Evidence automation; **31 connectors** | provider, display name, org, token; scheduled sync and pass/fail checks |

### Operating processes

| Route | What it does | Data captured |
| --- | --- | --- |
| `/controls` | Framework control implementation | status, notes, justification |
| `/objectives` | Clause 6.2 objectives | objective, measure, target, owner, due date, status, progress note |
| `/roles` | Clause 5.3 roles | role, holder, responsibilities, authority, reports to |
| `/measurements` | Clause 9.1 monitoring | what, method, frequency, responsible, target, last measured, latest result |
| `/stage1-check` | Twelve Stage 1 prerequisites | computed, not manually ticked |
| `/internal-audit` | Clause 9.2 programme | title, date, scope, findings, completion |
| `/management-review` | Clause 9.3 minutes | date, attendees, decisions; auto-generated 9.3 pack |
| `/incidents` | Incident response log | title, description, severity, status, timeline |
| `/corrective-actions` | CAPA kanban | title, description, status (open / in progress / implemented / closed), due date |
| `/training` | Awareness evidence | course, assignee, assignment, completion |
| `/vendors` | Supplier register | name, services, criticality, review status, contract URL |

### Offensive and frameworks

- `/vulnerability-scans` — external scanning against asset IPs/URLs.
- `/cyber-essentials` and `/cyber-essentials-plus` — CE questionnaire and Plus evidence.
- **AI governance:** `/ai`, `/ai/soa`, `/ai/systems`, `/ai/impact-assessments`, `/ai/risks`, `/ai/governance`, `/eu-ai-act`, `/ai-42001-controls`.
- **Framework packs:** ISO 27001, SOC 2 overview and criteria, EU overview / GDPR / GDPR controls / EU AI Act, Middle East overview, Singapore/APAC overview, Pakistan overview.
- **Account:** `/settings`, `/enterprise` (SSO), `/billing`, client workspaces.

The framework counts exposed in the UI are substantial: ISO 27001 (93 controls), SOC 2 criteria, GDPR (62 controls), NIS2 (18), EU AI Act (65), ISO 42001 (38), NCA ECC (108), NESA (188), Singapore CE (75), Essential Eight (24), Pakistan CTDISR (84), PDPB (30), PISF (238) and SBP TRM.

### Stage 1 gate

The reference's Stage 1 page counts **12 computed prerequisites**:

1. ISMS scope statement defined.
2. Core policies approved (10 required).
3. SoA justified for all applicable controls.
4. Risk assessment methodology documented.
5. Risks assessed and treated with residual scores.
6. Information security objectives set.
7. Context and interested parties captured.
8. Roles and responsibilities assigned.
9. Internal audit completed in the last year.
10. Management review held in the last year.
11. Security awareness training delivered.
12. Real evidence collected, not mock data.

A thirteenth advisory row reports how long the ISMS has been operating (target roughly 90 days) but is not counted.

---

## 2. What we implemented in this pass

The highest-value gap was the **management-system foundation**: the reference's Stage 1 gate depends on records our build simply did not have. This pass adds them end to end.

| Area | Route | What was added |
| --- | --- | --- |
| Organisation intake | `/onboarding` | profile, completeness score, deterministic scope generation |
| Context | `/context` | issues and interested parties, needs, relevance, delete |
| Scope | `/scope` | Clause 4.3 draft from intake and frameworks, edit and regenerate |
| Methodology | `/methodology` | five documented fields, completeness, review cadence |
| Objectives | `/objectives` | measurable objective, target, owner, due date, status, progress notes |
| Roles | `/roles` | holder, responsibilities, authority, reporting line |
| Internal audits | `/internal-audits` | schedule, scope, findings, completion |
| Management reviews | `/management-reviews` | date, attendees, decisions |
| Training | `/training` | assign, due date, completion |
| Suppliers | `/suppliers` | criticality, owner, review dates, DPA and assurance; one-click review scheduling |
| Incidents | `/incidents`, `/incidents/[id]` | severity, status workflow, append-only timeline, supplier link, linked actions |
| Corrective actions | `/corrective-actions` | source, priority, owner, due date, completion and effectiveness verification |
| Stage 1 gate | `/stage-1` | 14 computed checks and an advisory operating-age row |
| SoA rigor | `/soa` | every control now needs a written applicability justification, not only exclusions |
| APIs | `/api/v1/isms`, `/api/v1/stage1` | read access to the new records and the computed gate |

All writes are tenant-scoped, permission-checked and recorded in the existing `AuditEvent` trail. New entity types are rendered in `/activity`.

### Deliberate differences

- **Scope generation is deterministic, not AI.** It composes the organisation, geography, systems, data, cloud/SaaS dependencies and enabled frameworks from the intake. This is honest, repeatable and does not invent facts. A model-assisted draft can be added later behind a review step.
- **Stage 1 checks are adapted to our schema.** Policy coverage uses the seven required topics already defined in `readiness.ts`; risk treatment is judged from score, owner, treatment, controls and actions because we do not yet store residual likelihood/impact; evidence counts only non-seeded uploads so demo artefacts cannot make the gate green.
- **SoA justification is mandatory for every control.** The reference's gate expects this and our previous SoA only justified exclusions. The seeded workspace now records a justification for all 52 controls.

### Current demo result

Northwind Cloud Ltd scores **12/14** on the Stage 1 gate:

- Open: core policy topics (4/7 approved) and real evidence (0 uploads, 3 seeded artefacts).
- Met: scope, SoA justification (52/52), methodology, risks, objectives, context, roles, internal audit, management review, training, supplier due diligence and incident/corrective-action ownership.

The Stage 2 readiness gate now weights incidents and suppliers at 15%, alongside policies, risk, SoA and evidence. Northwind's operational phase scores 100% from seven suppliers, four incidents and six corrective actions.

This is deliberately not a vanity score. The two open items map to work a user can do in the product.

---

## 3. Gap scorecard

| Domain | Status | Notes |
| --- | --- | --- |
| Policies, versions, approvals | Strong | Version history, review dates and control mapping already exist |
| Statement of Applicability | Strong | Now requires a justification for every control |
| Risk register | Partial | Scored, owned, treated; missing residual score, risk appetite link and formal review history |
| ISO 27001 foundation (4.x, 5.3, 6.x) | Strong after this pass | Intake, context, scope, methodology, objectives, roles |
| Stage 1 and Stage 2 gates | Strong | Both computed; Stage 1 now has its own 12-point page |
| Evidence | Partial | Expiry and mapping exist; no connector automation or scheduled checks |
| Supplier management | Strong after this pass | Register, criticality, owner, DPA, assurance, review scheduling and Stage 1 gate |
| Incident and CAPA | Strong after this pass | Severity, status workflow, append-only timeline, linked corrective actions, effectiveness verification |
| Business continuity | Missing | No BIA, RTO/RPO, asset dependency or continuity test record |
| Asset inventory | Missing | No asset register or Cyber Essentials scope flag |
| Monitoring and measurement | Missing | No Clause 9.1 metric register |
| Awareness training | Minimal | Records exist, but no course library or enrolment workflow |
| Internal audit and management review | Minimal | Records and completion, but no findings workflow or auto-generated 9.3 pack |
| Cyber Essentials / Plus | Missing | No questionnaire, evidence pack or scoring |
| Vulnerability scanning | Missing | No scanner integration or asset-based scan workflow |
| AI governance (42001 / EU AI Act) | Missing | No AI system inventory, AI SoA, impact assessment or AI risk register |
| SOC 2, GDPR, regional packs | Missing | Only ISO 27001 and Cyber Essentials frameworks are seeded |
| Evidence automation | Missing | 31 connectors in the reference; none here |
| Enterprise / SSO / SCIM | Missing | Email and password only |
| Auditor export package | Partial | SoA CSV and readiness data; no zipped evidence pack |

---

## 4. Prioritised replication roadmap

### Phase 2 — supplier, incident and remediation (completed in this pass)

This is what auditors test immediately after policies and risk, and what the reference makes operational.

1. `/suppliers` — name, services, criticality, review status, DPA, assurance and review dates; owner on every record. Contract URL and risk links remain future work.
2. `/incidents` — severity, status workflow, detected/contained/resolved timestamps, owner, supplier link and append-only timeline. Post-incident review capture remains linked through corrective actions.
3. `/corrective-actions` — source (audit finding, incident, management review, supplier), owner, due date, status and verification of effectiveness.
4. All three feed the Stage 1 gate and the Stage 2 readiness score.

### Phase 3 — continuity and assets

`/bia`, `/assets`, then continuity tests and recovery evidence. The reference's BIA model is detailed (five impact dimensions, RTO/RPO/MTPD, dependencies and minimum resources) and is the right template.

### Phase 4 — offensive and AI

Cyber Essentials questionnaire and evidence pack, vulnerability scan results per asset, then the AI governance suite (AI system inventory, AI SoA, impact assessments, AI risks, ISO 42001 controls, EU AI Act mapping). These are separate products in the reference and should not be rushed into one release.

### Phase 5 — framework packs and automation

SOC 2, GDPR and regional packs require verified control content, not placeholder rows. Evidence connectors should come after a stable control/evidence model and a background job runner. SSO/SCIM belongs with enterprise sales, not the compliance workflow.

---

## 5. Reference defects observed

These are reasons not to copy blindly:

1. **Session cookie collision.** The reference uses `auditix_session`. Because cookies ignore ports, signing into another local app with the same cookie name can invalidate the reference session. Our build uses `auditix_web_session`.
2. **Risk category select mismatch.** On `risks/AI-001`, the visible category select showed “Operational” while the stored record was “AI”. The select has no “AI” option, so the next save can silently reclassify the risk.
3. **Residual score ambiguity.** Residual likelihood/impact expose `0` alongside a “—” option, so “not assessed” and a genuine zero are indistinguishable.
4. **Connector error leakage.** The GitHub connector surface displays a raw provider exception including the configured organisation identifier. Errors should be normalised before display.
5. **Demo credentials in the login UI.** Convenient for a demo, unacceptable for a production tenant; ours keeps them behind a “fill demo credentials” action for this environment only.

---

## 6. Verification performed

- Authenticated audit of all 47 reference routes and their form fields.
- `prisma db push` applied the new models to the local PostgreSQL database.
- `npm run db:seed` rebuilt the Northwind and Meridian demo workspaces, including the new ISMS records.
- `npx tsc --noEmit` and `npm run build` pass.
- All new routes return HTTP 200 when signed in.
- `/api/v1/stage1` returned `10/12` before this pass and the gate now reports `12/14` locally; `/api/v1/isms` returns the seeded context, roles, objectives, audits, reviews and training counts.
- A context item was created through the UI, appeared in the register and wrote an audit event; the test record was then removed.
- The supplier, incident and corrective-action pages were exercised through the UI: incident creation, investigation-to-contained transition, severity update, supplier review scheduling, action creation and effectiveness verification. Each produced the expected record and audit event; the demo database was reseeded afterwards.

---

## 7. Framework and AI parity pass (second review)

The reference navigation was rebuilt route-for-route from the signed-in demo. The Auditix sidebar now follows the same grouping and labels: Workspace (My clients, Dashboard), Compliance (Onboarding, Context & Parties, Scope Statement, Policies, Statement of Appl., Risk Register, Risk Methodology, Business Impact, Assets, Evidence), Processes (Controls, Objectives, Roles & Resp., Measurement, Stage 1, Internal Audit, Mgmt Review, Incidents, Corrective Actions, Training, Vendors), Offensive (Cyber Essentials, CE Plus), AI Governance (AI Management, AI SoA, AI Systems, Impact Assessments, AI Risks, AI Governance, EU AI Act, 42001 Controls), SOC 2, EU Compliance, Middle East, Singapore/APAC, Pakistan and Account.

### Framework packs

A shared pack engine now renders any framework in the reference's layout: readiness score, gap count, domain bars, grouped controls, ISO 27001 mapping chips, evidence state, owner, due date, review cadence and the four status buttons. Changes save in place and update the pack without a reload.

| Pack | Controls | Source |
| --- | --- | --- |
| ISO/IEC 42001:2023 | 29 | Annex A domains A.2–A.10, mapped to ISO 27001 controls |
| SOC 2 | 61 | AICPA trust services criteria, grouped CC1–CC9, A1, C1, PI1, P1 |
| GDPR | 62 | Article-level obligations |
| Cyber Essentials | 5 | Existing NCSC technical controls |
| ISO/IEC 27001:2022 | 93 | Existing Annex A control set |

The **Reuse ISO evidence** toggle is workspace-scoped: when enabled, evidence attached to a mapped ISO 27001 control is counted and labelled against the corresponding pack control. **Export** streams a CSV with status, owner, dates, evidence counts and mappings from `/api/v1/frameworks/[key]/export`.

### Registers and assurance

- `/assets` — asset inventory with type, classification, location, owner, ISMS scope and delete. Assets in scope support risk, evidence and Cyber Essentials work.
- `/bia` — business impact analysis with priority, RTO/RPO/MTPD and five impact dimensions per business function.
- `/measurements` — Clause 9.1 metric register with cadence, responsible person, target, latest result and inline result recording.
- `/cyber-essentials` — self-assessment against the five NCSC controls, scored from evidence, with a CE Plus tab covering patch management, MFA, backup, monitoring and incident response.
- `/aims`, `/aims/systems`, `/aims/impact`, `/aims/risks`, `/aims/soa`, `/aims/governance` — AI system inventory, EU AI Act risk tier, impact assessments with decisions and mitigations, AI-tagged risks, an ISO 42001 statement of applicability and a governance checklist computed from policies, roles, reviews and audits.
- `/eu`, `/eu/gdpr`, `/eu/ai-act`, `/soc2`, `/me`, `/sg`, `/pk` — regulatory overviews with readiness cards linking into the control packs.

All new writes are tenant-scoped, permission-checked and recorded in the audit trail with new entity types for assets, impact analyses, measurements and AI systems.

### Verification

- Prisma schema pushed; client regenerated; packs seeded through `prisma/seed-packs.ts` without resetting demo records.
- `tsc --noEmit` and `next build` pass.
- UI checks: framework status updates and totals refresh in place; asset create/delete, AI system create/delete and AI impact assessment create persist and refresh; Cyber Essentials renders seeded statuses; all new routes return the expected content when signed in.
- A stale client-cache issue after same-path redirects was fixed by returning from the server action and refreshing the route; register deletes use a client control that refreshes after completion.

---

## 8. Third pass — live-route replication

The signed-in reference app was re-crawled after the second pass and the local Komply copy was found to have drifted from it, so the live app became the source of truth again. Navigation hrefs, labels and ordering were read straight from the rendered sidebar and mirrored exactly, including the alias routes the reference exposes (`/clients`, `/vendors`, `/stage1-check`, `/internal-audit`, `/management-review`, `/aims/impact-assessments`, `/aims/eu-ai-act`, `/gdpr`, `/middle-east`, `/apac`, `/pakistan`, `/risk-methodology`).

### `/eu` rebuilt against the live page

The page now matches the reference card-for-card: **Frameworks** (GDPR (EU & UK) · 62 controls, NIS2 Directive · European Union · 18 controls) with the same descriptive copy, adoption tick and full-width **Open** buttons to `/frameworks/gdpr` and `/frameworks/nis2`; then **Tools** with the GDPR data-subject rights and EU AI Act cards linking to `/eu/gdpr` and `/aims/eu-ai-act`.

### NIS2 pack

`prisma/frameworks/nis2.json` adds the 18 organisation-facing obligations — scope and registration, management-body accountability, the ten Article 21(2) measures, the three-stage Article 23 reporting regime and Article 24 certification. Domains are grouped as Governance, Risk & policy, Incidents, Resilience, Supply chain, Engineering, People, Cryptography, Reporting and Assurance, and the pack renders through the shared framework engine with readiness, gaps, owners and CSV export.

### New modules

| Route | Behaviour |
| --- | --- |
| `/integrations` | Connector catalogue for GitHub, AWS, Google Workspace, Microsoft 365/Azure, Jira and Okta. Connecting registers the connector and its baseline checks with control mappings; **Test** and **Sync now** report a real credential state, and a missing server credential surfaces the same 401-style error the reference shows. Stats: automated checks, passing, failing, stale and controls with evidence. |
| `/scans` | Scan register with target, type, requester and timestamp; queued scans record critical/high/medium/low findings and complete, feeding the critical/high counter. Delete is confirmed. |
| `/enterprise` | OIDC SSO settings (domain, default role, discovery URL, client ID, secret stored as a hash), DNS TXT ownership proof verified by a real DNS lookup, SCIM token minting shown once and stored only as a SHA-256 hash, revocation, and the admin audit trail. Admin-only writes. |

Schema additions: `Integration`, `EvidenceCheck`, `VulnerabilityScan`, `SsoSettings`, `ScimToken`.

### Verification (this pass)

- `prisma db push` + client regeneration; NIS2 seeded through `prisma/seed-packs.ts` without touching existing records.
- `tsc --noEmit` clean.
- Every sidebar route returns 200 signed in, including all new alias routes.
- Exercised end to end in the browser: GitHub connector registration produced four checks and the credential error; a scan was queued at `https://app.northwind.example` and completed with 2 critical / 3 high / 1 medium findings; SSO settings saved with a generated TXT token; a SCIM token was minted, displayed once, then shown only as a masked prefix after reload.

### Still open against the reference

1. Framework detail layout is close but not pixel-identical to the live pack page (grouping and controls match, chrome differs).
2. Region overview pages (`/middle-east`, `/apac`, `/pakistan`, `/soc2`, `/eu/gdpr`) still use our section layout rather than the live tables.
3. Supplier contract links and risk-level supplier scoring.
4. AI SoA justifications are displayed but edited in the ISO 42001 pack rather than inline.
5. The reference's dashboard widgets are not yet matched one-for-one.

---

## AI layer: Virtual CISO and policy generation

The reference exposes two AI surfaces: a floating **vCISO Assistant** chat (general ISO advice, not workspace-aware) and **Generate Policy**, which drafts a full policy for a chosen type and lands it as a DRAFT that needs human approval. Both are now implemented in Auditix, with the assistant grounded in live data rather than generic knowledge.

### Virtual CISO

- `GET /api/v1/assistant` is a POST endpoint (`src/app/api/v1/assistant/route.ts`) that streams plain text from any OpenAI-compatible provider.
- `workspaceBrief()` (`src/lib/services/assistant.ts`) assembles a compact factual brief — policy status mix, control coverage %, open/critical/overdue risks, expired evidence, open incidents, overdue supplier reviews and a derived gap list — in a handful of aggregate queries.
- The system prompt forces the model to cite ISO/IEC 27001:2022 clauses/Annex A, to say what is missing instead of inventing numbers, and to stay under 250 words.
- The panel (`src/components/app/assistant.tsx`) is available on every workspace route, streams tokens, offers three starter questions, handles Esc, and shows a setup card when no key is configured.
- Limits: 40 messages per user per rolling hour (in-memory), last 10 turns of history, 4000 characters per message, same-origin enforced, workspace resolved from the session cookie (never from the client).

### Policy generation

- `generatePolicyAction` (`src/actions/policies.ts`) validates the requested type against `src/lib/policy-types.ts` (26 types, same set as the reference), sends the workspace brief plus existing policy titles (to avoid duplicates), and requires JSON `{title, summary, content}` with a fixed six-section Markdown structure.
- The draft is created through `createPolicy()` with `aiGenerated = true` and `aiModel` recorded, plus a version row noted "AI-generated draft". Migration: `20261107120000_ai_policy_provenance`.
- The UI (`src/components/policies/generate-policy-dialog.tsx`) sits next to "New policy" on `/policies` and is disabled with an explanatory tooltip when AI is not configured.
- The detail page shows "AI draft created — it is not authoritative yet" and keeps the existing submit-for-review → approve flow, so a human remains the accountable approver.

### Configuration

```
AI_API_KEY=          # required to enable; leave blank to disable the feature cleanly
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
```

Provider-agnostic by design (OpenAI, Z.ai, OpenRouter, Groq, Freebuff API). The key is read server-side only.

### Verification

- `tsc`/`next build` clean; unauthenticated POST returns 401, unconfigured returns a 503 with an actionable message.
- End-to-end against `scripts/mock-ai.mjs` (local OpenAI-compatible mock): assistant streamed a grounded answer into the panel; generating a policy from the dialog created a DRAFT, redirected to its page and rendered both AI notices. The test draft was then deleted, so the demo data is unchanged.

### Still open on AI

1. Conversation persistence and an audit record of AI interactions (currently per-panel session state).
2. Streaming for policy generation (currently a single completion with a pending button).
3. Additional AI surfaces seen in the reference: import policy from an uploaded document, AI-drafted SoA justifications, risk suggestions from the register.
4. Token/cost accounting per workspace.
