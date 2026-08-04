# Site-wide SERP metadata rebuild + guard test (Search Console review)

**Date:** 2026-08-03 · marketing SEO · analysis in
`docs/marketing/gsc-analysis-2026-08-03.md`

Yuqi supplied the Search Console export for 2026-07-26..08-01: 613 impressions,
**one click**, average position 22. The instinct is "we need to rank better."
The data says otherwise — bucketing impressions by position shows **264 of them
(42%) already on page one, producing that single click** (0.38% CTR, against a
2–5% norm at positions 7–10). Ranking was not the bottleneck. The snippet was.

## What was actually broken

An audit of all 151 built English pages found **79% shipping at least one
SERP-facing defect**:

| Defect                      | Pages | Cause                                                              |
| --------------------------- | ----: | ------------------------------------------------------------------ |
| Description > 158 chars     |    98 | No budget anywhere; median 170, max 318                            |
| Title > 60 chars            |    64 | Brand suffix appended after an already-long title                  |
| Machine-joined double colon |    48 | `${state} tax deadlines: ${label}: ${due}`                         |
| Our own "…" mid-sentence    |    23 | Hard `slice()` in the generators                                   |
| Lower-cased form names      |    15 | `spec.label.toLowerCase()` → "the fbar (fincen form 114) deadline" |

The last one shipped machine-generated-looking snippets to Google on exactly the
rule pages that rank best.

## What shipped

- **`lib/meta-copy.ts`** — `fitMeta` / `fitTitle` assemble to a budget by
  dropping whole optional clauses rather than truncating a sentence; `leadClause`
  extracts the answer ("April 15" out of "April 15 — the 15th day of…");
  `sentenceCaseLabel` folds ordinary words while protecting identifiers.
- **`lib/meta-quality.test.ts`** — the contract, mechanised: length budgets
  (EN and the narrower CJK ones), no lower-cased form names, no double colons,
  no self-truncation, no duplicate titles or descriptions across ~120 generated
  pages. A generator change cannot silently re-introduce this class of defect.
- **Generators rewritten** — state, rule, disaster-notice, comparison and
  alternatives metas are now answer-first and budgeted. 51 state + 17 rule + 17
  disaster + 12 conformity pages fixed by data, not by hand.
- **Hand-written pages rewritten** — every tool, hub, pillar, legislation and
  guide page, EN and zh.
- **Result: 0 defects across 151 EN pages** (median title 50, description 146)
  and 0 across 120 zh pages.

## Two structural findings fixed alongside

1. **The biggest traffic page was a dead end.**
   `/guides/tax-deadline-weekend-holiday-rule` carries 198 impressions — 32% of
   the whole site — at position 8.2, and linked on to neither the penalty
   calculator nor the extension checker, though "my deadline moved" leads
   straight to "what does missing it cost" and "what is my extension".
2. **Internal-link equity flowed the wrong way.** Every
   `/guides/*-alternatives` page linked to its `/compare/*` sibling; none of the
   compare pages linked back — even though the compare pages rank far better
   (position 10–17 vs 22–58).

Both are addressed by `PINNED_RELATED` in `seo-content.ts`: topically pinned
first links, with the existing deterministic rotation still filling the
remaining slots so long-tail spread is preserved.

## Content gap closed

`/rules/fbar-fincen-114-deadline` was reached by "fbar reporting threshold 2026"
at position 49 with nothing on the page answering it. Added a verified
"Who has to file" row — the $10,000 aggregate threshold — checked against the
cited IRS FBAR page the same day.

## Verification

Full CI green; 271 pages build; the meta-quality suite passes 9/9. Post-change
audit of `dist/` confirms zero title/description/casing/punctuation defects in
both locales. Baseline metrics for the next export are recorded in the analysis
doc — the number to watch is the CTR of those 264 page-one impressions.
