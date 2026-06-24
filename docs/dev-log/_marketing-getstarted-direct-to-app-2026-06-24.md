# Marketing — "Get started" goes straight to the app login (2026-06-24)

Direction change (team): the "tell us about your practice" questionnaire moves
**into the app's onboarding** (a separate session owns that migration), attributed
to a real account. So marketing's "Get started" should be a frictionless handoff —
straight into the app's existing passwordless sign-in — with **no marketing
interstitial**.

This supersedes today's earlier `/get-started` work (the questionnaire page and its
left↔right split): that page is now removed.

## What changed

- **One repoint drives the whole site:** `lib/app-url.ts` — `getStartedHref()` now
  returns `getAppHref('/login', locale)` (the app's passwordless sign-in) instead of
  the marketing `/get-started` path. Every "Get started" CTA flows through this
  helper, so the nav CTA (all pages), the home hero, the close finale, and the
  Pricing promo + plan "Start free" CTAs all now point straight at the app login —
  EN → `…/login`, zh → `…/login?lng=zh-CN`.
- **Removed the orphaned interstitial:** `pages/get-started.astro`,
  `pages/zh-CN/get-started.astro`, and `components/GetStartedPage.astro` deleted.
- **Test fixtures:** `lib/locale-paths.test.ts` used `/get-started` as a sample
  path; swapped those four cases to `/how-it-works` (a live page). 10/10 pass.

The flow is now: Get started → app `/login` → enter work email → open the emailed
link → onboarding. The launch offer ("3 months of Team free") still lives on the
home hero + the Pricing promo box, so the promise isn't lost.

## Not marketing's anymore

The questionnaire fields (focus / tools / pain) and `/api/leads` are no longer
touched by marketing — the in-app onboarding (other session) owns capturing them,
ideally attributed to the account rather than the anonymous `marketing_lead` table.
`PUBLIC_QUESTIONNAIRE_ACTION` is no longer referenced anywhere in marketing.

## Verified

- Nav / hero / Pricing CTAs resolve to `http://localhost:5173/login` (dev origin).
- `/get-started` returns 404; absent from `dist` and the sitemap.
- Production build clean — 74 pages (was 76). `locale-paths` test 10/10.
