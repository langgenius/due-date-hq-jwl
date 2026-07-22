# cpafieldguide editorial content — real reviews for all 25 tools — 2026-07-22 (pm 2)

**Ask (Yuqi):** "请真正写内容（每个工具的 pros/cons、真实截图、使用场景）。不要偷懒。
你要给予SEO的数据然后改善网站，并且想办法让duedatehq有存在感。"

**GSC input (28 days, 07-08→07-19):** 2 clicks / ~1,780 impressions. Key pattern:
impressions ramped 186→400/day through 07-13 then collapsed to ~15/day from 07-15 —
the classic new-site honeymoon test ending; Google re-evaluated and the site needs
real content + authority to earn the positions back. Biggest cluster: lacerte\*
(~175 impressions, /tools/lacerte pos ~24). /tools/cch-axcess pos 14, firm360
pricing pos ~9, /tools/aiwyn took the only tool-page click.

## 1. Editorial reviews on all 25 tool pages (the thin-content fix)

New data module `deploy/tool-content.mjs` — per tool: 4-5 pros, 3-4 cons, 2
real-world scenarios, and a bottom-line verdict. Written from public positioning
and widely known product characteristics; qualitative only, no invented numbers
(program red line). Prices stay in toolData; prose references pricing models,
not figures.

Template additions in `build.mjs` tool pages:

- "X pros and cons" two-column block (+ green / − gray, `.proscons`)
- "Who X is for — real-world scenarios" (`.usecase`)
- "Bottom line" verdict with accent border (`.verdict`)
- FAQ gains "What are the main drawbacks of X?" built from the top 3 cons
- JSON-LD gains a `Review` node (author = org, reviewBody = verdict; no
  fabricated ratings)
- `<title>` upgraded to "X Review (2026): Pricing, Pros & Cons" — matches the
  "lacerte reviews"-shape queries in GSC; meta description rewritten to match

## 2. Real product screenshot for DueDateHQ

Captured the actual /today dashboard (seed workspace, headless Playwright against
this session's dev server on :5188, dev overlay hidden) →
`deploy/detail-shots/duedatehq.jpg` (1600px, ~195KB). Shows the product's core
loop: LIVE alerts with affected-client counts and official-source links, Daily
Brief, Priorities table. Note: alert contents are seed/demo data, captioned as
product interface. The detail-shots pipeline auto-wires by slug — vendor
screenshots for the other 22 tools still need real captures (only karbon +
proconnect exist).

## 3. DueDateHQ presence (disclosed, inside the guide)

The duedatehq.com → cpafieldguide link on works-with-your-stack was intentionally
removed on the marketing side, so presence is built inside the guide instead,
disclosure-first:

- VS_PAIRS + `file-in-time–duedatehq` (File In Time = our best-ranking tool page,
  pos ~12.5; the static-tracker vs active-monitor comparison is the honest frame)
- ALT_SLUGS + `file-in-time`, `onesource-calendar` — DueDateHQ appears naturally
  as a same-category alternative on both
- Every page that features DueDateHQ (its profile, the vs page, both alt pages)
  carries a `DDHQ_DISCLOSURE` box up front: built by the team that maintains this
  guide, same rules as every other tool
- DueDateHQ's own review includes real cons (young product, beta, monitoring-layer
  scope, US-only) — credibility is the strategy

## Verification

- Build clean: 35 crawlable pages, sitemap 65 → 68 URLs
- 25/25 tool pages render all three review sections (grep + preview screenshot of
  /tools/lacerte)
- Disclosure appears on exactly the 4 DueDateHQ pages, nowhere else
- Preview quirk noted: this session's preview browser never loads `loading=lazy`
  detail shots (identical behavior on the already-live karbon page) — environment
  artifact, files serve 200 and markup matches live

## Still with Yuqi

- **Prod deploy** (now 22 new pages + 25 rewritten tool pages waiting):
  `cd docs/integrations/cpa-tools/deploy && npx vercel --prod`, then GSC sitemap
  resubmit.
- Vendor screenshots for the remaining 22 tools (drop `detail-shots/<slug>.jpg`).
- Backlink Tiers 1–2 (human-only) — unchanged.

## Addendum (same day): vendor screenshots from public marketing assets

Yuqi asked to source the missing vendor shots online (no product logins). Batch-fetched
each vendor's own public marketing pages (curl + two Playwright rendered passes),
visually triaged ~40 candidates, kept only genuine product-UI imagery — rejected
headshots, award badges, logo cards, and stock photos. Installed 9:
ultratax-cs (1120-S in-product), canopy (Inbox), file-in-time (classic desktop UI),
firm360 (dashboard), financial-cents (workflow), bill-com (approve/deny), ignition
(compliance dashboard), keeper (AI categorization), jetpack-workflow (My Work; has the
vendor's own play-button overlay). All © vendor, captioned "shown for identification",
takedown-responsive. Coverage now 12/25.

Not covered (13) — their public pages ship people photos/badges, not UI: the Intuit
trio (Lacerte/ProSeries/QBO — ProConnect already had a shot), Wolters Kluwer pair
(CCH Axcess/ATX), Thomson Reuters pair (UltraTax has one, ONESOURCE Calendar no),
Drake, TaxDome (bot-blocked), Pixie (SVG mockups only), Aiwyn, Sage (403), ProAdvisor
(a program, not software). These would need manual capture from demo videos/webinars.

Also noticed: keeper.app's og-image now brands as "double" — Keeper appears to be
rebranding. Verify before renaming anything on the site.

## Addendum 2 (same day): second push on the hard 13 — coverage now 16/25

Escalated sourcing beyond marketing pages to vendor documentation and live public
surfaces:

- **TaxDome** — full Insights-dashboard screenshot from their own Help Center
  navigation article (help.taxdome.com; marketing site is bot-blocked but docs
  aren't).
- **ProSeries** — real Federal Information Worksheet screenshot from Intuit's own
  support article (accountants.intuit.com help-article).
- **Pixie** — official product-mockup hero rendered from their homepage SVG via
  Playwright element screenshot.
- **ProAdvisor** — live capture of the public Find-a-ProAdvisor directory
  (proadvisor.intuit.com), the program's actual artifact; cropped to the filter UI.

Dead ends, documented so nobody re-treads them: QBO test-drive sits behind
reCAPTCHA (did not bypass — that's a line); Lacerte support-article images load
inside a dynamic component the scraper can't reach (got a lightbulb icon);
Drake KB image viewer likewise; CCH Axcess / ATX / Sage / ONESOURCE / Aiwyn public
pages contain only stock photos, badges, or SVG illustrations. Remaining 9 need
frames from official demo videos (manual).

## Addendum 3 (same day): demo-video frames — coverage 16/25 → 24/25

yt-dlp + ffmpeg on OFFICIAL vendor channels only (channel verified before download),
frame-extracted and hand-triaged: Drake Tax (official 38s demo — data entry + Tax
Planner), Lacerte (Intuit "Introduction to Lacerte" webinar — client list + missing-
data utility), CCH Axcess (WK "Tax Refresher" — worksheet view), QBOA (Intuit welcome
tour — Work kanban), Aiwyn (their co-founder deep-dive — Firm Portal WIP, cropped to
app), Sage (official Intacct Planning tour — P&L sheet; on-message since our verdict
centers Intacct), ATX (WK rollover tutorial — Rollover Manager), Xero (official
channel — bank-reconciliation match view). Rejected: talking-head and motion-graphics
frames. ONESOURCE Calendar is the one remaining gap — every official video is pure
marketing animation.

Also fixed factual staleness: **Keeper rebranded to Double (Oct 2025, lawsuit-driven;
product/pricing unchanged — confirmed via BusinessWire/CPA Practice Advisor)**. Kept
slug/title "Keeper" (that's what GSC queries still say), updated official URL to
doublehq.com, card desc + pros + verdict note the rebrand.
