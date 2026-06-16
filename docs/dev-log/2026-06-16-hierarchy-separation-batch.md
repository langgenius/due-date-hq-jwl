# Detail-pane hierarchy & separation batch (Yuqi feedback) — part 1

_2026-06-16_

Yuqi flagged (with screenshots) that on the now-white detail panes, **headers blur
into content and sections mush together**, plus a few specific defects. Diagnosed
all six in parallel; this is part 1 (the five shared/visual fixes verified live).

## #1 — Section headers were the SAME size as body (the root cause)

`detail-section-card.tsx` (shared by alert + deadline flat sections). The action
header was `text-base` = 14px — identical to body text, just bold — so a border
rule alone could never separate them. Re-ranked:

- **action → `text-lg` (16px)/600 primary** — a clear size step over 14 body.
- **reference → 11px uppercase eyebrow** (`text-caption-xs` /500, tracking,
  tertiary) — a deliberately _different_ style (Yuqi: "要么不一样的style") so a
  supporting section reads as a label, never confused with body.
- The separating hairline moved from UNDER the header to the **TOP of each
  section** (`border-t` + `pt-5`, `first:` reset) so it reads as a "new section
  starts here" divider, not a header underline.
  Verified live: deadline (Extension 16px vs RECENT ACTIVITY eyebrow) and alert
  (Change 16px vs SOURCE/ACTIVITY eyebrows) via computed styles.

## #6 — Hero status banner was red + bold (double-highlight)

`detail-status-banner.tsx` (shared). `font-semibold` → `font-medium` on both
layouts. On the colored danger/warning bands, red + bold was a banned
double-highlight; the tone colour + icon carry urgency, the label is a calm 500.
Verified: deadline "Not started" now reads medium-weight red.

## #2A — Materials checklist selected state was ugly

`ChecklistItemRow.tsx`. Selected was a strong accent border + 2px ring — with
Select-all on, every row became a heavy blue box. Now selection is a **faint
accent wash** (`bg-state-accent-hover` ≈ #eff4ff) behind the same hairline; the
filled checkbox is the signal, the tint just groups. Verified live.

## #2B — Materials groups didn't read as sections

`ObligationQueueDetailDrawer.tsx`. The OUTSTANDING/RECEIVED/WAIVED group headers
got a **full-width hairline under the label + a count pill** (rounded
`bg-background-section`), the label darkened to secondary, inter-group gap
`gap-4 → gap-6`, header→items `gap-1.5 → gap-2.5`. Each group now reads as a
clear sub-section; items stay tight within. Verified live.

## #3 — Alerts list rows weren't left-aligned

`PulseAlertRow.tsx` (Yuqi "为什么不是左对齐"). Day-grouped rows carried a 64px left
wall-clock rail that indented the content past the date band. Dropped it so the
row content's left edge lines up with the band; relocated the wall-clock + unread
dot to the head-row right cluster ("• 04:00 24d left"). Verified live.

tsgo + vp clean on all five. Part 2 (crumb parity + the deadlines status-filter
switch-back bug) follows.
