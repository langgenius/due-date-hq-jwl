# 2026-05-21 · Obligations row click regression

## Background

The inline obligations panel still existed, but clicking table data no
longer opened it after the row accessibility pass. The row had been
given `role="button"` and `tabIndex={0}` so keyboard users could focus
it, but the row click guard reused the app-level
`isInteractiveEventTarget()` helper.

That helper intentionally treats any ancestor with `[role="button"]`
as interactive. Once the row itself had `role="button"`, every normal
cell click looked like a nested-control click, so the handler only
focused `row=...` and returned before writing `drawer=obligation`.

## What Changed

- `apps/app/src/routes/obligations.tsx`
  - Made `isObligationQueueRowControlClick()` row-aware.
  - It now checks the nearest row-control element and ignores the
    current `<TableRow role="button">` itself.
  - Row clicks still open `drawer=obligation&id=...`; actual nested
    controls such as checkbox, status menu, evidence button, links, and
    SVG icons inside buttons are still suppressed.
- `apps/app/src/routes/obligations.test.ts`
  - Added regression coverage for normal row data clicks versus nested
    button clicks.

The side-panel hybrid behavior is unchanged: xl+ still renders the
detail as the inline `<aside>`, smaller viewports still use the modal
Sheet.

## Verification

- `pnpm --filter @duedatehq/app test -- obligations.test.ts` -> 26
  passed.
- Manual Playwright check against the running dev stack:
  `http://localhost:5173/obligations` -> click `Arbor & Vale LLC` ->
  URL became
  `/obligations?row=...&drawer=obligation&id=...&tab=readiness`, and
  the xl viewport rendered the inline `<aside>` detail panel.

## Docs Alignment

No stable architecture doc change needed.
`docs/dev-file/05-Frontend-Architecture.md` already describes
URL-backed obligation drawer state, and the inline detail behavior
remains consistent with the side-panel hybrid log.
