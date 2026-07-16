# 2026-07-16 — SEO: disaster-notice SERP titles + cpafieldguide schema/internal-link fixes

## Context

GSC review of both properties. Direction locked with Yuqi: cpafieldguide.com stays a
ranking/directory site (finish its real SEO gaps, no reinvention); duedatehq.com's
IRS disaster-relief pages are the newsjack engine to push for traffic.

## duedatehq — disaster-notice `<title>` rewrite (`apps/marketing/src/lib/disaster-notices.ts`)

**Problem:** leaf titles ran ~105 chars
(`IRS Hawaii Severe Storms Flooding Mudslides Tax Relief 2026 — Deadline … (HI-2026-01) | DueDateHQ`).
Google truncates at ~60, so the SERP showed the event-name pile-up and cut the one
thing a searching CPA needs — the postponed deadline. Impressions without clicks.

**Fix:** `getNoticeMeta` now emits
`IRS {State} Disaster Tax Relief {yr}: Deadline {deadlineLabel}` (59–63 chars; the
event name + notice code stay in H1/body/structured data). Collision guard: when two
notices share state+deadline (the two Montana winter-storm notices MT-2026-03/04),
the notice code is appended so no two pages share a title.

**Verified:** tsx script over all 11 notices (lengths + zero duplicates) and live
`<title>` fetch on the rendered dev-server pages, incl. both Montana leaves.
Marketing suite 22/22 green. Article JSON-LD already carries
datePublished/dateModified via `getContentDates` — freshness signals were fine.

## cpafieldguide — build.mjs schema + internal links (`docs/integrations/cpa-tools/deploy/`)

1. **Dangling `#website` @id.** Every interior page declared
   `isPartOf: {'@id': …/#website}` but the `WebSite` node only existed on the
   homepage (source HTML) — 21 of 22 references resolved to nothing. Added a shared
   `site` node (mirrors the homepage node exactly) injected into all 7 graph
   builders. Now 46/46 built pages define it; dangling refs 0.
2. **Money-page internal links.** Tool profiles never linked to the vs/alternatives
   pages featuring them (those only got links from /compare). Hoisted `VS_PAIRS` /
   `ALT_SLUGS` above the tool-page loop, added a "Compare {tool}" sibnav block —
   9 profiles now feed link equity to their comparison pages. The vs/alt generators
   consume the same hoisted constants (were duplicated literals; can't drift now).

**Verified:** rebuilt (34 pages, 46 sitemap URLs), all 46 JSON-LD blocks parse,
cross-link hrefs spot-checked on tools/taxdome.html.

## Not done / next (needs Yuqi or later session)

- Vercel redeploy of cpafieldguide deploy/ output (built files committed here).
- GSC: read Queries report for both properties; request indexing after deploys.
- Distribution loop per new IRS notice (post + alert list) — process, not code.
