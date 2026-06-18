# Marketing v2 — beta framing, feel pass, type-scale, reveal stagger, security section

**Date:** 2026-06-18 · `docs/marketing/design-explorations/production-v2.html` only (no app/server/package code).

A design-audit + polish pass over the production-v2 landing candidate, working through the requested lenses (critique / motion / interaction / hierarchy / type-scale / spacing / measure / micro-interaction / distill / quieter / state-machine).

## Beta launch framing
- Product is in **beta** now: `Get early access` → **`Start free`** everywhere (nav, mobile, hero, close); added a small **`Beta`** badge in the wordmark lockup; "Free while in early access" → **"Free during the beta"** (hero note + close reassure). No "early access" copy remains.

## Feel / micro-interactions (interfaces-that-feel, micro-interaction-spec)
- Added **press / `:active`** states (the missing tactile layer) to buttons, filter chips, the apply button, and map tiles.
- Alert-row detail and FAQ answers now **fade-slide in** (`detailIn`); chevrons rotate. All motion respects `prefers-reduced-motion`.

## Responsive fix (adapt)
- 🔴 Mobile Alerts-panel header broke (count squished, disclaimer clipped). At ≤560px the secondary count drops and the disclaimer shrinks — clean single-row header.

## Distill / quieter / typography
- Hero eyebrow distilled to one line ("Never miss a deadline change" — dropped the dangling "· FED + 50 states + DC"; scope still lives in the points + map).
- Unified the three "live preview · not your data" disclaimers to quiet lowercase (were UPPERCASE in 2 of 3).
- **Type-scale consolidation:** collapsed 12 ad-hoc micro-sizes (9/9.5/10.5/11.5/12.5/13.5/14.5…) to a clean 8-step ladder — **10 · 11 · 12 · 13 · 14 · 15 · 16 · 17**. Dense panel text rounded down (no overflow); sub-10px labels lifted to 10.

## Reveal stagger (motion)
- New `.reveal-group` mechanism: list items cascade in (0 → .07 → .14 → .21s…) instead of fading as a block. Applied to source chips, trust stats, the security cluster, and FAQ items. Reduced-motion disables it; the hero stays static (above-fold, not JS-dependent).

## Security & privacy section (NEW)
- Added a calm white band between the trust band and FAQ, adapted from the "Safe and secure" reference (headline + body left, a 2×2 trust cluster right): **Encrypted · Yours alone · Watches-never-files · No-password-to-leak**, each with a restrained navy icon. Closer: "No client portal to configure. No third-party data brokers."
- **Honesty:** built with real security posture, NOT fabricated certifications. Beta product — no SOC 2 / GDPR / ISO badges claimed (the reference's badges were deliberately not copied). "Sign in with Google" and data-isolation claims trace to real behavior; the isolation point elevates the existing trust-band legal boundary.

## Guardrails
Light-only; no "AI"/"Radar"/pricing/fabricated proof. Verified live (1280 + 390): no console errors; press states, expand animations, stagger wiring, mobile header, and the security section all confirmed. Not yet wired into `apps/marketing`.
