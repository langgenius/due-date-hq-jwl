# 2026-07-08 · Outreach UTM attribution and URL cleanup

## Why

Cold outreach clicks were indistinguishable from direct traffic in Amplitude because the
outreach emails linked to bare `duedatehq.com`. Email clients often strip or rewrite referrers,
so attribution has to come from explicit campaign parameters instead of referrer inference.

## Change

- `outreach-kit/send-outreach.mjs` now appends UTM parameters to every DueDateHQ link it sends:
  `utm_source=cold_outreach`, `utm_medium=email`, `utm_campaign=2026_07_cpa_outreach`, and
  wave/touch/track-level `utm_content`.
- Touch-1 uses the tracked URL in both plain text and HTML. Touch-2/3 plain-text bodies are
  rewritten at send time so existing CSV copy can stay readable.
- The marketing site captures UTM parameters into `Marketing Page Viewed`, `Pricing Viewed`, and
  `Signup CTA Clicked`, stores them in `sessionStorage`, then removes tracking parameters from
  the address bar with `history.replaceState`.
- Marketing CTA links to `app.duedatehq.com` inherit the stored UTM values so product-side
  signup/activation can still be segmented after the marketing URL is cleaned.
- The app captures incoming UTM values before Amplitude lazy-loads, stamps them as super
  properties on subsequent app events, and removes UTM/click-id parameters from the app URL.

## Privacy boundary

Attribution is campaign-level only. UTM fields must not contain recipient email, contact name,
firm name, domain, or other personal identifiers. If recipient-level attribution is needed later,
use a random `outreach_id` token with a private local mapping outside Amplitude.
