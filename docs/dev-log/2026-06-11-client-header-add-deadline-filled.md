# Client detail — header "Add deadline" → filled primary

**Date:** 2026-06-11

Feedback (Yuqi): "the buttons in the header are link not with the background and
border." The header's primary CTA fell back to `CreateObligationDialog`'s default
trigger (white bg + ~0.08α divider border) when the rail panel was closed, so it
read as a bare link. Now it always passes an explicit trigger: a filled
`variant="default"` "Add deadline" button (icon-only when the panel is open) —
matching the canonical header pattern on /rules ("+ Add Federal rule" filled
primary). The `⋯` overflow keeps its outline border. tsgo clean.
