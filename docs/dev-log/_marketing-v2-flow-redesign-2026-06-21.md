# Marketing v2 — how-it-works flow redesign (workflow-diagram style)

**Date:** 2026-06-21 · `docs/marketing/design-explorations/production-v2.html`. Addresses #7 ("bolder / polished / hard to read") and #8 ("what is the loop graphic"), adopting the workflow-diagram reference the user shared — navy-adapted, kept compact.

## What changed

- **Label tabs (the workflow-diagram move).** Each step (Watch / Match / Apply) now has a **label tab straddling the card's top edge** — a white pill with a navy icon circle + the step name, lifted with a soft shadow so it reads as "on top of" the card. The step name moves out of the card body into the tab, so the card body is just the description. Dropped the "Step 01/02/03" eyebrows (the tab is the identifier). On-brand: navy icon circles, not the reference's purple/green/cyan.
- **Connectors recentred.** With the icon gone from the card body, the dashed connector + chevron node now sits at the card's vertical middle (was at the old icon height). Goes vertical (chevron-down) on mobile, as before.
- **The loop is now a labelled pill (#8).** "Then it loops — watching for the next change" was floating mono text with an ambiguous icon; it's now a clear rounded **chip** (loop icon + text) so it reads as a distinct "this repeats" indicator.

Verified desktop (1280) + mobile (390): three cards with tabs, connectors between, loop chip below; stacks to one column on mobile with vertical connectors. "Don't waste space" honoured — stayed horizontal on desktop rather than going tall.

## This closes the feedback pass

All 18 Agentation comments + the 3 original asks + the workflow ref + nav-dark + content critique + scroll-spy rail are now shipped across seven committed batches.
