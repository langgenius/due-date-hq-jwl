# /deadlines detail — flat calm document on the warm surface

Date: 2026-06-08

Yuqi resolved the surface conflict: the alerts detail was deliberately flat /
white / no-frames ("one calm document"); rather than card-ify alerts to match the
deadline, REWORK THE DEADLINE to flat too — but on the warm gray secondary
surface. So both detail panes are now the same flat-document language; the
deadline's is warm, the alert's is white.

## Changes
- **panels.tsx**: `DeadlineTile` de-framed (dropped border + rounded + white bg);
  `PrimaryDeadlineStrip` is now a flat 3-up divided strip (`divide-x
  divide-divider-subtle`) modeled on the alerts EXTRACTED FACTS grid — the three
  key dates read as a flat divided row, not boxed cards.
- **ObligationQueueDetailDrawer.tsx**: all eight content-section card frames
  de-framed (checklist, refund, source docs, tax-year details, apply-extension,
  authority details) — frameless blocks on the warm surface. The two data tables
  (extension rule facts, extension history) kept only a subtle header rule (alerts
  AFFECTED-CLIENTS treatment), heavy outer card dropped. Inner `px-3` insets
  dropped so content aligns to the body `px-12`.
- Kept: warm pane (`bg-background-canvas-warm`), warm sticky chrome, the colored
  top status banner, the sticky footer, and all data/tabs/behavior.

## Verify
tsgo clean; `/deadlines` detail Summary + Extension tabs at 1512×861 — flat
document, frameless sections, the dates as a divided strip, no boxy cards, no new
console errors.
