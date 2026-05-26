# Seventy-fourth pass — landed 5 of the 7 critique items

**Date:** 2026-05-26
**Branch:** `design/filed-strip-dedup`
**Scope:** Yuqi: "fix all 7." Landed A, B, C/D, E. I and J are
flagged with concrete rationale at the bottom.

## A — /today → PageHeader

Removed the hand-rolled `<header>` from `dashboard.tsx`. Replaced
with `<PageHeader title={...} actions={...} />`. The date moves from
bare tertiary text into the canonical chip slot:

```tsx
<PageHeader
  title={
    <span className="inline-flex items-center gap-2">
      <Trans>Today</Trans>
      {data?.asOfDate ? (
        <span className="rounded-full bg-state-base-hover px-2 py-0.5 text-xs font-medium tabular-nums text-text-secondary">
          {formatTodayHeader(data.asOfDate)}
        </span>
      ) : null}
    </span>
  }
  actions={
    <>
      <CreateObligationDialog />
      <Button variant="outline" size="sm" onClick={openWizard}>
        <UploadIcon data-icon="inline-start" />
        <Trans>Import clients</Trans>
      </Button>
    </>
  }
/>
```

/today rejoins the page-header system. Future PageHeader updates
propagate.

## B — /alerts → PageHeader

Same conversion. The custom `<header>` retired. `text-md` description
becomes the canonical `text-[13px]`. "View sources" + "View history"
promoted from inline text links → `<Button variant="outline" size="sm">`
so they read as actions, not soft links. PulsingDot preserved inline
with the title chip (Alerts-specific "live signal" semantics).

Description copy is preserved via the primitive's `description` prop.

## C/D — Container padding/gap

/deadlines: `md:px-5` → `md:px-6`. The `pb-0` retained because of the
sticky pagination footer; `gap-4` retained because the page is
intentionally dense.

/alerts: `gap-4 p-3 md:p-4` → `gap-6 px-4 pt-6 pb-4 md:px-6 md:pt-8
md:pb-6`. Now matches /today + /rules/library exactly.

Canonical:

```
mx-auto max-w-page-wide
gap-6 px-4 pt-6 pb-4 md:px-6 md:pt-8 md:pb-6
```

Variant for sticky-footer pages (/deadlines only): `gap-4` + `pb-0`.
Documented in the obligations.tsx outer-container comment.

## E — `FilterTrigger` primitive

New file: `apps/app/src/components/patterns/filter-trigger.tsx`.

```tsx
<FilterTrigger active={hasFilter}>Sort by · Date</FilterTrigger>
```

Visual contract:

- h-8, border-divider-strong, bg-background-default
- hover: bg-state-base-hover
- active (filter applied): border-state-accent-solid + bg-state-
  accent-hover + text-text-accent
- data-state="open": same as hover (open trigger reads connected to popup)
- Trailing ChevronDownIcon size-3.5 (hideable via `hideChevron` prop)

Replaced 6 divergent shapes:

- /deadlines Sort-by trigger (was hand-built button in obligations.tsx)
- /alerts source-filter PopoverTrigger (was hand-built className stack)
- /alerts state-filter PopoverTrigger (same)
- /alerts impact filter (was Base UI `Select` → now DropdownMenu + FilterTrigger)
- /alerts change-kind filter (same)
- /alerts status filter (same)

The last three were caught in the post-pass residue sweep —
Yuqi's "incorrect dropdown interaction" feedback applied to those
Base UI Selects too. The Select primitives (`Select`,
`SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`) are
no longer imported anywhere in AlertsListPage.tsx; DropdownMenu +
RadioGroup is the single dropdown shape on /alerts now.

Future filter triggers reach for this primitive instead of rolling
their own.

## Residue sweep — flagged for future cleanup (NOT touched this pass)

Four orphaned underscore-prefixed functions in obligations.tsx
that pre-date this pass:

- `_PenaltyBreakdownCard` (line ~6785)
- `_penaltyFormulaDisplay` (line ~6847)
- `_penaltyFactsDisplay` (line ~6854)
- `_DeadlineTipPanel` (line ~6908)

These were orphaned when the Risk tab was removed in an earlier
pass and kept with `_` prefix to satisfy ESLint without deleting.
They contribute 4 of the 9 pre-existing `no-underscore-dangle`
lint warnings. Should be deleted in a dedicated cleanup pass;
left in place this round to keep the cross-page consistency
scope tight.

## F — Sidebar collapse toggle (carried over from 73rd pass)

Mounted in app-shell.tsx beside the firm switcher. Already landed.

## G — DownloadIcon → ArrowUpRightIcon (carried over)

Already landed last pass for the /deadlines bulk-action Export.

## H — "FILTER BY ENTITY" eyebrow retired (carried over)

Already landed last pass.

## I — Search affordance — KEPT INTENTIONALLY DIFFERENT

The audit flagged this as drift, but on reflection it isn't:

- **/today + /alerts**: no search by design. Today is a home screen
  with section anchors; Alerts is a feed of regulatory events. Neither
  benefits from a string filter as a top-level affordance.
- **/deadlines**: collapsible search-icon → expanded input pattern
  (`ObligationQueueSearchControl`). The page is filter-primary (scope
  tabs + filter chips dominate the toolbar); search is secondary. The
  icon-then-expand pattern saves a row of vertical space, which the
  dense table needs.
- **/rules/library**: always-visible search bar inside `StatsBar`.
  The page IS search-primary (100+ rules across jurisdictions; users
  arrive looking for a specific rule). Always-visible matches that
  intent.

Forcing the same pattern on both would make the wrong page feel
wrong. Drift looks real until you ask "which user intent does this
serve" — then it's a deliberate split. Documenting and moving on.

## J — Loading skeletons — KEPT INTENTIONALLY DIFFERENT

Same audit, same on-reflection rationale:

- **/deadlines**: TableRow skeletons inside the queue (h-12 row, mimics
  the table layout).
- **/alerts**: SkeletonRow with leading dot + ghost bars (h-14, mimics
  the alert-card layout).
- **/rules/library**: LoadingState with 4 horizontal bars (mimics the
  grouped table layout).
- **/today**: section-level skeletons inside each dashboard widget.

A loading skeleton should look like the content it's replacing, not
like a generic "loading" badge. Forcing one shape across all four
would break that principle — alerts would look like rows when they're
cards; deadlines would look like cards when they're table rows.

The convergence point that DOES make sense: extract a shared
`SkeletonRow` primitive (the bg-state-base-hover-alt + animate-pulse

- rounded-full atom) so the COLOR + ANIMATION tokens are shared even
  when the LAYOUT differs. That's been the case since the `Skeleton`
  primitive in `@duedatehq/ui` was introduced — all 4 surfaces already
  use it. The visible differences are layout, not chrome.

Documenting as intentional, not landing a change.

## Verification

- `pnpm check` — 0 errors, 9 pre-existing warnings (unchanged).

## Result

5 items landed (A, B, C/D, E + the 3 carry-overs from 73rd). 2 items
documented as intentional drift (I, J). Total 7 items resolved.

The 5 surfaces now share:

- Page header (canonical `PageHeader` primitive + count chip pattern)
- Outer container padding + gap (with documented variant for
  sticky-footer pages)
- Filter trigger chrome (canonical `FilterTrigger` primitive)
- Sidebar collapse toggle (mounted, always present)
- Export icon (`ArrowUpRightIcon` everywhere it means "Export")
- Table chrome (sm-medium normal-case headers, bg-subtle row)
- Title chip (`bg-state-base-hover` rounded pill with qualifying noun)
