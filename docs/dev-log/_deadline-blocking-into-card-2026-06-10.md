# Deadline detail — fold "What's left" into the WorkflowMilestoneCard (2026-06-10)

Yuqi (a): "merge blocking into the WorkflowMilestoneCard for the exact CorQi
NextMovePanel match." The "What's left to do" checklist was a separate
`DetailSectionCard` sibling below the workflow card. Moved it INSIDE the
WorkflowMilestoneCard as the final divider-separated section (the Qn4nX `CorQi`
`WdFB4` NextMovePanel slot):

- Rendered as a plain section (small uppercase eyebrow "What's left to do" +
  "N of M complete" + the checklist + "Manage in Materials →"), no nested card
  chrome — the wrapper's `divide-y` paints the top rule.
- Card is now stepper · active stage · next-move/what's-left, all in one card,
  matching the canonical 3-section structure.

`tsgo` clean (drawer). pnpm fmt applied.
