# Rules & Audit: primitive reclamation, a11y, dead-flag removal

**Date:** 2026-06-24
**Surfaces:**

- `apps/app/src/routes/rules.library.tsx`
- `apps/app/src/features/rules/RuleCoverageMap.tsx`
- `apps/app/src/features/rules/generation-preview-tab.tsx`
- `apps/app/src/features/rules/rule-detail-drawer.tsx`
- `apps/app/src/features/audit/audit-event-drawer.tsx`
- `apps/app/src/features/audit/audit-log-page.tsx`
- `apps/app/src/features/audit/audit-log-table.tsx`

## Changes

### rules.library.tsx — primitive reclamation

- **OverviewCoverageGaps chips** (~949): raw `<button>` replaced with `<Button variant="ghost" size="sm">`. Preserves onClick, removes hand-rolled focus ring and hover classes.
- **OverviewCaughtUpCard links** (~1175, ~1179): `<button className={linkClass}>` pattern replaced with `<TextLink variant="accent" size="sm">`. The `linkClass`/`linkArrowClass` variables removed entirely.
- **High-severity pill** (~905): hand-rolled `<span className="... rounded-full bg-state-warning-hover ... text-caption-xs ...">` replaced with `<Badge variant="warning">`.

### rules.library.tsx — a11y (entity coverage matrix)

`EntityStateCell` and `EntityApplicabilityCell` rendered `aria-hidden` dots/dashes/icons with no text alternative. Added `<span className="sr-only">` labels in every branch:

- not_applicable → "Not applicable"
- count=0 → "No rules"
- pendingReviewCount>0 → `aria-label="{N} of {total} pending review"` on the wrapping span
- applicable (count>0, no pending) → `aria-label="{N} applicable"`
- CheckIcon (active) → "Applicable"
- CircleIcon (review) → "Pending review"
- dot (destructive/muted) → "Applicable"

### rules.library.tsx — dead flag removal

`SHOW_COVERAGE_MAP = false` constant removed. The `if (SHOW_COVERAGE_MAP) { <two-column layout> } else { <OverviewReviewBreakdown> }` ternary collapsed to the `else` branch rendered directly. The `RuleCoverageMap` import and `coverageByJurisdiction` wiring kept intact for easy restore.

### rules.library.tsx — font-weight sweep (semibold→medium on non-titles)

Demoted to `font-medium`:

- Jurisdiction code chip in recent-changes list row (data)
- UPDATED/NEW/EFFECTIVE status pill text (data label)
- Entity filter tab count
- Coverage stat tooltip count
- Badge labels in bulk-review modal ("Awaiting review" / "Active")
- Stat value in the mini-stat card component (`text-xl tabular-nums`)
- Jurisdiction code chip in bulk-accept rule list

Kept `font-semibold` (titles):

- "# jurisdiction has a coverage gap" section callout
- Rule title in recent-changes row (`tracking-title`)
- "Review queue is clear" page heading (`tracking-title`)
- "# rules need your review" section callout
- Jurisdiction group label (e.g., "New York") in coverage matrix
- `<h2>` rule title in detail header
- `DialogTitle` elements

### features/rules/ — font-weight sweep

- `RuleCoverageMap.tsx`: tilegram count chip → `font-medium`
- `generation-preview-tab.tsx`: rollover stat value (`text-lg`) and rollover date cell (`text-base`) → `font-medium`
- `rule-detail-drawer.tsx`: entity count in fact rows → `font-medium`; author name in review notes → `font-medium`; error code chip → `font-medium`; deadline/entity-type stat values (`text-lg`) → `font-medium`; per-entity count in impact modal → `font-medium`; "Primary" badge → `font-medium`

Kept `font-semibold` (section titles): `<h3>` cards, `DialogTitle`, matched-pulse-block section header.

### audit-event-drawer.tsx — connection fix

`auditEntityHref()` returned `null` for `pulse_alert`, `pulse_firm_alert`, and `pulse_application` entity types, making alert audit rows dead-ends in the drawer. Mapped them to `/alerts?alert=<entityId>`.

### audit-log-page.tsx — Card demote + CountPill

- Removed tutorial `CardDescription` ("Search by actor, entity, action…") from the Audit filters card — controls are self-evident.
- Replaced `<Badge variant="outline">` event count in `CardAction` with `<CountPill tone="neutral">`.
- Added `CountPill` import.

### audit-log-table.tsx — a11y button

- `<div role="button" tabIndex={0} onKeyDown={handleKeyDown}>` promoted to real `<button type="button">`. Added `w-full text-left` to maintain layout.
- Removed hand-wired `handleKeyDown` (Enter/Space now handled by the browser natively).
- Removed unused `KeyboardEvent` type import.

## No-ops / decisions

- **audit-log-page.tsx `max-w-page-wide`** (target 9): INTENTIONAL. The audit log is a single-pane (no split rail) page. `max-w-page-wide` is also used on `/billing`, `/billing/checkout`, and `/migration/new` for the same reason. Leaving aligned with billing pages.
- **OverviewReviewBreakdown jurisdiction cards** (~856): the large card-shaped `<button>` wrapping StateBadge + prose content is left as-is. `<Button>` imposes fixed h-sizing incompatible with the variable-height card layout. The element is already a correct, accessible `<button type="button">` — the raw-button smell here is layout complexity, not a primitive gap.
