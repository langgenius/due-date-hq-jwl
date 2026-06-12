# /today responsive + affordance polish (2026-06-12, round 2)

Follow-up to `_today-critique-fixes-2026-06-12.md` — Yuqi: "can you polish
and make it NICER and MORE UX FRIENDLY?" Stress-tested the page at tablet
(768) and mobile (375) and found the desktop-only assumptions:

## 1. Alerts grid was hard-coded `grid-cols-3`

At 768px each card squeezed to ~200px: titles cut mid-word ("for al…"),
source links truncated to a bare "↗". Now `grid-cols-1` base /
`md:grid-cols-2` (2+ cards) / `xl:grid-cols-3` (3+ cards), skeleton
mirrors the same breakpoints. Verified: tablet renders 2-up fully
readable, mobile stacks.

## 2. Priorities table silently amputated STATUS / owner / DUE at tablet

The CLIENT cell's fixed `w-[440px]` + frame `overflow-hidden` pushed every
column after CLIENT past the clipped edge — at 768px the CPA couldn't see
status or due dates at all (the red lateness signal lives in DUE). Two
fixes: CLIENT width steps `220 / md:300 / xl:440`, and the frame is
`overflow-x-auto` so genuinely-too-narrow viewports (phones) scroll
sideways instead of hiding data. Verified at 375: scrollWidth 679 vs
clientWidth 341, swipeable.

## 3. Empty-bucket message links its verb

"None in the priority shortlist — open the queue to see all N." now has
"open the queue" as a real accent link to /deadlines. Catalogs
regenerated; zh-CN translated (reused the existing sentence's translation
with the `<0>` link wrapper). Also filled the parallel session's three
pending priority-label strings so `i18n:compile --strict` stays green.

## 4. "N clients" → `font-medium`

The affected-client count is WHY an alert earned a card — key data gets
500 per the type-weight ladder; the rest of the footer stays 400.

Docs: `alert-card-design.md` (+responsive grid bullet),
`today-actions-table-style.md` (+Responsive section). Verified at
1512/768/375; tsgo + strict compile + console all clean.
