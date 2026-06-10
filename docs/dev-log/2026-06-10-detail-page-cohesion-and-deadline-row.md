# Dev log — detail-page cohesion + shared DeadlineRow (2026-06-10)

Yuqi: "ensure … the Alert detail, Deadlines detail, Clients detail, and Rule
Library detail are consistent and design-wise aligned … obviously from the same
design system." Plus: replicate the Pencil deadline detail (`Qn4nX`) 100%, and
"read docs/Design/deadline-row-interaction.md to execute."

Frontend-only. No contract/schema/mutation changes. `tsgo` clean throughout.

## Cross-page cohesion — the shared `DetailSectionCard`

The gray-header-band card (`components/patterns/detail-section-card.tsx`, landed
earlier this session) is now the single section-card primitive across the
detail surfaces, so every page reads as one system:

- **Rule Library detail** (`features/rules/rule-detail-drawer.tsx`) — the flat
  bare-`<h4>` reference sections (Applicability · When it's due · Extension ·
  Evidence · Practice review · Version history) now render through
  `DetailSectionCard` (gray header band + count/meta in the header-right slot),
  matching the alert + deadline detail. The decision footer
  (`CandidateReviewSection`) intentionally stays flat (it's the sticky commit
  surface, not a reference card).
- **Penalty exposure** (`features/obligations/detail/PenaltyExposureCard.tsx`) —
  swapped its hand-rolled card chrome for `DetailSectionCard`; header bg
  corrected `#f2f4f7 → #f9fafb` (`background-section`) to match the Pencil
  `u2jxP` + the rest of the cards.

## Deadline detail — Pencil `Qn4nX` date cards

`features/obligations/queue/components/panels.tsx`: the standalone-page `'cards'`
variant of `PrimaryDeadlineStrip` now renders a dedicated `DeadlineDateCard`
(was reusing the frameless flat `DeadlineTile`) matching `MuJyP`/`QMQgD`/`ZSK1V`:

- Leading icon per card (`calendar-x` / `target` / `wallet`), uppercase
  `11/600` label, `22/600` prettified date (`alwaysShowYear`), and a
  `weekday · relative` sub-line (red when overdue/slipped, warning for payment).
- The Filing card flips to the warm `state-warning-hover` (#fff4f1) tint with a
  warning-tone icon when overdue.
- The flat variant (`/clients` + sheet contexts) is unchanged.

## Shared `DeadlineRow` component (Phase 1 of deadline-row-interaction.md)

NEW `features/obligations/queue/components/DeadlineRow.tsx` — the single shared
obligation-row per the interaction spec. Built but **not yet wired** (Phase 2,
the `/clients` panel integration, is a follow-up):

- 4 modes (`navigate` · `inline-expand` · `drawer` · `navigate-to-audit`); the
  title link always navigates (Cmd+click → new tab).
- All 7 click targets with `stopPropagation` on every nested control so pills /
  owner never trigger the row body; keyboard parity (Enter/Space/←→/Esc) + ARIA.
- Overdue left destructive rule + inline penalty exposure (§7.1).
- Inline expansion: workflow journey strip + readiness/evidence signal +
  Mark-filed / Reassign / Snooze actions + Open-full link.
- **Deferred per §11** (procedures don't exist): Section B recent-activity and
  Section C per-item todos render as "→ full page" links / a readiness summary
  instead. No backend procedures added.

Reuses existing primitives throughout: `AssigneeAvatar`, `DueDaysPill`,
`ObligationStatusReadBadge`, `TaxCodeBadge`, `deadlineDetailHref`.

Spec: `docs/Design/deadline-row-interaction.md` (committed alongside).

## Follow-up — deadline detail feedback polish (Yuqi /deadlines/:id batch)

- **#7 date cards smaller**: `DeadlineDateCard` tightened — `px-4 py-3`, 16px date
  (was 22), 11px sub — so the strip stops dominating the header.
- **#8 stepper caption**: "Past deadline" / "Expected" dropped to 8px (smaller
  than the 9px date above) + `text-muted` (lighter).
- **#9 unreached stages**: stages not yet reached render as an empty circle (no
  glyph), per Pencil `aNMRF` — only done / active / skipped carry an icon.
- **#5 tidy / #6 displaced**: the header chip row dropped its trailing
  `items-baseline` meta span (duplicated the "Tax year · period" line above and
  sat baseline-misaligned against the h-6 chips). Reduced to just the
  JurisdictionLabel seal, aligned with the chip row.
- **#13 sticky action bar (+ #1/#5)**: the alert-style sticky bottom action bar
  now renders in page mode too (was `!isPageMode`) — Last updated · Copy link on
  the left, Assign · Snooze · Mark filed on the right. The page hero dropped its
  top action cluster (moved to the bar), shortening the header so more detail is
  readable. Footer surface is white in page mode (gray body), warm in panel.
- **#10 active-stage eyebrow (Pencil `iTasJ`)**: the plain stage-label heading on
  `ActiveStageDetailCard` became the design's eyebrow row — a canonical
  `ObligationStatusReadBadge` status pill + "Stage N of 6" + sub-status (reusing
  the same pill the row/queue use). (Materials progress block landed earlier;
  action-stack restyle + BLOCKING panel still pending — needs a loading waiting
  deadline w/ checklist to verify.)

## Follow-up — alert detail footer one-line (Yuqi "should ALWAYS be in one line")

- `DrawerActions` dropped `flex-wrap` (outer row + secondary cluster) → the
  footer's secondary actions (Copy draft · Dismiss) + primary CTA (Mark
  reviewed / Apply) now stay on a single line. Secondary group can shrink
  (`min-w-0`); the primary CTA cluster is `shrink-0` so it's always flush-right
  and fully visible. The alert right panel already carries `bg-background-subtle`
  (gray wash, white cards pop) per Pencil `irBJ8`.
- **"What's left to do" → own card (Yuqi "the style is different")**: pulled the
  checklist OUT of the white workflow box (where it was a bare uppercase eyebrow)
  into its own gray-header `DetailSectionCard` ("N of M complete" right-meta),
  matching Pencil `bmwHb` + the rest of the panel's card system. The workflow
  card stays the headerless hero (stepper + active-stage), per Pencil `Y8xrR`.

## Client Work tab → DeadlineRow inline-expand (Yuqi pick "a")

Phase 2 of deadline-row-interaction.md, integrated into the existing panel
(grouping + multi-select + bulk bar preserved):

- `ClientDetailWorkspace`: new `obligations.list` query filtered by `clientIds`
  (returns `ObligationQueueRow[]` with assigneeName/daysUntilDue/readiness that
  `DeadlineRow` needs) + a `nuqs` `?expanded=` param (strict accordion). The
  existing `listByClient` still feeds the work-plan summary.
- `ClientWorkPlanPanel` retyped to `ObligationQueueRow`; `FilingPlanYearSection`
  swaps its `<Table>` (Form/Internal/Official/Status columns, inline status
  picker, kebab, column-sort) for `<DeadlineRow mode="inline-expand">`. The
  table's inline controls are redistributed into the row expansion (Mark filed
  etc.), per the spec. Year-group header keeps the select-all; panel sort still
  orders rows; multi-select still drives the bulk bar.

Verified live on /clients/lone-star-…: 3 DeadlineRows render, body click expands
inline + sets `?expanded=`, the expansion region renders. tsgo clean.
NOTE: table removal left some now-unused imports in the panel (lint-level, not
type errors) — tidy follow-up.
