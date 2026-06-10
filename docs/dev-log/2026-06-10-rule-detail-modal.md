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

## Card chrome → irBJ8 (right-slots, chips, labels)

Refined `RuleDetailCompact`'s cards to the `irBJ8` spec:
- **Applicability**: right-slot "Verify before Accept"; summary = 3 labeled
  `FactChip`s (ENTITY · FILES · EFFECTIVE) instead of an inline line;
  read-more "Show all fields".
- **Due date logic**: title (was "Due date"); right-slot = the raw mono kind
  (`source_defined_calendar` / `fixed_date`); summary wrapped in a highlighted
  `bg-subtle` block; read-more "View extension rules".
- **Evidence**: read-more "View N more source(s)".
- **Activity**: read-more "Show all events".

Verified live. tsgo clean. Still open vs irBJ8: a concrete "Due {date}" block for
fixed_date rules, the evidence code·name·desc row chrome, a SEPARATE Practice-
review note card, the sticky Decision footer, and the affected-clients + team-
notes data (backend).

## Sticky Decision footer (irBJ8 card 6)

`RuleDetailCompact` gains `hideDecision`; the modal (`RuleDetailPanel`) now renders
the cards in the scroll area and pins `CandidateReviewSection` as a **sticky
footer** (border-top + soft top-shadow), so the commit zone (Accept/Reject) stays
visible while the reference cards scroll. Reviewable rules only.

Verified live: Accept stays pinned at the modal bottom when the card stack is
scrolled. tsgo clean.

Remaining vs irBJ8: the footer still shows the *full* decision (Practice-review
heading + "Before you accept" aids + buttons) rather than the slim "summary +
Skip/Reject/Accept + signed line"; splitting the Practice-review note into its own
scroll card + a slim footer needs the CandidateReviewSection refactor + the
team-notes backend.
