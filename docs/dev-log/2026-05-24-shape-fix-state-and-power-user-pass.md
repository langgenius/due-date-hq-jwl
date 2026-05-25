# 2026-05-24 — Fix-state journey + filing-plan power-user pass (shape)

## Why

Two critique fixes in one /shape commit:

### P1 — Fix-state journey mismatch

The /clients list page had a 2-click `FixNeedsFactsSheet` flow for
adding a missing filing state. The detail-page H1 "Add filing state"
chip did NOT open that sheet — it switched tabs and scrolled to the
jurisdiction form, requiring the CPA to find the field, type or
pick a state, and click Save (6+ clicks vs 2). Same task, 3× the
work depending on where they entered.

### P2 — Power user gaps on the filing plan

- Column headers (FORM / Internal Deadline / Official Deadline /
  Status / Estimated tax) looked like a real table but didn't sort.
- Rows had no multi-select affordance, so Sarah couldn't pick 5
  blocked filings and bulk-mark them as "In review".
- No floating bulk-action bar.

## What changed

`apps/app/src/features/clients/ClientFactsWorkspace.tsx` (~+220 lines)

### Fix-state sheet on detail

- `FixNeedsFactsSheet` now mounts inside `ClientDetailWorkspace`
  with `clients={[client]}`.
- `openMissingFacts` branches: when only `state` is missing (90%
  case), open the sheet. When `entityType` is missing (rare, no
  mutation exists), fall back to the existing tab+scroll behavior
  because the sheet's entityType handler is a "Open client to fix"
  link that would loop back here.

### Sortable column headers

- New `FilingPlanSort` type + `sortObligations` helper near the
  panel.
- `FilingPlanSortHeader` button component renders the column label
  - a ChevronUp/ChevronDown when the column is the active sort.
    Click cycles asc → desc → no sort.
- Sort state lives on `ClientWorkPlanPanel` so it applies across
  every year section (sort within each year).
- Five sortable columns: Form (alpha), Internal Deadline (date),
  Official Deadline (date), Status (lifecycle order), Estimated
  tax (cents).

### Multi-select + bulk status

- New `selectedIds: Set<string>` state on the panel.
- Per-row checkbox replaces the leading "N" badge (which read like
  a priority signal it didn't actually carry).
- Year header gets a select-all checkbox with indeterminate state
  when some-but-not-all rows in that year are selected.
- Selected rows get an `bg-state-accent-hover-alt` highlight so
  the selection is visually obvious.
- `FilingPlanBulkBar` — new floating-pill bar at the bottom of the
  viewport when `selectedIds.size > 0`. Count badge + status
  picker dropdown + clear button.
- Wires `orpc.obligations.bulkUpdateStatus` mutation. Same RPC the
  /obligations queue uses; same invalidation set (listByClient,
  list, getDetail, dashboard).

## Verification

- tsc clean
- lint 0/0
- 17/17 client feature tests pass

## Follow-ups

- Keyboard shortcuts to switch tabs (deferred — separate keyboard pass)
- Optimistic update on bulk status (toast feels instant; row
  refresh has ~200ms lag)
- Persist sort + selection across page navigations
