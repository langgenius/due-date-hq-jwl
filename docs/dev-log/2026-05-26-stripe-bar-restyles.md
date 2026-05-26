# Stripe-bar visual restyles — S14 / S9 / S4

**Date:** 2026-05-26
**Branch:** `design/stripe-bar-restyles-2026-05-26`
**Scope:** Three pure-visual restyles inspired by the Stripe dashboard
language. No content changes — same routes, same data, same actions,
same row counts. Pulled from `docs/Design/stripe-level-critique-2026-05-26.md`
§1 patterns S14 (multi-color stacked bar), S9 (success-pill check
icon), S4 (filter "+" chips).

## Task S14 — multi-color stacked progress bar on /rules/library

**File:** `apps/app/src/routes/rules.library.tsx`

The top-of-page completion meter on /rules/library was a two-tone
bar — green (active count) LEFT and amber (needs-review count)
RIGHT, with everything else collapsed out of the picture.
`verified`, `candidate`, `rejected`, `archived`, `deprecated` rules
were either folded into "active" or completely invisible.

Restyled to a Stripe-style multi-color stacked bar: one segment per
`RuleStatus` with > 0 rules in the catalog, widths proportional to
each status's share of the total. Same h-7 rounded-md container
chrome. Reading L→R gives a finer maturity story:

- `active` → `bg-state-success-hover` / `text-text-success`
- `verified` → `bg-state-accent-hover` / `text-text-accent`
- `pending_review` → `bg-state-warning-hover` / `text-text-warning`
- `candidate` → `bg-state-base-active` / `text-text-secondary`
- `rejected` → `bg-state-destructive-hover` / `text-text-destructive`
- `archived` / `deprecated` → `bg-divider-regular` / `text-text-tertiary`

All tokens already in the design system — `STATUS_TONE` and
`EntityStateCell` use the same status→tone mapping elsewhere in
this file.

Each segment shows its label + count when the segment is ≥ 18 %
wide; below that it falls back to count-only. Full breakdown
lives in the `title` tooltip + `aria-label`.

**Data flow:** added a `statusCounts: Record<RuleStatus, number>`
memo in `RulesLibraryRoute`, replacing the previous `totalActive` +
`totalPendingReview` props on `StatsBar` and `RuleReviewProgressBar`.
Both legacy props were only used to feed this one bar; no other
consumer.

## Task S9 — success-pill green tint + check icon

**Files:**
- `packages/ui/src/components/ui/badge.tsx`
- `apps/app/src/features/obligations/status-control.tsx`

The canonical `Badge` `success` variant was a pale green-tint
chip with dark green text (`bg-components-badge-bg-green-soft
text-text-success`) — readable but quiet, basically the same
weight as every other low-emphasis pill in the palette.

Restyled to a Stripe-style "Succeeded" chip: solid green
(`state-success-solid`, green-500) with white text
(`text-text-primary-on-surface`). The check-mark glyph is
already supplied by callers — `FileCheck` / `CircleCheck` on
the obligation lifecycle, `CheckCheck` / `FileCheck` on the
Pulse status set, `CheckCircle2Icon` on the clients workspace.
No new icons added; the variant just gets bolder chrome and
the existing glyphs carry through with `currentColor`.

**Icon-color override for obligation status pills:** the
obligation status surface used to pin the icon color
explicitly to `text-text-success` (dark green) — on a solid
green pill that disappears. Added `STATUS_ICON_COLOR_ON_PILL`
in `status-control.tsx` — same map as `STATUS_ICON_COLOR`,
overrides `done` / `paid` / `completed` to
`text-text-primary-on-surface` (white). The dropdown menu
items keep the original menu-surface tints so the glyph
still reads as a hue swatch against the white menu
background.

**Surfaces affected (all already used `variant="success"`):**
- `/deadlines` queue — status pill on Filed / Paid / Completed rows.
- `/clients/:clientId` — filing-plan rows (`ObligationStatusReadBadge`), "All on track" chip, "Ready" / "Ready for rules" insight chips.
- `/rules/pulse` — Applied / Reviewed alert status badge.
- `/reminders`, `/notifications` — "Sent" delivery status badge.
- `/obligations` — "Received" / "Client ready" inline chips.

Same content, same statuses, same labels — pure visual lift on
the existing success-state pill.

## Task S4 — `+`-prefixed filter chips on /clients

**Files:** TBD (will append after the next commit).
