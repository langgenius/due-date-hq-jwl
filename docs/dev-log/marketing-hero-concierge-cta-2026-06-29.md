# Marketing hero — chase-led sharpen + concierge "we'll set it up" CTA

**Date:** 2026-06-29
**Files:**

- `apps/marketing/src/lib/site.ts` (new `CONCIERGE_EMAIL`)
- `apps/marketing/src/lib/app-url.ts` (new `getConciergeHref()`)
- `apps/marketing/src/components/home/Hero.astro`
- `apps/marketing/src/components/home/Close.astro`
- `apps/marketing/src/pages/index.astro`
- `apps/marketing/src/pages/zh-CN/index.astro`
- `apps/marketing/src/pages/how-it-works.astro`
- `apps/marketing/src/pages/zh-CN/how-it-works.astro`
- `docs/marketing/landing-page-copy.md` (hero CTA addendum)

## Why

The homepage is what converts the founder's warm outbound emails — recipients are
warm CPA practices, not cold search traffic. Two gaps for that audience:

1. The hero was already chase-led ("A deadline just moved. Do you know _who_ it
   hits?") and monitoring-led, but the monitoring line read as a feature, not a
   wedge — it didn't say _"so you don't have to."_
2. **The whole site assumed self-serve activation** ("paste your client list").
   There was no done-for-you path anywhere. For a busy CPA reading a warm email,
   "send us your list and we'll set it up" removes the activation friction that
   kills these conversions.

The signup path itself was already sound: every CTA resolves through
`getStartedHref()` → the app's real passwordless `/login`. That was verified, not
changed.

## What changed

### 1) Concierge path — real, swappable, one place to repoint

- `CONCIERGE_EMAIL` in `site.ts` (currently `hello@duedatehq.com` — must be a
  monitored inbox; swap here to repoint every concierge CTA).
- `getConciergeHref(locale?)` in `app-url.ts` — a `mailto:` with a prefilled
  subject + body referencing the client list, localized EN/zh. A warm-email
  reader hands over their list in one click instead of self-serve onboarding.

### 2) Hero (`Hero.astro`)

- Sub sharpened so monitoring is the wedge: "…around the clock — **so you don't
  have to.**"
- Reassurance line reframed as the self-serve option ("**Do it yourself:** paste
  your client list…").
- Secondary CTA swapped from "See how it works" → concierge **"We'll set it up
  with your list"** (concierge-bell glyph).
- "See how it works" demoted to a quiet inline text link in the reassurance line
  (demote, don't delete) — the warm audience doesn't need it as a button.
- New required prop `conciergeHref`.

### 3) Close finale (`Close.astro`)

- Ghost CTA swapped from "See how it works" → the same concierge offer, mirroring
  the hero's two-path structure (self-serve signup + done-for-you) at the final
  conversion push. New required prop `conciergeHref`; `howHref` removed.

### 4) Wiring + parity

- `conciergeHref` passed on EN + zh-CN home and both how-it-works pages (Close is
  shared across them).
- Tracking markers `marketing.hero.concierge` / `marketing.close.concierge` added.
  Note: the delegated analytics listener only fires on links to the app host, so
  `mailto:` concierge clicks are not auto-tracked — the markers are for parity and
  future wiring.

## Verified

- `astro check` — 0 errors, 0 warnings.
- Rendered HTML (dev): primary CTAs → app `/login`; 2 concierge `mailto:` links
  (hero + close) with prefilled subject/body; "see how it works" → `/how-it-works`.
- Visual: hero at 1280px and narrow — two-path CTA reads cleanly, alerts panel
  intact.

## Open

- Confirm the concierge mailbox. `CONCIERGE_EMAIL` defaults to
  `hello@duedatehq.com`; the only other real address in-repo is
  `support@duedatehq.com` (`structured-data.ts`). One-line change in `site.ts`.
- `docs/marketing/landing-page-copy.md` is otherwise stale (pre-redesign hero);
  only the hero CTA section was brought current here.
