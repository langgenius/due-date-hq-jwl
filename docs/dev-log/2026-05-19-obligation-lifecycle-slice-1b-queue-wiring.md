---
title: 'Obligation lifecycle v2: slice 1b — Obligations queue wires the v2 vocabulary'
date: 2026-05-19
author: 'Claude'
area: obligations
---

# Obligation lifecycle v2: slice 1b — Obligations queue wires the v2 vocabulary

## Context

Slice 1a ([2026-05-19-obligation-lifecycle-slice-1a-schema.md](2026-05-19-obligation-lifecycle-slice-1a-schema.md)) added `blocked` + `completed` to the canonical enum, the v2 label set, and a `useLifecycleV2` flag hook. This slice wires those into the live Obligations queue at `/obligations`.

## Discovery that simplified the slice

The Obligations queue already has a Status column ([apps/app/src/routes/obligations.tsx:1252-1284](../../apps/app/src/routes/obligations.tsx)) — earlier critique notes that "Obligations has no Status column" were wrong; it's just not always visible at the user's viewport width and is hideable via the `?hide=` URL param. So slice 1b is a label + dropdown-options swap, not a new column.

## Change

### `ObligationQueueStatusControl` now accepts a `statuses` prop

[apps/app/src/features/obligations/status-control.tsx](../../apps/app/src/features/obligations/status-control.tsx): the dropdown radio items used to hardcode `ALL_STATUSES`. They now iterate over a `statuses` prop that defaults to `ALL_STATUSES` for back-compat. v2 callers pass `LIFECYCLE_V2_STATUSES`.

The trigger button still renders `labels[row.status]`, so a row currently in a legacy state (e.g. `in_progress`) keeps a readable label even when its value isn't in the constrained dropdown options. Picking any of the 6 v2 options transitions the row out of the legacy state — the migration path is "every interaction nudges legacy rows toward v2."

### Obligations route consults the flag

[apps/app/src/routes/obligations.tsx](../../apps/app/src/routes/obligations.tsx) now reads `useLifecycleV2()` and selects between the legacy and v2 label maps + the 8-value vs 6-value dropdown options. One assignment, no fork in component code:

```tsx
const lifecycleV2 = useLifecycleV2()
const statusLabels = lifecycleV2 ? v2StatusLabels : legacyStatusLabels
const statusDropdownOptions = lifecycleV2 ? LIFECYCLE_V2_STATUSES : ALL_STATUSES
```

## What you see when the flag is on

Visit `http://localhost:5175/obligations?lifecycle=v2` (or any port the dev server is on) and:

- The Status column dropdown surfaces 6 options: **Not started · Waiting on client · Blocked · In review · Filed · Completed**.
- `review` rows display as "In review" (instead of "Needs review").
- Rows currently in legacy states (`in_progress`, `extended`, `paid`) keep their legacy label on the trigger button — picking any v2 state transitions them out.

Visit without the flag: identical to before.

## Verification

- `pnpm check` — pass.
- `pnpm -F @duedatehq/app test --run` — 203/203 pass.

## Not in this slice

- Timeline tab in the obligation detail drawer (slice 1c).
- Transition validation matrix (slice 2): today the dropdown will let you do any 6 → any 6, including illegal ones like `not_started → completed`.
- Server-side rejection of illegal transitions (slice 2).
- `blocked_by` UI on the row + drawer (slice 2/3).
- Migration script (slice 3).
