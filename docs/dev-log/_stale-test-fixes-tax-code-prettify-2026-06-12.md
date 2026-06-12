# Stale test fixes + tax-code prettifier "OR" bug

**Date:** 2026-06-12
**Surface:** `packages/core/src/tax-codes`, `migration/Step3Normalize.test`,
`alerts/AlertsListPage.test`

Two tests failed on a clean main checkout. Both were stale expectations
left behind by intentional product changes — but investigating the first
one surfaced a real rendering bug in the shared tax-code prettifier,
fixed here too.

## 1. Step3Normalize — raw enum vs TaxCodeBadge

The test asserted the raw `tx_state_franchise_or_entity_tax` enum appears
in body text. The matrix cell now renders tax types through the shared
`<TaxCodeBadge>` primitive (human label inline, raw code only in the
tooltip), per the 2026-05-19 "no raw snake_case on any surface" decision —
Step4Preview's test already asserted the *absence* of the raw code. The
component is correct; the assertion now expects the human label and the
absence of the raw enum, matching Step4Preview.

## 2. prettifyCode capitalized "or" like a state code

`tx_state_franchise_or_entity_tax` is a *generated* family code
(`{state}_state_franchise_or_entity_tax` from `default-matrix`), so it
isn't in the static `TAX_CODES` label table and falls through to
`prettifyCode`. That fallback uppercased every 2-letter segment (meant
for jurisdiction prefixes like `tx`/`ca`), rendering
"TX State Franchise **OR** Entity Tax". Added a connective-word set
(`or/of/and/to/in/on/for/per`) that stays lowercase in non-first
positions — first-segment prefixes (including `or_` = Oregon) still
uppercase. Now renders "TX State Franchise or Entity Tax".

## 3. AlertsListPage — date line year

The batch-seeding test expected "Mar 15, 2026", but the row's date line
goes through `formatDatePretty` (dateShort), which drops the year for
current-year dates per `docs/Design/date-formatting-canon.md` — the
display-preferences work (59bac8b2) routed the row through the canon.
The rendering is correct; the assertion now matches "Mar 15", which is
present whether or not the year is appended, so it won't go stale when
the fixture year stops being current.

## Verification

`npx vp test` green across apps/app (527), packages/core (299),
apps/server (546).
