# /deadlines — global glance + Today table/tile parity

Date: 2026-06-08

Yuqi feedback: the glance cards changed when switching status tab; tiles + table
should match Today's.

## Changes
- **Glance always global** (obligations.tsx): added a second always-unfiltered
  `orpc.obligations.list` query (`glanceQuery`/`glanceRows`) — no status/due/
  evidence/signature/taxType/client/state filters, only the as-of clock + default
  due_asc sort. `DeadlinesAtAGlance` now reads `glanceRows`, so the TODAY/THIS
  WEEK/NEEDS YOU tiles summarize ALL deadlines regardless of the active tab.
- **Tiles match Today's alert card** (deadlines-at-a-glance.tsx NarrativeTile):
  card `rounded-xl px-5 py-4` → `rounded-[14px] p-[18px]`, hover →
  `bg-background-subtle`; eyebrow `font-bold tracking-[0.8px] text-muted` →
  `font-semibold tracking-[0.4px] text-tertiary`; headline → `text-[14px]
  leading-[1.3]`; sub → `text-secondary`; inner gap → gap-1.
- **Table matches Today's actions table** (obligations.tsx): row hover →
  `hover:!bg-background-subtle`; cell padding → `py-3`; split-view frame →
  `rounded-[14px] bg-background-default` (the canonical Table already supplies the
  subtle-bg uppercase header band).
- **STATUS column icon-only when filtered**: when a single status scope tab is
  active (`singleStatusScopeActive`), the STATUS cell renders icon-only (reusing
  the status control's compact mode); "All" keeps the full label.

## Verify
tsgo clean; no console errors. `/deadlines` → switching to "Waiting on client"
keeps the glance global (Riverside 27d overdue stays); the single waiting row
shows status as just the hourglass icon. At 1512×861.
