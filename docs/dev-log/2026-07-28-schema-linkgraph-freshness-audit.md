# duedatehq: schema / link-graph / freshness audit (pass 6)

2026-07-28. Programmatic audits of the two layers not yet checked:

**JSON-LD**: 0 parse errors; FAQPage + BreadcrumbList on 100% of rules/guides/compare/states;
DefinedTerm on pillars, HowTo on how-it-works + playbook. Nothing to fix — layer already solid.

**Internal link graph** (123 EN pages, BFS from home): found `/irs-disaster-relief/
cpa-response-playbook` fully ORPHANED (0 inbound, unreachable) and every guide/vs page at
inbound=1 (resources index only). Fix: RELATED_RESOURCE_LINKS pool expanded 8→22 entries
(payroll, holiday, calendar, alternatives family, playbook, vs) with deterministic per-page
rotation (pathname hash — stable across builds, no randomness) so related-blocks spread link
equity across the long tail instead of always linking the same four hubs. Result: playbook
0→14 inbound (depth 2), taxdome-alternatives 1→9, vs-jetpack 1→13; remaining inbound=1 pages
are hub-and-spoke leaves (states, disaster notices) — structurally normal.

**Freshness**: CONTENT_REVIEWED_ON 2026-06-18 → 2026-07-28 — today's CTR pass genuinely
reviewed/rewrote every public page's title/description (per-slug rule respected; not a blind
bump). Sitemap lastmod + JSON-LD dateModified now signal the real review.
