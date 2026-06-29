# Onboarding welcome step — restructure (task-led hero, loud offer badge, wider) + footer trust line

**Date:** 2026-06-29
**Files:**

- `apps/app/src/features/onboarding/welcome-offer-step.tsx`
- `apps/app/src/routes/onboarding.tsx`
- `apps/app/src/features/auth/auth-chrome.tsx`

## Why

Per-element annotations on the welcome step (Yuqi). The offer hero + perks list
buried the actual task; the trust line read as a full-width stripe.

## What changed

### Welcome step (`welcome-offer-step.tsx`)

- **Title promoted:** "Tell us a little about your practice" is now the hero
  `h1` (was a small `text-base` heading inside the card). The card's duplicate
  heading + subtitle are gone — one clear title for the step.
- **Offer stays loud:** the "Get 3 months free" heading + the three-perk row are
  replaced by a single **accent promo badge** — `🎁 3 months of Team — free`
  (filled `state-accent-hover-alt` tint, accent text, semibold) above the title.
  It's the conversion hook, so it reads loud without a competing headline.
- **Subline** folds the offer's warmth in lightly ("…your trial's on us — every
  field is optional").
- **Microcopy removed:** the "We use this… never to sell or share" line under the
  CTA read as tacked-on; the subline + "(optional)" labels carry the framing.
- **Wider:** `max-w-[720px]` → `max-w-[800px]`.
- Claim button (full-width `lg` primary) and the muted "Skip for now" `TextLink`
  were reviewed and kept — both are the correct treatments.

### Funnel width (`onboarding.tsx`)

Practice + rule-review steps bumped `720` → `800` to stay consistent with the
widened welcome step (no card resize across the funnel).

### Footer trust line (`auth-chrome.tsx`)

`AuthFooter`'s `showTrust` line is now left-aligned with no divider/banding —
a quiet footer line rather than a centered full-width stripe above the legal row.

## Notes

`tsgo --noEmit` clean for `apps/app`; HMR verified on the running dev server.
