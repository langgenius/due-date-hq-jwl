# 2026-06-05 — /deadlines page-feedback alignment with /today and /alerts

Yuqi filed 11 numbered feedback items + a batch-selection-bar screenshot
note against `/deadlines` (Viewport 1920×992). The thrust was: align
chrome, primitives, and visual rhythm with the canonical `/today` and
`/alerts` surfaces, drop redundant affordances, and redesign the bulk-
action bar so it reads as a deliberate selection-mode surface.

## Changes

### `apps/app/src/routes/obligations.tsx`

1. **(#5) Duplicate search removed.** The collapsible icon-button
   `ObligationQueueSearchControl` that sat next to the scope tabs is
   gone. The fixed-row search field (`h-9 w-[260px] rounded-xl`,
   pixel-matched to `/alerts`) is the single search affordance.
   `searchInputRef` now targets that always-mounted input; the `/`
   hotkey just focuses + selects, no open-first dance.
2. **(#10) Bottom footer removed.** The strip carrying
   "N deadlines · M clients · J K navigate · Enter open · ? all"
   plus a "Load more" button is gone. The scope-tab counts at the
   top already carry the aggregate; the IntersectionObserver sentinel
   inside the scroll container is the infinite-scroll trigger; the
   global "?" help dialog surfaces shortcuts. A small ghost
   "Load more" button stays as a fallback when the sentinel can't
   fire (short viewports), centered below the table with no chrome.
3. **(#11) Table-card border + radius removed.** The bordered
   `rounded-[12px]` wrapper painted a tall empty rectangle below
   the last row whenever the result set was short. Dropped both —
   the `TableHeader`'s `bg-background-section` band is enough to
   mark the top of the data region; the empty area below now reads
   as the page surface, not a framed "empty card."
4. **(#6) Sort label disambiguated.** "Sort by · Due ↑" read like a
   directional indicator on Group-by's value, which made the two
   triggers look interchangeable. Now reads "Sort by · Due date
   (earliest)" / "Due date (latest)" / "Smart priority" / "Recently
   updated" — verb-prefixed, longhand, no arrow glyph. The aria-
   label clarifies the scope: "Sort deadlines within each group."
5. **(#7 + #8) Urgency-band sub-header aligned to `/alerts` dispatch
   divider.** The right-side count was a filled `Badge` pill; the
   penalty-exposure note was lower-case body text. Both now use
   the same `text-[12px] font-semibold tracking-[0.5px] uppercase`
   eyebrow scale `/alerts` uses on its day-group header — so
   "OVERDUE · 3" and "3 DEADLINES" and "≈12D AVG · ≈$11,840 PENALTY
   EXPOSURE" all sit on one typographic line.
6. **(#12) Bulk-action bar redesigned.** Moved to `tone="elevated"`
   (dark inverted surface), reordered to surface only the 3 primary
   actions inline (Assign owner, Set status, Confirm projected),
   and collapsed Snooze / Export / Remind to sign / Decide
   extension under a single `More ▾` overflow menu. The bar now
   reads as 6 affordances instead of 11. Position offset by
   `md:!left-[calc(50%+6.875rem)]` so it centers on the queue panel
   instead of the viewport (the 220px persistent sidebar was
   pushing the optical center ~110px to the left).
7. **Dead-code cleanup.** Local `ObligationQueueSearchControl`
   function dropped (no remaining consumer in this route). Unused
   `KbdHint` and `SearchInput` imports removed. The `searchOpen`
   state lifted from the now-deleted control is gone. The
   `uniqueClientCount` memo that powered the removed footer count
   is gone with a TODO-style comment noting where to restore it
   from if a footer is ever wanted again.

### `apps/app/src/components/patterns/floating-action-bar.tsx`

1. **`tone="default" | "elevated"` variant added.** Default is the
   existing white pill (Rule library's bulk-review bar still uses
   it). Elevated paints `bg-text-primary text-text-inverted` with
   inverted button hover (`bg-white/10`) and a translucent-white
   separator — the canonical dark "command bar" recipe used by the
   selected state-rail chips and rules-console primitives.
2. **`flex-wrap` → `flex-nowrap`.** Wrapping to two lines read as
   "the bar is broken." Consumers with more than ~6 affordances
   must now use a `More ▾` overflow menu (`/deadlines` does).
   Padding tightened from `px-5 py-3` to `px-4 py-2.5` and gap
   from `gap-3` to `gap-2` so the bar reads as a compact toolbar,
   not a horizontal panel.
3. **Bottom offset clarified.** Stays at `bottom-12` (48px from
   viewport edge). Comment was wrong (`bottom-10 = 40px`); updated.

## Items the user explicitly affirmed

- (#1) Group by / Sort by FilterTriggers — left in place; the
  user's note was "this is the correct Group by / Sort by."

## Items not yet shipped (need user follow-up)

- (#2) Top padding. `/today` and `/deadlines` already share
  `pt-6 pb-12 md:px-16 md:pt-6 md:pb-12`; `/alerts` is the
  outlier (`md:px-6`, `pb-4`, `gap-6`). Need a call on whether
  to reconcile `/alerts` toward the others or vice versa.
- (#3 + #4) PageHeader and search "consistent element and design
  details as Today and Alerts." Item 5 (duplicate search) covers
  the search side. PageHeader on `/today` carries no description;
  `/alerts` carries one; `/deadlines` carries none. Today and
  Deadlines are now in alignment per the current PageHeader spec,
  but if the user wants `/alerts`-style description copy added to
  `/deadlines`, that's a follow-up — keeping it out for now since
  the most recent Pencil iteration (round 21, h4bQ2) explicitly
  dropped the description sentence.

## Files changed

- `apps/app/src/routes/obligations.tsx`
- `apps/app/src/components/patterns/floating-action-bar.tsx`

## Verification

- `pnpm exec tsc --noEmit` in `apps/app/` — clean for the touched
  files. Two pre-existing untracked errors in
  `features/dashboard/daily-brief-card.tsx` (untracked, not
  introduced by this change).
- Live preview at `localhost:5173/deadlines` with the `pulse` E2E
  seed — all 12 visual items render correctly at 1600×900 desktop
  width. See screenshot in chat transcript.
