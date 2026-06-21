# Marketing v2 — left scroll-spy rail

**Date:** 2026-06-21 · `docs/marketing/design-explorations/production-v2.html`. Per a Canopy reference: a sticky left sidebar that tells the reader which section they're in.

## What shipped

- **`.spyrail`** — a fixed, vertically-centered rail in the left margin listing the six main sections: How it works · The document · Sources · See it work · Why trust it · FAQ. Each item is a label + a small ring **dot**; the active section fills the dot navy + darkens the label (a touch of scale on the dot). Anchor links scroll to each section.
- **Scroll-spy** via its own `IntersectionObserver` (`rootMargin: -45% 0px -50% 0px`, same active-band logic as the nav glider) toggling `is-active` as sections cross the viewport middle.
- **Shown on wide screens only** (`@media (min-width: 1500px)`) — below that there isn't room in the left margin without overlapping the 1240 content column, so it's hidden (the top nav still carries section links there).

Verified at 1600px: rail renders at left ≈ 48px (clear of the content at ≈ 180px), and the active item correctly tracks the centered section (`active = Sources`).

## Note

Reuses the established scroll-spy pattern, so it stays in sync with the nav. The one remaining feedback item after this is the **how-it-works flow redesign** (#7 "bolder / hard to read" + #8 "what is the loop graphic") — deferred for a dedicated pass, likely adopting the workflow-diagram card+label+connector style.
