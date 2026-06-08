# /today — page-feedback polish pass

Date: 2026-06-08

Eight inline page-feedback items on the dashboard, all small but each a
real readability/affordance fix. No new surfaces — tightening existing ones.

## Daily Brief (`daily-brief-card.tsx`)

- **Top padding reduced** (#1): section padding split — `pt-3` vs the 18px
  on the other sides, so the title row sits closer to the top edge.
- **"Outdated" is now an action** (#2): the stale freshness chip is no
  longer a dead label. When outdated it renders as an amber
  `● Outdated · ↻ Refresh` **button** that regenerates on click (tooltip:
  "This brief is out of date — regenerate it"). Answers "what do you do
  when it's outdated" from the chip itself, not just the separate icon.
- **Closeable** (#8): an `✕` dismiss button on the right cluster. The
  dashboard route persists the dismissal in `localStorage` keyed to the
  brief's generation stamp (`ddhq:dashboard:brief-dismissed`), so closing
  hides THIS brief but a freshly regenerated one (new stamp) returns.

## Header (`routes/dashboard.tsx`)

- **Import clients `+` slightly smaller** (#3): `icon-sm` (32px) →
  `icon-xs` (28px) so the lone affordance sits quieter beside the synced
  stamp + shortcut chip.

## Needs-attention alert card (`needs-attention-card.tsx`)

- **Title 1px bigger** (#5): `text-sm` (14px) → `text-[15px]` — clearer
  card anchor line.
- **Client avatars darker** (#4): initial-avatar fill gray-100 → gray-200
  (`#e9ebf0`) and initials → `text-primary`, so they read against the
  card's gray-50 surface instead of dissolving in.

## Actions-this-week table (`actions-list.tsx`)

- **No alternating row background** (#7): body rows opt out of the
  canonical zebra (`[&_tbody_tr]:even:bg-transparent`) — the table reads as
  one flat white surface; the status-group header bands carry the
  structure. (Zebra left intact on the shared `<TableRow>` primitive for
  every other table.)
- **Darker group header** (#6): the lifecycle-status divider band steps
  gray-100 → gray-200 (`#e9ebf0`) and its label → `text-primary`, so it
  reads as a real section header instead of a faint whisper. Hover override
  updated to match.
- **Hover-revealed Review button**: each Actions row now shows an outline
  **Review** button on hover/focus (new trailing column, `opacity-0` →
  `opacity-100`), matching the /alerts row pattern. The button reserves its
  own column so the reveal never jitters the table; whole-row click still
  opens the drawer. `tabIndex={-1}` + `aria-hidden` keep it out of the tab
  order (the row is the focusable target). The status-divider `colSpan`
  already spanned 7, so it now matches the 7-cell row exactly.
