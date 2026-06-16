# Finish the obligations.tsx orphan cascade (the drawer's dead helper subtree)

_2026-06-17_

Follow-up to [2026-06-16-obligations-dead-drawer-excision](2026-06-16-obligations-dead-drawer-excision.md),
which removed the 2,784-line dead `ObligationQueueDetailDrawer` but left its
helper subtree orphaned (the duplicates whose only consumer was the drawer). This
commit completes the **reference-count cascade** that excises the rest.

**obligations.tsx: 10,977 → 7,198 LOC** (−3,779 this commit; −6,558 across both
commits, from the 13,756 the route carried before Task B).

## What came out
- The contiguous dead cluster (`EmptyPanel`, `formatTaxPeriod`,
  `PrimaryDeadlineStrip`, `DeadlineTile`, `FlatDateList`, `StatutoryDatesPanel`,
  `PathToFilingSummary`, the `TIMELINE_*` consts, `humanizeAuditAction`,
  `computePastStageEntries`, `reviewPipelineCurrent`, `pipelineStateOf`, the
  duplicate `ActiveStageDetailCard`, `mineTimelineTimestamps`, the
  `*_PIPELINE_KEYS`, etc.) — a mutually-referencing dead island, removed whole.
- The round-by-round orphans the count-cascade surfaced after each pass: the
  request/rejection/materials dialogs, the `Readiness*` evidence components, the
  authority-rejection helpers (`AuthorityRejectionDraft` /
  `AuthorityRejectionAuditDetails` / `isAuthorityRejectionNextStep` /
  `cleanOptionalText` / `defaultAuthorityRejectionDraft` /
  `latestAuthorityRejectionAudit`), `parseGeneratedReadinessChecklist` +
  `ReadinessChecklistItemsSchema`, the fiscal-year-end helpers, the
  `DropdownTriggerButton` shell, `copyTextToClipboard`, `openExternalUrl(...)`,
  `isObligationQueueDetailTab`, and the now-dead consts/types.
- **46 now-unused imports** (lucide icons, contracts types, `Sheet*`/`Tabs*`/
  `StageActions` blocks, `buttonVariants`, `computeExtendedFilingDeadline`,
  `daysBetween`/`formatCents`/`formatDateTimeWithTimezone`, the
  extension-decision-evidence trio, `useObligationDrawer`, `usePracticeTimezone`,
  `EASE_APPLE`/`MOTION_DURATION`, `plural`, etc.).

## What stayed (live islands inside the same region)
`PenaltyInputDialog`, `parseMoneyCents`, `parseOwnerCount`, and the queue's filter
machinery (`ObligationFiltersPopover` / `ObligationFilterTab` /
`ObligationFacetSearchList` / `ObligationFilterPill` / `ObligationActiveFilterChips`
/ `ObligationQueueEmptyState` / `CalendarSyncPopover`) — all still rendered by the
queue route. The cascade preserved this subtree.

## How it was kept honest
The count-cascade removes only symbols with **zero in-file references** that are
not exported-and-imported-elsewhere. `obligations.test.ts` imported four helpers
that are *also* the canonical live copies in `features/obligations/queue/helpers.ts`
(`countOutstandingReadinessDocuments`, `materialsChecklistReference`,
`reviewPipelineCurrent`, `willReadinessChecklistBeFullyReceived`) — those four test
imports were redirected to `@/features/obligations/queue/helpers` so the route copy
could go without breaking the suite.

Verified: typecheck 0; `vp check` reports **no new lint** (the only two remaining
`react-hooks(exhaustive-deps)` errors are pre-existing — confirmed byte-identical on
the committed HEAD baseline, on a live `useMemo` this cascade never touched);
obligations suite 55 pass; full suite 535 pass / 2 skipped (76 files); `/deadlines`
queue renders live (28 rows + summary band + filters + status controls, zero
console errors). The live detail drawer (dedicated file) is untouched.
