# Alerts empty states — pixel alignment to Pencil O3s4ie / rR9X1

Date: 2026-06-07

Verified the two recently-implemented Alerts empty surfaces against the Pencil
canvas and closed the remaining pixel gaps. No structural list/header rewrite —
the active list, filter row, day-grouped `PulseAlertRow`, and detail drawer were
already shipped and are deliberate (PageHeader-family unification, table-chrome
rows); the canvas list frame (`F5lMBp`) is an alternate "option 1" with bulk-
select strip + priority-reason insets that was not adopted. Scope held to the
empty states the task flagged for verification.

## What changed

### Shared `EmptyState` prominent variant (`apps/app/src/components/patterns/empty-state.tsx`)

Two new optional, backward-compatible props on the `prominent` variant:

- `iconTone?: 'accent' | 'neutral'` — `accent` (default) keeps the blue 88px
  `#eff4ff` circle + `#155aef` icon (Pencil O3s4ie active empty). `neutral`
  renders the quieter 72px `#f9fafb` (`bg-background-section`) circle + 32px
  `text-text-muted` icon and bumps the title to 22px (Pencil rR9X1 history
  empty).
- `fill?: boolean` — stretches the card to `min-h-[600px] flex-1` and
  vertically centers the column, so the card owns the whole content area like
  the canvas frames (fixed 600px there).

Also widened the prominent description cap `max-w-[520px]` → `max-w-[560px]` to
match the canvas sub-copy width. Existing call-sites (preview storybook) keep
the prior look via the defaults.

### `/alerts` + `/alerts/history` empty states (`apps/app/src/features/alerts/AlertsListPage.tsx`)

- Active empty: added `fill` so the card fills the list area; sub-copy now reads
  "Last check: …" matching the canvas punctuation.
- History empty: `iconTone="neutral"` + `fill`; CTA promoted from
  `variant="outline"` to the canonical filled primary `<Button>` ("Go to
  alerts", dark `#101828` per canvas); copy aligned to "Last 60 days of activity
  will appear automatically."
- `AlertsHistoryRecordLegend` pills re-skinned to the canvas: gray
  `bg-background-section` (no border), `px-3 py-1.5`, `size-3` `text-secondary`
  icon; heading dropped `font-mono` (canvas uses Geist).

### Test (`apps/app/src/features/alerts/AlertsListPage.test.tsx`)

Added assertions that the history empty surface renders the "Go to alerts"
return path and the "What gets recorded" legend.

## Verification

- `npx tsgo --noEmit -p apps/app` → 0 errors
- `pnpm --dir apps/app test -- src/features/alerts --run` → 69 passed, 1 skipped
- `npx vp check` → 0 errors (44 pre-existing unrelated warnings)
