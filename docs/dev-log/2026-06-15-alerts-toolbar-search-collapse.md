# Alerts toolbar — collapse search to an icon

_2026-06-15_

Yuqi (earlier): "should search always be at the rightmost? or collapse into an
icon and only expand when …". Done.

## What

The /alerts toolbar search now rests as a **search icon button** and expands
into the canonical `SearchInput` on click (autofocused). It stays expanded
while it carries a query and collapses again on blur when empty. Frees toolbar
width so the finding-controls cluster (Filters / State / Sort / view) reads
cleaner.

Reused the existing `SearchInput` (its `autoFocus` + `onBlur` props) + a
`Button size="icon"` — no new component. State is a single `searchOpen` flag;
the field renders when `searchOpen || searchQuery`.

## Verified

Live: toolbar shows the collapsed search icon button; clicking expands to the
autofocused field. Per-file vp check + tsgo clean (the only whole-project tsgo
errors are the parallel session's uncommitted rule-detail-drawer WIP).
