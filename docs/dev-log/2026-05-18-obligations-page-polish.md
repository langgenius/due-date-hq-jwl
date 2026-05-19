---
title: 'Obligations Page Polish'
date: 2026-05-18
author: 'Claude'
area: design
---

# Obligations Page Polish

## Context

After the dashboard restructure landed (`docs/dev-log/2026-05-18-copy-polish-and-dashboard.md`), Yuqi turned to the `/obligations` queue: the header had four primary-ish buttons fighting for attention, the controls card carried a redundant "Queue controls" title and a density toggle nobody used, and the filter rail mixed a time-window chip with two action-state chips so the user couldn't tell what they were filtering by. The Calendar sync button took users to a separate `/obligations/calendar` page just to copy or regenerate a URL — a heavyweight trip for a one-click action.

## Change

### Header

- Reordered the action row so the primary CTA is **Saved views** (was secondary): `[Saved views (primary)] [Calendar sync (outline)] [Reset (outline)]`. Saved views is what users return to every session; calendar sync is occasional.
- Replaced the **Calendar sync** `<Link to="/obligations/calendar">` with an inline `CalendarSyncPopover` component (defined at the bottom of `routes/obligations.tsx`). The popover anchors below the button, paints a `bg-black/30` backdrop, and lets the user copy or regenerate the personal subscription URL without navigating away. When no subscription exists, it shows a single "Enable subscription" CTA. Wired to the existing `orpc.calendar.upsertSubscription` and `regenerateSubscription` mutations; the query is lazy-loaded (`enabled: open`) so we don't fetch on every queue render.
- Renamed the empty-state "Run migration" button to **Import clients** to match the dashboard change that landed in the prior PR.

### Controls card

- Removed the `Comfortable | Compact` density tabs. The underlying `density` URL state still parses (so old saved views don't break) but defaults to `comfortable` with no way to change. Saved-view density payloads will all be `comfortable` going forward.
- Removed the `CardHeader` (`Queue controls` title, description, and row-count badge action). With nothing else on the page, the title was noise; the description duplicated obvious table-header affordances; the row-count badge moved to the right edge of the new filter row so it's still scannable.

### Filter rail

The chips were a flat row of `[This week] [Needs input] [Needs evidence]`, mixing a time-window control with two action-state filters. Now split into two semantic groups with a hairline `Separator` between them and tiny eyebrow labels:

```
WINDOW · [This week]  │  NEEDS ACTION · [Penalty input] [Evidence]   …  3 rows
```

- The `WINDOW` group holds the time chip (`This week`); future time chips would go here.
- The `NEEDS ACTION` group holds state chips. Tightened the labels — `Needs input` → **Penalty input**, `Needs evidence` → **Evidence** — because the eyebrow does the "needs action" work, so the chip just needs to name the thing.
- Row count badge anchors right.

### Calendar page

- Dropped the **Practice-wide calendar** card from `features/calendar/calendar-page.tsx`. Per Yuqi: the practice-wide feed wasn't being used and the page was easier with a single subscription. Calendar page now shows the **My deadlines** card only. The grid switched from `lg:grid-cols-2` to a single-column layout; the unused `canManageFirmCalendar` import was removed.
- The `/obligations/calendar` route still exists (in case any external link / docs reference it) but is no longer reachable from the Obligations header — the popover handles the common path.

## Docs Check

No `DESIGN.md` or product-design doc update required. The voice & terminology rules added in the prior PR cover the new copy (`Calendar sync` button stays as a verb-noun label; popover follows the "no trailing period on toast titles" rule already). The header-action ordering and chip grouping are layout decisions inside one route, not new design-system tokens.

## Validation

- `npx tsc --noEmit --project apps/app/tsconfig.json` — clean
- `pnpm --filter @duedatehq/app i18n:extract` — clean (7 new strings)
- `pnpm --filter @duedatehq/app i18n:compile` (strict mode) — clean (zh-CN backfilled for all 7)

## Follow-ups (deferred)

- Active-chip variant treatment: the eyebrow + chip pattern means the chips do less wayfinding work; we may want a quieter active state than `Badge variant="default"` to match. Left as a follow-up.
- `/obligations/calendar` route now only shows the "My deadlines" card — if no one is deep-linking to it, the route itself could be deleted.
- `density` URL parser stays in `obligations.tsx` for back-compat with already-saved views. If we don't expect anyone to have a `density=compact` saved view we still want to honor, we can rip out the parser, the `withDefaultDensityCleared` helper, and the `density === 'compact'` branch in cell padding.
