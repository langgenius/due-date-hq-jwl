# scripts/

Operational CLI utilities (docs/dev-file/08 §1).

- `check-dep-direction.mjs` — enforces the dependency DAG in docs/dev-file/08 §6. Wired into `pnpm check:deps`.
- `ensure-cloudflare-queues.mjs` — reads Queue producer/consumer/DLQ names from
  `apps/server/wrangler.toml` and creates any missing Cloudflare Queues before deploy. Wired into
  `pnpm cf:ensure-queues` and `workspace-deploy`.
- `pulse-inbound-email-smoke.mjs` — posts RFC 5322 email fixtures to a local Wrangler Email
  Routing handler at `/cdn-cgi/handler/email`. Used by `docs/ops/runbooks/pulse-email-inbound.md`.

Planned (Phase 0 / Phase 1):

- `ac-traceability.ts` — PRD Test ID → E2E coverage report.
- `cost-report.ts` — Cloudflare AI Gateway + internal trace cost aggregator per firm.
- `firm-inspect.ts` — admin read-only dump of a firm's obligations / pulses / audits.
