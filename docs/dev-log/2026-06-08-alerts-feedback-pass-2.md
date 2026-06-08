# /alerts — second feedback pass (list + detail)

Date: 2026-06-08

Follow-on to the other session's `204101b2` cohesion pass. Yuqi's 12 items:

## List

- **Lighter row title** (`PulseAlertRow`): `font-medium text-text-primary` →
  `font-normal text-text-secondary`.
- **Filter-row grouping** (`AlertsListPage`): a `lg+` `flex-1` spacer after the
  List/Map toggle pushes the dropdown cluster (All time · Filters · State · Sort)
  to the end; left cluster = search + view toggle.
- **Sort chevron at the end**: `mr-auto` on the value span pins FilterTrigger's
  trailing chevron to the chip's right edge.
- **Thinner row icon**: the standalone clients glyph → `strokeWidth={1.5}`.
- **Jurisdiction = StateBadge chip** (`PulseAlertRow`): plain mono code → the
  canonical seal+code chip (12×12 `StateBadge` in a bordered `h-[20px]` chip),
  matching Today's card and the rail.
- **No red dot** (`routes/alerts.tsx`): dropped the leading health dot before the
  "Sources · …" chip; chip now leads with the database icon, health stays in the
  tooltip.

## Detail

- **Primary action at the end** (`AlertDetailDrawer` DrawerActions): already
  `justify-between` — no change.
- **Dim inactive rail items** (`AlertListRail`): inactive title `text-text-tertiary`,
  active `text-text-primary`; 2px left accent kept on active.
- **Banner height** (`AlertDetailDrawer`): "Pending your review" pinned to `h-7`
  (28px) to match the Segmented `size="sm"` track.
- **Weight restraint** (`AlertStructuredFields`): fact value `font-semibold` →
  `font-normal`; eyebrow `font-bold` → `font-semibold`.
- **De-mono labels** (`AlertStructuredFields`): removed `font-mono` from fact
  eyebrow labels (Authority etc. — names, not dates/numbers).
- **Remove aside border** (`AlertDetailDrawer`): dropped `border-l` from the
  detail `<aside>` (no `border-r` existed); rail border + wash carry separation.

## Verify

tsgo clean; `/alerts` list + detail confirmed in preview at 1512×861 — seal chips
present, red dot gone, filters grouped, detail footer/banner/facts/border correct.
