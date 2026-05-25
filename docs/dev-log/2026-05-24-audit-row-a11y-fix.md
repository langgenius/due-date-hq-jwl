# 2026-05-24 — Filing-plan row a11y fix (audit)

## Why

Critique P2: the filing-plan row had `role="link"` + `tabIndex={0}`

- `onKeyDown(Enter/Space)` AND contained two real `<button>`s inside
  (checkbox, status pill). Nested-interactive HTML — screen readers
  can't render this sensibly. Browsers will read the row as a link
  then announce the buttons as nested interactives, leaving keyboard
  users with an ambiguous focus order.

`event.stopPropagation()` was already wired on every inner button
(verified status-control.tsx:206,234 + the new checkbox slot from
the /shape commit), so the click-race risk was already mitigated.
The remaining issue was pure a11y.

## What changed

`apps/app/src/features/clients/ClientFactsWorkspace.tsx` — the row in
`FilingPlanYearSection`:

- Dropped `role="link"`, `tabIndex={0}`, `aria-label`, and
  `onKeyDown` from the row wrapper. The row is now a non-
  interactive container with a mouse-only `onClick`.
- Promoted the form-code cell from `<span>` to a real `<button>`.
  This is the keyboard-focusable open-row target — Tab brings the
  user here, Enter / Space opens the drawer. The button stops
  propagation so the row's mouse-click handler doesn't also fire.
- Form code button carries the descriptive `aria-label`
  ("Open 1120-S due May 6") so screen readers announce one
  unambiguous target instead of a link wrapping buttons.

Mouse ergonomics unchanged: clicking anywhere on the row still
opens the drawer (parent div onClick). Keyboard users get a
cleaner Tab order: checkbox → form code button → status pill →
next row's checkbox.

## Verification

- tsc clean
- lint 0/0
- 17/17 tests pass
- Tab order manually traced (mental walk-through) — no more nested
  interactives.
