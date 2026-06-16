# Deadline detail page → white surface + flat workflow card (Yuqi)

_2026-06-16_

Yuqi: "polish the deadline details panel, good hierarchy — should it be white?"

## Yes — white.

The deadline detail PAGE body was a warm-gray wash (`bg-background-subtle`); the
alert detail pane is white. The gray existed to pop white boxed cards, but #11
flattened the sections into the document, so that rationale was spent. Switched
the page body to `bg-background-default` (white), unifying with the alert detail.
Hero + footer were already white, so the whole pane is now one white surface.

## Hierarchy fix that the white body forced

On white, the `WorkflowMilestoneCard` (stepper + active stage + "what's left" —
the deadline analogue of the alert's "The change") receded: a white card with a
hairline border on a white body. Since the alert's "The change" is now a FLAT
section, flattened this too — dropped the `rounded-xl border bg-default px-5 py-4`
box; the stepper + what's-left flow as flat content and the (already-tinted)
active-stage block is the one focal workspace. This both matches the alert and
restores hierarchy (the action workspace is the only tinted element on white).

## Verify

- White body verified live (clean screenshot before the preview drifted): the
  pane reads calmer + cohesive with the alert detail; bordered elements (fact
  cards, checklist items) still delineate via their hairlines.
- Workflow-card flatten: tsgo + vp clean; could NOT re-screenshot (the shared
  preview tab was driven to /clients by the parallel session). Low-risk — it
  mirrors the alert's flat "The change" + the panel mode's existing flat
  (`contents`) treatment. Will eyeball the page-mode result when the preview frees.

## Scope note

Page mode (`isPageMode`) only. The /deadlines in-page panel + the client slide-in
modes have their own surface treatments; they'll align as the rail/panel
consolidation lands.
