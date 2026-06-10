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

## Remaining vs the 8-card `N2X10V`
One card still missing: the **Impact** card ("→ N estimated new obligations"
between Evidence and Activity). Will add it with the *real* `previewRuleImpact`
count only (dropping the canvas's fabricated "12 clients / +8% coverage").
