# Adopt StatusRing app-wide (replace the lucide status glyphs)

_2026-06-18 · Yuqi approved adoption after the /preview comparison_

The obligation status mark switched from the per-status lucide glyph set
(`Loader` / `Hourglass` / `Construction` / `MessageSquareText` / `FileCheck` /
`CircleCheck`) to the [`StatusRing`](../../apps/app/src/components/primitives/status-ring.tsx)
progress ring — the ring fills along the happy path so a queue scan reads how far
along each deadline is.

## What changed

- `status-control.tsx`: removed `STATUS_ICON` (lucide map) + its imports; added
  `STATUS_RING_LEVEL` (DB-status → v2 level) + a `StatusMark` renderer that wraps
  `<StatusRing>`. Swapped all three internal render sites (status-control trigger
  pill, the status dropdown items, `ObligationStatusReadBadge`). `STATUS_ICON_COLOR`
  / `_ON_PILL` are unchanged — they still drive the hue; only the mark shape moved.
- `DeadlineNavigatorRail.tsx`: swapped its `STATUS_ICON` use for `StatusMark`.
- `/preview`: replaced the prototype current-vs-proposed comparison with a single
  canonical "Status (StatusRing)" row + a new `ObligationStatusReadBadge` specimen
  (the read pill wasn't in the gallery before).
- Docs: `obligation-status-icon-vocabulary.md` (adoption banner + level mapping;
  lucide rationale retained as history) + DESIGN §4.11 (new `StatusMark` row).

Mark mapping (mirrors the v2 collapse): not_started = empty dashed ring · waiting
= ring+pause (off-path) · blocked = ring+slash (off-path) · in_review = ~50% arc ·
filed = ~85% arc · completed = solid disc + check.

## Verification (live, dev server /preview)

- `tsgo` 0; 543 app tests pass; build green.
- "Status (StatusRing)" row: 6 pills, tones inherit (gray/coral/red/navy/green),
  arc fills exact (dashed `2 2.2`, in-review 50%, filed 85%, completed solid disc).
- `ObligationStatusReadBadge` specimen: `StatusRing` renders at **12px** inside the
  `Badge` (the `[&>svg]:size-3!` rule), correct on-pill tones (secondary gray for
  not-started/waiting, red/navy/green otherwise). completed reads on the soft
  `success` chip (green disc + white check on green-50).
- Gated surfaces (/deadlines rows, status control) use the same `StatusMark` —
  not seedable locally (Worker demo-login 502), but consume the verified renderer.
