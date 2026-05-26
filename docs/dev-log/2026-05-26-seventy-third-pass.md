# Seventy-third pass — cross-page consistency critique + trivial fixes

**Date:** 2026-05-26
**Branch:** `design/filed-strip-dedup`
**Scope:** Cross-page audit of Today, Sidebar, Alerts, Deadlines,
Rule library. Trivial fixes landed in this pass; bigger structural
moves flagged below for explicit user direction.

## Findings — 10 drift points

| #   | Surface                                                                                    | Issue                                                                                                                         | Severity   | Status  |
| --- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ---------- | ------- |
| A   | /today                                                                                     | Hand-rolled header (not `PageHeader`); date suffix is bare tertiary text instead of the family chip                           | P0         | flagged |
| B   | /alerts                                                                                    | Hand-rolled header; `leading-tight` not `leading-7`; `text-md` description; "View sources/history" are text links not Buttons | P0         | flagged |
| C   | gap-4 vs gap-6 split between pages                                                         | P1                                                                                                                            | flagged    |
| D   | Outer padding drift: /deadlines `md:px-5`, /alerts `p-3 md:p-4`                            | P1                                                                                                                            | flagged    |
| E   | Three different filter-trigger chromes (Sort-by/Select/Popover)                            | P1                                                                                                                            | flagged    |
| F   | `SidebarCollapseToggle` exported but never mounted — explains the "icon position" question | P0                                                                                                                            | **LANDED** |
| G   | /deadlines bulk-action Export still uses `DownloadIcon`                                    | P2                                                                                                                            | **LANDED** |
| H   | /rules/library has a "FILTER BY ENTITY" eyebrow no other page uses                         | P2                                                                                                                            | **LANDED** |
| I   | Search affordance inconsistent (always-bar / collapsible-icon / none)                      | P1                                                                                                                            | flagged    |
| J   | Loading skeletons: 4 pages, 4 shapes                                                       | P2                                                                                                                            | flagged    |

## Landed this pass

### F — Sidebar collapse toggle mounted

`SidebarCollapseToggle` was exported from `packages/ui/src/components/ui/sidebar.tsx:769` but had zero call sites. The toggle Yuqi was looking for didn't exist in the rendered UI — that's why the "absolute position should not change" question had no obvious answer.

Now wired into `app-shell.tsx` in the header row beside the firm switcher:

- **Expanded**: row layout — monogram + name + chevron (flex-1) followed by the `size-8` toggle button at the right edge.
- **Collapsed**: column layout — monogram on top, toggle button stacked directly below it. Both centered in the 56px rail.

The toggle is always `size-8`, always inside the header row, always rendered. No "appears/disappears between states" — that was the real "position changes" bug.

Firm-switcher trigger updated from `w-full` → `min-w-0 flex-1` (expanded) / `w-8 flex-none` (collapsed) so it shares the row with the toggle without overflowing.

### G — DownloadIcon → ArrowUpRightIcon

The bulk-action Export button in the /deadlines floating toolbar (`obligations.tsx:3145`) still used `DownloadIcon`. Replaced with `ArrowUpRightIcon` so all Export verbs in the product share one glyph.

The other two `DownloadIcon` instances in the file (Export modal: CSV format option + Download recipient option) are LEGITIMATE uses — the icon labels the file format / the literal "download" recipient, not the Export action. Left intact.

### H — "FILTER BY ENTITY" eyebrow retired

`EntityChipRow` had a `text-caption-xs uppercase tracking-wider` eyebrow above the chip strip. No other list page in the product labels its filter row with an eyebrow — /deadlines, /alerts, /clients all rely on the chips themselves carrying the meaning. The active chip's dark-filled state IS the "this is selected" cue.

Removed the eyebrow. The "Clear filter" link survives (now self-aligned to the left, only renders when a chip is active).

## Flagged — needs Yuqi's direction

These are bigger structural moves; I want explicit sign-off before landing.

### A — Convert /today to `PageHeader`

The dashboard route hand-rolls its header instead of routing through the canonical primitive. Means:

- Title pairs with a bare `font-normal text-text-tertiary` date string instead of the canonical pill chip
- No breadcrumb / eyebrow / description support
- Different visual rhythm from every other page

**Move**: replace the hand-rolled header with `<PageHeader title={<><Trans>Today</Trans> <span className="rounded-full bg-state-base-hover ...">{todayDate}</span></>} ...>`. The date moves into the chip slot. Existing actions/sub-controls move into the `actions` prop.

### B — Convert /alerts to `PageHeader`

Same shape as A. AlertsListPage hand-rolls a `<header>` with its own typography (`leading-tight`, `text-md` description). The "View sources" / "View history" links should be promoted to `Button` shapes for action parity.

Risk: the existing PulsingDot, History link, and Sources link have specific visual treatments that need preservation through the conversion. Worth doing carefully.

### C/D — Container padding/gap unification

Two patterns in the codebase:

- **Canonical** (Today + Library): `mx-auto max-w-page-wide px-4 pt-6 pb-4 md:px-6 md:pt-8 md:pb-6` + `gap-6` between header and content
- **Density** (Deadlines + Alerts): tighter padding + `gap-4`

Pick one as canonical, or split deliberately ("standard" vs "tight-bottom for sticky-footer pages") and codify in a shared layout primitive.

### E — Single filter-trigger primitive

Three shapes across /deadlines + /alerts:

1. /deadlines Sort-by: inline `DropdownMenu + DropdownMenuRadioGroup` (`h-8 border-divider-strong` button)
2. /alerts state/severity Selects: `SelectTrigger size="sm"` with conditional width + accent-tinted active state
3. /alerts sources/state Popover triggers: third shape with explicit hover + accent active

Build one `FilterTrigger` primitive (h-8, border-divider-strong, hover bg-state-base-hover, chevron-3.5, accent active state) and reach for it in every filter spot.

### I — Search affordance

Three patterns for one job:

- /rules/library: always-visible search bar
- /deadlines: collapsible icon → expanded input (`ObligationQueueSearchControl`)
- /alerts: no top-level search
- /today: no search

Pick one. Easiest unify: collapsible-icon pattern from /deadlines applied to /alerts and /rules/library. Saves vertical space, lets the user opt in.

### J — Loading skeleton unification

4 pages, 4 skeleton shapes. Pick one shape and apply everywhere. Probably the `/alerts` "row with leading dot + ghost bars" pattern since it tonally fits the product.

## Verification

- `pnpm check` — 0 errors, 9 pre-existing warnings (unchanged).

## What I need from Yuqi

Sign-off on **A, B, C, D, E, I, J** before I touch them — these are real refactors (especially A + B) that I don't want to land on autopilot. Or, if you want me to plow through with my best-guess defaults, say "go" and I'll batch the canonical pattern based on my recommendations above.
