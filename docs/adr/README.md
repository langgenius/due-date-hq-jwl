# Architecture Decision Records

Any non-trivial architectural decision lives here (docs/dev-file/08 §9).

## Template

```
## Context
<Why the decision is needed>

## Decision
<What we decided>

## Consequences
<Good / bad / uncertain consequences>

## Status
proposed | accepted | deprecated | superseded by #NNN
```

## Backlog

- Vite+ unified toolchain and pnpm catalog version locking.
- shadcn/Base UI primitive strategy beyond the token-chain decision in ADR 0014.

## Accepted

- 0009-lingui-for-i18n.md — Lingui v6 for i18n (supersedes `05 §11` react-i18next line)
- 0010-firm-profile-vs-organization.md — Firm profile as first-class business tenant table, PK reuses organization.id (closes the `organization.metadata` antipattern)
- 0011-migration-copilot-demo-sprint-scope.md — Migration Copilot Demo Sprint 产品形态锁定（6 条冲突裁定 + 9 条设计系统增量 + Onboarding Agent 设计锁定不实现）
- 0012-marketing-astro-landing.md — Marketing landing 接入 Astro 公开站（`apps/marketing` Astro 6 静态站 + Cloudflare Workers Static Assets + 设计 token 三方对齐 Figma + 8 条 follow-ups）
- 0013-marketing-locale-handoff-with-nuqs.md — Marketing `?lng=` locale handoff 由 nuqs + React Router v7 adapter 消费、持久化并清理
- 0014-dify-token-tree-adoption.md — Adopt Dify Token Tree as the canonical design token source while implementation remains governed by Tailwind v4 CSS variables in `packages/ui`
- 0015-tanstack-hotkeys-keyboard-shell.md — TanStack Hotkeys keyboard shell for global, sequence, route, and overlay shortcuts
- 0016-cloudflare-first-single-worker-d1-platform.md — Cloudflare-first SaaS Worker, D1, and native binding platform decision
- 0017-orpc-contract-first-rpc-api-boundary.md — oRPC contract-first with `/rpc` for internal SPA RPC and `/api` for auth/webhooks/future REST
- 0018-d1-tenant-isolation-scoped-repo-ports.md — D1 tenant isolation through middleware, `scoped(db, firmId)`, lint rules, and `@duedatehq/ports/<domain>`
- 0019-ai-sdk-gateway-glass-box-boundary.md — AI SDK + Cloudflare AI Gateway execution boundary with Glass-Box guard and no request-path Dashboard AI
- 0020-tanstack-form-for-client-forms.md — TanStack Form for complex client-side forms, with Zod Standard Schema validation and no resolver layer
- 0021-public-github-x-draft-review-mirror.md — Best-effort public GitHub Issue snapshots for X review drafts without adding a second publishing authority
