# 2026-05-25 — Status-pill + info-icon cross-surface audits

## Why

Two of the genuinely-deferred items from the ledger needed
discovery work before code could move:

- **Library #9** — cross-surface status-pill audit
- **Alerts #10** — info-icon audit

Yuqi greenlit both. This commit lands the survey docs that
establish the unified target for each before the refactors that
follow.

## Status-pill audit (`docs/Design/status-pill-audit-2026-05-25.md`)

Catalogued **15 status-pill families** — more than the four the
ledger anticipated. Surprises:

- Rule library's bespoke `RuleStatusKicker` /
  `RuleStatusBar` / `EntityStateCell` /
  `EntityApplicabilityCell` quartet — each renders status with
  its own color logic, not the Badge primitive
- Lifecycle-v2 `RejectionChip` + `BlockedByChip` bypass the
  Badge primitive entirely
- Four ad-hoc status badges buried in `routes/obligations.tsx`
  (Insight / ReadinessResponse / Preparing / materials)

### High-severity findings

1. **"Review" is rendered THREE different ways** — blue chip in
   the obligations queue, blue-text kicker in the rule detail,
   amber in `EntityStateCell` + `CoverageCell`, red in
   materials. Same semantic concept, four tones.
2. **Amber means 5+ different things** — "waiting on client"
   obligation status, "needs review" rule status, "missing
   facts" client banner, "pending" lifecycle review, "snoozed"
   alert. No way for a CPA to learn that amber = X.

### Unified ladder proposed

Tone → meaning:

- **success** (green) → terminal success states (active rule,
  filed obligation, completed)
- **info** (blue) → "needs human review" / in-flight progress
- **warning** (amber) → blocked-by-external (waiting on
  client, snoozed)
- **destructive** (red) → unrecoverable / hard error (missing,
  rejected, blocked-not-deferred)
- **secondary** (neutral) → identity / non-status facts
  (entity type, jurisdiction)
- **outline** (hairline) → reserved for filters + togglable
  states only

Shape → category:

- **Filled chip** (Badge default/variant) → live status
- **Outline chip** → toggleable filter state
- **Bare-icon + label** (no chip chrome) → kicker / contextual
  meta
- **Progress-bar segment** → aggregate counts inside a strip

Ornament rule: filled-chip uses icon (no dot); outline-chip
allows leading dot; filled+dot is redundant and should be
dropped.

### Concrete next-step recommendations (10 items)

Top three highest-leverage:

- **#1** point `actions-list.tsx` at the canonical
  `ObligationStatusReadBadge` (kills 1 duplicate badge
  implementation)
- **#2–#3** flip rule-library review tone amber → blue in
  `EntityStateCell` + `CoverageCell` so "review" reads the
  same everywhere
- **#6** replace `RejectionChip`'s bespoke palette with the
  `destructive` Badge variant

Full list with file + line citations in the doc.

## Info-icon audit (`docs/Design/info-icon-audit-2026-05-25.md`)

24 usages catalogued. The good news:

- **A canonical primitive already exists** — `<ConceptHelp>` /
  `<ConceptLabel>` in
  `apps/app/src/features/concepts/concept-help.tsx` is used 24
  times across 11 files. `CircleHelpIcon` at `size-3.5` inside
  a focusable `size-6` button, opens a Popover with typed
  concept dictionary content. This is the correct shape.

The bad news: three one-offs drift from it.

1. `features/dashboard/actions-list.tsx:722` — lucide `Info`
   (wrong icon), `size-3` (smaller), bare `<span title=…>` (not
   keyboard-focusable). Should route through `ConceptHelp
concept="smartPriority"`.
2. `features/migration/Step2Mapping.tsx:351` —
   `CircleHelpIcon` rendered in `text-text-destructive`. The
   icon isn't an error, it's an explainer.
3. `features/rules/generation-preview-tab.tsx:797` —
   `RolloverHelpTooltip` uses Tooltip for 60–100+ char
   glossary content (13 callers). Tooltip clips long text;
   should be Popover, ideally folded into `ConceptHelp` with
   new concept IDs.

### Six redundant popovers stack the same concept on the same screen

Most notably `routes/practice.tsx:520` repeats `smartPriority`
23 lines after a CardTitle popover; `auditTrail` fires three
times on `/audit` (PageHeader, export-dialog title, "Event
stream" CardTitle). Drop the duplicates — one explainer per
concept per screen.

### False positive

Lucide `Info` at `routes/obligations.tsx:3306` is the
late-days urgency mark, not an info affordance. Flagged in the
inventory so future readers don't conflate.

## What's next

These audits are the prerequisite for the next two commits in
the deferred-ledger sweep:

- A "status-pill unification" pass that applies the 10
  recommendations from the status-pill doc
- An "info-icon cleanup" pass that drops the three drifters
  onto `ConceptHelp` + removes the six redundant popovers

Those will come as separate commits so the audits ship now and
the refactors land with their own commit-level scope.

## Files touched

- `docs/Design/status-pill-audit-2026-05-25.md` (new, 265 lines)
- `docs/Design/info-icon-audit-2026-05-25.md` (new, 232 lines)

No code changes. Audits only.
