# Flat section headers get a full-width rule + gap-8 rhythm (both detail panes)

_2026-06-16_

Yuqi: "ensure the right panel on the deadline detail and alert detail have good
separation of header — the whole sections are on white background now." Plus:
"match the inter-section gap — deadline uses gap-6, the alert uses gap-8; use the
alert's."

## Header separation (shared primitive → both panes)

With the deadline detail now white (like the alert), the flat sections lost the
gray-wash contrast that used to delineate them; the section header was carrying
the separation with type + whitespace alone, which read weak on all-white.

Added a **full-width bottom hairline** to the `DetailSectionCard` flat-variant
header (`border-b border-divider-regular pb-2`). This is the
clear-sections-not-boxes delineator (header + full-width rule + whitespace, never
a per-section box). `divider-regular` (8%) not `-subtle` (4%) — 4% was invisible
on white; 8% is a clean, restrained underline that actually reads.

Only the alert detail + the deadline detail use `variant="flat"`, so this lands
on **exactly both panes**, identically — the cohesion the request asked for.

## Inter-section gap → gap-8

The deadline detail body (`ObligationQueueDetailDrawer`) spaced its flat sections
`gap-6`; the alert detail spaces its major sections `gap-8`
(`AlertDetailDrawer` L1770). The flat sections are the body's direct children, so
that gap _is_ the inter-section rhythm — bumped `gap-6 → gap-8` to match.

## Verify

Live on the deadline detail page (`/deadlines/000000000001`, page mode, white
body): the rule renders as a clear full-width hairline under "Recent activity"
and "Extension," each cleanly separated from its content; sections sit gap-8
apart. tsgo + vp clean. The alert detail uses the identical shared primitive, so
it gets the same header rule (live re-check pending — alert deep-links sit in the
preview's offline-paused query state).
