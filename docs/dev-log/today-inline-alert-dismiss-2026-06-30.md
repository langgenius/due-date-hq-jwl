# /today — inline alert dismiss (P2 act-inline)

**Date:** 2026-06-30 · capability-gap P2

The /today "Alerts" cards were review-only — the whole card was a single
<button> opening the drawer, so triaging meant open-drawer → scroll → dismiss →
close, per card. Added an inline dismiss:

- Converted the card from <button> to a clickable <div role="button"> (Enter/Space
  still open) so it can host a nested control without invalid button-in-button
  nesting. The corner affordance is now a hover/focus-revealed ✕ when onDismiss
  is wired (the open-hint ↗ shows otherwise).
- needs-attention-section wires pulse.dismiss + reuses useAlertsInvalidation, with
  an Undo toast that re-activates (reversible, same as the alerts list). Drawer
  stays the full-review path; dismiss is the "glanced, not relevant" shortcut.

Verified: each card shows a Dismiss button; clicking → "Alert dismissed · Undo"
toast → card drops; Undo re-activates.
