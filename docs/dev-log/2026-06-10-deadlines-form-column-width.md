# 2026-06-10 — /deadlines Form column width

## Change

Widened the `/deadlines` Form column so long `TaxCodeBadge` labels such as
`Form 1099-NEC` fit inside the table cell instead of overflowing the parent.

- Added `OBLIGATION_QUEUE_FORM_COL_WIDTH`.
- Changed the Form column from `104px` to `168px` for both header and body cells.

## Docs Alignment

No `DESIGN.md` update is needed. This is a scoped table-column sizing fix inside
the existing deadlines list layout.

## Validation

- `pnpm check` passed with 0 errors. The existing 13 unrelated warnings remain
  in rules/deadline detail files.
- Local Playwright check on `http://localhost:5173/deadlines`: `Form 1099-NEC`
  cell width is `168px`, badge width is `108.25px`, and the badge fits inside
  the parent cell with `47.75px` right-side room and no document-level
  horizontal overflow.
