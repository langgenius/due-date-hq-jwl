# P0 burndown — second pass

**Date:** 2026-05-21
**Branch:** `design/preview-integration`
**Reference:** `docs/Design/ux-audit-2026-05-21.md`

After the Pulse vocabulary unification landed (P0 #2), this PR knocks
down the remaining six P0 issues from the audit. Smallest fixes first,
biggest deletion last.

## P0 #6 — Differentiate Rejected vs Blocked-by chip

`BlockedByChip` previously used the same destructive red palette as
`RejectionChip`. Two different urgencies, identical visual weight =
noise. Moved BlockedByChip to amber (warning tone). Red is now reserved
for IRS rejections.

Tokens changed in `apps/app/src/features/obligations/blocked-by-chip.tsx`:
`state-destructive-*` → `state-warning-*`, `text-text-destructive` →
`text-text-warning`.

## P0 #7 — Visible hotkey hints

The product has good hotkeys (`j/k` for queue navigation, `Esc` to
exit) that lived only in `title` attributes. Nobody discovers a
shortcut by hovering on a header.

New primitive: `apps/app/src/components/patterns/kbd.tsx`. Exports
`Kbd` (inline keyboard symbol) and `KbdHint` (labeled row of
`[kbd] label · [kbd] label`).

Mounted on two surfaces:

- **Rule review drawer** (`coverage-tab.tsx`): adds
  `j next · k prev · esc exit` below the rule title
- **Obligations inline drawer** (`obligations.tsx`):
  `j next row · k prev row · esc close` below the header chrome

## P0 #3 — Owner column on Obligations queue row

New column inserted after `Client`. Reads `row.assigneeName`.

- Unassigned rows show italic `Unassigned` in muted tone
- Rows assigned to the current user get a `YOU` chip (accent tone)
  followed by the name

Current user resolved via `useCurrentUserName()` —
`apps/app/src/lib/use-current-user-name.ts`, which reads from the
protected route loader (`useRouteLoaderData(PROTECTED_ROUTE_ID)`).

**Known fragility:** matches by display name, not user ID, because the
queue row schema only exposes `assigneeName`. When the contract grows
to expose `assigneeUserId`, switch the hook over.

## P0 #4 — Header X + Esc on inline obligations drawer

The inline-mode drawer (`aside`, xl+ viewport) previously had only a
buried "Close" button in the footer. Modal mode (`Sheet`, md and below)
had a built-in X + Esc + backdrop. Three viewports, three different
close contracts.

Fix:

- Added a header X button (28px, top-right) — rendered only in inline
  mode (modal mode keeps Sheet's built-in)
- Added a scoped `useAppHotkey('Escape', ...)` that fires only when
  `mode === 'inline' && obligationId !== null`. Modal mode's Esc is
  still handled by `Sheet`'s built-in.

Two viewports now share the same back-out semantics. The `<sm>`
full-screen variant inherits from modal so it's covered too.

## P0 #5 — Kill Rule library redundancy stack

Active / pending / source counts appeared in two places on the matrix
view: `CoverageSummaryStrip` + `SourcesSummaryStrip` at the page top
(drillable) AND a separate `StatsStrip` inside `CoverageTab`. Same
numbers said three times.

Deleted `StatsStrip` + its `Stat` helper from
`apps/app/src/features/rules/coverage-tab.tsx`. The top strips win
because they're already redesigned and drillable. The
`StartReviewCTA` button stays — it's an action, not a stat.

The redundancy stack on matrix view dropped from 5 horizontal bars to
3 (top strips + section header + filter chip when active).

## P0 #1 — Delete Dashboard v1 + retire `useDashboardV2` flag

Done in a single sub-agent pass:

- `apps/app/src/routes/dashboard.tsx`: **1291 lines → 218 lines.**
  Removed `useDashboardV2()` hook usage, all `{dashboardV2 ? V2 : V1}`
  conditionals, every V1-only function (NeedsReviewBanner,
  LegacyPenaltyInline, DashboardTriagePanel, DashboardTriageTable +
  sub-components, EmptyDashboard, label hooks, V1 routing helpers,
  dead types).
- **Deleted files:**
  `apps/app/src/features/dashboard/use-dashboard-v2.ts`,
  `apps/app/src/features/pulse/PulseAlertsBanner.tsx`.
- **URL params preserved** for deep-link compatibility — every existing
  query param still feeds `dashboardTableInput` (the server-side filter
  input), so bookmarked links keep working even though the V1 UI to
  set those filters is gone.

`?dashboard=v1` no longer resolves to a different product. One
dashboard, one code path.

## Score impact

The audit had Dashboard at **24/40**, Obligations at **23/40**, Rule
library at **26/40**. Expected post-PR movement on the next critique
pass:

- **Consistency & standards** (#4): up across all three surfaces.
  Dashboard no longer ships two versions. Obligations chips now have
  honest severity. Rule library no longer says the same number twice.
- **Recognition over recall** (#6): up across queue + review.
  Hotkeys are visible.
- **User control & freedom** (#3): up on Obligations. Inline drawer
  back-out now matches modal mode.
- **Aesthetic & minimalist** (#8): up on Rule library. Two bars of
  chrome removed.

Future passes per audit doc P1 list — Undo on destructive status
changes, segmented control for Rule library views, "what changed
since" delta on Dashboard hero, smart priority on Obligations row,
status taxonomy convergence.
