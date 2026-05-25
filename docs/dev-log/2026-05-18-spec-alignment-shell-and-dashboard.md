---
title: 'Spec Alignment — Shell + Dashboard Pass 1'
date: 2026-05-18
author: 'Claude'
area: design
---

# Spec Alignment — Shell + Dashboard Pass 1

## Context

After PRs #3 and #4 shipped, Yuqi pointed me at the canonical design spec on her desktop (`/Users/yuqi/Desktop/desktop/DueDateHQ_dashboard/DESIGN.md`) — a substantially more opinionated document than the project's in-repo `DESIGN.md`. Audit against the spec found that several recent changes had introduced T1 / T4 / Layout violations:

- The "May 18" header date was set in Geist Mono with `font-mono` — T1 says system sans + `tabular-nums`, never a separate mono family for numbers.
- The priority-list table painted a 2px inset left bar on every row keyed to severity — T4 says status colors are pills only, "never become surface fills, never become row left-borders, never become full-card backgrounds."
- The app-shell wrapped `<Outlet>` in `mx-auto max-w-[1280px]` — Layout spec caps body content at 1080 (data tables) / 840 (digest), "never go to marketing-page sprawl (1280+)."

This pass undoes those three plus the redundant page eyebrow text that the spec also forbids. Out of scope: T6 row-density rework, the full app-wide `font-mono` → `tabular-nums` sweep, the new component-primitive set (`<PageHeader>` / `<PageContainer>` / `<StatusPill>` / etc.), the color-token migration to the OKLCH refresh. Those are larger projects that warrant their own branches.

## Change

### T1 — system sans + tabular-nums for numbers

- Dashboard date in the page header (`Today` + date) — dropped `font-mono`, kept `tabular-nums`. The date now renders in the same system sans as the rest of the title with proportional weight (`font-normal`) and tertiary color.
- `NeedsReviewBanner` counts (`X rows ready`, `Y need evidence first`) — dropped `font-mono`, kept `tabular-nums`.
- `LegacyPenaltyInline` amounts (`90-day legacy penalty estimate`, `Accrued penalty`) — dropped `font-mono`, kept `tabular-nums`.

(The wider catalog of `font-mono` callsites across the app — table cells, sidebar plan numbers, deadline countdowns, etc. — is deferred to a separate sweep PR. This pass only touches the surfaces I introduced in PR #3.)

### T4 — no status-color row paint

- Deleted `apps/app/src/features/dashboard/severity-row.ts` and the lone `severityRowClass(...)` call at `routes/dashboard.tsx:1227`. Priority-list rows are now neutral; severity is already encoded by the SmartPriority badge color and the Deadline countdown badge color — the row paint was a fourth signal (redundant per the spec's "tautological status columns" rule).

### Layout — 1080 cap

- `components/patterns/app-shell.tsx` main wrapper: `max-w-[1280px]` → `max-w-[1080px]`. This brings every route into the data-table-width variant defined in the spec's §Layout. Routes that already had their own narrower `mx-auto max-w-[880px]` (e.g. `routes/practice.tsx` Settings forms) stay narrower — the inner constraint wins.

### Eyebrow cleanup (carried forward from prior work in this branch)

- `RouteHeader` (`components/patterns/app-shell.tsx`): the h-14 route header bar no longer renders the eyebrow; only the title remains.
- Nine page-level routes lost their redundant `Operations` / `Practice` / `Clients` / etc. eyebrow above the title — those just echoed the sidebar nav. Kept `account.security` because `Account → Security` is real two-level hierarchy.
- Dashboard: removed the `OPERATIONS COMMAND` eyebrow + the descriptive paragraph; the date is now the page anchor.

Files: `dashboard.tsx`, `obligations.tsx`, `practice.tsx`, `clients.tsx`, `audit-log-page.tsx`, `members-page.tsx`, `notifications-page.tsx`, `reminders-page.tsx`, `opportunities-page.tsx`, `pulse/AlertsListPage.tsx`.

### Middle-dot rule audit (no changes needed)

The spec forbids `·` as a structural separator between metric values but explicitly allows it inside metadata strings (`Tax 2025 · Federal · LLC`). Audited:

- `NeedsReviewBanner` separates items with `gap-x-3` Flex spacing, not a literal `·` — clean.
- `LegacyPenaltyInline` same — clean.
- The two remaining literal `·` characters in `obligations.tsx` (lines 2948, 2980) are inside metadata strings (`label · sourceLabel`, `$X · date`) — allowed.

## Docs Check

`DESIGN.md` in the repo wasn't updated — the canonical spec lives on Yuqi's desktop and is being treated as authoritative going forward. We'll port it into the repo as a separate move once the spec-alignment work stabilizes.

## Validation

- `npx tsc --noEmit --project apps/app/tsconfig.json` — clean
- `pnpm --filter @duedatehq/app i18n:extract` — clean, total dropped from 1882 → 1880 (the eyebrow strings disappeared from the catalog)
- `pnpm --filter @duedatehq/app i18n:compile` (strict mode) — clean, 0 missing zh-CN

## Follow-ups (deferred)

- **T6 (≥44px row height + drop dividers)** — the priority-list and obligations tables inherit shadcn's default `border-b` row dividers and tighter padding. A proper T6 alignment likely means redesigning the dashboard table as cards per the spec's T6 + "Cards (alert cards, client action cards)" section.
- **App-wide font-mono → tabular-nums sweep** — ~50 callsites still use `font-mono` for numeric data (deadline countdowns, dashboard tabs, exposure cells, audit-log timestamps). Bulk replace + spot-check.
- **`<PageHeader>` / `<PageContainer>` / `<StatusPill>` / `<FilterChip>` / `<CountBadge>` / `<StateBadge>` / `<AlertCard>` / `<ClientActionCard>` primitives** — build the project-level component set the spec calls for, then migrate routes to use them.
- **Color-token migration** to the OKLCH refresh from the spec's §Design substrate.
- **Sidebar restructure** — different IA (Today / Alerts first) is left as-is in this PR per Yuqi's instruction not to touch Rules / Account.
