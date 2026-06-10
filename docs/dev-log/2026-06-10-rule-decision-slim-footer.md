# Slim Decision footer + "Before you accept" card (irBJ8) — final piece

**Date:** 2026-06-10

irBJ8's Decision footer is slim (summary · Reject/Accept · audit signed-line). The
implementation carried the "Before you accept" aids (year-over-year + the AI
concrete-draft panel) inside the footer, making it tall for source-defined rules.

## The split
- New **`RuleBeforeAcceptCard`** (scroll card): year-over-year diff + AI-draft
  panel. Self-contained — its own `draftConcreteRule` mutation invalidates
  `listConcreteDrafts`; the route re-reads it → the footer's `concreteDraft` prop
  updates → Accept unlocks. So the footer's accept gating needed NO change.
- `CandidateReviewForm` footer slimmed: removed the aids + the dead
  draftMutation/requestDraft; added the audit signed-line. Now: summary · Reject ·
  Accept · "Decisions are recorded in the audit ledger." (irBJ8's "signed by
  {name}" dropped — no signer until the decision is recorded).
- Rendered `RuleBeforeAcceptCard` in `RuleDetailCompact` (both the modal scroll
  and the batch stack).

## Regression fixes surfaced by the rules tests
- Restored **`VerificationSection`** (Reviewed by / at) in the new card modal — it
  was lost in the earlier Sheet→Dialog conversion; reviewed-rule reviewer metadata
  is back.
- Added a **`hideReviewAids`** prop: bulk surfaces (coverage walkthrough / list
  modal) suppress the per-rule Practice-review note composer (their own shared
  note owns that), so the bulk note textarea isn't shadowed. The AI-draft panel
  stays (it's the accept gate).
- Added the `listRuleNotes`/`addRuleNote` mocks the team-notes card needs to the
  rules.library + coverage-tab test mocks.

tsgo clean; rules + coverage + library suites green (33 + 23). Verified live: slim
footer, aids in scroll, Accept correctly gated.
