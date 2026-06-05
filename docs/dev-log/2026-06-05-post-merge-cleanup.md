# 2026-06-05 — Post-merge cleanup: lingui re-extract + Pulse→Alert comment sweep

## Why

After cherry-picking 5 unmerged commits (rounds 70-85 + 3 predecessor design
sweeps + 2 DS-system rounds) onto `origin/main` to absorb PR #61's
`Pulse → Alert` product rename, two pieces of debt were carried forward:

1. **i18n catalogs were stale.** The merge resolution took `--theirs` on
   `messages.po`/`messages.ts` for both `en` and `zh-CN`. That left 361
   stale source-path comments (`#: src/features/pulse/PulseAlertCard.tsx`,
   etc.) per locale referencing files that no longer exist under that
   path. The msgids themselves still resolved, so nothing crashed — but
   the catalog was lying about where its strings came from, which would
   confuse the next translator audit and noise up future lingui diffs.

2. **Comment references to the renamed `PulseAlertCard` component.** Six
   files carried "PulseAlertCard" mentions in docstrings or inline
   comments from earlier rounds that predated the rename. None affected
   runtime; all were prose drift.

## What changed

### `pnpm -F @duedatehq/app i18n:extract`

Regenerated `en` (3173 source strings) + `zh-CN` catalogs from the actual
source tree. Diff: ~+2900 / −1500 lines across both locales — almost
entirely source-path comment shuffling, not real msgid churn.

`zh-CN` reports 375 strings missing translation. That's not new debt from
this pass — those are strings that already lacked translations before the
merge (the rounds 70-85 + DS sweep work added new `<Trans>` macros that
were never sent to a translator). Flagged for a translator pass; not
blocking this commit.

### Comment sweep — `PulseAlertCard` → `AlertCard` (where the rename
applies) or `AlertCard (née PulseAlertCard)` (where the historical
identity matters)

- `apps/app/src/features/alerts/components/pulse-alert-chrome.ts`:
  docstring header updated. Added a short "naming note" explaining why
  the file + helper prefix kept `pulse-alert-*` after the product
  rename — the helpers encode the original Pencil-spec vocabulary, not
  the user-facing component name, so the chrome lineage is the right
  thing to surface in the filename.
- `apps/app/src/features/alerts/components/PulseAlertRow.tsx`: docstring
  reworded to `AlertCard (née PulseAlertCard)` + path corrected from
  `/rules/pulse` (old route) to `/alerts` (current route).
- `apps/app/src/features/alerts/AlertDetailDrawer.tsx`: round-68 impact-
  pill gate comment updated.
- `apps/app/src/features/alerts/AlertsListPage.tsx`: round-61 i90PZ
  layout comment + round-77 wiring comment both updated.
- `apps/app/src/features/dashboard/changes-since-last-section.tsx`:
  round-42 bg-unification comment updated.

Three intentional `PulseAlertCard` mentions remain in code comments —
all in "renamed-from" historical context (e.g. `AlertCard (née
PulseAlertCard)`). These are correct: future engineers grepping for the
old name should find these breadcrumbs.

## Verification

- `pnpm -F @duedatehq/app exec tsc --noEmit` → exit 0
- `grep -rn 'PulseAlertCard' apps/app/src` → 3 results, all intentional
  historical breadcrumbs (see above)
- `grep -c '#: src/features/pulse/' apps/app/src/i18n/locales/*/messages.po`
  → 0, 0 (was 361, 361)

## What's still deferred

- Production build (`vp build`) not exercised — only `tsc` ran.
- Vitest not exercised — pre-existing `babel-plugin-macros` setup
  issue blocks `vitest` even on clean `main`. Not regression from this
  pass.
- `zh-CN` has 375 missing translations. Belongs to a translator pass,
  not this commit.
- Local backup tag `pre-rebase-rounds-70-85` and branch
  `backup-rounds-70-85` still in place. Safe to delete once the merged
  state is confirmed shipping-ready.
