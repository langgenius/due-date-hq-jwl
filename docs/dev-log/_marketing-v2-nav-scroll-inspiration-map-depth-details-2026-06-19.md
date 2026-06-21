# Marketing v2 — nav scroll action, 200-ref inspiration map, first depth-details batch

**Date:** 2026-06-19 · `docs/marketing/design-explorations/production-v2.html` + a new reference doc.

## Nav scroll action (Agentation feedback)

- Made the nav **bar transparent** (dropped the white frosted background) so the brand + floating pill + CTA sit over the page, Voiceflow-style.
- Added a real **scroll action**: on scroll the bar stays transparent but the nav **condenses 70 → 60px** and the floating pill **lifts** (gains a shadow + its frosted bg strengthens 0.55 → 0.82 for legibility over scrolling content), all smoothly transitioned. Works because the page is light-only throughout.

## Inspiration map (NEW reference doc)

- Analyzed **all 200** Pinterest references in `~/Desktop/gallery-dl/pinterest/wu8050/DueDateHQ-Design Direction/` via 8 parallel agents (25 each, none skipped) and synthesized **`docs/marketing/design-direction-inspiration-map.md`** — organized by page section, each image keyed by its last-6-digits, plus a priority quick-win list and a "deliberately skipped" list.
- The unifying takeaway: every ref leans on one saturated accent → recolor to **navy #2E368C**; **Geist Mono** on all data; **red strictly for risk**; depth via **grain / dotted-grid / halftone**, never heavier shadow.

## First depth-details batch (from the map's quick-wins)

- **Alerts delta-badge** (ref 165997): the `old → new` date-diff is now a small tinted **pill** — green for "N days later" (more time), red for "N days left/sooner". Reads as a scannable badge, not plain colored text.
- **Faint dotted-grid texture** (refs 140149 / 164983): a restrained navy dotted canvas behind the **product-surfaces** section, plus a finer texture on the card **thumbnails** so the placeholders read as "canvas previews" — depth without shadow.
- **Product-surfaces → embedded mini-UI** (ref 165139): replaced the placeholder thumbs with real product mini-fragments on a **graph-paper grid** — a live alert card, a coverage heat-tile grid, a risk-ranked worklist (amber `2d late` bar), and an "⚡ Apply to 8 clients" + audit-line card. Header restructured to **title-left / intro-right**. Cards now _show_ the product instead of using placeholders.

## Notes

- File still embeds the **Agentation devtool** (localhost-gated, `?noagent` escape) for live annotation; strip before `apps/marketing`.
- Re-formatted with `vp fmt --write` (the file is prettier-managed on `origin/main`). Remaining quick-wins (callout bubbles, segmented piano-key progress, timeline nodes, receipt-scallop edge, worklist chip system) are queued in the map doc.
