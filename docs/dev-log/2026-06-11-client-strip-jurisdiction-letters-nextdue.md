# Client detail — jurisdiction letters + Next-due into the strip

**Date:** 2026-06-11 (critique items #1, #5)

- **#1 jurisdiction "missing the letters":** the StatBand JURISDICTIONS chip was a
  `StateBadge` seal alone (unreadable at that size). Now renders the seal **+ the
  2-letter code** (`<StateBadge size="xs"> NY`), so the state is identifiable.
- **#5 next-due:** added a **Next due** stat to the strip (soonest open deadline +
  on-track/overdue read) and **removed the header sub-line** (`description={null}`)
  it duplicated — the Healthy/At-risk title pill carries overall health.
  (`renderClientHeaderSubLine` is now unused dead code — safe to prune later.)

#3 (fixed form-code column) deferred — needs a live preview to tune the width.
tsgo clean; not visually verified (the 5173 dev server is serving a stale build —
restart it / fix the uncommitted WIP build error to see these).
