# UX-polish primitives batch — search/sort/lateness unification + alert dimming + close policy (Yuqi)

_2026-06-16_

A large polish pass driven by a full-app audit + Yuqi screenshot feedback. New
shared primitives, cross-surface vocabulary unification, and a close-interaction
policy. All typecheck-clean; `vp test run` = 538 pass / 2 skipped.

## New primitives

- **`components/patterns/sortable-header.tsx` — `SortableHeader`.** The one
  "click a column header to sort" affordance. Idle → faint `ChevronsUpDown`
  (40%), asc → `ChevronUp`, desc → `ChevronDown` (accent). Adopted by `/clients`
  (`ColumnSortHeader`) and the `/deadlines` queue (`ObligationQueueSortableHeader`),
  which had drifted (arrows vs chevrons; clients had no idle icon). `aria-sort`
  added to the `/clients` `<th>` (deadlines already had it).
- **`components/primitives/collapsible-search.tsx` — `CollapsibleSearch`.**
  The canonical collapsing toolbar search: ghost magnifier → expands on
  **hover** (no focus-steal) / click / `/` → stays open while focused or carrying
  a query → collapses on mouse-leave when empty+unfocused. Focus lands via a
  post-commit effect (a bare rAF fires before React mounts the input). Replaced 4
  hand-rolled `searchOpen` controls (clients, rules-global, rules
  `JurisdictionFilterBar`, alerts) and deleted the dead `ObligationQueueSearchControl`.
  Page **lead-control** searches (audit, notifications, alert history), rails
  (`compact`), and the `/deadlines` 320px primary search stay always-open.
- **`DueCountdownText`** (extracted from `due-date-label.tsx`). Tone-agnostic
  compact relative-date wording — `5d late` / `in 5d` / `today` / `filed 5d
late·early`. See lateness unification below.
- **`Dialog protectInput` prop** (`packages/ui/.../dialog.tsx`). See close policy.
- **`Segmented` `dimmed` option flag** — fades an inactive option to 60% (empty
  buckets) so `/today`'s Priorities selector adopts the primitive without losing
  its dim.

## Cross-surface unification

- **Lateness → compact everywhere** (Yuqi: "compact everywhere"). Every due-date
  COUNTDOWN now routes through `DueCountdownText`: the `/deadlines` queue column
  (both the `primitives.tsx` `DueDaysPill` AND the live local one in
  `routes/obligations.tsx`), `/clients` next-due cell, the client peek + detail
  next-due lines, the obligation detail note + "Past deadline" banner, and
  `panels.tsx` key-date cards / lateLabel / flat hero. Terminal rows now gain the
  `filed` prefix (the queue's deliberate no-"filed" rule was overridden). Removed
  two `i18n._(plural())` footgun calls in `panels.tsx`. **Left verbose on
  purpose:** recency ("N days ago"), date-diffs ("N days sooner/later"), prose
  sentences, and "Effective in N days" (rule lifecycle, not lateness).
- **Filing-plan reflow** — dropped `min-w`/`overflow-x` in `ClientWorkPlanPanel`
  - `DeadlineRow`; columns shrink/truncate like the other tables (0 h-scroll at
    1040px).
- **`/today` Priorities selector → `Segmented`** (+ the `dimmed` flag).
- **Scope-selector convergence — NOT done (obsolete).** The `/deadlines` status
  scope is no longer underline tabs; it was already reworked (2026-06-16) to a
  `Status │ All ⌄` FilterTrigger because 7 statuses were "too long". Converting
  to a Segmented pill strip would regress that. Rule recorded: Segmented for
  ≤3–4 options, FilterTrigger for many; content-bound tabs stay `Tabs`.

## Screenshot-feedback fixes

- **Alert rows — dim everything but the title** when the row isn't open. The
  metadata cluster, timestamp, and action link drop to 60% opacity (lift on hover
  / when `active`); the `<h3>` title stays full ink. List now scans as a column
  of headlines.
- **`/deadlines/:ref` rail header** — Sort moved onto the title line (mirrors the
  Jurisdictions rail's "Show"); dropped the redundant "N shown" line (folded into
  the count chip, which now reads "N shown" only while filtering) and the
  "Soonest internal due date first" note (restated the sort). Title switched to
  the `ListRailTitle` primitive (was hand-rolling the same `text-item-title`).
- **Dashboard "See all deadlines" overdue date → 14px** (`text-sm`, the primitive
  default) — was a 16px override that rendered bigger than the `/deadlines` table.
  Red colour carries urgency; balances the xs avatar + 11px sub-date.

## Close-interaction policy ("Smart — protect input")

Modals close on Esc + ✕ + backdrop click (Base UI default). Modals carrying
**unsaved text** opt into `<Dialog protectInput>`, which cancels an
`outside-press` (`eventDetails.cancel()`); Esc / ✕ / Cancel still close. Applied:
CreateClient, CreateObligation, the 5 queue compose/note dialogs, rules
accept/reject-with-note, reminders compose, members invite. The right detail
panel keeps ✕ / Esc / breadcrumb (no backdrop in the split); overlay panels close
on outside-click. New test in `alert-dialog-overlay-close.test.tsx` proves normal
dialogs still close on overlay click and `protectInput` ones don't.

## Stale-test fixes (caught by the full suite)

- `pulse-alert-chrome.test.ts` — asserted old hardcoded hex; the impact badge was
  earlier tokenized (`var(--state-warning-hover)` etc.). Updated.
- `Step3Normalize.test.tsx` — wrapped in `MemoryRouter` after the raw-`<a>` → `<Link>`
  fix needed a router context.
- `actions-list.test.tsx` — "Payment 10 days late" → "Payment 10d late".

## Follow-ups

Message extraction + zh-CN parity for the new/changed strings (compact lateness,
removed rail note); the deferred dead-code excisions (AlertsListPage `historyMode`,
the obligations.tsx duplicate detail-drawer block); split `ClientFactsWorkspace.tsx`.
