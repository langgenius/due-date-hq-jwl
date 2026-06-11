# /deadlines table — 3 small tweaks (2026-06-10)

Yuqi page feedback on the list table:

- **#1** Client-name cell ("Riverside Sole Prop…") was `text-[16px]` → `text-sm`
  (down a size; also drops an arbitrary px for a token).
- **#2** Active-sort chevron in `ObligationQueueSortableHeader` was
  `text-text-accent` (blue) → `text-text-secondary` (neutral; its presence +
  direction is the sort signal, not colour). "为什么是蓝色的".
- **#3** Client column widened — outer cell `min-w-0` → `min-w-44` (176px, scale
  width, not arbitrary) so the client name truncates less. (Best-guess column;
  ties to #1.)
