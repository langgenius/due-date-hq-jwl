# /today bold budget — demote the anchors, size the signal (2026-06-12, round 3)

Yuqi, looking at the Everyone-scope page with 5 overdue rows: "people lost
focus — so many bold things on the page. For REAL IMPORTANT THINGS you can
have them bigger in size and grab attention."

DOM census confirmed it: eleven 600-weight text elements at 14–18px ("Today",
"Alerts", "Priorities", 3 card titles, 5 client names) — all black, all
equal. Repetition cancels weight; nothing won. Meanwhile the actual signal
("31d late") was the smallest text in its row.

## The rebalance (both in `features/dashboard/`)

1. **Alert card titles 14/600 → 14/500** (`needs-attention-card.tsx`) —
   second demotion of the day (16/600 → 14/600 this morning). News reads at
   key-data weight, not title weight.
2. **Client names 14/600 → 14/500** (`merged-brief-card.tsx`) — same tier.
   `text-row-anchor` (14/600) no longer appears on /today; both call sites
   were its only app usages, registry tables elsewhere are untouched.
3. **Late/due-today countdowns 13/500 → 16/600** — `DueDateLabel` gets
   `text-[16px] leading-[22px] font-semibold` (the item-title recipe; passed
   as arbitrary values because tailwind-merge can't resolve the custom token
   utility against the primitive's internal `text-sm`) only when
   `days <= 0`. Future countdowns keep the quiet default so the This week /
   This month buckets stay calm.

Result, measured: card title 14/500, client name 14/500, late countdown
16/600 `text-destructive`, section anchors 18/600. The ≥600 leaf census is
now: Today, Alerts, Priorities, the 11px column-band labels, avatar
initials, and the red countdowns — the eye path lands on lateness.

## Rule recorded

Overview pages spend 600 on: page title + section anchors + the ONE urgency
signal — and that signal gets SIZE, not just weight. Recorded in
`section-header-style.md`, `alert-card-design.md`,
`today-actions-table-style.md`, and the type-weight-restraint memory.

No string changes (class-only) — no catalog regen needed. tsgo + console
clean; verified live at 1512.
