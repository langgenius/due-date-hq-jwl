# Deadline detail — tune active-stage materials/waiting card to canonical (2026-06-10)

Yuqi: visually tune the active-stage card's "waiting on client / materials"
state to match the canonical Pencil node Qn4nX `X3lBEt` (ActiveStageCard
"Left" column). Visual-only pass on the `isWaitingDocsCase &&
readinessCounts.total > 0` block in `ActiveStageDetailCard`
(`features/obligations/queue/components/panels.tsx`). No data/wiring changes —
every value still comes from the existing `readinessCounts` memo.

Changes:

- Added the canonical Headline above the big-number row: 18px / 600 /
  -0.4 tracking, `text-text-primary` — "N material(s) still outstanding."
  (via `<Plural>`), falling back to "All materials are in." once outstanding
  hits zero. This was missing; the block previously opened straight on the
  big number.
- Big-number "of N materials" caption: `text-sm` (14px) → `text-xs` (12px)
  to match the canonical 12px sub-caption; dropped the `pb-0.5` nudge for
  `leading-tight`.
- Legend chips tightened to canonical: label 12px/medium → 10px/600, dot
  6px → 5px, padding `px-2.5 py-0.5` → `px-2 py-0.5`, gap → 1. Waived chip
  text now reads `text-text-tertiary` (muted) vs `text-text-secondary` for
  received/outstanding, matching the Pencil's `#354052` vs `#676f83` split.
- Outstanding legend dot color: `bg-state-warning-solid` (orange) →
  `bg-state-destructive-solid` (red), per canonical `#f25f4c`.
- SegBar unchanged (already h-1 = 4px, `rounded-full`, green fill over
  `bg-divider-subtle` track — already canonical).

The card keeps its parent-blended surface (no own white bg/border) so it
works inside both the white WorkflowMilestoneCard (page mode) and the warm
`/clients` panel. The shared eyebrow header and the BLOCKING section below
were left untouched.

`tsgo --noEmit` clean. `vp fmt` applied to panels.tsx.
