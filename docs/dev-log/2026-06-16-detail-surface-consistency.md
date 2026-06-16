# Detail surface consistency pass: lighter gray, white hero, carded sections (Yuqi)

_2026-06-16_

Follow-up to the NrQaI surface unification. Yuqi feedback on /deadlines/:ref:

- **Body too dark** ("not very light"): `bg-background-subtle` (gray-100) →
  `bg-background-section` (gray-50) for the body/section area — both panels
  (deadline + alert) for cohesion. Small chips/pills/icon-tiles stay on subtle.
- **White hero** ("what is this" — a gray band behind the "Tax year … · Calendar
  period" eyebrow + close): the hero header was already white; the perceived band
  was the (now-lighter) body wash + the nested tinted Stage block. Resolved by the
  lighter body + flattening the Stage block (below). Hero/eyebrow/fact-cards are
  fully white now; gray begins only at the body.
- **Status workspace = one white card WITH a header** ("this is in section, why
  are the others not" / "put the progress bar and the Stage card into a section"):
  the stepper + "Stage N of 6" active-stage now sit in ONE white card titled
  **"Workflow"**. The `ActiveStageDetailCard` gained a `flat` prop (passed in
  panel/page) so its inner block drops its own tint/border — no card-in-card.
- **Deleted the bottom hint bullets** ("Confirm engagement letter…" / "Assign a
  preparer…") — they were the two `manual`-flavor tasks in the pending stage
  config; removed.
- **Consistency / "header for each section" / "fix the rest"**: "What's left to
  do" was extracted out of the Workflow card into its OWN `DetailSectionCard`
  (title + N-of-M count), matching Recent activity / Extension. Every body section
  (Workflow · What's left to do · Recent activity · Extension · Reference dates ·
  Materials · Audit) is now a white bordered card with a header on the gray body.

## Execution + review

Sub-agent applied items 1-5 to ObligationQueueDetailDrawer.tsx + panels.tsx
against the spec; I reviewed (changed files are mine, not parallel WIP),
verified live (deadline page mode: lighter gray, white hero, Workflow + What's-
left cards with headers, bullets gone), and added the alert-body lightening for
cohesion. tsgo + vp clean on all 3 files.
