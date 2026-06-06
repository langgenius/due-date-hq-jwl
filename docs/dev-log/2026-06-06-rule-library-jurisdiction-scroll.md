# Rule Library jurisdiction scroll fix

**Date:** 2026-06-06
**Surface:** `/rules/library?jurisdiction=...`

## Change

Fixed the selected-jurisdiction Rule Library pane so Federal/state rule tables can
scroll when their rows exceed the viewport.

- Added `min-h-0` to the right master-detail pane in
  `apps/app/src/routes/rules.library.tsx`, preserving the locked desktop height
  chain from the route shell down to the table.
- Made `JurisdictionRuleTable` own the remaining-height scroll region with
  `min-h-0 flex-1 overflow-y-auto` instead of shrinking and clipping rows inside
  its bordered frame.
- Extended the existing route test harness to mock the `jurisdiction` query
  param and assert the selected-jurisdiction scroll-frame contract.

## Docs Alignment

No `DESIGN.md` update is needed. This restores the existing workbench table
pattern: at `xl+`, the page chrome stays fixed while the dense table owns
vertical overflow.

## Validation

- Browser: `http://localhost:5173/rules/library?jurisdiction=FED`
  - `1494x900` viewport: table scrollTop moved `0 -> 458`; page `main` stayed
    at `0`; Federal header remained pinned.
  - `1494x1354` viewport: table frame is the scroll owner and page `main` stays
    fixed; Federal data renders without clipping at the screenshot size.
- `pnpm --filter @duedatehq/app test -- rules.library.test.tsx`

## Follow-up: review-first selected table order

**Date:** 2026-06-06

When a selected jurisdiction has both active rules and rules needing review, the
flat jurisdiction table now sorts `candidate` / `pending_review` rows above
active rows. This keeps the work item visible at the top instead of burying it
after active templates.

No `DESIGN.md` update is needed. This is list priority inside the existing table
surface, not a new visual contract.

Validation:

- Browser: `http://localhost:5173/rules/library?jurisdiction=FED` rendered
  `Disaster tax relief candidate watch` at row index `0`, before the first
  active rule at index `1`.
- `pnpm --filter @duedatehq/app test -- rules.library.test.tsx`
