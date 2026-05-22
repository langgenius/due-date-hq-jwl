---
title: 'Filing plan hierarchy + canonical status badge + filter-vs-badge contract'
date: 2026-05-22
author: 'Yuqi pairing with Claude'
area: ux
---

# Filing plan hierarchy + canonical status + filter/badge contract

Follow-up commit after Yuqi reviewed the demo and flagged four issues:

1. Filing plan is hard to read — no hierarchy, no visual terminus
2. Filter and badge visual languages are getting mixed up
3. Filing plan's filter / right-edge content gets orphaned on wide screens
4. Status display has to be identical across the whole product

This commit addresses all four.

## 1. Filing plan hierarchy

### Header row — content clusters left, no right-edge orphan

Before: `[Filing plan] [N filings across M tax years]` on the left,
3 chips `[{N} overdue] [{N} need review] [{N} payment-linked]`
pushed to the right via `justify-between`. On wide screens this
created a content-at-two-edges layout that fragmented the header.

After: title + count cluster together at the left only. The 3 chips
were retired — they looked like interactive filters (warning tone
when count > 0) but were inert; the visual mismatch is exactly the
filter/badge confusion (see point 2). The overdue count is already
in the page subtitle in tone-coded form, so this isn't lost info.

### Year section — bigger heading, no `ml-auto` push, terminus

Before:

```
2026 [Current tax year]                              2 extended · 3 open
[table]
                                                     ← no separator —
2025                                                  1 open
[table]
```

After:

```
2026  [Current tax year]  3 open · 2 extended
[table]
─────────────────────────────────────────────  ← divide-y terminus
2025  1 open
[table]
─────────────────────────────────────────────
```

Concrete changes in `FilingPlanYearSection`:

- Year number from `text-sm font-medium` → `text-base font-semibold`
  (reads as a section heading, not row meta)
- `Current tax year` chip + open/extended count cluster `gap-x-3` next
  to the year — no more `ml-auto` push to the far edge
- Year sections separated by `divide-y` in the parent, giving each
  year a clean visual terminus instead of just stopping

## 2. Filter vs Badge contract

Wrote `docs/Design/filter-vs-badge-contract.md` to nail the rule:

> Badges = read-only state indicator. No chevron, no hover lift, tone
> color carries meaning.
>
> Filters = interactive narrowing trigger. Always have a chevron `▾`
> or filled active state. Neutral by default; active state uses a
> pressed-pill background, not a tone color.

The doc lists every current badge and filter, the anti-patterns we
just retired, and the implementation patterns for new ones. Future
sweeps reference this.

## 3. Status display canonicalization

### Found

- `useLifecycleV2StatusLabels()` + `STATUS_VARIANT` + `STATUS_DOT` in
  `features/obligations/status-control.tsx` are the **canonical**
  source of truth: 10 raw statuses collapse to 6 user-facing labels
  with consistent variant + dot tone.
- The obligations queue, dashboard action-list, audit log, and
  evidence drawer all consume the canonical vocabulary.
- **The filing-plan rows on `/clients/[id]` did not.** They had a
  local `ObligationStatusBadge` with different labels (`Complete` /
  `Needs review` / `Waiting` / raw-text fallback for blocked /
  pending / etc.) and no `BadgeStatusDot`.

So the same status would read as `Complete` on the client page and
`Filed` on the queue. Same data, two vocabularies.

### Fix

- Added `ObligationStatusReadBadge` to `status-control.tsx` — a
  read-only sibling of `ObligationQueueStatusControl` that uses the
  same variant + dot + v2 label maps but renders as a plain Badge
  (no dropdown). One status → one label → one color, everywhere.
- Replaced the row-level usage in the filing plan with the canonical
  component.
- Deleted the local `ObligationStatusBadge` definition.

The page now shows `[•Filed]` / `[•In review]` / `[•Waiting on client]`
matching the queue exactly.

## Files

- M `apps/app/src/features/obligations/status-control.tsx`
  - Added `ObligationStatusReadBadge` component
  - Re-exported it alongside the existing exports
- M `apps/app/src/features/clients/ClientFactsWorkspace.tsx`
  - Filing plan header: left-cluster title + count, dropped 3 inert
    summary chips
  - Year section: bigger heading, no `ml-auto`, terminus via parent
    `divide-y`
  - Row status: swap local `ObligationStatusBadge` for canonical
    `ObligationStatusReadBadge`
  - Deleted the local `ObligationStatusBadge` definition
  - Added the `status-control` import line
- A `docs/Design/filter-vs-badge-contract.md`
- A this dev-log

## Verification

- `npx tsc --noEmit -p apps/app/tsconfig.json` → clean
- Manual:
  - Open a client with multiple tax years → year headings read as
    headings (text-base + bold), chip + count sit next to the year
    not at the far edge
  - Year sections have clear horizontal separators between them
  - The 3 chips above the year sections are gone
  - Row status badges show `[•Not started]` / `[•Waiting on client]` /
    `[•Blocked]` / `[•In review]` / `[•Filed]` / `[•Completed]` —
    same labels + same dot vocabulary as the obligations queue

## What's NOT in this commit

- Sweeping `useLifecycleV2StatusLabels` consumers for any other
  divergence (this only fixed the one I found — the local
  `ObligationStatusBadge`). The status taxonomy drift audit (task
  #22) covered this earlier; this re-verifies the fix held.
- Cross-surface filter-vs-badge sweep beyond /clients/[id]. The
  contract doc is the spec; future commits enforce it as they touch
  each surface.
- A "filter the filing plan" feature. Yuqi mentioned filter
  proximity — there's no filter on the filing plan today; the chips
  that looked filter-like were just badges. If a real filter
  (status / year / overdue-only) gets added later, the contract doc
  is now the spec for how it should look.
