# /deadlines feedback pass — button sizing, table personality, brighter filter accent, View count, calendar popover (2026-06-22)

Yuqi's page-feedback annotations on /deadlines (5 threads) + a follow-up on the
Calendar-sync popover, then a `/design-critique` pass that drove a sixth fix.

## Changes

1. **Header + View buttons → h-9** (`obligations.tsx`): the three header
   actions (Export / Calendar sync / Add-deadline split) were `size="sm"`
   (h-8/32px) while the page's own filter chrome (Status / Sort by / Filter /
   View) is h-9/36px — a 4px family mismatch the /alerts header already
   documents as wrong. Dropped `size="sm"` so they inherit the default h-9. The
   toolbar **View** button was the worst offender — h-8 sitting between two h-9
   pills. Now h-9, and it shows the column count `7/11` (shown / hideable) on
   the trigger with an aria-label, mirroring the count already on the Columns
   submenu.

2. **Brighter filter-value accent — app-wide** (`filter-trigger.tsx`): the
   `valueLabel` was brand navy `text-text-accent` (#2e368c), which sits right
   next to the gray label and reads as plain text (Yuqi: "why is this not
   accent colour? other places got it accent"). Switched the value + chevron +
   active leading icon to vivid blue `#1570ef`
   (`text-(--color-util-colors-blue-600)`, via a local `valueAccent` const).
   Brand navy stays the accent for CHROME (buttons/borders); vivid blue is now
   reserved for the scannable applied-filter value. This is the primitive, so
   it brightens the value on all 10 `valueLabel` callers. Contrast: #1570ef on
   white = 4.57:1 → passes AA.

3. **Table "distinct character"** (`obligations.tsx`) — Yuqi picked the bold
   option over subtle warmth:
   - **Per-row urgency left-stripe**: the existing 2px left rail turns
     red/coral by `dueDaysTone(days).variant` (the same tone the Internal-due
     pill uses, so they never disagree — deep red `destructive`, coral
     `warning`, none past 3 days out). Gated by `isDueDaysSuppressedForStatus`
     so filed/completed/paid/N-A rows show NO stripe (their lateness is a
     quality stat, not live urgency). `urgencyRail` placed LAST in the row
     `cn()` so urgency wins the rail over the gray client-cluster tint. Demo: 5
     deep-red + 7 coral, 16 clean — the 5 matches the banner's "5 LATE".
   - **Urgency-band lane wash**: OVERDUE header → red-50, THIS WEEK →
     warning-50. GOTCHA: painted on the `<TableCell>`, NOT the `<TableRow>` —
     the TableRow primitive's `has-aria-expanded:bg-state-base-hover` rule (the
     band's collapse button is always aria-expanded) outranks any row-level bg,
     so the old `bg-background-subtle` on the row was a silent no-op too.
   - Client col 196→232px so long names stop truncating.

4. **Status-column reclaim** (critique-driven, `obligations.tsx`): the table is
   `table-fixed w-full` and Status was the LONE fill column → it ate ~547px
   (40%) of mostly-empty trailing space at 1512px. Gave Status an explicit
   `w-[240px]`. Now that EVERY column is fixed, table-fixed spreads wide-screen
   slack proportionally instead of dumping it in one column. Measured @1512:
   Status 547→302, Client 232→292 (names breathe), all columns +~26%.

5. **Calendar-sync popover** (`obligations.tsx`) — Yuqi: "the pop up is weird
   and underdesigned… there is a white mask behind the popup section."
   - Removed a manual `<div className="fixed inset-0
     bg-background-overlay-backdrop">` that painted a 95%-opaque WHITE scrim
     over the whole page on open (that token resolves to rgba(255,255,255,0.95)).
     It was unique to this one popover; no other popover dims the page. Base
     UI's `PopoverRoot` wires `useDismiss` with outside-press enabled by
     default, so close still works (the Filters popover proves it — same
     primitive, no backdrop, ships in prod).
   - Redesigned: soft accent icon-tile + "Calendar subscription" title + scope
     line; full-width hairline; labeled "Private subscription link" field with
     an inline copy glyph (focus selects the URL); Regenerate demoted to a
     quiet ghost footer action so the destructive path stops competing with the
     everyday copy.

## Gotcha worth keeping

- A `{/* comment */}` inside a JSX **expression attribute** (`render={ … }`)
  is a parse error ("Expected `}` but found Identifier") — `{/* */}` is
  JSX-children syntax. Use a `//` line comment inside `render={}`, or move the
  comment to a children position. (Cost me one red-herring "topSlot is not
  defined" stale-bundle chase before the real parse error surfaced in the
  worktree dev-server logs.)

## Verify

- `tsgo --noEmit` clean; `i18n:extract` + 7 zh-CN translations + `i18n:compile
  --strict` clean; live-verified on a worktree dev server. NOTE: the running
  :5173 server points at the MAIN checkout, not this worktree — had to spin a
  `--dir` server on :5191 to actually see the edits (a parallel session was
  editing main, which also produced transient route failures unrelated to this
  work).

## Held (not done)

- "Quiet the Form chip so the client name leads" — the Form chip is the shared
  `TaxCodeBadge` primitive (also /today, /alerts, drawer), so it can't be
  quieted on /deadlines alone without diverging; the Status-reclaim's +60px to
  Client partially addresses it. Needs a system-level call.
- Unifying the Filter pill's active state to the blue — its navy chrome + filled
  count badge is a deliberate "filters are ON" treatment; left intact.
