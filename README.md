# DueDateHQ

[中文 README](./README.zh-CN.md)

DueDateHQ is a deadline operations workbench for US CPA practices. It turns
client facts, filing obligations, rule changes, penalty exposure, team ownership,
and audit evidence into one operating system for daily tax-deadline triage.

The product is built for practices that have outgrown spreadsheet reminders but
still need professional review, source traceability, and a clear answer to the
question: "What should the team handle next, and why?"

## Product Loop

1. Bring client data in through manual entry or Migration Copilot.
2. Normalize client facts into filing jurisdictions, entity types, tax types, and
   ownership.
3. Generate obligations from verified rules and practice-reviewed facts.
4. Triage work by due date, readiness, evidence, owner, and projected penalty risk.
5. Review Alerts from official sources before applying them to affected
   clients and obligations.
6. Run reminder automation from the dedicated Reminders surface: review the
   30/7/1-day schedule, adjust firm message templates, and monitor delivery or
   suppression status.
7. Send personal morning digests only when deadline pressure, Alerts, or
   reminder delivery failures need attention.
8. Keep audit evidence for important import, rule, status, billing, and team
   events.

DueDateHQ is an alpha product codebase. It supports operational review and
evidence-backed decision making, but it is not tax advice, a filing system, or a
replacement for review by a CPA, EA, attorney, or other qualified professional.

## What The Product Covers Today

- **Practice workspace**: login, first-practice onboarding, MFA setup, invitations,
  role-aware surfaces, practice switching, account security, and bilingual app copy.
- **Client facts**: client profiles, filing jurisdictions, owners, contact details,
  import history, readiness signals, client detail workspace, work plan context,
  Alert impact, lightweight future-business cues, activity log, and fact review.
- **Migration Copilot**: CSV, TSV, XLSX, pasted tables, and provider-export-shaped
  data with field mapping, risky-input blocking, preview, generated clients,
  generated obligations, and audit evidence.
- **Dashboard and obligations**: risk triage, saved views, bulk status updates,
  readiness, evidence drawers, weekly/monthly views, and projected penalty
  exposure.
- **Rules and Alerts**: source registry, coverage, rule library, generation preview,
  candidate review, firm-scoped verification decisions, official-source monitoring,
  Alerts impact triage, source-backed suggested actions,
  apply/mark-reviewed/request-review/revert flows, and source-health operations.
- **Practice operations**: audit log, reminders, personal notifications with
  morning digest controls,
  readiness portal, calendar subscription, billing checkout handoff, members,
  and team workload surfaces.
- **Marketing site**: static bilingual public site for product, pricing, rules, and
  state-coverage entry points.

Current public coverage should be described as `FED + 50 states + DC`.
State/DC sources and candidate rules are review-gated; candidates are not the same
as verified reminder-ready rules.
AI-assisted flows are used for mapping, extraction, summarization, and drafting
inside guarded workflows; human review remains part of the product model.

## Tech Stack

DueDateHQ is a TypeScript pnpm monorepo deployed on Cloudflare.

- **Apps**: Vite React SPA for the authenticated workbench, Cloudflare Worker API
  for the SaaS backend, and Astro for the marketing site.
- **Frontend**: React 19, React Router 7, TanStack Query/Table/Virtual/Hotkeys/Form,
  Zustand, nuqs, Zod, Lingui, Tailwind 4, Base UI, shadcn/ui
  `base-vega`, and lucide-react.
- **API and contracts**: Hono on Cloudflare Workers with oRPC contract-first
  boundaries shared through `packages/contracts`.
- **Data and auth**: Cloudflare D1 with Drizzle ORM, tenant-scoped repositories,
  better-auth Organization/Access Control, and practice-level audit records.
- **Cloudflare platform**: Workers Assets, KV, R2, Vectorize, Queues, Cron
  Triggers, Workflows, Rate Limiting, and Wrangler.
- **AI and integrations**: Vercel AI SDK Core through Cloudflare AI Gateway,
  internal guards/traces/budgets, Resend, Stripe, Sentry, and Amplitude where the
  deployment has those services configured.
- **Quality**: Vite+ (`vp`) for workspace tasks, Vitest, Cloudflare Workers test
  pool, Playwright, Lingui strict compilation, Drizzle Kit, and dependency
  direction checks.

## Repository Map

```text
apps/
  app        Vite React SPA for the authenticated workbench
  server     Cloudflare Worker API, auth, oRPC, queues, cron, webhooks
  marketing  Astro static marketing site

packages/
  ai          AI Gateway calls, prompts, guards, traces
  auth        Better Auth setup, organization roles, billing plugin
  contracts   Zod and oRPC contracts shared by app and server
  core        Pure domain logic for dates, rules, imports, risk, priority
  db          Drizzle schema, migrations, D1 repositories
  i18n        Shared locale helpers
  ingest      Alert source adapters and fetch/parse utilities
  ports       Boundary interfaces
  ui          Design tokens and reusable UI primitives
```

Useful docs:

- [Technical overview](./docs/dev-file/00-Overview.md) for architecture and phase
  context.
- [Tech stack](./docs/dev-file/01-Tech-Stack.md) for deeper technology decisions.
- [Architecture decisions](./docs/adr/README.md) for major tradeoffs.
- [Design system](./DESIGN.md) for current visual tokens and UI rules.
- [Dev log](./docs/dev-log/README.md) for implementation history.

## Development

Use pnpm with Node `>=22.19.0`.

```bash
pnpm dev       # run workspace development tasks
pnpm check     # type-aware checks
pnpm test      # unit tests
pnpm build     # production builds
pnpm ready     # default pre-handoff gate
```

Common module rules:

- Keep feature UI in `apps/app/src/features/<vertical>/`.
- Keep app runtime helpers in `apps/app/src/lib`.
- Keep pure domain logic in `packages/core`.
- Keep shared contract and schema work in `packages/contracts`.
- Keep tenant-aware persistence behind `packages/db` repositories.
- Do not use React `useEffect` in app or package code.
- Use Conventional Commits for commit messages and PR titles.

Before opening a PR, include a concise summary, validation commands, screenshots
for UI changes, and any migration, dependency-direction, environment, or
security-sensitive notes.

## Data Handling

DueDateHQ product flows handle client and practice data. Treat sample data,
exports, screenshots, logs, and AI traces as sensitive unless they are clearly
sanitized.
