# Marketing v2 — floating-pill nav, interactive product hero, US coverage map

**Date:** 2026-06-18 · `docs/marketing/design-explorations/production-v2.html` only (no app/server/package code).

Follow-up iteration on the converged production candidate, per design-lead feedback. Three moves: a new nav, an interactive hero built from the *real* product UI, and a US map visualization.

## Nav — Voiceflow-style centered floating pill
- Replaced the cramped/wrapping link row with a centered rounded pill (`How it works · Sources · See it work · FAQ`) and a **sliding glider** that animates to the hovered link and rests on the current section via scroll-spy.
- 3-zone grid (brand · pill · CTA). Dropped the "For US CPA practices" brand tag and the "Early access · FED + 50 states + DC" status pill ("too much things"). Collapses to the hamburger < 940px.

## Hero — two-column, interactive, product-faithful
- Split layout: copy left, a live **Alerts panel** right (kills the wasted right-side space).
- The panel **replicates `PulseAlertRow`** (`apps/app/src/features/alerts/`) pixel-faithfully: severity pills in the product's exact colors (`URGENT` #D92D20 / `HIGH` #E04F16 / `NORMAL` #495464), jurisdiction chip, change-kind + icon, source ↗, mono `old → new · N days later` date-diff, "Affects N clients · X ready · Y review", and an expand → source excerpt + affected-client chips + `Apply → Applied → Undo` (the real 24h-undo loop).
- **Interactive:** jurisdiction filter chips (All / Federal / CA / TX / NY / WA / FL) filter rows + update the live count; click a row to expand; apply/undo toggles. Keyboard-accessible, reduced-motion safe.
- Headline kept serif but resized for readability; **serif is now reserved for the hero headline only** — all section titles, the close headline, the notice excerpt, the extracted quote, villain emphasis, and stat figures converted to sans (figures use mono).
- CTA "Open the workbench" → **"Get early access"** (nav + hero + close); removed the "Start free with Google…" line.

## US coverage map (Sources section)
- Added a US state-grid heatmap **replicating `PulseAlertsMap`** (`apps/app/src/features/alerts/components/PulseAlertsMap.tsx`): the same 13×8 tilegram layout, Federal tile + legend, and the 5-step heat ramp (none → light-navy → navy → amber → red by alert density).
- **Interactive:** tap a state → scrolls to the hero panel and filters it to that jurisdiction (states without a hero row fall back to "All").

## Guardrails
- Light-only. No "AI"/"Radar"/pricing/fabricated proof. Alert + map content grounded in the real agencies/forms the product monitors (IRS IR-2026-41, CA FTB, TX Rule 3.586, NY TSB-M, WA B&O, FL TIP); UI tokens pulled from the product. Everything labeled "live preview · not your data". The map caption keeps live-monitoring depth (IRS, CA, NY, TX, FL, WA, MA + FEMA) distinct from the 50-state-+-DC rule-library coverage.
- Verified live: no console errors; nav glider, filter, row expand, apply/undo, and map click-to-filter all confirmed; serif confined to the single hero headline.

Not yet wired into `apps/marketing`.
