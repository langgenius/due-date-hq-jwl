# Rule Library — calmer detail popup, explain the AI draft, drop backlog panel

Date: 2026-06-15 · Yuqi · three follow-ups after the full-flow critique.

## 1. Fewer borders/dividers on the detail popup

"Avoid too much use of borders or dividers." Leaned the two-pane modal on
whitespace + headings + fill contrast instead of rules:

- **Left fact column** dropped the `divide-y` + top `border-t` that drew a
  hairline above and between all four fact sections. The section headings
  (Applicability / Due date logic / Evidence / Verification) + `gap-7` spacing
  delineate them (Law of Proximity intact from the earlier critique fix).
- **Due-date highlighted block** dropped `border border-divider-subtle` — the
  `bg-background-section` fill already lifts it; border + fill was doubling the
  same boundary.
- **Two panes** are now separated by the right rail's `bg-background-section`
  fill alone, not a `border-l`.
- **Kept** (deliberately): the header rule, one Activity-footer hairline, and
  the gate box / textarea (functional containers — boxes are for inputs/tables).

## 2. Explain what the AI concrete draft is

`AiDraftReviewPanel` pre-generation state previously just said "AI concrete
draft is not ready." Now it explains the concept the first time a reviewer
meets it:

> This rule's due date is set by its official source, so it has no concrete
> logic yet. Generating a draft reads that source and proposes the exact due
> date — review the proposal and its confidence, then accept to start creating
> client deadlines from it.

(Background: a `source_defined_calendar` rule has no machine-readable due-date
formula — the agency "defines" it. The concrete draft is an AI proposal of that
due-date logic, read from the official source text, carrying a humanized
`dueDateLogic` + a `confidence` score + the `sourceExcerpt` + `reasoning`.
Accepting applies that logic so the rule can generate client deadlines, which is
why Accept is gated on a ready draft.) The panel branches on whether a draft can
be generated (source present → explanation + Generate) vs the no-source blocker
(surface the error).

## 3. Remove the Backlog composition panel

Dropped the overview's "Backlog composition" (By severity / By reason) panel.
"Where to start" is now full-width. No information lost — the high-severity
count still lives in the StatBand. Removed the now-orphaned `reviewReasonCounts`

- `listReviewTasks` query + the severity-mix object (replaced by a direct
  high-severity count for the StatBand stat).

## Verification

`tsc` clean; lint 0 errors. Verified live: overview backlog gone + list
full-width; detail popup reads with only the header + footer hairline (no
inter-section lines, no pane border, no due-date box border); AI-draft panel
shows the explanation + Generate draft.
