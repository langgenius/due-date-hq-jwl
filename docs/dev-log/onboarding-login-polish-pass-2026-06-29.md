# Onboarding + login polish pass (icons, alignment, fit, shared footer, chip border)

**Date:** 2026-06-29
**Files:**

- `apps/app/src/features/dashboard/setup-step-icon.tsx`
- `apps/app/src/features/dashboard/sidebar-setup-card.tsx`
- `apps/app/src/routes/login.tsx`
- `apps/app/src/features/onboarding/welcome-offer-step.tsx`
- `apps/app/src/features/auth/auth-chrome.tsx`
- `apps/app/src/components/primitives/toggle-chip.tsx`

## Why

A live QA pass over the login / onboarding funnel (Yuqi, via inline annotations).
Several small but real defects in the first-run chrome.

## What changed

### Setup-card icons (sidebar + `/today` SetupProgressCard)

Earlier this session the spinning loader and progress ring read as weird/
broken. Final state is a plain checkbox metaphor in `SetupStepIcon`:
hollow `CircleIcon` = to-do, green `CircleCheckIcon` = done (tone carries
"next"). The sidebar card's leading **progress ring was removed** — the `50%`
text + the checklist already carry progress, and the ring rendered as a
half-moon at 16px.

### Login alignment → centered

Yuqi: left-aligned looked weird → centered the whole sign-in column on one
axis (hero, the single field label, reassurance, residency). Buttons still
center their own labels; the divider stays symmetric; the 360px card stays
centered on the page.

### Welcome-offer step (`/onboarding` step 1)

Per-element feedback:

- **Perks** → one horizontal line, concise copy, a distinct glyph each
  (Gift / CreditCard / Tag) instead of a vertical checklist of identical checks.
- Card **title** `text-lg` → `text-base` (stops competing with the `text-2xl`
  hero).
- **Width** `max-w-[680px]` → `max-w-[760px]`.
- Tighter gaps + the footer merge below reclaim vertical so the step fits the
  viewport without the inner scroll.

### Shared auth footer (`auth-chrome.tsx` + `login.tsx`)

- `AuthTrustLine` now renders **inside** `AuthFooter` (`showTrust` prop) — one
  bordered footer band instead of a trust row floating above a separate footer.
- Deleted the near-duplicate `LoginFooter` from `login.tsx`; login now uses the
  **one** shared `AuthFooter`, so the footer design is aligned across every auth
  surface (login, onboarding, 2FA, accept-invite).

### ToggleChip selected border

Selected chip border `border-state-accent-solid` (full navy) →
`border-state-accent-solid/30` — a soft accent frame matching the checked-control
treatment in `field.tsx`. Applies to every ToggleChip caller (onboarding chips,
rules-library entity filter, command-palette scope pills, …).

## Notes

`tsgo --noEmit` clean for `apps/app`; HMR verified on the running dev server.
The sign-out backend fix shipped separately (`auth-signout-empty-body-and-dev-origin`).
