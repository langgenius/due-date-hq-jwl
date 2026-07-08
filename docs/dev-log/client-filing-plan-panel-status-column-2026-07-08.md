# Client filing plan panel-open status column

**Date:** 2026-07-08 · clients detail

The client detail filing plan now hides its row Status column while the
right-side deadline panel is open. Official due and owner stay visible in the
master table.

## What changed

- `ClientDetailWorkspace` keeps `compact={false}` for the filing plan but passes
  `hideStatus={panelOpen}`.
- `ClientWorkPlanPanel` and `DeadlineRow` share a matching grid layout for the
  panel-open table: `Deadline`, `Internal due`, `Official due`, `Owner`, and the
  trailing chevron slot.
- `DeadlineRow` suppresses the status pill and visible form name when `hideStatus`
  is true. The status and form title remain available in the focused deadline
  panel.
- The panel-open grid narrows the date/owner tracks, and the Deadline cell clips
  its own overflow; the jurisdiction chip also shrinks from 104px to 72px in
  this mode so it cannot paint into `Internal due`.
- The hidden form title remains as an `sr-only` row label so `aria-labelledby`
  stays valid even when the visible Deadline cell only shows jurisdiction.

## Why

When the detail panel is open, showing status in the filing-plan row duplicates
the same fact from the panel. The first pass removed Status but left the remaining
fixed tracks too wide; the Deadline track could shrink below its fixed 104px
jurisdiction chip, so Deadline content overflowed into Internal due. Keeping
official due and owner preserves the useful master-list scan context, while the
new narrowed tracks and overflow clipping keep each column visually independent.
Panel-open rows are now a navigator: jurisdiction in the master list, full form
identity in the focused panel.

## Verification

- `pnpm --filter @duedatehq/app check` was attempted, but the app package does
  not define a `check` script.
- `pnpm check` was attempted from the repo root, but it stopped before analysis on
  an unrelated generated HTML formatting error in
  `docs/integrations/cpa-tools/deploy/tools/proconnect.html`.
- `pnpm exec vp check apps/app/src/features/clients/ClientDetailWorkspace.tsx apps/app/src/features/clients/ClientWorkPlanPanel.tsx apps/app/src/features/obligations/queue/components/DeadlineRow.tsx docs/dev-log/client-filing-plan-panel-status-column-2026-07-08.md`
  passed for the changed files.
- Browser verification was not run because browser automation for
  `http://localhost:5173` was blocked by the current browser-use policy.
