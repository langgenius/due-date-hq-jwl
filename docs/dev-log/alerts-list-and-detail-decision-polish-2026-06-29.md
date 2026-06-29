# Alerts: list headline-first + detail decision/verify polish

**Date:** 2026-06-29
**Files:**
- `apps/app/src/features/alerts/components/PulseAlertRow.tsx` (list row + day band)
- `apps/app/src/features/alerts/components/AlertListRail.tsx` (navigator rail)
- `apps/app/src/features/alerts/AlertHistoryView.tsx`
- `apps/app/src/features/alerts/components/AlertStructuredFields.tsx`
- `apps/app/src/features/alerts/AlertDetailDrawer.tsx`
- `apps/app/src/features/_surface-vocabulary/alert-headline.ts` (+ `.test.ts`, `index.ts`) — new shared helper
- `apps/app/src/features/dashboard/needs-attention-card.tsx` (consumes the lifted helper)

## Why

Yuqi: the default (non-hover) alerts list read "messy / hard to read"; the detail page had a padding
bug, weak text hierarchy, and a decision that felt like "a thin footer."

## What changed

### List (`PulseAlertRow` + `AlertListRail` + history)

- **Retired the opacity veil.** Non-active rows used to dim everything but the title to `opacity-60`
  at rest — a veil over a backwards hierarchy. Removed it entirely.
- **Headline-first.** The title now LEADS each row (semibold, primary ink) with the identity meta
  (jurisdiction · form · change-kind · source) demoted to a quiet line beneath it, so the list scans
  as a clean column of titles. Same order applied to `AlertListRail` so opening an alert doesn't
  reshuffle the layout.
- **Quieted the suggested-action line.** It was accent on every row (a wall of blue competing with the
  headline); now neutral at rest, accent only on hover/open.
- **Day band humanizes recency.** "Today" / "Yesterday" for the freshest groups (the rows' relative
  time moved to a hover tooltip, so the band is now the only at-rest recency cue); older groups keep
  the absolute date, which stays on the band's `title` hover.
- **De-duplicated source in the title.** Alert titles lead with the source name ("NY DTF clarifies…")
  which the row already shows as a chip + jurisdiction pill — the same fact three times. Lifted the
  existing `dedupeTitleSource` out of `needs-attention-card` into shared
  `_surface-vocabulary/alert-headline.ts` and applied it at EVERY alert-title render site (list, rail,
  detail hero + breadcrumb, history, /today card) so the de-dup is consistent product-wide. The full
  original title stays on the element's `title` hover.

### Detail (`AlertStructuredFields` + `AlertDetailDrawer`)

- **Padding fix.** The Change card's fact grid (and the Source card's Captured/Parse-confidence grid)
  were double-indented — each cell's `px-5` added to the card body's `px-5`, so labels sat 20px to the
  right of the header above them. Full-bled the grids (`-mx-5`) so cell content lines up flush under
  its header and the grid reads as one contained band.
- **Tidied hierarchy.** Removed the tutorial captions on every section header ("what changed and what
  to verify", "where this came from", …) and demoted "Parsed fields" from a 14/600 primary header
  (which competed with the card's "Change" title) to a quiet eyebrow — one bold header per card.
- **Dropped the empty `Effective —` cell** (it rendered a labelled em-dash, contradicting the grid's
  own "empty values drop their cell" rule).
- **Low-confidence verify gate.** "Mark reviewed" on a low-confidence review-only alert now opens a
  confirm that points at the source (`requestMarkReviewed` → `confirmReviewDialog`; `reviewVerified` +
  shared `goToSource` flip the gate off once the CPA has gone to the source, so it never nags twice).
  Wired to both the footer button and the `A` hotkey. Normal alerts fire straight through (verified).
  Mirrors the existing higher-stakes `AlertApplyVerificationDialog`, at review-path weight.
- **Elevated "Your decision" footer.** A framing band names the decision + its consequence above the
  action buttons (`DecisionPrompt` + `alertHasOpenGate`), so the footer reads as the decision region.
  Decision stays at the BOTTOM by design: this is a verify-before-you-act tool, so the action is the
  terminus of read-change → check-source → decide, not a lead-in (leading with the action would invite
  the rubber-stamp the gate guards against). The faint "captured to audit ledger" line hides while the
  prompt is up to avoid doubling the reassurance. Mutually exclusive with the gate warning.

## Verification

Live-verified across the /alerts list, the navigator rail, the detail (Change + Source tabs), the
low-confidence gate (gate appears at 46%; normal alert fires through + auto-advances), and the /today
card (unchanged — its title doesn't lead with its source). `dedupeTitleSource` unit test (8 cases)
passes at its new home. `tsgo` clean; no console errors.
