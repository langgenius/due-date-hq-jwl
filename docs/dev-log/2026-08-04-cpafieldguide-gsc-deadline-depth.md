# cpafieldguide — deadline category depth from GSC, 2026-08-04

**Input:** Yuqi's two GSC exports (28d 07-07→08-01 and 7d 07-26→08-01). Full read-out in
`docs/marketing/cpafieldguide-gsc-analysis-2026-08-04.md`.

## Why only one page changed

The 28-day numbers are 1,574 impressions / 2 clicks / position 43.65, with impressions down ~93%
since 07-15 and flat there for three weeks. The drop is not technical — every sampled URL is 200
on live, robots allows everything, category pages are `index,follow` with correct canonicals — it
is the new-site discovery burst correcting to the site's real authority. Head terms sit at
position 60–85; only backlinks move those.

So this is deliberately not another content wave. The site is at 68 URLs; page 69 is not the
lever. The one thing the data did justify was depth on the single cluster that is both winnable
and on-strategy:

- `cpa due date tracking software` pos 18.8, `tax deadline management software` 22,
  `tax deadline tracking software` 24.5, `due date tracking software for accountants` 25,
  `accounting due date tracking software` 27.3 — exact-match intent already in striking distance.
- `tax calendar software` (15 impr) and `tax compliance calendar software` (7) at position 70–78,
  while the phrase **"tax calendar" appeared nowhere on the site** — Google matching a loosely
  related page because nothing matched.
- `/deadline-monitoring-software` was serving all of that in 448 words, the thinnest page on the
  site.

## Changed

All in `docs/integrations/cpa-tools/deploy/build.mjs` (generator-owned; regenerated with
`node build.mjs`, `pnpm generated:check` clean):

1. **`catEssay`** — new per-category explainer slot, populated for `monitor` only, rendered under
   the tool cards. Separates the three jobs the vendor copy blurs: the tax calendar (statutory
   schedule; IRS Publication 509 federal, state agencies for the rest), due date tracking
   (calendar applied to a client list, which is what File In Time and the PM-suite modules do),
   and deadline monitoring (watching whether the dates move — IRC §7508A postponements, FEMA
   declarations moving every client in the covered counties at once). Plus a five-point buying
   checklist. Built from `.revh2` / `.toolsection` / `.usecase`, the primitives the tool pages
   already use — no new CSS.
2. **Title/description** for the `monitor` category now lead with "Tax Calendar & Due Date
   Tracking Software (2026)".
3. **`faqByCat.monitor` 2 → 5 entries**, worded to the observed queries; feeds the FAQPage schema.
4. **`vercel.json`** — 308 redirect `www.cpafieldguide.com` → apex. GSC lists
   `https://www.cpafieldguide.com/tools/canopy` as its own page row and www answers 200 today.
   Canonicals already point to apex, so this is cleanup, unrelated to the drop.

Facts are limited to what the tool cards already assert plus IRS Pub. 509 and §7508A. No new
vendor claims.

## Verified

- `node build.mjs` → 35 pages / 68 sitemap URLs, unchanged counts.
- `node scripts/check-generated-artifacts.mjs` clean; diff touches only `build.mjs`,
  `deadline-monitoring-software.html`, `llms.txt` — the other three category pages are byte-identical.
- Rendered locally: 448 → 1,095 words, one `h1`, five `h2`, FAQPage schema parses with the five
  entries. DOM-measured in the browser pane: all new blocks `opacity: 1`, aligned with the rest of
  `main` at the same left edge, no horizontal overflow.

## Not done

- `DATE` stays `2026-07-22`. It is a single site-wide "reviewed" stamp feeding sitemap `lastmod`
  and `dateModified` on all 68 URLs; bumping it would assert a review of 60+ untouched pages.
- **Not deployed.** `cd docs/integrations/cpa-tools/deploy && npx vercel --prod` is Yuqi's call.
