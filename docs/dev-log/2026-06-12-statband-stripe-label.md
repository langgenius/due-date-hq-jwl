# 2026-06-12 — StatBand: Stripe stat grammar (component-level)

Yuqi's Stripe reference ("Gross volume / £216.20 / 12:08") applied to the shared
StatBand primitive — "to the component, not a single element":

- Stat label: tracked-caps eyebrow → sentence-case `text-sm font-medium
text-text-secondary`. Calm label, big value, quiet sub — the Stripe read.
- Value/sub lines unchanged (tone-coding via valueClass/subClass intact).

One component, five surfaces update together: /clients, /clients/[id],
/rules/sources, /rules/library, /alerts/history.

Verify: tsgo clean (the one error in the run is the Today session's in-flight
merged-brief-card.tsx, not this change); /alerts/history measured live —
"Handled" label 13px/500, text-transform none, rgb(53,64,82).
