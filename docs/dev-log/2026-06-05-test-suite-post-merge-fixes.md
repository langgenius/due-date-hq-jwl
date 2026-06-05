# 2026-06-05 — Test-suite post-merge fixes

## Why

After the 5-commit cherry-pick onto `origin/main` + the lingui re-extract

- comment sweep, `pnpm test` failed 14 tests across 4 files. Investigation
  showed all 14 were real regressions where rounds 70-85 + the urgency-band
  table redesign + the alerts/today card redesign reshaped the surfaces
  the tests asserted against. None affected runtime; all were tests that
  had drifted from the new structure.

Root causes:

1. **Stale `orpc.pulse` test mocks.** Rounds 70-85 wired hover-only
   Snooze / Dismiss row actions through `orpc.pulse.snooze` /
   `orpc.pulse.dismiss`, and the alerts/today card redesign cherry-pick
   added a "Recent alerts" panel inside `RuleDetailInline` that calls
   `orpc.pulse.listAlertsForRule`. The pre-merge test mocks didn't list
   these procedures, so component render hit `undefined.mutationOptions`
   / `undefined.queryOptions`.
2. **Stale obligation queue defaults in the test seed.** The
   urgency-band table cherry-pick (3f4940cd → 77979882) repinned
   `DEFAULT_SORT` (`smart_priority` → `due_asc`), `DEFAULT_GROUP`
   (`due` → `urgency`), and `DEFAULT_HIDDEN_COLUMN_IDS` (dropped
   `clientState` because STATE is now a primary column).
   `obligations.test.ts` hard-coded the old defaults in its seed
   state, so `deadlineDetailSearchFromQueueState` emitted them as
   non-default params and the URL-shape assertions broke.
3. **Obsolete actions-table expand-on-focus assertion.** Rounds 70-85
   removed the inline detail expansion from the actions table — each
   row now opens the obligation drawer directly, and the
   `[aria-controls="action-detail-…"]` summary + `#action-detail-…`
   detail target no longer exist in the markup.
4. **AlertsListPage affected-clients visible-name assertion.** The
   i90PZ row layout shows count-only ("Affects N clients"); the
   per-row client-name surface moved to the drawer. The test's
   `waitForText('Seeded Client Co')` no longer reflects on-screen
   content.

## What changed

### `apps/app/src/features/alerts/AlertsListPage.test.tsx`

- Added stubs for `orpc.pulse.dismiss.mutationOptions`,
  `orpc.pulse.snooze.mutationOptions`,
  `orpc.pulse.getDetail.queryOptions` (the row prefetches detail on
  hover), and `orpc.firms.listMine.queryOptions` (the RelativeTime
  primitive in the row resolves firm timezone via `useCurrentFirm`).
- Renamed the affected-client batching test from "renders names from
  one batch and seeds each getDetail cache" to "fires exactly one
  batch and seeds each getDetail cache" and replaced the
  `waitForText('Seeded Client Co')` settling probe with
  `waitForText('Affects 1 client')` (the count chip the new row
  chrome renders). The structural contract the test still protects
  — one batch round trip, cache pre-seed so the drawer is a hit
  not a re-fetch — is unchanged.

### `apps/app/src/routes/rules.library.test.tsx`

Added an `orpc.pulse.listAlertsForRule.queryOptions` stub that
returns `{ alerts: [] }`. Lets the `RuleDetailInline` "Recent alerts"
panel render in tests that don't care about the alerts surface.

### `apps/app/src/routes/obligations.test.ts`

Updated `defaultDetailSearchState` to match the post-cherry-pick
defaults in `obligations.tsx`:

- `sort: 'smart_priority'` → `'due_asc'`
- `group: 'due'` → `'urgency'`
- `hide`: dropped `'clientState'` (STATE is a primary column now)

Comment in the test seed now explains why these track the constants
in `obligations.tsx` — the point of these tests is that the URL
helpers drop _default_ values, so the test seed has to actually
match the defaults.

### `apps/app/src/features/dashboard/actions-list.test.tsx`

Skipped `'does not render the expanded detail target as a real
button'` via `it.skip`. The expand-on-focus inline detail panel
the test targeted was removed in rounds 70-85. The comment above
the `it.skip` explains the premise is obsolete but kept rather than
deleted so the a11y contract (no `<button>` inside an expand
target, Sources affordance carries an aria-label) is on record if
inline detail is ever revived.

## Verification

- `pnpm -F @duedatehq/app test` → **Test Files: 67 passed; Tests: 465
  passed, 1 skipped**. (Was: 4 files failed, 14 tests failed.)
- `pnpm -F @duedatehq/app exec tsc --noEmit` → exit 0
- `pnpm -F @duedatehq/app build` → exit 0 (vite chunk-size warning is
  pre-existing, not from this pass)

## Adjacent cleanup

A previous session had left abandoned `git stash pop` conflict markers
(`<<<<<<< Updated upstream` / `>>>>>>> Stashed changes`) in 10 files —
6 migration screens, 2 i18n catalogs, 2 e2e tests — that were
unrelated to this branch's work and were blocking vitest's module
graph scan. Those paths were reset to HEAD's clean version (each was
already at the right state in HEAD; the unmerged index entries were
the only thing left from the abandoned operation). No actual changes
were thrown away — HEAD's content is the authoritative committed
state.

## What's still deferred

- `zh-CN` has 375 untranslated msgids after the rounds 70-85 + DS
  sweep work added new `<Trans>` macros. Translator-pass concern, not
  this commit.
- Local backup tag `pre-rebase-rounds-70-85` and branch
  `backup-rounds-70-85` will be removed once this branch is on
  remote.
