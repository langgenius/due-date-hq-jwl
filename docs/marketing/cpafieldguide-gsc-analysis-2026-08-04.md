# cpafieldguide.com — GSC analysis, 2026-08-04

**Input:** two Search Console exports from Yuqi, both dated 2026-08-04 — last 28 days
(2026-07-07 → 2026-08-01) and last 7 days (07-26 → 08-01), Web search type. Verified as the
cpafieldguide.com property from the filename and the page URLs (per the verify-which-domain rule).
The 7-day export is a strict subset of the 28-day one, and the 28-day chart reproduces the
07-13→07-19 window from the 07-22 analysis exactly (568 impressions) — the two exports agree.

## Headline

| Window                  | Impressions | Clicks |
| ----------------------- | ----------: | -----: |
| 07-08 → 07-14           |       1,352 |      1 |
| 07-15 → 07-21           |          90 |      1 |
| 07-22 → 07-28           |         102 |      0 |
| 07-26 → 08-01 (last 7d) |          75 |      0 |
| **28-day total**        |   **1,574** |  **2** |

Average position 43.65. Sitewide CTR 0.13%. Two clicks in 28 days, on `/tools/aiwyn` and `/`.

**Impressions fell ~93% on 07-15 and have stayed there for three weeks.** Everything else in this
document is secondary to that fact.

## What the 07-15 drop was — and was not

Checked and ruled out:

- All sampled URLs return 200 on live (`/`, the four category pages, `/cpa-software-pricing`,
  `/tools/lacerte`, `/tools/file-in-time`, `/karbon-vs-jetpack-workflow`, `sitemap.xml`,
  `robots.txt`). The "prod deploy pending" state flagged on 07-22 has since been resolved.
- `robots.txt` allows everything, including the AI crawlers.
- Category pages carry `index,follow` and a correct self-canonical.
- Sitemap serves 68 URLs.

So it is not a technical block and there is no evidence of a manual action. The shape matches a
new-site discovery burst correcting itself: 07-07 was 0 impressions (not yet in the index), 07-08
was 24, then Google crawled broadly and briefly surfaced pages at positions 60–85 for head terms
— `/practice-management-software` alone absorbed 347 impressions at average position 63.75 — got
no clicks, and settled the site at its real authority level of ~10–20 impressions/day.

The 1,352-impression week was never traffic. It was Google evaluating the site.

## Where the impressions actually sit

| Position band | Queries | Impressions | Share |
| ------------- | ------: | ----------: | ----: |
| 1–3           |       0 |           0 |    0% |
| 4–9           |       5 |           8 |    0% |
| 11–19         |      20 |         115 |   10% |
| 21–29         |      43 |         182 |   16% |
| 31–49         |     101 |         233 |   20% |
| 51–79         |     132 |         489 |   43% |
| 81–100        |      30 |          53 |    4% |

(Bot-signature queries with `-site:` operators excluded — 12 rows, 35 impressions.)

The site has **no page-one presence at all**: 8 impressions in 28 days from positions 4–9. 43% of
impressions come from positions 51–79, which produce nothing. Zero clicks from 115 impressions at
positions 11–19 is roughly what page-two CTR predicts, so it is not separate evidence of a
title/snippet problem — do not read it as one.

## What the queries say

**The head terms are a domain-authority wall, unchanged from 07-16 and 07-22.** "accounting
practice management software" (24 impr, pos 67), "practice management software for accountants"
(17, pos 85), "cpa practice management software" (14, pos 60), "cpa software" (13, pos 62). These
sit at page 6–9 after two weeks of content expansion. Only backlinks move them; more pages will
not.

**The strongest real asset is the Lacerte cluster** — roughly 170 impressions across `lacerte`
(46, pos 19.6), `lacerte tax` (20), `lacerte software` (21), `lacerte tax software` (18),
`lacerte pricing` (12), `lacerte tax software price` (12), `lacerte sdk` (12, pos 16),
`lacertesoftware` (11), `lacerte price` (7), plus `what is lacerte` and `how much does lacerte
cost`. `/tools/lacerte` is the #2 page by impressions (278). The page is already strong — title
covers pricing and pros/cons, it has FAQ schema, pros/cons, use-case sections. On-page work here
is largely done; this cluster is waiting on authority too.

**The on-strategy cluster is small but the best-positioned thing on the site.** Everything in
DueDateHQ's own category — due date tracking, deadline, tax calendar — is 46 impressions of 1,131
(4%), but it contains the site's best long-tail positions:

| Query                                      | Impr | Position |
| ------------------------------------------ | ---: | -------: |
| tax calendar software                      |   15 |     70.3 |
| tax compliance calendar software           |    7 |     78.1 |
| cpa due date tracking software             |    4 |     18.8 |
| due date tracking software for accountants |    4 |     25.0 |
| accounting due date tracking software      |    3 |     27.3 |
| tax return due date tracking software      |    3 |     50.3 |
| due date tracking software                 |    3 |     78.3 |
| tax deadline tracking software             |    2 |     24.5 |
| tax due date tracking software             |    2 |     43.0 |
| tax deadline management software           |    1 |     22.0 |

Two things stand out. First, the exact-match "due date tracking" queries rank 18–27 — genuinely
within reach, and the only queries on the site that are both winnable and worth winning, because
the searcher wants exactly what DueDateHQ sells. Second, the **"tax calendar" queries rank 70–78,
and the phrase "tax calendar" appeared nowhere on the site** — Google was matching a loosely
related page because nothing matched properly.

`/deadline-monitoring-software` was carrying all ten of these intents in 448 words, the thinnest
page on the site. All four category pages are thin (444–580 words).

## Shipped in response (2026-08-04)

One page deepened, no new pages. Detail in
`docs/dev-log/2026-08-04-cpafieldguide-gsc-deadline-depth.md`.

1. `/deadline-monitoring-software` 448 → 1,095 words: a three-part explainer separating the tax
   calendar (the statutory schedule — IRS Pub. 509 federal, state agencies for the rest), due date
   tracking (calendar applied to a client list), and deadline monitoring (watching whether the
   dates themselves move — IRC §7508A postponements, FEMA declarations), plus a five-point
   buying checklist. Facts limited to what the tool cards already state; no new vendor claims.
2. Title/description now carry "Tax Calendar", closing the vocabulary gap.
3. Category FAQ 2 → 5 entries, worded to the queries above ("What is tax calendar software?",
   "What is the best due date tracking software for accountants?", "Does due date tracking
   software cover state deadlines?"), which also feed the FAQPage schema.
4. `vercel.json`: 308 redirect `www.cpafieldguide.com` → apex. GSC lists
   `https://www.cpafieldguide.com/tools/canopy` as a separate page row; www currently answers 200
   rather than redirecting. Canonicals already point to apex, so this is cleanup, not a fix for
   the drop.

## The recommendation

**Stop shipping pages on cpafieldguide.com.** The site published 68 URLs and three weeks of
content expansion (07-22, 07-28, 07-29) while impressions fell from 568/week to 75/week and clicks
totalled 2. Content is not the constrained input and has not been for a month; this is the third
consecutive analysis to reach that conclusion.

Two things can still change the number, and neither is code:

- **Backlinks.** Tier 1–2 of `docs/marketing/cpafieldguide-backlink-kit-2026-07-16.md`. The
  07-29 pitches (WSCPA, Accounting Today, Going Concern, Future Firm, Insightful) are the live
  attempt; the ~08-05 follow-up is the next action.
- **Deciding the site's job.** Per the 07-27 GEO decision, DueDateHQ is the canonical entity and
  cpafieldguide is demoted. This data supports that. The query profile is ~90% competitor-brand
  and generic practice-management terms — traffic that, even if won, wants Karbon or Lacerte, not
  DueDateHQ. The 4% that is on-strategy is now served by one deep page instead of a thin one.
  Further effort belongs on duedatehq.com.

## Noted, not acted on

- `DATE` in `build.mjs` is a single site-wide "reviewed" stamp (`2026-07-22`) driving sitemap
  `lastmod`, visible "updated" copy, and `dateModified` on all 68 URLs. Left at 07-22 rather than
  bumped, because bumping it would claim a review of 60+ untouched pages that did not happen. A
  per-page modified date is the real fix and is not worth building at this traffic level.
- A "2013" query cluster (`professional tax software 2013`, `best professional tax preparation
software 2013`, ~9 impressions at pos 20–22) hits the site although the string "2013" appears
  nowhere in it. Low value; ignore.
- 73% of impressions are US (1,153 of 1,574). Geography is not a problem.
