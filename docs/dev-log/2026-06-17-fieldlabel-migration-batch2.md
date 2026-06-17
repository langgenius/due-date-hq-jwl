# FieldLabel migration — batch 2 (full safe-surface sweep)

_2026-06-17_

Continues [batch 1](2026-06-17-fieldlabel-migration-batch1.md). With Yuqi's call to
grind ALL remaining clean labels **and** also migrate the three ambiguous
categories (table column headers, `<h3>` heading-labels, 13px `text-caption`
headers), this batch sweeps the rest of the safe surfaces — **49 sites across 19
files** (batch 1 + batch 2 = 65 sites / 23 files).

## Decisions applied (Yuqi)

- **Clean span/dt/div labels** → `FieldLabel` group (11px B1) / field (12px B2),
  color + layout preserved, only size/weight/tracking normalized to the register.
- **Table column headers** → keep `<TableHead>` (+ its width/align classes), wrap
  the content in `<FieldLabel variant="group">` (AnnualRolloverDialog, rules.library
  entity matrix).
- **`<h3>`/`<h2>` heading-labels** → demoted to `as="div"` FieldLabels
  (Step4Preview "Clients to create"/"Before you import", settings.tsx, dialogs.tsx).
  Accepted a11y tradeoff: these were small-caps _labels_, not prose titles.
- **13px `text-caption` headers** → normalized to group (11px): the /deadlines
  banner eyebrow, generation-preview column band.

## Files

rules.library, generation-preview-tab, rules-console-primitives, states-rail,
obligations/queue/{dialogs,components/primitives}, AnnualRolloverDialog, AlertCard,
AlertsListPage, audit-log-table, Step2Mapping, Step4Preview, settings.permissions,
settings, practice, readiness, not-found, settings-sub-nav, routes/obligations.

## Name-collision handling

Three files (`obligations.tsx`, `queue/dialogs.tsx`, `routes/practice.tsx`) already
import a DIFFERENT `FieldLabel` from `@duedatehq/ui/components/ui/field` — the
form-control label used with `htmlFor` inside `<Field>`. The canonical caps
primitive is imported there under an alias (`CapsFieldLabel` / `CapsLabel`); the
existing form-control `FieldLabel` usages are untouched.

## Deliberately NOT converted (correctly skipped)

- **Badges / pills / chips** (`<Badge>`, `rounded-* + px + bg` chips) — different
  primitive (ChecklistItemRow, rejection-chip, severity pills, recent-change pills,
  the /deadlines authority+state row badges).
- **`<label htmlFor>` form-control labels** — `FieldLabel` doesn't forward
  `htmlFor`; converting would break the label↔control link. Left as-is. _(Follow-up:
  add `htmlFor`/`...rest` to FieldLabel if we want these on the primitive too.)_
- **`<DropdownMenuLabel>`** menu section labels — their own menu primitive.
- **`text-sm` (14px) header bands** and **`tabular-nums` count values** — not field
  labels.
- **`text-column-label`-token labels** — already canonical (not hand-rolled drift).
- **`cn(...)` ternary fragments** where label classes split across the ternary,
  unless the whole className was on one standalone element (those converted, color
  preserved).
- **The alert/deadline detail drawers** — still deferred (churned by the unpushed
  remote + parallel session).

Verified: typecheck 0; obligations.tsx 0 lint errors (9 pre-existing warnings
across the touched files, unchanged); full suite 544 pass / 2 skipped (77 files);
live `/deadlines` banner eyebrow renders 11px/uppercase/600/flex (group, layout
preserved), `/notifications/preferences` labels correct, no console errors.

## Remaining

The detail-drawer labels (~43, `ObligationQueueDetailDrawer` / `panels` /
`AlertDetailDrawer`) once those files settle. The one-line `field` tracking
reconciliation (`tracking-wide` → `tracking-eyebrow`) noted in the canon is still
open.
