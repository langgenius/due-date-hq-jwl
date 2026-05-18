---
title: 'Spec Alignment Pass 2 — T6 row chrome + T1 font-mono sweep on dashboard/obligations'
date: 2026-05-18
author: 'Claude'
area: design
---

# Spec Alignment Pass 2

## Context

Pass 1 (PR #6, branch `design/spec-alignment-shell-and-dashboard`) undid the T1 / T4 / Layout violations I'd introduced in PRs #3 and #4 and finished the redundant-eyebrow cleanup. Pass 2 picks up the next two items on the spec-alignment punch list, scoped tightly to the dashboard and obligations surfaces (Yuqi flagged rules + account routes as off-limits because parallel sessions own them):

- **T1** — drop `font-mono` from numeric displays. The canonical spec says system sans + `tabular-nums`; mono was the previous spec's rule.
- **T6** — "Density via vertical air, not chrome." Tables/lists should drop the row dividers and rely on spacing for grouping; row content padding should sit ≥44px tall.

This pass is stacked on `design/spec-alignment-shell-and-dashboard` (the Pass 1 branch). When that merges, this PR's base auto-advances to main.

## Change

### T1 — `font-mono tabular-nums` → `tabular-nums`

Sed pass over `routes/dashboard.tsx` and `routes/obligations.tsx` removed `font-mono` everywhere it was paired with `tabular-nums`. The kept-mono callsites (5 in obligations) split out as:

- `meta: { cellClassName: 'font-mono text-text-secondary' }` (ID column) — kept; identifier strings benefit from monospace per workbench convention.
- `<Input className="font-mono text-xs">` (Calendar URL display in the sync popover) — kept; URLs are technical strings.
- Three more (penalty amount in a list, penalty-input value, list ordinal) — switched to `tabular-nums` since they're numeric data.

### T6 — drop row `border-b`, bump cell padding

shadcn's `<TableRow>` ships `border-b border-divider-subtle` by default. Per the spec, that's chrome doing the work that vertical air should do. Two TableBody-level class overrides applied:

```tsx
<TableBody className="[&_tr]:border-b-0 [&_td]:py-3">
```

- `[&_tr]:border-b-0` neutralizes the dividers across every row in this table without touching the shared shadcn primitive (rules / members / audit-log / pulse tables stay as-is).
- `[&_td]:py-3` bumps cell vertical padding from `p-4`'s 16px to a tighter 12px on top + 12px on bottom — but combined with the typical 14px–16px content line-height that lands at ~38-44px row height, comfortably in T6's "≥44px" range without ballooning the table.

Same override applied to both:

- Dashboard priority-list table ([dashboard.tsx:1208](apps/app/src/routes/dashboard.tsx:1208))
- Obligations queue table ([obligations.tsx:1941](apps/app/src/routes/obligations.tsx:1941))

Also added `rounded-md` to the dashboard's per-row className so the focus ring renders with rounded corners now that there's no border defining a rectangle.

### Out of scope (will pick up in later passes)

- Members / Reminders / Audit-log / Pulse / Clients / Workload tables — same T6 fix would apply but left for later passes to keep this PR scoped.
- Building `<PageHeader>` / `<PageContainer>` / `<StatusPill>` / `<FilterChip>` / `<CountBadge>` primitives.
- OKLCH color-token migration.
- Sidebar IA changes (excluded by Yuqi's "don't touch rules / account" constraint and also because the spec's `Today / Alerts` IA is for a different product structure).
- Full app-wide `font-mono` sweep on the rest of the surfaces.

## Docs Check

No `DESIGN.md` update needed — the canonical spec on Yuqi's desktop already documents T1, T6, and the table conventions being applied here. The repo's in-tree `DESIGN.md` is no longer authoritative for this work.

## Validation

- `npx tsc --noEmit --project apps/app/tsconfig.json` — clean
- `pnpm --filter @duedatehq/app i18n:extract` — clean, 0 catalog changes (no new strings)
- `pnpm --filter @duedatehq/app i18n:compile` (strict mode) — clean
- Browser verification deferred — the preview tool's headless browser kept hitting cross-origin chrome-error pages across worktree port collisions. Yuqi to spot-check in her own browser at the worktree's actual dev port.

## Follow-ups

- Apply the same T6 row chrome to Members, Reminders, Audit-log, Pulse, Clients, Workload tables.
- Build the spec's project-level primitives (`PageHeader`, `StatusPill`, etc.) so future routes can compose from them instead of re-rolling chrome each time.
- Token migration to the OKLCH refresh from spec §Design substrate.
