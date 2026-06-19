# Marketing v2 — Agentation feedback pass + Legora-inspired sections

**Date:** 2026-06-19 · `docs/marketing/design-explorations/production-v2.html` only.

Worked through 18 element-level comments captured via the **Agentation** browser tool (the user clicks an element on the live mockup, leaves a note, copies structured Markdown), then added two patterns borrowed from the Legora site.

## Agentation feedback (18 comments)

- **Nav** — removed the pill border + added a backdrop-blur; the "Start free" CTA is now fully rounded (999px) to sit with the pill; no bottom border on scroll (soft shadow instead). Glider still follows the scrolled section.
- **Hero** — dropped the eyebrow (and the tick dots site-wide); widened the column + max-width (1240) so the headline reads in 3 lines, not 5; subhead smaller/tighter; points cleaner (trimmed) with the **beta line merged in as a 4th point**; CTAs closer together.
- **Hero grid scroll** — the alerts panel was running ~450px past the copy; now **bounded with an internal scroll** (537 vs 447), so the columns balance and page-scroll chains naturally.
- **Alerts panel** — stripped to lift hierarchy and cut style-count: removed the change-kind row and the gray **NORMAL** pills (matches the real product, which hides normal-priority pills), and quieted the "ready · review" split from mono-caps to plain muted. The **chevron is now clearly visible** (was near-invisible) and turns accent on hover — the click affordance.
- **Villain** — headline weight 600 → **500**; "Sound familiar?" is now a quiet sentence-case lead, not an uppercase eyebrow.
- **Notice** — beam column widened 64 → 108px (no longer squeezed); extract output narrowed (clip 1fr / extract 0.88fr).

## Legora-inspired additions

- **Product-surfaces grid** ("Precedent highlights" pattern) — new _"The product → Everything in one workbench"_ section after the worklist: 4 cards (Alerts · Coverage · Worklist · Apply & audit), each with an icon, description, "See it →" link, and a **clearly-marked image placeholder** to swap for real product screenshots. Staggers in on scroll.
- **Big-wordmark footer** (their giant "LEGORA") — a large faint navy **"DueDateHQ"** watermark under the footer columns (subtle 13% navy, easy to make bolder).
- Translated into our navy/light/editorial register — not Legora's green/dark. NOT copied: their dark cert band (SOC 2 / ISO / GDPR / HIPAA) — DueDateHQ is in beta; no fabricated certifications.

## Notes

- The file embeds the **Agentation devtool** (`agentation@3.0.2` via esm.sh import-map), **localhost-gated** with a `?noagent` escape hatch — a local annotation aid only; **strip it before wiring into `apps/marketing`**.
- Reconciled with origin/main, whose only change to this file was a repo-wide prettier reflow (b7be0c72, "stabilize ci"); re-formatted my version with `vp fmt --write` so the format check stays green.
