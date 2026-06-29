# Rule library — review prompt dismiss → collapse-to-pill (always present, reopenable)

**Date:** 2026-06-29
**Files:**

- `apps/app/src/routes/rules.library.tsx`
- `docs/Design/rules-library-overview-and-review-2026-06-08.md` (item 1 brought current + collapse note)

## Why

Yuqi: _"the needs-review banner should always be present on rule library!!!!
also user can dismiss but need to able to reopen?"_

The overview's review-prompt strip (shown when pending > 0) was the one-click
entry into bulk review, but it had **no way to dismiss** — a persistent nag with
no off switch. The ask had a tension: "always present" vs. "dismissible". The
resolution, per **demote, don't delete**: dismiss should _collapse_ the strip to
a small pill rather than remove it, so the entry point is always present while
still being tuck-away-able — and reopenable.

## What changed

All in `rules.library.tsx` (overview, no jurisdiction selected):

### 1) Dismiss → collapse to a pill

- A quiet ghost `×` (`Button variant="ghost" size="icon-sm"`,
  `aria-label="Dismiss review prompt"`) sits after the **Start review** CTA — the
  secondary exit, not competing with the primary action.
- Clicking it collapses the full strip into a small rounded pill: eye chip + live
  count + chevron (`N rules need review ⌄`), in the same slot. The count stays
  live (re-uses `totalPendingReview`).

### 2) Reopen

- The pill is a button (`aria-label="Show review prompt"`); clicking it
  re-expands the full strip.

### 3) Sticky state

- New `reviewBannerCollapsed` state persisted to `localStorage`
  (`rules-library:review-banner-collapsed`, key constant near `PAGE_SIZE`).
  `persistReviewBannerCollapsed()` writes `'1'` on collapse, removes the key on
  reopen. State is **seeded synchronously** from `localStorage` on first render so
  a collapsed strip never flashes open before hydration. `localStorage` access is
  wrapped in try/catch (privacy-mode safe — degrades to session-only).

### 4) At-zero unchanged

- When the queue is clear (0 pending), the existing `OverviewCaughtUpCard` reward
  card still shows. The dismissible prompt only exists when there's something to
  review — so "always present" means _whenever there are pending rules_, never an
  empty nag.

Imports: added `ChevronDownIcon`. Reused `EyeIcon`, `XIcon`, `Plural`, `Button`.
The `InfoBanner` primitive was considered but dismisses to `null` (gone), not the
collapse-to-pill model here — so the collapse is built inline.

## Verified (live dev, port 5177, overview with 456 pending)

- Dismiss → full strip becomes the pill, `localStorage = "1"`. ✓
- Reload → pill persists, **no flash** of the full strip. ✓
- Click pill → full strip returns, `localStorage` cleared. ✓
- `Start review` still selects all pending + opens the bulk list. ✓
- `tsc --noEmit` (app project) — no errors in `rules.library.tsx`. ✓
- Screenshots: pill renders as eye-chip + count + chevron; `×` sits quietly right
  of the CTA.

## Open

- None. Optional: the `×` glyph reads as "close"; since it collapses (not closes),
  a chevron-up could be swapped in — held off, `×` matched the user's "dismiss"
  wording.
