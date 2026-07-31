# /penalty-calculator — IRS late-filing penalty estimator (linkable asset #2)

**Date:** 2026-07-31 · marketing SEO/GEO tools

Second interactive tool after `/deadline-lookup`, same architecture (verified
constants inlined as JSON, vanilla JS, no framework, no network calls). Targets
the "what happens if I miss a client's filing deadline — penalty exposure" and
"IRS penalty 5% per month cap" prompt cluster from
`docs/marketing/geo-citation-source-plan-2026-07-31.md`.

## What shipped

- `lib/penalty-facts.ts` — the ONE source of truth for every rate, with the
  irs.gov page cited next to each number (verified 2026-07-31): FTF 5%/mo cap
  25%, concurrent-month reduction to 4.5% (maxes after 5 months), the $525
  over-60-days minimum (returns due after 12/31/2025), FTP 0.5%/mo cap 25%
  (0.25% installment / 1% post-levy variants noted), and the $255 per
  partner/shareholder per month × 12-month cap for 1065/1120-S.
- `components/PenaltyCalculator.astro` — two one-purpose panels: income-tax
  return with balance due (1040/1120) and pass-through information return
  (1065/1120-S). Defaults render on load (answer on first paint), assumptions
  and the min-penalty branch surfaced inline, four official-source links.
- `pages/penalty-calculator.astro` + `pages/zh-CN/penalty-calculator.astro` —
  thin wrappers with WebPage + BreadcrumbList + FAQPage JSON-LD; FAQ questions
  mirror the target prompts ("How much is the IRS penalty for filing late?",
  the $255 pass-through math with a worked example, stacking, abatement).
- Registered on the shared surfaces: footer (both locales), `/resources`
  related-links, llms.txt Free tools, `content-metadata.ts` freshness entry.

## Verification

- Marketing tests (24) + `astro check` clean.
- Live-verified in this session's dev server, EN + zh: defaults $10k/3mo →
  FTF $1,350 + FTP $150 = $1,500; 8 months → FTF capped $2,250 + FTP $400;
  $500/4mo triggers the 100%-of-tax minimum branch ($500 + notice); $0 tax →
  file-anyway note; 10 owners × 20 months caps at 12 → $30,600. No console
  errors.

Extension-eligibility checker remains open in this track (next tool asset).
