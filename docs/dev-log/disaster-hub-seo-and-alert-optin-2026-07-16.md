# Disaster hub — SEO confirm + free-alert opt-in (2026-07-16)

Two GTM moves on `/irs-disaster-relief`, which is already the newsjack SEO surface.

## #5 — SEO (mostly already built; confirmed + expanded)
- Per-page titles are keyword-perfect via `getNoticeMeta`:
  `IRS <State> <Event> Tax Relief <yr> — Deadline <date> (<code>) | DueDateHQ`, plus rich
  `getNoticeFaq` (FAQ structured data) and `disasterNoticeStructuredData`.
- The 2026-07-14 notice refresh (6→11) **expanded the indexable surface**: LA/MS/WI/MI/MT×2 now have
  their own optimized pages. Confirmed all 11 disaster pages are in the built `sitemap` (no noindex
  exclusion touches them). `astro build` clean, 207 pages.
- **Remaining levers are off-page** (can't do from here): submit the sitemap in Google Search Console,
  earn backlinks (the newsjack pitches + #TaxTwitter posts), and keep the data fresh (the daily IRS
  monitor task does this).

## #1 — Free deadline-alert opt-in (new)
- Added a "Get an email the moment a deadline moves in your states" section to the hub, between the
  notices roster and the FAQ — so the SEO traffic converts to **subscribers without an app signup**
  (lower-commitment than "Start free"; the product value delivered before the product).
- Form fields: work email + states; POSTs to `alertFormAction`
  (`import.meta.env.PUBLIC_ALERT_FORM_ACTION`, placeholder `formspree.io/f/YOUR_FORM_ID`).
- Analytics: `data-event="marketing.disaster-hub.alert-optin"`. Scoped CSS via `--m-*` tokens.

### Wiring to go live (2 steps)
1. Create a capture endpoint (Formspree/Tally free form, or a Cloudflare Worker) and set
   `PUBLIC_ALERT_FORM_ACTION` to its URL in the marketing build env.
2. Each submission (email + states) lands in Yuqi's inbox → add to a subscriber CSV → when a disaster
   hits those states, send via `send-outreach.mjs --alert --wave <subscribers>.txt`. Same alert email,
   now to opted-in subscribers instead of cold firms.

The loop: SEO hub (#5) → free-alert opt-in (#1) → subscriber list → disaster-alert sender. Ties directly
to the "real-time monitoring" selling point.
