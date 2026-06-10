# Deadline detail — filled stepper circles + de-boxed active headline (2026-06-10)

Yuqi: "work on the deadlines detail page." Two visible divergences from the
canonical Qn4nX active card, fixed in `panels.tsx`:

## Stepper circles — solid filled (the real "#5 反色")

`PathToFilingSummary` stage circles were soft-tinted (accent-hover bg + accent
text). The canonical `StatusJourney` uses SOLID FILLED circles with white glyphs:
- done → `bg-state-accent-solid text-text-inverted`
- active → `bg-state-accent-solid text-text-inverted`
- active + overdue → `bg-state-destructive-solid text-text-inverted`
- upcoming → empty outline ring (unchanged)
- skipped → dashed (unchanged)

This is what "反色" (invert/fill) actually meant — filled chips, not removing the
card.

## Overdue context — headline + sub, not a boxed callout

The "Filing was due … — N days past deadline." banner was a
`rounded-lg border bg-background-default` box — white-on-white inside the white
WorkflowMilestoneCard. Restyled to the canonical active-card treatment: a 15px
semibold headline + a muted sub-line ("Submit the return now, or file an
extension if eligible."), no box chrome.

## Verified

`tsgo --noEmit` clean. Live (`/deadlines/000000000003`): "Not started" solid
blue, "In review" solid red filled circles; overdue line reads as headline + sub
with no nested box.
