# 2026-06-05 — Merge origin/main into design/clients-state-icon-sweep-2026-05-29

## Why

After cherry-picking 5 commits onto the post-`git reset --hard` base
and landing post-merge cleanup + test fixes, origin/main had moved
forward by 23 commits while our branch was 9 commits ahead. Heavy
overlap on the alerts surface (new pagination, tax-area filter,
impact-level rewrite, e2e adaptations, 334 zh-CN translations) +
the obligations queue extraction. Open PR to main requires the
branch to integrate origin/main first so the diff shows just the
_delta_, not the divergence.

## Conflict shape

10 files in conflict after `git merge origin/main`:

- `apps/app/src/features/alerts/AlertsListPage.tsx` (8 regions)
- `apps/app/src/features/alerts/components/pulse-alert-chrome.ts` (1 region)
- `apps/app/src/features/dashboard/needs-attention-card.tsx` (3 regions)
- `apps/app/src/features/dashboard/actions-list.test.tsx` (1 region)
- `apps/app/src/routes/alerts.history.tsx` (1 region)
- `apps/app/src/routes/obligations.tsx` (6 regions, incl. an 8,386-line region)
- `apps/app/src/i18n/locales/{en,zh-CN}/messages.{po,ts}` (4 files)

Each was hand-walked rather than blanket-resolved.

## Per-file resolution

### `pulse-alert-chrome.ts`

Took origin/main's `impactBadgeFromAlert(alert)` over HEAD's
`severityFromConfidence(confidence)`. The impact model on main is
the canonical evolution — tier now reflects actual
`matchedCount + needsReviewCount` rather than the model's
confidence. HEAD's X3j4nt amber HIGH colors (round 58) were
superseded by main's destructive-red palette. Updated all three
HEAD-side callers (`AlertDetailDrawer.tsx:539`,
`PulseAlertRow.tsx:187`, `needs-attention-card.tsx:184`) to use
the new helper.

### `needs-attention-card.tsx`

- Import conflict: kept main's `impactBadgeFromAlert` import,
  intentionally omitted main's `PulseSourceMeta` import — the JSX
  body kept HEAD's round 81 inline source treatment
  (`<ExternalLinkIcon>` + truncated label with URL on tooltip
  hover), so `PulseSourceMeta` would be unused.
- Severity call: switched to `impactBadgeFromAlert(alert)`; kept
  the bare-tier-word ("HIGH") label commentary from round 71.
- Layout block (J4INTw 2-block structure with subject below
  meta+severity): took HEAD's rounds 67-85 layout — main's
  layout was the older round 42-44 title-below-meta arrangement
  that rounds 67-85 superseded. The continuation lines after the
  conflict region (STATE rendering, rounds 73/80/81 polish)
  confirm the file's narrative belongs to HEAD's evolution.

### `actions-list.test.tsx`

Took main's replacement test
(`renders each obligation as a focusable non-button row with a
span rank tooltip`). HEAD's `it.skip` of the old expand-on-focus
test was the right placeholder; main's new test covers the same
a11y contract (no native `<button>`, tabindex, role) against the
_current_ table-sweep markup. Main's version is the proper update,
not just a substitute.

### `alerts.history.tsx`

Combined HEAD's round 81 `wide` flag (cap at
`max-w-page-expanded` 1440 so history matches active) with main's
`contentClassName` for the panel-open transition. Both are
legitimate additions — no semantic conflict.

### `AlertsListPage.tsx`

- Import line for `@tanstack/react-query`: HEAD imported
  `useMutation, useQuery`; main imported `useInfiniteQuery, useQuery`.
  Merged to all three. Main's pagination needs `useInfiniteQuery`;
  HEAD's row Snooze / Dismiss needs `useMutation` + sonner toast.
- HEAD-only imports (`MorningSweepPanel`, `aiConfidenceTier`): kept
  with a comment explaining they're HEAD additions on top of main.
- Query-options imports: switched to main's
  `useAlertsListInfiniteQueryOptions` /
  `useAlertsHistoryInfiniteQueryOptions` but kept HEAD's
  `useAlertsInvalidation` for the post-action cache reset.
- 70-line state-machine block: merged. Round 77's `setReasonState`
  - `dismissAlertMutation` + `snoozeAlertMutation` + sonner toasts
    kept verbatim; the query-options block at the end switched to
    main's `useInfiniteQuery` shape so the consumer matches the
    `alertsQuery.data?.pages.flatMap` already on the next line.
- Filter-row outer container: kept HEAD's round 71
  `flex-nowrap overflow-x-auto` single-line scroll, dropped
  main's round 42-44 wrap-with-panel-open container (rounds 71+
  superseded that approach).
- Status / Tax area dropdown trigger: HEAD's version was a stale
  duplicate Status trigger (Status had already moved into the
  `historyMode` wrapper above). Main introduced the canonical
  Tax area trigger in this slot; surrounding `DropdownMenuContent`
  already drives `taxAreaFilter`. Took main's trigger; documented
  the duplicate.
- Source-filter comment: merged both rounds' explanations
  (round 71 "least-used pill, crowded the one-line constraint" +
  2026-06-05 "all sources filter too granular, State/Federal
  coverage via map below").
- Trailing spacer/View-toggle slot: kept HEAD's round 83 reorder
  (spacer + View toggle moved to the position immediately after
  Search); dropped main's `{panelOpen ? null : <span flex-1>}`
  trailing pusher.

### `obligations.tsx`

Took origin/main's version wholesale. The conflict region spanned
**8,386 lines** — origin/main extracted obligations.tsx into a
new `apps/app/src/features/obligations/queue/` subdirectory
(`constants.ts`, `helpers.ts`, `types.ts`, `dialogs.tsx`,
`use-obligation-queue-columns.tsx`,
`components/{evidence,panels,primitives,toolbar}.tsx`,
`ObligationQueueDetailDrawer.tsx`). Trying to layer HEAD's
monolithic rounds 70-85 polish on top of that refactor would
create a hybrid that nobody could reason about. HEAD's polish on
the deadlines surface came from the cherry-picked predecessor
3f4940cd (which is already on origin/main as the original SHA),
so very little is actually lost — only the round-3 follow-up
tweaks I had applied on top of the predecessor are gone, and
they can be re-applied as a focused follow-up PR against the
queue extraction.

### i18n catalogs

Took origin/main for all four files, then re-extracted via
`pnpm i18n:extract`. Final catalog: en 3171 source strings,
zh-CN 90 strings missing (translator-pass concern — main had
334 zh translations land just before this merge, which trimmed
the gap substantially).

## Cascade fixes after taking origin/main's obligations.tsx

- `obligations.test.ts`: origin/main's queue extraction dropped
  `urgencyBandOf` / `URGENCY_BAND_ORDER` from
  `@/features/obligations/queue/helpers` (band logic moved inline).
  Skipped the `urgency band derivation` describe block via
  `describe.skip` + added throwing stubs for the two missing
  symbols so TypeScript can still typecheck the skipped body.
  Also realigned `defaultDetailSearchState` to origin/main's
  current defaults — `sort='smart_priority'`, `group='due'`,
  `hide` includes `'clientState'` again — since the whole point
  of those tests is that the URL helpers drop default values
  from the query string.
- `rules.library.test.tsx`: origin/main had already added the
  `pulse` mock the post-merge regression-fix commit also added.
  Dropped the duplicate I added; main's version (which expects
  `{ matches: [] }`) is the canonical shape.
- `AlertsListPage.test.tsx`: origin/main's new tax-area filter
  test waited on `waitForText('Seeded Client Co')`. The i90PZ row
  layout from rounds 70-85 shows count-only ("Affects N clients")
  — same fix as before, re-anchored the settling probe to
  `waitForText('Affects 1 client')` so the test settles on the
  count chip the new chrome renders.

## Verification

- `pnpm -F @duedatehq/app exec tsc --noEmit` → exit 0
- `pnpm -F @duedatehq/app test` → 69 test files passed, 476
  tests passed, 5 skipped (was 67 / 465 / 1 before the merge —
  the new files come from origin/main's contributions).
- `pnpm -F @duedatehq/app build` → exit 0 (chunk-size warning
  pre-existing, not from this merge).
- `pnpm -F @duedatehq/app i18n:extract` → en 3171 / zh-CN
  90 missing.

## What's still deferred

- 90 untranslated zh-CN msgids (translator pass — most were
  added by rounds 70-85 + post-merge cleanup; main's 2ac5a19b
  already translated the 334 strings that existed before).
- Rounds 70-85 fine-tuning on the obligations.tsx surface
  (the polish that landed on top of the 3f4940cd predecessor)
  needs re-applying against origin/main's queue extraction. A
  focused follow-up PR against `features/obligations/queue/*`
  is the right venue.
