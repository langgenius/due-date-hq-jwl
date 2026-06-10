# Deadline-detail navigator rail follows the table's sort + filters

**Date:** 2026-06-10
**Surface:** `/deadlines/:obligationRef[/:detailTab]` (master-detail page, Pencil rzzww)

## What changed

The deadline-detail page's left navigator rail previously queried
`obligations.list` with a hardcoded `sort: 'due_asc'` and no filters. So if a
preparer filtered/sorted the `/deadlines` table (e.g. status = Blocked, sort by
official due date) and then opened a row, the rail showed an unrelated,
unfiltered, due-ascending list — its Prev/Next stepped through the wrong set.

The rail now mirrors the TABLE's active sort + filters by reading the **same
URL search params** the table reads and building the **same list input**.

## How

- New helper `apps/app/src/features/obligations/rail-list-input.ts` exporting
  `railListInputFromSearch(search, limit)`. It parses the search string with
  nuqs's pure `createLoader(obligationQueueSearchParamsParsers)` — the exact
  parser map the table feeds into `useQueryStates` — and maps it through the
  table's shared cleaning helpers (`cleanEntityIdFilters`, `cleanStateFilters`,
  `cleanStringFilters`, `daysFilterValue`) into
  `ObligationQueueListInputWithoutCursor`. The body mirrors obligations.tsx's
  `queryInputWithoutCursor` field-for-field (status, search, obligation/client/
  rule/state/county/taxType ids, assignee name(s), owner, due, dueWithinDays,
  min/maxDaysUntilDue, needsEvidence, awaitingSignature, confirmed, asOfDate,
  sort), so the two surfaces can't drift.
- `apps/app/src/routes/deadline-detail.tsx` now memoizes
  `railListInputFromSearch(location.search, RAIL_PAGE_SIZE)` and feeds it into
  the `infiniteOptions` input callback (spread + `cursor`) instead of the
  hardcoded object. `initialPageParam: INITIAL_CURSOR`, `getNextPageParam`, and
  `placeholderData` are unchanged; ref→id resolution and Prev/Next are
  unchanged.

## Behavior preserved

- **No relevant params → identical to before.** The shared parsers default
  `sort` to `smart_priority`, but the rail's baseline is `due_asc`. The helper
  detects whether `?sort=` is explicitly present and falls back to `due_asc`
  when it isn't, so a bare `/deadlines/:ref` still loads due-ascending.
- Query key shape is unchanged, so TanStack still serves the rail from the
  table's cache on navigation (no extra fetch in the common case).
- `exactOptionalPropertyTypes` honored: optional input fields are omitted, never
  set to `undefined`.

## Verification

- `pnpm exec tsgo --noEmit -p apps/app/tsconfig.json` → no errors.
- Formatted with `vp fmt --write` (the two changed files only).
- No preview screenshots taken (shared dev server rate-limited; verified via
  tsgo + code reading).
