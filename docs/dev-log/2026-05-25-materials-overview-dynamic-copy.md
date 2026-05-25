# 2026-05-25 — Materials overview dynamic copy

## Why

The Materials tab overview on client detail used one static support-text pattern:
"Of N total, N are still owed by the client." When no documents had been received,
that made the copy feel hard-coded instead of reflecting the actual materials state.

## Shipped

- Replaced the waiting-on-client support copy with state-specific text.
- Shows an "all items still waiting" sentence when zero materials have been received.
- Shows a received-vs-outstanding sentence once at least one item has been received.
- Switched the waiting headline to Lingui plural handling so the one-item case reads
  correctly.
