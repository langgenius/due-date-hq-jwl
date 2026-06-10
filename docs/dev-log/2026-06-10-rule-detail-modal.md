# Rule detail — big centered modal (Pencil `N2X10V` / `O0pyRO`)

**Date:** 2026-06-10
**Source:** Yuqi feedback + screenshot of the `N2X10V` summary-first detail.

## What changed

The rule detail had been turned into a right-side **Sheet** rendering the old
`RuleDetailInline` section layout. Per feedback, the reviewer wants a **big
centered modal** with the **summary-first card-stack**, that **closes on
outside-click**.

`RuleDetailPanel` (`rules.library.tsx`): **Sheet → `Dialog`**.
- 980px-wide centered modal (`max-h-[90vh]`, scrolls), `bg-subtle` so the white
  cards read as a stack.
- Closes on overlay (outside) click **and** Esc — the Dialog fires
  `onOpenChange(false)` for both.
- Body renders the summary-first stack: a new **`RuleDetailHeroCard`** ("Rule
  under review" — status · title · identity kicker · 2-line summary · audit-ledger
  signature; honest, no fabricated AI-confidence %) + the effective-date banner +
  `RuleDetailCompact` (Applicability · Due date · Evidence · Activity · Decision,
  each an independently-disclosing bar-header card; Practice-review note lives in
  the Decision card under "Before you accept").

`RuleDetailCompact` (`rule-detail-drawer.tsx`): added a `confirmImpact` prop,
threaded to its `CandidateReviewSection`, so the modal's Accept keeps the
impact-confirm dialog (parity with the old Sheet footer).

## Verified live
Row-click → 980px centered modal, hero + Applicability/Due date/Evidence/Activity
cards + Accept/Reject; **overlay-click closes it**. `tsgo` clean.

## Impact card — added (all 8 `N2X10V` cards now present)
`RuleImpactCard` inserted between Evidence and Activity (review-context rules
only). Summary = the **real** `previewRuleImpact.estimatedObligationCount`
("Activates this rule → ~N new obligations…", or an honest "No client obligations
yet" when the count is 0); read-more = the per-entity distribution. The canvas's
"12 clients" + "+8% AZ coverage" are **dropped** — the API doesn't return an
affected-client count or a coverage-lift %, so rendering them would be fiction.

Verified live: the modal now shows, in order — Rule under review · Applicability ·
Due date · Evidence · **Impact** · Activity · Practice review · Decision.
