# 2026-06-11 — Affected-clients table: 8-row collapse

Closes the last open recommendation from the state-completeness audit
(Yuqi approved). A high-match alert (a CA 1040 shift can hit half the
client book) rendered every affected-client row — 50 clients ≈ a 3000px
card burying the ready-to-apply panel, Source & confidence, and Activity.

Per the collapsible-density rule:

- **> 10 rows** → first 8 render + a quiet full-width "Show all N clients"
  footer inside the table frame ("Show fewer" when expanded).
- **≤ 10 rows** → everything renders, no expander (zero change for demo
  data and existing E2E flows — verified live: the demo alert's 1-row
  table is untouched).
- **needs_review rows sort to the top when collapsed** — the fold may only
  hide auto-matched rows, never one that needs human eyes. Below the
  threshold the server order is untouched (specs that assert order are
  unaffected).
- Selection semantics are data-level and unchanged: header select-all,
  "Confirm N", and the selection summary all operate on the FULL set, so
  the collapsed view never lies about totals.
- Collapse state resets when the table is handed a different alert's rows
  (render-time setState keyed on first-row id + length).

New unit coverage (`AffectedClientsTable.test.tsx`): no expander at the
threshold; 8-row collapse + expand toggle; needs_review never hidden.
Suite: 90 passed. tsgo clean.
