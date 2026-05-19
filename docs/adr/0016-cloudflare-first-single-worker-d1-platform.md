# 0016 · Cloudflare-first single Worker + D1 platform

## Context

DueDateHQ is a compliance workload console for small CPA firms. The product needs low-latency
authenticated app traffic, tenant-scoped point queries, background ingest, audit evidence storage,
and AI calls governed at the edge. The team is small, so the platform should minimize glue code and
third-party operational surfaces.

The stable architecture already describes:

- `apps/server` as the SaaS Worker that serves `/rpc/*`, `/api/*`, and `apps/app` static assets.
- `apps/marketing` as a separate Astro static site for `due.langgenius.app`.
- Cloudflare D1, KV, R2, Queues, Cron, Workflows, Vectorize, Workers Assets, and AI Gateway as the
  default infrastructure primitives.

Before this ADR, the rationale lived across `docs/dev-file/00-Overview.md`,
`docs/dev-file/01-Tech-Stack.md`, and `docs/dev-file/02-System-Architecture.md`. That is enough for
implementation, but not enough as a durable platform decision.

## Decision

DueDateHQ is Cloudflare-first for the SaaS runtime.

- The SaaS app deploys as one Cloudflare Worker-owned runtime boundary: Hono routes, oRPC handler,
  auth/webhook routes, scheduled/queue dispatchers, and Workers Assets for the Vite SPA.
- The production database for the MVP path is Cloudflare D1 via Drizzle. D1 is not a temporary demo
  compromise; it matches the expected workload: small tenant datasets, `firm_id` point queries,
  range scans by due date/status, and edge latency sensitivity.
- Object snapshots and generated artifacts go to R2; hot counters/cache and debounce locks go to KV;
  long/background work goes through Cron Triggers, Queues, and Workflows.
- Vector search uses Cloudflare Vectorize. AI provider calls go through Cloudflare AI Gateway from the
  server runtime.
- The public marketing site remains a separate Astro static deployment on Cloudflare Workers Static
  Assets. It does not run inside the authenticated SaaS SPA.

This decision explicitly rejects the default alternative of Vercel + Next.js + Neon/Postgres +
Upstash + Inngest for Phase 0. Those pieces remain possible future migrations, but they are not the
baseline.

## Consequences

Good:

- Local and production runtime semantics stay close through Workers/miniflare bindings.
- The infrastructure surface is small enough for a two-engineer team to operate.
- The app can keep a clear split between SEO/static marketing and authenticated SPA workbench.
- D1, KV, R2, Queues, and Vectorize all live near the Worker, reducing integration latency and
  provider sprawl.

Bad:

- D1 imposes SQLite and platform limits: statement variables, SQL size, query counts, and single
  database size. Batch paths must be deliberately chunked and tested.
- D1 has no row-level security. Tenant isolation must be enforced in middleware, repo factories, and
  static dependency rules.
- Cross-tenant analytics, large OLAP, or strong per-tenant physical isolation may require future
  D1 sharding or a Postgres migration.

Uncertain:

- At roughly 1000 firms or near the D1 storage ceiling, the team must decide from measured
  `storage_bytes`, query latency, and workload shape whether to shard by firm/region before
  considering Hyperdrive + Neon.

## Status

accepted · 2026-04-30
