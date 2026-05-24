---
title: 'C2 — AlertDialog focus-landing smoke test (jsdom tier)'
date: 2026-05-24
author: 'Claude (Yuqi pairing)'
area: test
---

# C2 — destructive AlertDialog never auto-focuses the destructive button

## Why

WAI-ARIA + WCAG: when an AlertDialog opens, focus should never
land on the destructive Action button. Accidental Enter would
commit the exact action the user is being asked to reconsider —
that's the failure mode the confirm gate exists to prevent.

All 10 destructive confirms in the app rely on Base UI's
`AlertDialog` primitive doing the right thing automatically: focus
moves into the dialog content and lands on the first focusable
button, which is `<AlertDialogCancel>` because of the consistent
`<Cancel> <Action>` markup order we use in every footer.

There are two regression patterns that could quietly break this:

1. Someone adds `autoFocus` to the destructive AlertDialogAction
   to "highlight" the primary CTA. React respects autoFocus and the
   destructive button becomes `document.activeElement` on mount.
2. Someone inverts the footer markup so Action comes before Cancel.
   Base UI's focus trap then lands keyboard focus on Action.

The e2e tests (`destructive-confirms.spec.ts`) catch both in a real
browser. This commit adds the jsdom-tier counterpart so a
non-Playwright test run also catches the first one (the second
needs a real focus-trap and can't be reproduced in jsdom).

## What changed

### New test file: `alert-dialog-focus-landing.test.tsx`

`apps/app/src/components/`

Three scenarios, all built on the same `createRoot` + `act`
pattern as the existing `alert-dialog-overlay-close.test.tsx`:

1. **Cancel-first markup** (the canonical shape): destructive
   Action button is not `document.activeElement` after mount.
2. **With DestructiveChangePreview between header and footer**:
   matches the Downgrade / Calendar Disable / Regenerate shape.
   Extra non-focusable DOM between header and footer doesn't
   shift which button gets focus. Same assertion.
3. **AlertDialog mounted next to an outside button**: the outside
   button doesn't end up with focus, and neither does the
   destructive Action slot.

Assertions check both the slot data attribute (`alert-dialog-action`)
and the visible button text — defends against either side being
renamed in isolation.

The file's leading comment is explicit about what jsdom CAN and
CANNOT catch versus the e2e tier, so future maintainers don't
mis-trust the suite.

## Verification

- `pnpm check` → 1413 files formatted, 663 lint+type clean.
- `pnpm test` (app + contracts + server) → 311 + 26 + 254 green
  (+3 over the prior baseline = the new file's 3 cases).

## Coverage tier (post-C2)

| Regression                              | Jsdom (C2) | Playwright (C3+C4)                                  |
| --------------------------------------- | ---------- | --------------------------------------------------- |
| `autoFocus` on destructive Action       | ✓          | ✓ (focus assertion implicit in Cancel-dismiss test) |
| Markup inversion (Action before Cancel) | ✗          | ✓                                                   |
| Cancel button missing entirely          | ✗          | ✓ (test would fail on getByRole)                    |
| DestructiveChangePreview missing        | n/a        | ✓ (toContainText assertions)                        |

## Files touched

- A `apps/app/src/components/alert-dialog-focus-landing.test.tsx`
