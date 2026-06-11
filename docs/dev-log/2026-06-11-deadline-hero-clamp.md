# 2026-06-11 — Deadline hero clamp (closing the open fix)

The last finding from the app-wide hostile-data sweep, applied once the
parallel session's drawer work landed and the file was free:

`ObligationQueueDetailDrawer` hero `<h2>` — expanded state now carries
`line-clamp-3` (was unclamped: a long title ran 4+ lines and pushed the
tab content below the fold on all four tabs). Collapsed state already had
`line-clamp-1`. Full text rides the `title` attr; expanded leading 1.25 →
1.3 (same cramped-two-line finding as the alert hero, batch 4 #3). This
is the exact pattern the alert detail hero uses — the two detail panes
now share one hero-overflow contract.

Verified live: hostile 250-char title renders exactly 3 lines expanded,
title attr present; tsgo clean.
