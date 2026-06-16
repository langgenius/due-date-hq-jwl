# Deadline footer: "Mark as filed" → accent primary (Yuqi)

_2026-06-16_

Yuqi: "the bottom mark as filed should be accent" + "same visual language between
alerts and deadlines."

## Change
`ObligationQueueDetailDrawer` footer action cluster. "Mark as filed" was
`variant="outline"` (a deliberate "one blue per view" rule — the active-stage
card carried the only blue). Now `variant="accent"`: the footer gains a clear
primary CTA + outline secondaries (Assign · Snooze), the same dominant-primary
hierarchy the alert footer uses (AlertDetailDrawer's accent Apply / Mark-reviewed
beside outline/ghost secondaries).

## Why `accent` (soft tint), not `default` (solid blue)
The alert footer primary is a solid blue (`default`). Copying that literally
would put TWO solid blues on the deadline (the workflow card's contextual stage
action is already solid blue). `accent` (blue tint + blue text + blue border)
makes "Mark as filed" unmistakably the footer's accent CTA while letting the
workflow card keep the single SOLID blue — honouring both the request and the
older one-blue rule. If a stronger, solid-blue footer CTA is wanted, switch
`accent → default` (and consider demoting the stage action so it doesn't double).

## Verify
Computed style confirmed live on localhost:5173 (bg #eff4ff, text #155aef). tsgo
+ vp pending in the commit step.

## Next (the bigger cohesion ask)
"Same visual language" — the remaining structural divergence is tabs (deadline)
vs scroll-spy (alert). The lossless tabs→scroll-spy conversion plan is ready
(wtynq1xzc); that's the next focused pass.
