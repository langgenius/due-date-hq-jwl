# duedatehq: /deadline-lookup — the interactive linkable asset

2026-07-29 (Yuqi: stop picking low-hanging fruit — build the hard thing)

New interactive tool at /deadline-lookup (+zh): pick a federal form (14, from rule keyDates)
or a state (50, from STATE*DEADLINES) → verified due date, extension rule, official source
link, and the deep-link to the full reference page. `getDeadlineLookupData()` feeds the same
verified dataset behind /rules/* and /states/\_ — the tool is a new lens, not new claims.

Implementation: DeadlineLookup.astro (inline JSON + vanilla JS, no framework, no network),
token-styled (hairlines, radius 12, no shadows, weight restraint). WebPage + BreadcrumbList +
FAQPage JSON-LD; content-metadata entry; footer Resources link + related-pool entry so it is
never an orphan. This is the passive-backlink play: societies/blogs link tools, not vendors.

Verified: build OK, both routes render with 14+50 dataset embedded, 24/24 tests, lint clean.
Interactive behavior verified live post-deploy (select → result panel).
