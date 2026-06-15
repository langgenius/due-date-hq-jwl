# Alerts flow — full bug sweep (UX + UI critique fixes)

_2026-06-15_

A live + code-level audit of the whole /alerts flow. Fixes below; a few flagged
items were retracted as preview-environment artifacts (see end).

## Interaction / correctness

- **`A` hotkey bypassed the footer's disabled state** (`AlertDetailDrawer.tsx`).
  The keyboard shortcut fired Mark-reviewed **without** the `canApply` check the
  footer button enforces (a preparer could trigger a server-rejected action →
  confusing error toast), and fired Apply with nothing selected / details missing
  (popping a dialog the user couldn't act on). The `A` branch now mirrors the
  footer primary-CTA disabled logic exactly: `!canApply` → no-op; review-mode
  gated on `reverifyIncomplete`; apply-mode gated on `needsDeadlineDetails` +
  `selectionCount === 0`.

- **Bulk action bar collided with the detail's docking footer**
  (`AlertsListPage.tsx`). The floating "N selected · Dismiss" bar sits
  bottom-center and overlapped the detail's own decision footer when a selection
  was active and a detail was open. It's now hidden while a detail is open
  (`openAlertId === null`); the selection is preserved and the bar returns on
  close.

## Consistency

- **Date-diff tone was contradictory across surfaces.** The detail's
  DeadlineChangeCard painted "later" GREEN (relief) while the list row painted it
  AMBER — one shift read positive in one place, cautionary in another; a 0-day
  (no-op) shift rendered a coloured "+0 days" / "0 days later". New shared helper
  `lib/due-date-diff.ts` (`dueDateDiffTone` + `DUE_DATE_DIFF_TONE_CLASS`) owns the
  one rule — **sooner = red, later = green, same = neutral "No change"** — used by
  both `AlertDetailDrawer` and `PulseAlertRow`.

- **Filter group mislabeled.** The Filters popover group labeled "Severity"
  actually lists impact/status options ("All impact / Needs action / …") bound to
  `impactFilter`. Renamed to **"Impact"** to match its contents.

## Cleanup

- **Deleted dead components** `PulseAffectedClientChips.tsx` and
  `PulseRelevanceMatrix.tsx` — exported but imported nowhere (abandoned
  refactors). Verified zero importers before removal.

- **Fixed two stale unit tests** (were failing before any of this work; not
  component bugs — test copy had drifted):
  - `AffectedClientsTable.test.tsx` — expander copy is "View all N affected
    clients" (not "Show all N clients"); updated the locator regex + assertion.
  - `AlertStructuredFields.test.tsx` — key-fact reads "Act by {date}" (not "Claim
    window closes"); updated the assertion.

## Verification

- `npx tsgo --noEmit -p apps/app` + `npx vp check` — clean.
- `pnpm --dir apps/app test -- src/features/alerts` — **16 files, 112 passing**
  (was 110 + 2 failing).
- Live at 1512: "14 days later" now renders green (`text-success`), matching the
  detail; bulk bar hides when a detail opens (verified, selection preserved);
  hotkey gates confirmed against the footer logic.

## Retracted (not real bugs)

- The bottom-right "FAB" overlapping the detail CTA at narrow widths is the
  **preview tool's own injected toolbar** (`styles-module__toolbar___…`), not a
  product element — no fix warranted.
- The Filters popover's faint translucency is the deliberate frosted
  `components-panel` token (shared UI primitive) — left as-is.
- Mobile footer cramping is largely the same preview-overlay artifact; the app is
  desktop-baseline (Pencil xl), so deferred.

## i18n

New strings ("No change", "Impact") render via the lingui English fallback;
catalog extract deferred per the parallel-sessions protocol.
