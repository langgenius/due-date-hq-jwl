# 2026-05-25 — Pulse / Deadlines / Rule library fourth pass

## Why

Three pages of fresh feedback arrived in a chain:

1. `/rules/pulse` — 9 items (alert card restructure, dropdown
   appearance, chip shrink, drawer-as-panel)
2. `/deadlines` — 3 items (drop redundant header label, pagination
   placement, multi-deadline grouping)
3. `/rules/library` — 13 items (table widths, section header
   alignment, progress-bar text alignment, dialog header
   restructure, jurisdiction marker consistency)

This is a continuation pass: many items revisit previous fixes
that didn't go far enough (chips, widths, dialog title). The
common theme is the StateBadge SVG primitive — Yuqi wants it
**everywhere** a US-jurisdiction appears, so the Pulse drawer,
Alerts list, /clients States column, Rule library group headers,
and Rule detail dialog kicker all now share the same flag/seal
motif.

## Shipped — /rules/pulse (8 items)

### #1 — State chips shrunk again (third compression)

Previous compression went text-sm → text-xs with an inner h-4
count chip. Yuqi flagged the result as STILL too big and the
"NY1" reading-as-one-token problem. Dropped the inner chip
entirely; count is now inline tabular-nums text-tertiary
separated by a real space from the code. Outer padding tightened
`py-0.5 pl-1 pr-1.5` → `py-0 pl-1 pr-2`. Each chip collapses to
its natural badge-height (~24px).

### #2 — Card lists actual client names

Was: `5 clients may be affected · 1 need review`. Now: up to 3
client-name chips inline + `+N more` overflow + a meta line
below carrying the count + needs-review tail. Reads the actual
clients at a glance instead of forcing the CPA to open the
drawer for the same info.

Data: pulled from the existing per-alert detail query the dashboard
NeedsAttentionCard already uses. React Query caches per-alert so
hover/scroll doesn't re-fetch.

### #3 — Review button always on top

Action column reordered: Review (primary) now sits at the TOP of
the stack; Snooze + Dismiss follow below as ghost siblings. Eye
finds the primary CTA at the same vertical anchor across every
card row.

### #4 — Bigger gap between content + actions

Outer `gap-4` → `gap-6` between the content column and the action
stack. The two halves now read as deliberately separated columns.

### #5 — Source badge at the END of the title

`PulseSourceBadge` moved from a standalone row below the title
into the title row, trailing the h3 (just before the change-kind /
confidence / status badges). Reads: jurisdiction → title → source
→ chips, all on one headline.

### #6 — Filter dropdowns no longer look disabled

The Select primitive's default `bg-components-input-bg-normal` +
muted text made the filter dropdowns read as greyed-out / disabled
to Yuqi. Overrode at the call site with `border-divider-strong
bg-background-default text-text-primary
hover:bg-state-base-hover` — the four filters on /rules/pulse now
read as real outline buttons. Primitive itself untouched so other
consumers (settings forms, etc.) are unaffected.

### #7 — Reset button drops the icon

`<FilterXIcon data-icon="inline-start" />` removed. The word
"Reset" is self-evident; the icon was redundant.

### #8 — Card chrome: no border, light-gray bg

Was: `border border-divider-subtle bg-background-default` (white
bordered tile). Now: no border, `bg-background-subtle` (light
gray surface). Hover lifts to `bg-state-base-hover` so the
interactive cue still lands.

### #9 — Drawer-as-page-panel — **deferred**

Yuqi wants the Pulse review drawer to behave like the Deadlines
inline panel + Rule library Dialog: a true page-level right
column that splits the body, not a Sheet that overlays the page
with a backdrop. This is an architectural refactor (drawer ↔
panel ↔ provider routing) parallel to the work that promoted the
obligation drawer to a portal-mounted shared provider. Captured
for a dedicated commit — out of scope here.

## Shipped — /deadlines (1 item)

### #1 — "Filter by status" eyebrow removed

The eyebrow caption above the scope tabs ("Filter by status") was
duplicating what the tabs themselves communicate (the tab labels
_are_ status names). Cleaner without it; the tabs now anchor the
sticky filter bar directly.

### #3 — Pagination footer floats outside the frame

Was `sticky bottom-0 -mx-1` which pinned the pagination controls
to the viewport bottom and visually overlapped the last data row.
With client-side page-flipping (already in place) the user
navigates by page, not by scroll — so the sticky pin wasn't
buying us anything. Dropped both `sticky bottom-0` and `-mx-1`
so the footer sits as a static block immediately below the table
frame. `mt-auto` retained so the footer still pushes to the
bottom of a short-table flex column.

### #2 — Multi-deadline grouping — **deferred** (feature build)

"More obvious grouping of client's deadlines" wants a collapsible
client-row that nests its multiple deadlines underneath. This is
a half-day+ feature — new row type, expand state, column-span
logic, sort interactions. Captured in the deferred ledger;
parking until prioritized.

## Shipped — /rules/library (10 of 13 items)

### #1 — Section header explicit left-align

Defensive `pl-3 text-left` on the colspan TableCell so the
"NEEDS REVIEW" / "ACTIVE" / "MISSING RULES" labels always
anchor at the cell's left padding regardless of any inherited
text-center default for colspan cells.

### #2 + #7 — Rule column wider (42% → 52%)

Fourth time asked for. 52% takes most of the table width;
entity dot columns stay fixed at 48px each.

### #3 — Form column narrower (120px → 96px)

"7004" and "1120-S" fit comfortably in 96px; longer codes
truncate with title-tooltip fallback. Reclaimed 24px goes to the
Rule column.

### #4 + #11 — Progress bar needs-review text left-aligned

Was `justify-end` on the warning-amber segment (pushed the label
to the bar's far right edge). Now `justify-start` so the "N need
review" label sits at the LEFT edge of its segment, immediately
adjacent to where the active segment ends. Reads as two adjacent
labels, not "active on left, label on far right."

### #5 + #12 — Start Review count chip white bg

Chip background was `bg-state-accent-active-alt/40` — translucent
deeper accent that, sitting inside the primary-blue button, picked
up enough red that Yuqi kept reading the whole button as red /
destructive. Solid `bg-background-default` (white) chip + accent
text reads cleanly as a "count inside a primary CTA" — same
pattern GitHub uses on "Open N issues."

### #6 — GroupHeader uses StateBadge primitive

The state group header rendered jurisdiction as `Badge
variant="secondary"` with mono text "CA" / "FED". Swapped to the
StateBadge SVG primitive (matching /clients States column, Alerts
chip strip, Pulse drawer). 2-letter code stays as a label after
the SVG so the row remains keyboard-typable.

### #8 + #10 — Dialog header restructured

Yuqi flagged the previous third-pass dialog header as still
"chaotic, no section."

- Title moved ABOVE the kicker (was kicker → title) so the eye
  lands on the rule name first, then the identity-meta as
  supporting context below
- Title bumped `text-lg` → `text-xl` — bigger anchor
- Kicker/title gap `gap-2` → `gap-3` so the two read as distinct
  sections
- Header surface picks up `bg-background-subtle` so the section
  visually separates from the scrollable body content

### #9 — Kicker uses StateBadge primitive

Same swap as #6 — Dialog header kicker's jurisdiction marker
upgraded from mono-text Badge to the StateBadge SVG. One visual
grammar for "this is a jurisdiction" across every rule-library
surface (group header, kicker, /clients column, Alerts chips,
Pulse drawer).

### #13 — Same card summary on /opportunities — **already shipped**

Already landed in the previous /clients + /opportunities sweep
(commit `4eff0930`). `OpportunitiesStatTile` mirrors the rule
library `StatTile` shape and is now used on the /opportunities
page. No-op.

## Files touched

- `apps/app/src/features/pulse/components/PulseAlertCard.tsx`
- `apps/app/src/features/pulse/AlertsListPage.tsx`
- `apps/app/src/routes/obligations.tsx`
- `apps/app/src/routes/rules.library.tsx`

## Verification

- `vp check` → 1449 files formatted, 0 lint/type errors in 667
  files

## Genuinely deferred

- **/rules/pulse #9** — Drawer → page-level right panel.
  Architectural refactor mirroring the obligation drawer
  promotion. Out of scope.
- **/deadlines #2** — Multi-deadline collapsible client grouping.
  Half-day+ feature build with new row type + expansion + sort
  interaction.
