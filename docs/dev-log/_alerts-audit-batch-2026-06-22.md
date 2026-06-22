# Alerts audit batch — kill color+bold, row-dismiss feedback, one primary, J/K nav

**Date:** 2026-06-22
**Surface:** `/alerts` list + detail (`features/alerts/*`), keyboard-shell
(`components/patterns/keyboard-shell/types.ts`, `ShortcutHelpDialog.tsx`)

Net-new from the 45-lens design-audit skill pass on the alerts cluster. Four
vetted fixes shipped; one (route A/D via the keyboard shell) was investigated
and deliberately skipped — see below.

## 1 — Color+bold double-highlight sweep

Canon: urgency reads in SIZE/COLOR, never weight — color + bold together is a
banned double-highlight. Dropped the redundant `font-semibold` (→ `font-medium`,
or just the primitive's base) while KEEPING the tone, which is the actual signal:

- `components/PulseAlertRow.tsx` low-confidence chip — `font-semibold` →
  `font-medium` (keeps `text-text-warning`).
- `components/AlertListRail.tsx` low-confidence chip (same) + the "Review N"
  count affordance — dropped `font-semibold`, keeps `text-text-accent`, now
  matching the sibling `AlertsListPage` Review tab that already commented red+bold
  is banned.
- `AlertDetailDrawer.tsx` toned TextLinks (destructive "Retry now", success
  "Undo") — dropped the `className="font-semibold"` override so they fall back to
  the TextLink primitive's `font-medium` base; the variant already carries tone.
- `components/AlertCard.tsx` "Review →" — `font-semibold` → `font-medium`.

`SeverityChip`'s uppercase-eyebrow 600 is the sanctioned exception and was left
untouched.

## 2 — Per-row Dismiss feedback (responsiveness)

The hover-Dismiss button on each list row fired with no per-row disable/spinner,
so a CPA on a slow link could double-fire the same dismiss. Threaded the
in-flight alert id (`dismissAlertMutation.isPending` + `.variables.alertId`)
from `AlertsListPage` → `PulseAlertList` (`dismissingId`) → `PulseAlertRow`
(`dismissing`). The matching row's Dismiss button now disables + swaps its
ArchiveIcon for a spinning `Loader2Icon` while pending.

Optimistic row-removal (`onMutate` + rollback) was scoped OUT: the list has
multiple query-key variants (live/catchup, flat vs infinite) and already
dissolves the row via a `motion.div` exit on query settle plus an Undo toast, so
optimistic removal was non-trivial/risky for little gain. Per-row disable+spin
is the safe subset that kills the double-fire.

## 3 — Two filled primaries for one action

In the green "Ready to apply" card, the inline "Apply now" shortcut was
overridden to `bg-state-success-solid` (green-on-green, low contrast) and sat
as a SECOND filled primary alongside the footer's accent "Apply to N clients".
Made "Apply now" a `secondary` button and dropped the solid override — the green
ground is now the only success cue, one filled primary per view.

## 4 — Route keyboard nav on /alerts

`/alerts` registered no route-scope hotkeys, unlike `/deadlines` (J/K) and
`/rules`. Added `'alerts'` to `ShortcutCategory` (+ `CATEGORY_ORDER` /
`CATEGORY_LABELS` "Alerts") and registered route-scope `J`/`K` via `useAppHotkey`
that step the open detail selection through `sortedAlerts` (reusing the same
`openDrawer(id)` paging the panel's prev/next arrows drive; with nothing open, J
opens the first row, K the last). They now appear under "Alerts" in the `?` help
dialog.

## 5 — SKIPPED: route A/D through the keyboard shell

Item 5 (replace `AlertDetailDrawer`'s hand-rolled `document` keydown for
Apply(A)/Dismiss(D) with overlay-scope `useAppHotkey`) was built, then reverted.
The `@tanstack/react-hotkeys` manager only fires under a `HotkeysProvider`, which
the `AlertDetailDrawer` unit tests do not mount — the shell path broke 4 existing
hotkey tests (`AlertDetailDrawer.test.tsx`) that dispatch raw `KeyboardEvent`s
and assert the dismiss/apply mutations fire. Per the audit guardrail ("prefer
SKIP-with-reason over breaking shortcuts/tests"), the hand-rolled A/D keydown was
restored verbatim so the shipped shortcuts keep working exactly as before. A/D
still don't surface in `?` help — revisit once the drawer tests are wrapped in a
keyboard provider.

## Verify

`pnpm -F @duedatehq/app exec tsgo --noEmit` → rc 0. Alerts + keyboard-shell unit
suites green (128 passed / 1 skipped). `AlertsListPage.test.tsx` gained a
`vi.mock('@/components/patterns/keyboard-shell', …)` stub (matching
`members-page.test.tsx`) so the bare-rendered page resolves the shell hooks
without a provider.
