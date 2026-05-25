# 2026-05-25 — Phase 3: frames + dead affordances (Today / Alerts)

## Why

Phase 3 of Yuqi's 2026-05-25 89-item review — clusters C (section
frames + page rhythm) and E (dead-looking / mislabeled
affordances). Scoped to Today + Alerts pages; Deadlines's 30 items
will land in their own dedicated phase.

8 items addressed in one commit.

## What changed

### Today page

**#4 — Alerts section needs a frame.** `NeedsAttentionSection`
was rendering as a bare flex column above the work tiles, at the
same visual weight as everything below it. Wrapped in a soft
destructive-tint card (`border-warning-soft +
bg-state-destructive-hover/15` + `p-3`). The eye now lands on
Alerts first, then drops to Actions.

**#5 — Merge "This week's exposure" into "Actions this week".**
Both sections covered the same week scope. The 3 status tiles
("Need decision / Blocked / Waiting on client") now render as a
summary header inside `DashboardActionsList`, between the section
heading and the row list. The standalone `<ExposureStrip>`
component + file were deleted. Skeleton loading state also moved
inside so the section holds its full height during load.

**#6 — "Need your decision" → "In review".** The tile linked to
`/deadlines?status=review` where the column reads "In review";
clicking jumped to a status name the user hadn't seen yet.
Renamed the tile label to match the canonical status name.

**#7 — Arrow icon rotates 45° on hover.** The two `ArrowUpRightIcon`
"View all" / "All deadlines" links now rotate the icon from
45°→90° (up-right → straight right) on hover via
`group-hover/all:rotate-45`. Reads as "follow this link" cue. Same
pattern on both Today links so the affordance is consistent.

**#3 — "View 1 more" + "View all" copy clarified.** Both links
go to `/rules/pulse` (the overflow tile and the section "View all"
link). Renamed the section link from "View all" to "View all
alerts" so both copy variants anchor on the same noun. Doesn't
change behaviour; resolves "do these go to the same place?"
ambiguity.

**#31 — Secondary nav items pinned to sidebar bottom.**
`NavGroupSection` with `muted={true}` (today: Audit log + Settings)
now adds `mt-auto` so the group floats to the bottom of the
sidebar instead of stacking immediately under Clients with no
separation. Pattern matches Linear / Notion sidebars.

### Alerts page

**Alerts #3 — Drop the redundant frame around the filter row.**
Filter row was wrapped in `border border-divider-subtle
bg-background-default p-3`. The page already has outer padding +
the alert cards below sit on the page surface without a frame —
the filters were the only thing in a box. Dropped the frame; the
filters now read as page chrome aligned with the header above.

**Alerts #8 — Clearer change-kind labels.** `changeKindLabel()`
returned single-noun chips ("Scope", "Form", "Deadline", "Filing")
that didn't say what changed. Replaced with verb-phrase / noun-
phrase forms that name the thing and signal motion:

- `deadline_shift` → "Deadline shifted"
- `filing_requirement` → "Filing rule changed"
- `applicability_scope` → "Who it applies to"
- `form_instruction` → "Form updated"
- `new_obligation` → "New rule added"
- `other` → "Other change"

### `docs/Design/dashboard-actions-design-brief.md`

Updated layout diagram + visual-hierarchy ladder to reflect the
new structure (Alerts frame is the heaviest surface; Exposure
tiles merged into Actions header). Per the
`feedback_design_docs_on_change` memory rule.

## Verification

- `pnpm exec tsc --noEmit` clean
- `vp lint` 0/0 (664 files, down 1 from deleting exposure-strip.tsx)
- 23/23 runnable dashboard + pulse tests pass

## Files touched

- new: `docs/dev-log/2026-05-25-phase-3-frames-and-affordances.md`
- mod: `apps/app/src/features/dashboard/needs-attention-section.tsx`
- mod: `apps/app/src/features/dashboard/actions-list.tsx`
- mod: `apps/app/src/features/dashboard/actions-list.test.tsx`
- mod: `apps/app/src/routes/dashboard.tsx`
- mod: `apps/app/src/components/patterns/app-shell-nav.tsx`
- mod: `apps/app/src/features/pulse/AlertsListPage.tsx`
- mod: `apps/app/src/features/pulse/components/PulseAlertCard.tsx`
- mod: `docs/Design/dashboard-actions-design-brief.md`
- del: `apps/app/src/features/dashboard/exposure-strip.tsx`

## Closes Yuqi review items

- Today: **#3, #4, #5, #6, #7, #31** (6 items)
- Alerts: **#3, #8** (2 items)

8 of 89 items closed in this phase. Combined with Phase 1 (7) and
Phase 2 (13), the review is at **28 / 89**.
