# /extension-checker — tax extension checker (linkable asset #3)

**Date:** 2026-07-31 · marketing SEO/GEO tools

Closes the tool pair opened by `/penalty-calculator` earlier today. Same
architecture (verified facts inlined as JSON, vanilla JS, no framework).
Zero new facts: `lib/extension-facts.ts` restates, in structured form, the
extension facts already published and source-cited on the `/rules/*` reference
pages (4868 → Oct 15, 7004 → Sep 15 / Oct 15 / the 5½-month Sep 30 for 1041,
8868 → Nov 15 with the 990-N-cannot-extend nuance, FBAR automatic Oct 15 —
each entry cites the same irs.gov source as its rule page and links to it).

One panel, one purpose: seven filer-type chips (1040 / 1120 / 1120-S / 1065 /
1041 / 990 / FBAR) → extension mechanism, file-by date, extended deadline, and
a "don't get this wrong" line. Individual pre-selected so the answer is on
first paint. FAQPage JSON-LD mirrors the target prompts ("does an extension
extend payment", the S-corp/partnership Sep 15 answer, FBAR no-application,
the 1041 5½-month trap). Registered in footer (both locales), `/resources`
related links, llms.txt Free tools, and content-metadata freshness.

Verification: marketing tests (24) + `astro check` clean; live-verified EN +
zh on this session's dev server — default 1040 card, estate-trust (Sep 30),
FBAR (no form), nonprofit (Nov 15 + 990-N nuance) all render; no console
errors.
