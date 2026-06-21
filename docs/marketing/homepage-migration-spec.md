# Marketing homepage migration — spec

**Date:** 2026-06-21. Decision: make the `production-v2.html` exploration the **delivered marketing homepage**, built **into `apps/marketing`** as Astro components, and pull the rest of the marketing site up to its style. Balance the two core stories (v2's *insight* hook + the existing site's product *depth*).

## Locked decisions

- **Target:** `apps/marketing` (Astro). Bring v2's *design* into the existing app — inherit pricing infra, i18n, SEO, analytics. Do **not** rebuild infra or ship the standalone HTML.
- **Theme:** **light only** this pass, but all styles use **semantic tokens so dark mode is a later retrofit, not a rewrite**.
- **i18n:** **中文 in scope** — copy wrapped in the existing translation system; keep the locale switcher.
- **Pricing on the homepage:** **"Pricing coming soon · currently free during the beta."** No tiers surfaced on home yet. (`/pricing` handled in a later phase — likely a "coming soon" state rather than the live Solo/Pro/Team/Enterprise tiers.)
- **Strip** the Agentation devtool entirely.

## Token architecture (best practice — already 3-tier)

```
@duedatehq/ui primitives.css      ← SHARED. navy --color-util-colors-primary-600 #2e368c,
   ↓                                 --color-brand-highlight #14c5f6 (cyan), neutral ramps,
   ↓                                 spacing + radius scales, font families. One source of truth.
semantic-light.css (+ dark later) ← product keeps its functional/dense semantic layer;
   ↓                                 marketing gets its OWN editorial semantic layer (same primitives)
marketing component styles        ← Astro components consume semantic tokens, NEVER raw hex
```

- **Share primitives** with the product UI (the navy/cyan/scales/fonts). production-v2 *hardcoded* `--accent: #2E368C` — that's literally the shared `--color-util-colors-primary-600`; replace hardcoded hex with token refs.
- **Don't share the semantic layer.** A dense product console and an editorial marketing page want different accent intensity, type scale, density. The marketing semantic layer (~20 tokens) is where v2's editorial choices live: serif display font (Instrument Serif), 1240 container, hero type scale, eyebrow rhythm, the navy villain band.

## Section map (each considered on its own)

| Section | From | Decision · depth fold |
|---|---|---|
| Nav | v2 style | floating pill; real targets incl. Pricing; CTA "Start free" |
| Hero | **v2** | serif headline + Alerts panel; quiet "keyboard-first · cites every number · 24h SLA" line |
| Villain | **v2** navy band | + one existing stat ("14 rule changes in 30 days") |
| How it works | **v2** | label-tab Watch→Match→Apply (the conceptual loop) |
| Notice | **v2** | re-house Evidence/Verify depth: "no provenance, no render" + source_excerpt·verified_at |
| Sources + map | **v2** | keep (richer) |
| Compare | **v2** | enrich with existing villain (Excel+Outlook+50 state sites) |
| See it work | **v2** + existing | worklist + re-house the **Monday console** (keyboard-first / ⌘K / smart priority) |
| Surfaces | **v2** | + re-house **Migration Copilot** (30 min · paste→map→normalize) |
| Trust / glass-box | **merge** | v2 band + existing Proof (0 black-box, 50+DC); apply big-numeral treatment |
| Security | merge | v2 + existing (per-practice isolation / audit log / email-first) |
| Pricing | — | "coming soon · free beta" on home; `/pricing` later |
| FAQ | **v2** | keep |
| Close | **v2** framed close | keep |
| Footer | v2 + existing | wordmark style + locale switcher (中文) + real link columns |

**Net-new depth to re-house** (exists today, absent from v2): the **SLA/speed strip** (30 sec / 30 min / 24h) → See-it-work; **Migration Copilot** → Surfaces.

## Phases

- **Phase 0 — tokens (current):** marketing semantic layer mapped onto shared primitives; wire Instrument Serif; map v2's `--accent`/grays/severity/layout vars to tokens. Light, dark-ready.
- **Phase 1 — homepage components:** decompose v2 into Astro components in `apps/marketing`, reuse `BaseLayout` + i18n + analytics; restyle `TopNav`/`Footer`.
- **Phase 2 — re-house depth + pricing-coming-soon.**
- **Phase 3 — pull the rest of the pages (state-coverage, trust, rules) up to the new style.**
