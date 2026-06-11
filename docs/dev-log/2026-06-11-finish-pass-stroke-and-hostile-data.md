# 2026-06-11 — Finish-quality pass: icon stroke canon + hostile-data audit

Yuqi asked what ELSE produces high-finish UI beyond de-duplication /
type discipline / alignment, and green-lit the two highest-ROI levers:
a rendering-crispness sweep and a hostile-data pass on /alerts.

## Icon stroke canon

The same lucide glyph rendered at strokeWidth 1.5 in the /alerts rows +
rail but 2 (default) in the drawer — adjacent icons with mismatched stroke
weight. Canon (now in docs/Design/icon-sizing.md): **lucide default 2,
never pass strokeWidth**; hand-drawn inline svgs (the ACTION elbow) keep
their own stroke as part of the drawing. Swept the 1.5 overrides out of
PulseAlertRow + AlertListRail. Live-verified: every `svg.lucide` on the
page reports stroke-width "2" — one value.

## Hostile-data audit (250-char titles, 100-char source names)

Injected hostile strings into: list-row title + source, rail-item title +
source, breadcrumb leaf, drawer hero title, header meta source link, fact
grid Authority value. Results:

- PASS: list-row title clamps at 2; rail title clamps at 2; rail source
  truncates; breadcrumb leaf holds its 360px cap; fact value clamps at 2;
  header meta truncates; zero page-level or panel-level x-overflow.
- PASS (by design): AffectedClientsTable client names wrap
  (`whitespace-normal` in a table cell), they don't break layout.
- **FAIL → fixed:** the drawer hero title had NO clamp in the expanded
  state — a 250-char title ran 4+ lines at 22px and pushed the extracted
  facts below the fold. Now `line-clamp-3` expanded (1 collapsed), full
  text on the `title` attr. Re-verified: hostile title renders exactly 3
  lines.

Note: tsgo shows an unrelated error in ObligationQueueDetailDrawer.tsx —
that's the parallel session's WIP file, not touched here.
