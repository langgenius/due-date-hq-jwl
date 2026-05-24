# 2026-05-24 — Tile values 14px → 20px (typeset)

## Why

Critique flagged this as P0: tile values (`text-sm font-semibold`,
14px) were visually equivalent to filing-plan row form names below
(`text-xs`, 12px). The strip stopped anchoring the eye — CPAs read
the subline before the value because the value was too quiet to
compete with the H1 chip cluster above.

The Figma export had tiles at 14px; that was a Figma decision that
worked in the design canvas but lost the "headline number" rhythm
once placed next to a real filing plan. 20px is the Ramp/Linear
sweet spot: anchors the eye without becoming an AI-slop hero metric
(which lives at 32-48px and screams).

## What changed

`apps/app/src/features/clients/ClientSummaryStrip.tsx` — `valueClass`:

- `text-sm font-semibold leading-5` → `text-xl font-semibold leading-7`
- Tabular-nums + tracking-tight preserved
- All four tone variants (neutral/warning/critical/muted) preserved
- Subline kept at 13px so the value:subline ratio reads as 1.5×
  (the tile now has a clear hierarchy inside it, not a flat block)

The `TaxCodeLabel` rendered inside the Next-due tile inherits the
new size via `asChild` parent — verified the tax code now reads at
20px alongside the "Due May 6 · 17 days late" subline.

## Verification

- tsc clean
- lint 0/0
