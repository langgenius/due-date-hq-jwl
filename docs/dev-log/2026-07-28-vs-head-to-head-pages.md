# duedatehq: A-vs-B head-to-head pages (GSC-driven)

2026-07-28

## Why

GSC 28d: the vs cluster is the single largest demand source with no dedicated pages —
"taxdome vs jetpack" 44 imp (top query), "karbon vs jetpack"/variants ~14 imp, plus the
taxdome/karbon competitors cluster. Those queries currently land on /guides/\*-alternatives
at pos ~40.

## What

New `vsPageSpecs` + `vsPage()` generator in seo-content.ts; wired into getComparisonPages so
routes, sitemap, llms.txt and the resources index pick them up automatically. Three pairs ×
EN/zh = 6 routes under /compare/: taxdome-vs-jetpack-workflow, karbon-vs-jetpack-workflow,
taxdome-vs-karbon.

Shape: comparison table (what it is / best fit / verified starting price / "rule-change
monitoring: not the focus for either"), choose-by-gap sections, DueDateHQ strictly as the
neutral monitoring layer (takes no side, complement-not-replace), FAQ with the honest
"depends on the gap" answer. Public positioning + Jul-2026 verified prices only.

Verified: build OK, 6 routes render EN+zh, prices in tables, sitemap includes, 24/24 tests.
