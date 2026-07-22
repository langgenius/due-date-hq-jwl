# cpafieldguide GSC-driven fixes — 2026-07-22 (pm)

**Input:** Yuqi's GSC export (last 7 days, 07-13→07-19): 1 click / 568 impressions /
avg position ~50, ~200 distinct queries. Verified the export is the cpafieldguide.com
property (filename + page URLs) per the verify-which-domain rule.

## What the data said

- Google understands the site: impressions across the whole practice-management /
  tax-software query space. But the money head terms ("cpa practice management
  software" etc.) sit at position 60–75 — that is the domain-authority gap; only
  backlinks move it.
- Near-page-1 already: /tools/file-in-time (pos ~13), /tools/firm360 ("firm360
  pricing" pos ~8), lacerte queries (11–24), "ultratax cs" (16.8),
  /canopy-alternatives (8), /lacerte-vs-proseries (5.5).
- Three content gaps with proven impressions and no matching page (the
  "GSC-Queries-driven long-tail" lever from the 07-16 strategy):
  1. **Pricing cluster** (~35 impressions: "lacerte pricing", "ultratax cs
     pricing", "jetpack workflow pricing", "karbon pricing", "taxdome cost"…) —
     hit tool pages at pos 20–50, no pricing page existed.
  2. **Due-date-tracking cluster** ("cpa due date tracking software" pos 18.5,
     "due date tracking software for accountants" 26…) — the deadline category
     page said "Deadline & Compliance Monitoring", never "due date tracking".
  3. **"karbon vs jetpack" / "jetpack workflow vs karbon"** — no vs page.

## Shipped (commit this entry rides with; sitemap 62 → 65)

1. **/cpa-software-pricing** — new guide page via the existing `guidePage()`
   generator: all 25 tools grouped by category with real starting prices, FAQ
   targeting the top pricing queries. Prices interpolate from `toolData` via
   `priceOf()`/`bare()` helpers so the page can never drift from the cards.
   Linked from footer Guides, homepage Guides block, and guide-page sibling nav.
2. **Deadline category retitle** — `<title>` → "Tax Due Date & Deadline Tracking
   Software", desc leads with "due date tracking", section H1 (source
   `cpa-tools-directory.html`) → "Deadlines & Due Date Tracking".
3. **VS_PAIRS + ['karbon','jetpack-workflow']**, **ALT_SLUGS + 'jetpack-workflow'**.

Verified: rebuild clean (35 crawlable + vs/alt = 65 sitemap URLs), pricing page
screenshot-checked on local static server, FAQ copy reads clean (fixed a
"run from from" double-word from naive price interpolation).

## Still blocking / not code

- **Prod deploy STILL pending** — yesterday's 16 pages are 404 on live
  (checked /proconnect-vs-proseries). Everything above ships with the same one
  command: `cd docs/integrations/cpa-tools/deploy && npx vercel --prod`.
- Head terms need backlinks (Tier 1–2 of
  `docs/marketing/cpafieldguide-backlink-kit-2026-07-16.md`) — human-only.
- Noted for later, NOT built (facts-only red line — we have no sourced data):
  an "ATX/UltraTax cloud hosting" cluster (~20 impressions) keeps hitting the
  site; a hosting-options guide would need real research first.
