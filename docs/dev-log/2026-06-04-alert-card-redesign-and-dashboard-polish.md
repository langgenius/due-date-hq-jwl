# 2026-06-04 — `/rules/pulse` alert-card redesign + `/today` dashboard polish

> Multi-round UX polish session triggered by a long sequence of
> screenshot-based feedback from Yuqi on the `/rules/pulse` and `/today`
> surfaces. Rounds 36–44 of the rolling card-design pass.

## Scope

Two adjacent surfaces — the `/today` Alerts section + the `/rules/pulse`
list — drifted apart visually across earlier passes. This session
re-anchored them on a single card vocabulary (severity pill, encapsulated
state badge, white-card-on-gray-wash chrome) and brought the supporting
filter row + page-header chrome up to spec.

## Headline changes

### `PulseAlertCard.tsx` — jykZH layout finalized

The `/alerts` list-row card was restructured to Pencil **jykZH / ZkXFr**:

- **Top meta row** — severity pill + source · timestamp + action pill (no
  change-kind text-badge — it's in the facts panel below; no
  PulseAlertActionsRow — it's in the impact row).
- **Title row** — encapsulated StateBadge pill (SVG flag + abbreviation
  in a single `rounded-[4px]` gray-fill container) + h3 18/600 title +
  muted "Open"/"Snoozed".
- **Facts panel R2kul** — 4-column grid `[5fr_5fr_2fr_2fr]` on
  `bg-background-section`: WHAT CHANGED · AFFECTING · FIRST APPLICATION ·
  TRANSITION.
- **Impact row** — `clients · form` text + hover-revealed Review link +
  hover-revealed `PulseAlertActionsRow` (ghost-variant icon buttons).
- **Outer chrome** — `rounded-2xl px-5 py-3` white card, no border;
  hover paints a subtle inset gray ring (no bg color change); active
  state uses light-blue tint + 14%-alpha blue ring.
- **244 lines of dead `{false ? <>...</>}` legacy body deleted.**

### `NeedsAttentionCard.tsx` — matched to PulseAlertCard

- Severity pill + encapsulated state pill at the top of the card
  (mirroring the `/alerts` vocabulary). Both pills `h-6 rounded-[4px]`
  with equal visual weight (severity: color fill; state: gray-50 fill).
- `bg-background-section` (gray-50, near-invisible on the gray page
  wash) → `bg-background-default` (white). Resolves a 1–2 RGB-delta
  drift that made the cards visually disappear.
- Leading `PulseToneIcon` retired (severity pill carries the tier
  signal now); trailing chevron → Eye icon ("view this alert's
  details", not "navigate forward").

### `PulseSourceMeta.tsx`

- `text-sm` (14px) → `text-[13px]` so the source row on `/today`
  matches the `/alerts` card source exactly.

### `/alerts` filter row — T3GhR restructure

Single dense row:

```
[Search w=260] [Last 24h] [Severity any] [Change types all]
  [Status all] [Source all] [State] [Reset?]
                            ↓ flex-1 spacer
                            [Sort by Newest first]
```

- Search anchored to fixed `w-[260px]` at the row's leading edge (was
  `flex-1` floating in the middle).
- Sort by — canonical `<FilterTrigger noLeadingIcon>` with muted
  prefix + value, matching the `/deadlines` Group-by control
  (`obligations.tsx:740`).
- **Sort logic wired** — `sortOrder` state + `sortedAlerts` memo with
  three options: Newest first (default), Oldest first, Highest impact
  (sorts by confidence tier DESC then publishedAt DESC).
- Reset moved next to StateFilterPopover and now only renders when
  `filtersActive` (was a perma-disabled ghost button).
- Source + Status filter dropdowns restored to the filter row after
  earlier rounds had stripped them.
- Status chip strip (Needs Action / Needs Review / Closed) removed.

### `MorningSweepContext.tsx` (NEW)

- Saved-view button promoted from the filter row to the route shell's
  actions cluster (beside Sources + Alert history) in `rules.pulse.tsx`.
- React Context plumbs the on/off state across the React-tree boundary
  between the route shell (button consumer) and the embedded
  `AlertsListPage` (filter-override consumer). When active, overrides
  `timeRangeFilter` → `last_24h` + `statusFilter` → `active`.

### `/today` dashboard polish

- Page section gap `gap-6` (24px) → `gap-8` (32px); `/alerts` shell
  matched at `gap-8` so both top-level pages share the same outer
  rhythm.
- "Changes since" section bg flipped `bg-background-section` →
  `bg-background-default` (same near-invisible-on-wash fix as the
  alert card).
- `ActionsListHeader` — `SparklesIcon` moved INLINE INTO the h2 AFTER
  the title text. It now doubles as the info-tooltip trigger (the
  separate `InfoIcon` slot is gone). h2 → subtitle gap `gap-1` →
  `gap-0`.
- `ActionsTable` rows — body text `text-base` (16px) → `text-[13px]`,
  TableRow `[&_td]:py-3` overrides the canonical `py-4` cell padding.
- `ReadinessIndicator` — partial state (e.g. "Docs 1/3") tone
  `text-text-warning` (yellow) → `text-text-tertiary` (gray). Empty
  stays destructive; complete stays success.
- `PulseAlertActionsRow` chrome — `variant="outline" size-8` →
  `variant="ghost" size-7`, icon `size-3.5` → `size-3`, ghost
  text/bg tints. The outline 3-icon row was reading as "three loud
  borders sitting on the card" (Yuqi: "the buttons look ugly tho").

## Side notes

- `/alerts` inter-card gap `gap-4` (16px) → `gap-2` (8px) for a denser
  list.
- Card hover behavior iterated three times: gray bg (invisible against
  wash) → blue bg (too "click-state preview") → final inset gray ring
  on white (subtle edge cue, no color clash, no shadow, no layout
  shift).
- Filter button labels reworked to the `Severity / any` valueLabel
  pattern matching Pencil T3GhR (muted Geist Mono counter after the
  label).
- Top meta on the card had its change-kind chip dropped — it was
  redundant with the facts panel's "WHAT CHANGED" cell.

## Files touched (this session)

- `apps/app/src/features/pulse/AlertsListPage.tsx`
- `apps/app/src/features/pulse/components/PulseAlertCard.tsx`
- `apps/app/src/features/pulse/components/PulseAlertActionsRow.tsx` (new)
- `apps/app/src/features/pulse/components/PulseSourceMeta.tsx` (new)
- `apps/app/src/features/pulse/components/pulse-alert-chrome.ts` (new)
- `apps/app/src/features/pulse/MorningSweepContext.tsx` (new)
- `apps/app/src/features/dashboard/needs-attention-card.tsx`
- `apps/app/src/features/dashboard/actions-list.tsx`
- `apps/app/src/features/dashboard/changes-since-last-section.tsx`
- `apps/app/src/components/patterns/filter-trigger.tsx`
- `apps/app/src/components/primitives/readiness-indicator.tsx` (new)
- `apps/app/src/routes/dashboard.tsx`
- `apps/app/src/routes/rules.pulse.tsx`
- `apps/app/src/i18n/locales/*` (extracted + compiled)

## What didn't change

- `aiConfidenceTier` mapping (the shared helper driving severity color).
- The `PulseStatusFilter` enum + Reset state plumbing — `sourceFilter`
  / `statusFilter` are still in state even though their chip-strip UI
  came and went, so Reset still functions and a future advanced-filter
  surface can rewire to them.
- `apps/server/*` TS errors on Cloudflare Workers types (R2Bucket,
  D1Database, Queue, Fetcher) — pre-existing, not from this work.
- `zh-CN` 109 missing translations — pre-existing.

## Verification

- `pnpm exec tsc --noEmit` passes on the app workspace (server errors
  unrelated, see above).
- Lingui catalogs extracted + compiled clean.
- Live DOM inspection via `mcp__Claude_Preview__preview_inspect` /
  `preview_eval` at each major change.

## Deferred

- Pencil **tgX5T** detail-panel-open compact card mode (when the right
  drawer is open, the left-side card collapses to title + impact +
  time + state + Open/Snoozed only).
- Pencil **n9m9B** right-side detail panel exact recreation.
- Pencil **R2kul** facts panel data wiring: FIRST APPLICATION and
  TRANSITION cells currently render `—` because `PulseAlertPublic`
  doesn't carry effective-date / transition-window fields yet.
- `StateBadge` `SIMPLE_BADGES` registry (line 1115) — `size="xs"`
  currently falls through to `DESIGNED_BADGES`.
