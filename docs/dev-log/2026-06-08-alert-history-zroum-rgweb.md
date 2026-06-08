# /alerts/history — match Pencil zROUm (header) + rgWeB (filter row)

Date: 2026-06-08

Correctness pass on the handled-alerts archive against the Pencil design
nodes `zROUm` (PageHeader) and `rgWeB` (FilterRow), plus a visible date bug.

## Filter row (`rgWeB`) — `AlertHistoryView.tsx`

- **5 tabs, not 6.** The design's segmented control carries exactly All /
  Applied / Dismissed / Snoozed / Reverted. The code had a 6th **Expired**
  tab whose label, in the old hand-rolled if/else ladder, fell through to
  render a second **"Reverted"** (the bug visible in the screenshot — two
  "Reverted" tabs). A concurrent change had already moved the tabs onto the
  shared flat `<Segmented>` primitive (so labels can't desync from ids);
  this removes the Expired entry to match the design. Expired (aged-out
  `matched`) rows still surface under "All" with their Expired status badge,
  and the standalone **Expired** stat card keeps the count.
- **Search field** aligned to `rgWeB.search`: hairline `divider-subtle`
  border, ~240px cap (kept `flex-1` on small screens so it never overflows).

## Header (`zROUm`) — `routes/alerts.history.tsx`

- Title now carries the rolling 90-day **date-range context**
  (`· Mar 10 – Jun 8, 2026`) and a **`N handled alerts · last 90 days`**
  meta line, matching the design's header.
- Actions cluster replaced with a single **Export** button (design shows
  only Export). It's wired to a real CSV download of the loaded handled
  alerts — no dead control. The previous `Active alerts` + `Sources`
  buttons are dropped: the back-to-active path is already the `Alerts`
  breadcrumb, and Sources isn't in the design header.
- The handled count comes from the same `useAlertsHistoryQueryOptions`
  query the view runs (React Query dedupes on the shared key), so the
  header and table never disagree.

## Date column bug — `AlertHistoryView.tsx`

- The DATE cell showed the date twice ("May 17 / May 17"). Cause:
  `formatRelativeTime` switches to an absolute "Mon D" string past one week,
  which in this weeks-old archive is byte-identical to the primary date
  label. Now the relative sub-line only renders when it's an actual relative
  phrase (differs from the date label).

Deviation noted: the design puts the handled-count meta inline in the
breadcrumb (`Alerts / History · 482 handled …`); `RulesPageShell`'s
breadcrumb API can't append that, so it renders as the header description
line instead — same information, one tier down.
