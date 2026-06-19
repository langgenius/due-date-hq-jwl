# Marketing: converged production landing candidate (v1 warm, v2 cool)

**Date:** 2026-06-18 · `docs/marketing/` only (no app/server/package code).

Follow-up to the 9 reference design explorations. Converged the liked elements into a single production candidate per design-lead feedback ("Legora on top of AutoSend": editorial/trustworthy base + AutoSend's serif hero + Frontify-grade product UI; less text, more visuals).

## Changes

- **Added** `design-explorations/production-v1.html` — warm-cream editorial candidate: serif hero, "Alerts this week" panel, the document-intelligence centerpiece (notice → extracted change → affected clients → apply/undo), risk-ranked worklist, sources-we-watch, glass-box trust band, FAQ, close. Polished (AA contrast on the faint tier, 44px touch target, uniform-ink source glyphs, dead-rule cleanup).
- **Added** `design-explorations/production-v2.html` — the recommended direction: **cool/white palette** (cream removed), **shorter** (promise banner cut, prose trimmed), **more visual** (Watch→Match→Apply flow diagram + source-monitoring live feed), plus a **compact comparison strip** (DueDateHQ vs Excel / File In Time / TaxDome — DueDateHQ the only full column) after Sources.
- **Removed** the visitors.now exploration (`design-explorations/visitors-indie.html` + `design-systems/visitors-design-system.md`) per feedback.

## Guardrails

Copy grounded verbatim in `landing-page-copy.md`; honest per `unique-selling-points.md`. Light-only (no dark sections), no "AI"/"Radar"/pricing/fabricated proof, "sources we watch" not logos. Locked hero headline kept. Accessible (skip link, ARIA, focus rings, reduced-motion), responsive 1280/390.

Not yet wired into `apps/marketing`. v1 (warm) kept alongside v2 (cool) for comparison.
