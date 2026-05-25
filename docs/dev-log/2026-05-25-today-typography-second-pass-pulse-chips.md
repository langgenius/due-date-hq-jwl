# 2026-05-25 — Today typography (second pass) + Pulse state-chip shrink

## Why

Two notes from Yuqi back-to-back:

1. `/` — "I feel the page is too much bold and medium text" + "View
   all alerts" too prominent + NeedsAttention card title too big +
   expanded action descriptions too big.
2. `/rules/pulse` — state-filter chip "NY1" too big.

The first three Today items are a _second_ typography rebalance.
The previous pass dropped a few weights (client name semibold →
medium, "View all" → text-sm tertiary) but Yuqi still reads the
page as bold-heavy. This pass goes a tier further: heading scale
drops, body text scales drop in lockstep, and the "View all alerts"
link gets pushed to muted/xs.

The Pulse chip note reverses the bump from the previous pass —
chips had been promoted (text-sm / size-sm / h-5) to read as a
real filter strip; Yuqi now wants them quiet again.

## Shipped — Today (4 items)

### #1 — Section h2s + tile values stepped down a scale

The two section h2s ("Alerts" and "Actions this week") were both
at `text-xl font-semibold`. Page header h1 is also `text-xl`, so
the h2s were tying with the page anchor for visual weight. Dropped
both to `text-lg font-semibold` — same weight (still the section
anchor) but visibly subordinate to the h1.

`ActionsSummaryTile` value also stepped down: `text-xl
font-semibold` → `text-lg font-medium`. The tiles are summary
counts, not heroes; magnitude is conveyed by tabular numerals and
color (destructive when critical), no need for full semibold at
xl.

Count chip next to the h2 dropped `text-base` → `text-sm` so the
size hierarchy stays proportional.

### #2 — "View all alerts" link demoted further

Was `text-sm text-text-tertiary` (hover → secondary). Now `text-xs
text-text-muted` (hover → tertiary) with the icon shrunk `size-3.5`
→ `size-3`. Reads as quiet meta-text now, not a sibling action to
the h2 next to it.

### #3 — NeedsAttention card body shrunk

Card was reading as a hero tile. Walked the whole card down:

- Source eyebrow `<span>{alert.source}</span>` — `text-base` →
  `text-sm`
- Title — `text-md font-medium` → `text-sm` (regular weight). The
  title was the heaviest text on the page at text-md/medium; sm/
  regular keeps it scannable but visually subordinate to the h2.
  Min-height adjusted `min-h-10` → `min-h-8` so the card heights
  still align across the row.
- "N client(s) may be affected" — `text-sm` → `text-xs`
- Client-name chip + overflow `+N` — `text-base` → `text-xs`
- Empty-state line — `text-base` → `text-sm`

### #3 cont — Actions expanded panel descriptions shrunk

The expansion panel inherited `text-base` (16px) at the
container level. Yuqi flagged the dt/dd pairs ("Action / Status /
Form / Sources / Why now / …") as too big. Dropped to `text-sm`
on the panel root so every nested dt/dd inherits the smaller
scale. Same RowMeta time-to-due chip on the collapsed row
dropped `text-base` → `text-sm` to match.

Client name on the collapsed row stepped down `text-base
font-medium` → `text-sm font-medium`, prompt next to it
`text-base` → `text-sm`. The whole row collapses to a tighter
two-token rhythm.

## Shipped — /rules/pulse (1 item)

### #1 — State-filter chips shrunk back down

Previous pass bumped the chips from text-xs/size-xs/h-4 to
text-sm/size-sm/h-5 + py-1 / pl-1.5 pr-2.5 so the row would read
as a real filter strip. Yuqi flagged the result as too big.

Back to compact:

- Chip text `text-sm` → `text-xs`
- StateBadge motif `size="sm"` → `size="xs"`
- Count chip `h-5 min-w-5 text-xs` → `h-4 min-w-4 text-[10px]`
- Padding `py-1 pl-1.5 pr-2.5` → `py-0.5 pl-1 pr-1.5`
- Inner gap `gap-2` → `gap-1.5`

Touch target stays comfortable via the badge + padding combo, but
the strip claims a lot less vertical real estate above the alert
list.

## Files touched

- `apps/app/src/features/dashboard/actions-list.tsx`
  - h2: text-xl → text-lg
  - ActionsSummaryTile value + label scales
  - ActionRow client name + prompt: text-base → text-sm
  - RowMeta: text-base → text-sm
  - Expansion panel root: text-base → text-sm
- `apps/app/src/features/dashboard/needs-attention-section.tsx`
  - h2: text-xl → text-lg, count chip text-base → text-sm
  - "View all alerts": text-sm tertiary → text-xs muted
- `apps/app/src/features/dashboard/needs-attention-card.tsx`
  - Source label, title, body text scales all reduced
- `apps/app/src/features/pulse/AlertsListPage.tsx`
  - State chip strip: smaller motif, padding, text, count chip

## Verification

- `vp check` → 1448 files formatted, 0 lint/type errors across
  667 files
