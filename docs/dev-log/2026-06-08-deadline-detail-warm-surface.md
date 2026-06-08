# /deadlines detail — warm secondary surface + white content cards

Date: 2026-06-08

Yuqi (on the deadline detail): "should be a light gray background, on secondary
page, random use of lines and borders, messy information floating around." This
is the surface model — secondary/detail surfaces = warm light gray; content
grouped into white cards; borders restrained.

## Changes (ObligationQueueDetailDrawer.tsx)
- Pane surface `bg-background-default` (white) → `bg-background-canvas-warm`
  (warm gray) — both the master-detail panel-mode `<aside>` and the Sheet drawer.
- Sticky chrome (date strip, tabs container, TabsList, footer) → warm gray so
  they stay opaque + blend; footer border softened `border-t-2 regular` →
  `border-t subtle`; dropped the redundant date-strip `border-b`.
- Content sections → WHITE cards on the warm surface: added `bg-background-default`
  to all eight bordered section cards (checklist, fact grids, tables, extension,
  evidence, details). Info now reads as contained cards instead of floating with
  ad-hoc dividers.
- Metric tiles were already white (`bg-background-default`) — they now pop
  against the warm pane.

## Verify
tsgo clean; `/deadlines` detail at 1512×861 — warm gray pane, white metric +
checklist cards, contained info, no random section dividers.
