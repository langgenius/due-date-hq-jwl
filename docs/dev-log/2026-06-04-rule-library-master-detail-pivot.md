# Rule Library — master–detail pivot (Pencil HR6mK)

**Date:** 2026-06-04
**Surface:** `/rules/library`
**Design ref:** Pencil `HR6mK` (`duedatehq.pen`)

## What changed

Rebuilt the Rule Library from a single jurisdiction-grouped, paginated table
into a **two-pane master–detail**, matching the Pencil design but in the
established Today-page style (design-system tokens, `PageHeader`, the white
`FloatingActionBar` — not the Pencil's raw hex / dark bar).

- **Left States rail** (`features/rules/states-rail.tsx`, new) — searchable
  list: _All jurisdictions_ → pinned **Federal** → states A–Z, each with a rule
  count and a quiet amber "needs review" dot; selected state highlighted. Driven
  by the route's existing `buildGroups()` output, so no new data plumbing.
- **Right per-state pane** — when a jurisdiction is selected:
  - `PageHeader` with a `Rule library` breadcrumb, the state name, and status
    chips ("N Requires review" / "N Active" / "Sources all working").
  - The progress bar, entity-filter chips, and scope tabs all re-scope to the
    selected state's rules.
  - **Flat rule table** (`features/rules/jurisdiction-rule-table.tsx`, new):
    Rule · Form · Entities (compact applicability dots + N/7) · Due date ·
    Status · ⋯. `table-fixed` so long Form/Due text clamps instead of
    overflowing.
- **Scope tabs** gained an **Archive** tab → All · Active · Requires review ·
  Archive · Missing.
- **All jurisdictions** (default / no `?jurisdiction=`) keeps the existing
  grouped + paginated table unchanged — lowest-risk fallback.

State lives in a new `?jurisdiction=` URL param (deep-linkable, validated
against real jurisdictions). The rail is `lg+` only; narrow viewports fall back
to the overview pane.

## Refactor

Lifted the shared, pure helpers (`ENTITY_KEYS`/`ENTITY_LABELS`, `STATUS_TONE`,
`STATUS_LABEL_SHORT`, `statusGroupOf`, `stripJurisdictionPrefix`, tier types)
out of `routes/rules.library.tsx` into `features/rules/rules-console-model.ts`
so the two new feature components reuse them **without importing back from the
route** (which would be circular). Behaviour is identical to the prior in-route
definitions.

## Data caveats (intentional, flagged for follow-up)

- **Due date** shows the rule's humanized due-date _logic_ (rules are templates,
  not single dates), clamped to two lines. A compact due formatter is a good
  follow-up.
- **"Sources all working"** chip currently renders healthy unconditionally —
  wiring real per-jurisdiction source health is a follow-up.

## Verification

`tsc` 0 errors · format clean · `rules-console-model` tests 7/7 · production
build succeeds · live in-app check (real data, 473 rules / 52 jurisdictions):
rail, per-state pivot, all table columns, batch-select → white bulk bar.
