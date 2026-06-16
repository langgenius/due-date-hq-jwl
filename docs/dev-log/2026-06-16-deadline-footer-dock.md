# Deadline detail footer — float→dock shadow (alert parity)

_2026-06-16_

The alert decision footer floats with a drop-shadow while there's more body to
scroll, then docks (shadow off, divider off) at the bottom (`decisionDocked`).
The deadline detail footer was always a flat `border-t` bar. Added the same
float→dock behavior for parity (`ObligationQueueDetailDrawer.tsx`):

- `footerDocked` state (init docked); reset to docked on `obligationId` change.
- The body's `onScroll` (was page-mode-only, for hero-collapse) now also runs in
  both modes to compute `atBottom = scrollTop + clientHeight >= scrollHeight - 8`
  → `footerDocked`.
- Footer: `transition-shadow`; when floating, a `0 -10px 28px -16px` drop-shadow
  - the `border-divider-subtle` divider; when docked, no shadow + transparent
    border (the footer merges with the document end) — the exact tokens the alert
    decision bar uses.

## Verify

tsgo + vp clean. Live verification still blocked (the shared preview tab is being
driven elsewhere by the parallel session); this is a faithful copy of the
already-shipped alert `decisionDocked` mechanism, so risk is low.

## Hero fact-cards — deferred, needs a steer

The deadline hero's three date cards (`PrimaryDeadlineStrip variant="cards"`)
render as **three separate rounded-12 bordered boxes**, while the alert detail's
fact grid is **one framed container with hairline-divided cells**. Per the
"clear sections, not boxes" direction (and #11), the cohesive move is to unify
the three into one hairline grid — but `PrimaryDeadlineStrip` is a complex
multi-state component (missed=red / terminal=green / payment-overdue tones, plus
a compact-terminal collapse), so the conversion needs live verification of those
tone states (currently blocked) + a confirmed target treatment. Holding for that.
