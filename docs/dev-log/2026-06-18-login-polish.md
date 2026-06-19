# /login polish — auth button radius + ProductStory

_2026-06-18 · page feedback on /login_

## 1. Auth control radius (feedback: "is this the correct rounded corner")

The social buttons + email-flow buttons + the email field shell were `rounded-lg`
(8px) — stale, from before the 2026-06-16 button-rounding + 2026-06-18
form-control radius work. They sit inside a `rounded-xl` (12px) card next to the
`rounded-xl` inputs, so 8px read too tight, and a button rounder than its card
would read wrong. Unified them all to **`rounded-xl` (12px)** — matches the card +
the form-control canon, stays ≤ the card radius. (The sr-only skip-link keeps its
own radius.)

## 2. ProductStory left panel (feedback: "can do better — content, amount, spacing")

De-densified:

- **Dropped the bordered 3-column capabilities card** → an open 3-col grid
  (colored tone tick + claim + one line). Removed the `01/02/03` index chrome and
  the **9px eyebrows** (below the legibility floor + redundant with the titles).
- **Cut the marketing-fluff line** ("All three ship in v1 · /today /deadlines
  /alerts · no waitlist, no asterisks") — path chips are meaningless to a
  logged-out user.
- **Tightened the promise paragraph** — the old trailing "auto-rollover, triggers,
  audit history" clause pre-stated the three proof points below (double-statement).
- **Spacing rhythm**: grouped headline+promise, even `gap-8`, and pushed the trust
  strip to the bottom (`mt-auto`) so the panel fills its height instead of
  top-stacking.

## Verification

- `tsgo` 0; build green; 1 new string translated to zh-CN; `compile --strict` ok.
- **Live (/login?redirectTo=/onboarding):** Google button computed radius **12px**
  (was 8); fluff line gone; panel renders the lighter grid + bottom-anchored
  trust strip; no console errors.

## Noted, not changed

Security messaging now appears in three places — the left trust strip, the form's
"Secured by one-time link" note, and the footer "data never leaves your
jurisdiction." The feedback was the left panel only; the right-column dup is a
candidate follow-up.
