# 2026-06-14 — /alerts detail: feedback batch (styling fixes 1–6)

Yuqi /alerts?alert=…3001 batch. The clear styling items, shipped:

- **#1 fact grid → light-gray reference panel.** Cells go white → `bg-background-subtle`,
  rounded-lg, hairline-divided. On the all-white document this zones the
  structured reference data apart from prose — ONE intentional data block, not
  the alternating washes rejected earlier. (cell bg rgb(242,244,247), radius 8px.)
- **#2 footer "background on a coloured background?"** The footer is a
  non-overlapping sibling of the scroll area (overlap 0 — nothing scrolls
  under it), so its opaque white fill was redundant. Dropped; the top hairline
  separates it. (footer bg now transparent.)
- **#3 rail active state off the colour bg.** Selection was the accent wash
  (too loud, and accent is the action color). Now a NEUTRAL gray fill
  (`bg-state-base-active`); hover stays the lighter `bg-state-base-hover`. No
  left bar (doubled the rail's own left border).
- **#4 hero date complete.** `formatRelativeTime` → `formatDatePretty(…,
  {alwaysShowYear:true})` — "May 18, 2026", not a clipped "May 18".
- **#6 "Deadline change" closer to its diff.** Section gap-2.5 → gap-1.5 so the
  label reads as one unit with the old→new date.

#5 (the detail's "Deadline change" vs the list's "Deadline shifted") — Yuqi
approved the detail wording ("makes more sense"); left as-is, no change.

Items #7 (before/after for non-shift changes), #8 (table consistency — it IS
the shared <Table>), #9 (Confirm/Exclude vs Apply distinction), and the
big "make the pipeline legible" ask are answered/proposed in chat, not yet
built — they're a coherent lifecycle pass pending direction.

Verify: tsgo clean; all five measured live on instance 5173.
