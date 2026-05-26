# Sixty-ninth pass — cross-page feedback round

**Date:** 2026-05-26
**Branch:** `design/filed-strip-dedup`
**Scope:** Three-page feedback round from Yuqi spanning Today,
Deadlines, and Rule library. Every item addressed.

## Today (`/`)

### #1 — NeedsAttentionSection background "太浅了，看不出"

The alert-state background was `bg-state-destructive-hover/25` —
basically transparent over the page surface. Promoted to a real
solid `bg-state-destructive-hover` plus a destructive border so
the section actually reads as "this is the alerts zone." Empty
state keeps the neutral tint but gains a subtle border so the
section has a shape regardless of count.

### #2 — ActionRow arrow color by status

The leading `ArrowRightIcon` was a uniform `text-text-tertiary`
across all rows. Tinted it via the canonical `STATUS_ICON_COLOR`
map exported from `status-control.tsx`:

- Blocked → `text-text-destructive`
- Waiting on client → `text-text-warning`
- Review / In progress / Extended → `text-text-accent`
- Done / Paid / Completed → `text-text-success`
- Pending / Not applicable → `text-text-tertiary`

Carries the urgency cue at the row's leading edge so the eye
reads "what's this row asking me to do" without first parsing the
right-edge Status badge. Expanded state still pushes the arrow to
`text-text-primary` so the rotated-down cue stays legible on
neutral rows.

## Deadlines (`/deadlines`)

### #1–3, #5, #6, #7 (carry-over)

All previously addressed across the sixty-sixth/seventh/eighth
passes:

- **#1** Unassigned `?` → AssigneeQuickPicker DropdownMenu (with
  scope footer)
- **#2** Cell middle alignment → defensive `align-middle` reinforced
  at the call site
- **#3** BlockedByChip icon → tone aligned to label
  (`text-text-secondary`)
- **#5** RejectionChip → shadow + icon dropped in full mode (compact
  mode keeps icon as the only content)
- **#6** DueDaysPill → Info icon removed
- **#7** DueDaysPill flex → `gap-1.5 → gap-2`

### #4 — Select dropdown interaction (finally landed)

Two remaining Base UI Selects in `obligations.tsx` converted to
DropdownMenu so the queue's full dropdown family shares one
interaction model:

1. **Export modal client picker** (line ~3829) — list-of-many
   dropdown. Trigger styled like a form select with a chevron;
   the popup uses `DropdownMenuRadioGroup` so keyboard + click +
   focus behavior matches Sort-by + Columns.
2. **Tax year type calendar/fiscal** (line ~6172) — binary
   choice. Same DropdownMenu pattern.

The `Select / SelectContent / SelectItem / SelectTrigger /
SelectValue` imports are gone from the file — no Base UI Select
remains in the obligations queue.

## Rule library (`/rules/library`)

Four items, all in `GroupedRulesTable` + the flat-rules search
result table.

### #1 — Inherit styles from Deadlines / Today / Alerts

The library table was running its own hand-rolled chrome. Now the
table sits inside a `flex flex-col gap-3` wrapper with a toolbar
row above the table (jurisdiction count + Expand-all). The Table
itself uses the primitive defaults — same shape /deadlines
queue uses.

### #2 + #3 — Table header style + text style match /deadlines

Both TableHeaders (grouped view + flat search-result view) had
className overrides that forced the old kicker style
(`text-caption-xs uppercase tracking-wider text-text-tertiary`).
Those are gone. Headers now inherit the TableHead primitive
default (`text-sm font-medium normal-case text-text-secondary`)
that /deadlines and /alerts already use post inset-followups H.
Header BG is the primitive's `bg-background-subtle` (also
matching /deadlines).

### #4 — Expand all button outside the table

Was buried inside the rightmost TableHead, sitting next to the
"Tier" column label — a control inside a column label cell. Now
lives in the toolbar row above the table, next to the
jurisdiction count. Discoverable as a table-level action, not a
column-cell affordance.

## Verification

- `pnpm check` — 0 errors, 9 pre-existing warnings (unchanged).
