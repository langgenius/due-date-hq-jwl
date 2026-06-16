# Excise the dead duplicate ObligationQueueDetailDrawer from routes/obligations.tsx

_2026-06-16_

`routes/obligations.tsx` carried a **2,784-line duplicate** `ObligationQueueDetailDrawer`
(lines 6091–8874) — a stale copy of the live drawer. The live one is the dedicated
`features/obligations/queue/ObligationQueueDetailDrawer.tsx` (imported by
`ObligationPanelDispatcher` + `deadline-detail`); the obligations.tsx copy was
exported but **never imported** (only `ObligationQueueRoute` is imported from this
file, by the router). Removed the whole drawer function.

**obligations.tsx: 13,756 → 10,972 LOC** (−2,784).

Verified: typecheck 0; obligations suite 91 pass; full suite green; /deadlines
queue renders (31 rows, no error). The live detail drawer (dedicated file) is
untouched.

## Why the drawer's helper duplicates aren't all gone yet
The removed drawer rooted ~25 helper functions (the request/rejection/materials
dialogs, the Readiness* evidence components, PrimaryDeadlineStrip / DeadlineTile /
FlatDateList / StatutoryDatesPanel, PathToFilingSummary, AuthorityResponsePanel,
and a duplicate ActiveStageDetailCard + the reviewPipelineCurrent /
materialsChecklistReference / timeline helpers). Every one of these is a
**duplicate** — the live versions live in the dedicated files (`panels.tsx`,
`helpers.ts`, the dedicated drawer). With the drawer gone they're now orphaned.

They are NOT yet removed because the region is **interleaved with live islands**
that the queue route still uses (`PenaltyInputDialog` + the
`ObligationFiltersPopover` / `ObligationFilterTab` / `ObligationFacetSearchList` /
`ObligationFilterPill` / `ObligationActiveFilterChips` / `ObligationQueueEmptyState` /
`CalendarSyncPopover` filter components, plus their transitive deps). Safely
removing the ~1,500 LOC of orphaned duplicates is a **reference-count cascade**
(remove zero-ref functions, re-count, repeat) that must preserve the live subtree
— a careful follow-up, tracked, not rushed at the tail of this batch.
