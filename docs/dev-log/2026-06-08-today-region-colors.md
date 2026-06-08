# /today — region colors for focal hierarchy (Yuqi)

Date: 2026-06-08

Yuqi: "too much use of primary text color. hard to know which to actually look
at. or the alert card needs to be in a different colour to the action table."
Plus: daily brief light-blue background + smaller title.

The brief, alert cards, and Actions table were all white surfaces with dark text
— three identical-looking regions competing. Gave each region its own surface
color so the eye groups them and lands on the work:

- **Daily Brief**: `bg-background-subtle` (gray) → **light blue**
  (`bg-state-accent-hover` #eff4ff) with `border-state-accent-border`. It reads
  as the AI summary banner and now carries hue. Title `18 → 16` (`text-base`).
  Citation chips flipped to white fill + accent text/border so they still show on
  the blue.
- **Alert cards**: white → **gray** (`bg-background-section` #f9fafb, the source
  VxRyF fill). Avatar rings follow the card (`ring-background-section`); hover
  steps to `bg-background-subtle`.
- **Actions table**: stays **white** — the brightest surface, so "your work this
  week" is the clear focal point.

Net three-tier palette on the tinted page: blue brief / gray alerts / white
table. The differentiation does the hierarchy work that uniform dark text
couldn't. Recorded in [[project_today_design_system]].

## Verify

- tsgo 0; `vp check` 0 errors; verified in preview @1512 — three distinct region
  colors, white table reads as focus.
