# duedatehq: at-a-glance comparison tables on all alternatives pages

2026-07-29 (Yuqi: beyond auditing — make it better)

Every winning "alternatives" SERP result has a scannable comparison table; our 8 roundup
pages were prose-only. ALT_NOTES entries (and DDHQ_ALT) gained structured `price/priceZh` +
`fit/fitZh` fields (verified Jul-2026 prices; Aero honestly carries "No public per-seat
price"), and alternativeRoundupPage now emits a comparisonTable — Tool | what-it-is/best-fit
| starting price — reusing the proven geo-cmp component (mobile stacking included), EN+zh.

Renders on all 8 pages both locales; 24/24 tests; lint clean. This upgrades the top-demand
pages (taxdome 170 imp / karbon 156) from optimized-template to genuinely-scannable answer.
