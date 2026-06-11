---
name: distill-devfile
description: Fold new dev-log entries back into docs/dev-file volumes (the current-truth architecture docs), then bump each volume's 最后核对 stamp. Use when the user asks to distill/reconcile dev-file, run the weekly docs pass, or close out a workstream. Processes only the delta since each volume's stamp — cheap when run regularly.
---

# Distill dev-log → dev-file

Goal: every claim in `docs/dev-file/*` is true **today**. `docs/dev-log/*` is the dated
history of how the code got here; this pass folds what those logs (and the commits behind
them) changed back into the volumes, so AI and humans can keep trusting dev-file as
current truth (the three-layer contract in AGENTS.md).

Anchor: each volume carries `> 最后核对：YYYY-MM-DD` right under its H1. This pass
processes only dev-logs and commits **after** that date, then bumps the stamp. Missed
weeks self-correct — the window just grows.

## 0. Preflight

- Sync with `origin/main` first. If the main working tree holds another session's
  uncommitted WIP, work in a worktree and FF-push; otherwise commit directly to main
  (repo convention: no branches). `git commit --no-verify` is blocked; the pre-commit
  hook needs `node_modules/.bin` on PATH.
- Volumes 09 and 10 are bannered historical snapshots — never update them, never bump
  their stamps.

## 1. Collect the delta

For each remaining volume (00–08, 11, 12):

1. Read its `最后核对` stamp.
2. List newer logs: dev-log filenames are `YYYY-MM-DD-<slug>.md`, so a lexical compare on
   the prefix works (`ls docs/dev-log | sort` + filter > stamp).
3. Backstop for changes that shipped without a log:
   `git log --since=<stamp> --oneline -- <paths in the volume's routing row below>`.
4. Scan the new logs' 「后续 / 未闭环」 sections for explicit "写回规格文档" items —
   those are mandatory queue entries even if the topic looks minor.

## 2. Route logs → volumes

A log can hit multiple volumes. Routing map (volume ← topics / proving paths):

| Volume | Topics | Truth lives in |
| --- | --- | --- |
| 00-Overview | top-level surfaces added/removed, product scope, PRD volume splits | `apps/app/src/router.tsx`, `docs/PRD/` |
| 01-Tech-Stack | deps added/removed, toolchain, engine/major versions | root + per-package `package.json`, `pnpm-workspace.yaml` |
| 02-System-Architecture | worker handlers, queues, crons, bindings, external services, oRPC boundary | `apps/server/wrangler.toml`, `apps/server/src/{index,app}.ts`, `jobs/cron.ts`, `procedures/index.ts` |
| 03-Data-Model | migrations, tables/columns, repos, D1 conventions | `packages/db/migrations/`, `packages/db/src/schema/`, `packages/db/src/repo/` |
| 04-AI-Architecture | prompts, models, gateway, budget/quota, guard, AI observability | `packages/ai/src/`, `apps/server/wrangler.toml [vars]` |
| 05-Frontend-Architecture | routes, app shell/sidebar, patterns/primitives, URL state, keyboard, dashboard/deadlines/alerts surfaces | `apps/app/src/` (router, components/patterns, features/), `packages/ui/src/` |
| 06-Security-Compliance | auth flows, MFA, RBAC, tenant guards, audit actions, secrets, rate limits | `packages/auth/src/`, `apps/server/src/middleware/`, `packages/contracts/src/shared/audit-actions.ts` |
| 07-DevOps-Testing | CI workflows, deploy, git hooks, E2E, migration flow, observability/alerting | `.github/workflows/`, `playwright.config.ts`, `vite.config.ts`, `.vite-hooks/`, root scripts |
| 08-Project-Structure | directory trees, package inventory, lint/import conventions, docs taxonomy | `ls` of the trees it draws, `vite.config.ts` lint blocks, `AGENTS.md` |
| 11-Pulse-Ingest-Source-Catalog | sources, adapters, ingest pipeline, source health | `packages/ingest/src/`, `apps/server/src/jobs/pulse/` |
| 12-Marketing-Architecture | marketing pages, i18n/locale handoff, SEO, marketing deploy | `apps/marketing/src/`, `apps/marketing/wrangler.toml` |

## 3. Amend — one subagent per volume with a non-empty delta

Volumes with an empty delta: leave untouched, do **not** bump the stamp (the stamp means
"verified", not "looked at"). Typical week at sprint pace: 3–6 volumes get agents; run
them in parallel, each owning exactly one file.

Per-agent rules (put these in every agent prompt):

- **dev-logs are leads, code is truth.** Verify every claim against source before
  writing, and cite the proving path in your summary — even yesterday's log can be wrong
  (a 2026-06-09 log claimed a 280px rail; the code constant was 264px).
- Surgical Edit calls only. Preserve the volume's structure, heading numbering, and
  Chinese-prose-with-English-terms style. New coverage as terse as neighboring sections.
- Cite dev-logs the way the volume already does.
- Bump the volume's `> 最后核对：` stamp to today.
- Touch ONLY the assigned volume.
- Return: amendments (was → now + proving path), verified-OK areas, flagged-uncertain
  items left unchanged.

## 4. Hygiene sweep (flag, don't fix)

- dev-log naming violations: anything in `docs/dev-log/` not matching
  `YYYY-MM-DD-<slug>.md` except `README.md`.
- `docs/product-design/<feature>/` working docs whose content has since shipped or been
  superseded — candidates for a dated archive note.
- Report these in the final summary; fix only when trivially mechanical and the user has
  already approved that class of fix.

## 5. Land it

- `vp fmt --write` on touched docs only (vp panics when output is piped — redirect to a
  file). Do not run repo-wide `--fix`: it may sweep up other sessions' files.
- One commit: `docs(dev-file): distill <from>..<to>` with per-volume highlights.
- Push to main with a fetch → rebase → retry loop.
- Final report to the user: per-volume changes, skipped volumes, hygiene flags.
