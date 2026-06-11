# Deadline detail — differentiate + demote the three date cards

Date: 2026-06-10
Surface: `/deadlines/:ref` (page mode) — `PrimaryDeadlineStrip` `variant==='cards'`
File: `apps/app/src/features/obligations/queue/components/panels.tsx` (only)

Design critique: the prime horizontal band was THREE date cards
(`DeadlineDateCard`) that all showed the SAME date ("May 12, 2026") with a
generic `weekday · relative` subline. They dominated the header, out-shouting
the workflow card + primary CTA, and read as three identical heavy tiles.

Scope: ALL changes are inside the `cards` variant + its private
`DeadlineDateCard` component. The `flat` variant (panel/sheet mode for /clients,
via `DeadlineTile`) is untouched.

## 1. Differentiate each card using REAL row fields only (no fiction)

Each card now carries a card-specific line drawn from a field that already
exists on `ObligationQueueRow`:

- **FILING DEADLINE** — the hard date (`filingDueDate ?? baseDueDate`) + its
  overdue/relative clock. No penalty line: there is no clean per-row
  filing-penalty scalar (`estimatedExposureCents` is exposure, not a filing
  penalty), so per the no-fiction rule the card stays minimal.
- **INTERNAL TARGET** — the date + the firm's **buffer**: days between the
  internal target and the filing deadline, computed from the two real ISO dates
  via `daysBetween`. Renders "On the filing deadline" when equal, else
  "N days before filing". Plus its own overdue clock when past.
- **PAYMENT DUE** — the date + **$ owed** (`row.estimatedTaxDueCents` via
  `formatCents`, gated on `> 0`) + its own overdue clock.

When a card has no distinguishing real field (filing / a row with no $ /
internal == filing) the extra line is simply omitted — nothing fabricated.

## 2. Wording + off-by-one fix

Before: filing/internal said "N days **past**" (from `dayDiff` midnight math)
while payment said "N days **overdue**" (from `paymentOverdueDays` real-now
math) — inconsistent verb AND a 29-vs-30 off-by-one from the two different
bases. Now a single `clockFor(iso)` helper produces every card's clock from ONE
vocabulary (`formatDaysOverdue` → "N days overdue" for past, "in N days" /
"due today" for future) and ONE math base (`dayDiff`, midnight). Each card still
counts against ITS OWN date, so the counts are individually correct AND the
phrasing is uniform. Satisfied/terminal milestones drop the clock (a filed row's
filing date is not "overdue"); payment also drops it on completed/paid/n-a.

## 3. Demoted visual weight

`DeadlineDateCard` chrome lightened so the strip reads as reference, subordinate
to the workflow card + CTA:

- date type 16px → `text-sm`; label `text-xs` → `text-caption-xs`; clock/meta at
  `text-caption-xs`.
- surface `bg-background-default` → `bg-background-subtle`; padding
  `px-4 py-3` → `px-3.5 py-2.5`; no shadow (border + bg contrast only).
- overdue cards keep a restrained `state-warning-hover` tint as the only state
  cue.

## Secondary (verified, no change needed)

- `PathToFilingSummary` active stepper node is `bg-state-accent-solid` by
  default and only `bg-state-destructive-solid` when `overdueActive` (active +
  past internal due + non-terminal) — already correctly conditional.
- `ActiveStageDetailCard` "Steps" sub-list renders the CURRENT stage's
  sub-status pipeline (efile / payment / review keys via `pipelineStateOf`),
  distinct from the macro lifecycle stepper, with actions only on the current
  step. Already correct.

## Constraints / verify

- Tokens only, fixed radius scale (rounded-xl = 12), restrained shadows (none),
  i18n via `<Plural>` / `t` (no new `plural()`+`i18n._` footgun beyond the
  pre-existing helper usage pattern).
- `tsgo --noEmit`: clean. `vp test run obligations`: 89/89 pass.
  `vp fmt --write`: applied.
