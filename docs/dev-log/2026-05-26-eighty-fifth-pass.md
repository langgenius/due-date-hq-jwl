# 2026-05-26 — Eighty-fifth pass: deadline drawer + cross-surface polish

Continuation of the 84th-pass batch. Yuqi reviewed `/deadlines` (queue +
drawer), `/clients`, `/clients/[id]`, and `/rules/library` across a
sequence of feedback rounds and we landed roughly 25 polish items.
Grouped here by surface.

## Deadline drawer (right panel)

### DeadlineTile + path summary cleanup

- Dropped `font-mono` on the three deadline strip numbers — they were
  the loudest type on the panel even after demotion to a quiet header.
  Restored uppercase tracking on the small "PAYMENT DUE" label.
- `PathToFilingSummary`: dropped the bold `ring-1` rings on
  active/overdue-active milestone circles. The chevron itself carries
  enough emphasis.
- "Past deadline" caption: `text-text-destructive` →
  `text-text-secondary`. The red AlertTriangle in the banner row above
  already signals urgency.

### Right-panel red dial-down

The overdue banner ("Filing was due …") switched from a filled red
surface to a neutral white card with a red AlertTriangle + red title.
Previously the whole right panel was tinted red even when the work was
just one day late — disproportionate weight.

### Tab bar (4 iterations of feedback)

The deadline drawer's `Summary / Materials / Extension / Evidence`
tabs went through four feedback rounds:

1. **"Belong to content below, not above"** — inverted spacing so the
   bar has bigger gap ABOVE (separation from sticky strip) and tight
   gap BELOW (reads as leading edge of content). `pt-6` on the
   wrapper, `mt-0` on TabsContent.
2. **"Tabs not obvious enough"** — `data-active:font-semibold`,
   inactive `text-text-secondary` so the bar invites click.
3. **"Underline too close to text"** — reverted the `after:!bottom-0`
   override that seated the rule flush with the bar baseline (only
   ~9px between descender and rule). Primitive default
   `bottom-[-5px]` floats it with proper breathing room.
4. **"Push active state further"** — added explicit
   `data-active:text-text-primary` + `after:!bg-accent-default` so
   the rule pops in the brand accent color, matching `/clients/[id]`
   tabs.
5. **"Justify left, remove lateral padding"** — bar is now
   `justify-start gap-6`; triggers drop `flex-1` (via `!flex-none`)
   and override `px-2` → `!px-0`. Tabs hug content on the left edge.

Documented the segmented-control-vs-tab decision in the consumer
comment: stays as tabs because the four panels are different
sections of the same deadline (not filters or scopes).

### Stacked-lines reduction

Right panel was stacking 4 near-rules in the same 200px strip
(sticky-strip bottom border + tab-bar baseline + outer stage card
ring + inner Key dates ring). Dropped two of them:

- `ActiveStageDetailCard` outer ring removed. Kept the
  `bg-background-section` tint — the soft fill alone anchors the
  "deep-dive zone."
- `CompletedKeyDates` inner ring removed. The block sat inside the
  already-tinted parent; a redundant rule + bg on top of the parent's
  tint was the textbook "chrome on chrome" anti-pattern.
- Tab-bar baseline reverted `divider-regular` → `divider-subtle`
  (briefly bumped, but it added another visible rule to the busy
  header stack).

### Bulk review action bar

`/rules/library` floating action bar swapped from beige
warning-hover-alt to clean white elevated pill — was reading too
"caution tape", now reads as a neutral elevated control.

## Sticky drawer footer (universal)

Bumped `py-4` → `pt-4 pb-6` (16px top, 24px bottom) on every sticky
sheet/drawer footer:

- `SheetFooter` primitive
- Obligation drawer panel-mode footer
- Pulse drawer footer override

Asymmetry intentional — top stays tight so the bar still reads as a
settled-into-the-edge action strip, bottom breathes so buttons don't
glue to the viewport edge.

## Cross-table chrome unification

Yuqi flagged that `/deadlines`, `/clients`, and `/rules/library` still
diverged on row heights, late-text styling, status pill sizes, hover
affordances, and overall card chrome. Final unification pass:

- Canonical wrapper: `rounded-md border border-divider-subtle
overflow-hidden`
- Row height: all three at `h-14` (was `h-12` on /deadlines)
- `CLIENT_ROW_HEIGHT_PX` constant bumped 48 → 56 to match
- TableBody bg restored to `bg-background-default/50` (alpha-50 white)
  per Yuqi's hold rule — temporarily removed last turn
- TableHeader: dropped the `!bg-background-default-dimmed` override
  that was bleeding through on scroll (token is `rgb(... / 0.4)` —
  alpha-tinted, transparent under scroll). Falls back to primitive's
  solid `bg-background-subtle`.

Documented all canonical cross-table rules in
`docs/Design/unified-table-surface-vocabulary.md` (Sections A–K).

## Group-by on `/deadlines`

New `GROUP_OPTIONS` control with wireframes-inspired implementation:

- Options: Due date, Client. Status was removed (redundant with the
  top scope tabs).
- Lucide `ArrowUpDownIcon` for the trigger (icon-led
  `FilterTrigger` got a new `leadingIcon` prop).
- Section headers per wireframe with sticky `bg-background-subtle`
  band, count chip, and late-count chip per group.

## Rules library — active-section alignment

Yuqi follow-up on the Active section's leading slot:

- Outer flex `items-start` → `items-center` (kills the half-pixel
  baseline drift)
- Active dot color changed from `bg-state-success-solid` (green) to
  `bg-divider-regular` (gray) — entity-status dots elsewhere in the
  row already carry the green semantic, the second green was
  competing
- Hover-expand: on row hover, the gray dot expands to show the
  `STATUS_LABEL_SHORT` text inline (Active / Verified / Rejected /
  Archived). Maps to the user's mental model ("the dot tells me
  what's going on here").

## `/clients` sweep (6 items)

1. Search moved to right end via `ml-auto` spacer
2. Dropped redundant ArrowUpDownIcon on sort headers
3. Numeric columns left-aligned (was text-right)
4. NextDueRelativeLabel: `text-sm font-semibold` + verbose "N days late"
5. State badge fix: dropped redundant 2-letter code that was
   producing "MAMassachusetts" double-render
6. ClientsActionStrip: `rounded-md` → `rounded-full` for full banner

## `/clients/[id]` sweep (9 items + header restructure)

- Today tile pattern adopted in `ClientSummaryStrip` (no sublines,
  hugging content)
- Status pill source documented + title-tooltip on the column header
- `ClientRiskSummaryPanel` simplified — refresh hoisted to TabSection
  `actions` slot
- Filing-plan form-code text bumped to `text-sm font-medium`
- AI summary + status pill column header refined
- TabsList double-underline fix: dropped `border-b` from the list,
  added explicit `!important` overrides on `ClientDetailTabTrigger`
  to strip the primitive's pill chrome (the `data-active:bg-...`,
  `data-active:shadow-xs`, `after-pseudo` were all stacking)
- LLC + Unassigned pills harmonized — replaced
  `<Badge variant="outline">` with a custom h-7 rounded-full pill
  matching the owner pill chrome
- ClientCycleArrows (1/9 prev/next) moved to `eyebrowAside` slot — to
  the right of "Clients" breadcrumb, not in the H1 actions cluster
- Page container dropped `mx-auto max-w-page-wide` cap (was 1100px)
  in favor of `flex w-full flex-col` + `xl:h-screen xl:overflow-hidden`
  so the page matches `/deadlines` panel responsiveness
- Header block restructured to `flex min-w-0 flex-col items-start
gap-y-2` with title + min-w-0 so the H1 truncates instead of
  wrapping when the drawer narrows the column

### `/clients/[id]` tab icons

Added per-tab Lucide icons matching the deadline drawer pattern:

- **Work** → `ClipboardListIcon` (filing plan)
- **Client info** → `UserRoundIcon` (the person)
- **Opportunities** → `SparklesIcon` (discover)
- **Activity** → `ActivityIcon` (timeline)

All at `size-3.5` for parity with the drawer.

## Sidebar collapsed-mode fixes

Sidebar collapse mode was drifting:

- Icon alignment per item didn't match expand mode
- Item heights differed
- Badge dot at `-top-0.5 -right-0.5` was being clipped

Fixes:

- Hard-locked app-shell header to `h-[72px] justify-center`
- SidebarMenuButton: `overflow-visible` in collapsed mode
- SidebarMenu + SidebarContent: unified gap in both modes (no special
  collapsed override)
- Badge: smaller pill in collapsed mode (h-3.5), overhanging by 0.5px

## Files touched

- `apps/app/src/routes/obligations.tsx` — drawer tile cleanup, path
  summary, banner red dial-down, group-by, sticky footer pt-4 pb-6,
  tab bar (5 micro-iterations), stacked-lines reduction, comment
  hygiene throughout.
- `apps/app/src/routes/rules.library.tsx` — bulk action bar restyle,
  active section alignment + gray dot + hover-expand, STATUS_LABEL_SHORT
  map.
- `apps/app/src/routes/clients.$clientId.tsx` — drop max-w cap,
  full-viewport flex column.
- `apps/app/src/features/clients/ClientFactsWorkspace.tsx` — 6 list
  items, 9 detail items, header restructure, tab icons, tab double-
  underline fix, ClientRiskSummaryPanel simplification.
- `apps/app/src/features/clients/ClientSummaryStrip.tsx` — Today-
  tile pattern.
- `apps/app/src/features/clients/ClientTitleSwitcher.tsx` — min-w-0 +
  truncate so the H1 ellipsizes when the drawer narrows the column.
- `apps/app/src/features/pulse/PulseDetailDrawer.tsx` — SheetFooter
  pt-4 pb-6 mirror.
- `apps/app/src/components/patterns/page-header.tsx` — actions
  cluster drops `flex-wrap`; h1 gains `min-w-0`.
- `apps/app/src/components/patterns/filter-trigger.tsx` — new
  `leadingIcon` prop for group-by.
- `apps/app/src/components/patterns/floating-action-bar.tsx` —
  clean white elevated pill.
- `apps/app/src/components/patterns/app-shell.tsx` — h-72 lock on
  sidebar header.
- `apps/app/src/features/dashboard/needs-attention-section.tsx`,
  `apps/app/src/features/obligations/status-control.tsx` — minor
  ripple from shared primitive changes.
- `packages/ui/src/components/ui/sheet.tsx` — `SheetFooter` primitive
  pt-4 pb-6.
- `packages/ui/src/components/ui/sidebar.tsx` — collapsed-mode
  alignment + badge overhang.
- `packages/ui/src/components/ui/badge.tsx`,
  `packages/ui/src/components/ui/table.tsx` — small primitive
  refinements supporting cross-table unification.
- `docs/Design/unified-table-surface-vocabulary.md` — addendum
  Sections A–K with the canonical cross-table rules.

## Verification

- `pnpm exec tsc --noEmit` clean
- `vp lint` on every touched file clean (only the pre-existing
  underscore-dangle warnings on orphaned `_PenaltyBreakdownCard`
  family in `obligations.tsx` remain — same warnings the last few
  commits carried)
