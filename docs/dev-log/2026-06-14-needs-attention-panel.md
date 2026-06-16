# 2026-06-14 — Canonical "Needs attention" card treatment

Yuqi (page feedback on /rules/sources): "if it is Needs Attention, we could
give the card a light destructive background, and an icon alert + Needs
attention. This apply to the full application."

## Change

New canonical primitive `NeedsAttentionPanel`
(`apps/app/src/components/patterns/needs-attention-panel.tsx`): a card with a
light destructive surface (`bg-state-destructive-hover` = red-50) + soft
red-100 hairline, a leading `TriangleAlertIcon` (destructive tone), the fixed
**"Needs attention"** heading, an optional count, and an optional trailing
action. Chromatic accent lives in the container (per the no-coloured-text and
container-accent rules); the body text stays neutral. Full border only (never
per-side) on the rounded card.

Applied to the first surface — the /rules/sources `NeedsAttentionSection`
(`features/rules/sources-tab.tsx`), which previously used a neutral
`SectionFrame` + a hand-rolled amber-icon header. It now renders the tinted
panel; row separators are tinted to the panel surface (red-100) so the
hairlines read as part of the flagged card.

## Verify

- `tsgo --noEmit -p apps/app` clean.
- Live (1280px, /rules/sources): the card renders `background rgb(254,243,242)`
  (red-50), `border rgb(254,228,226)` (red-100), the alert triangle, and the
  "Needs attention · 1" heading over the degraded TX Comptroller row.

## Refinement (same day — "make it more delicate, more details")

First cut flooded the whole card red with a bare "Needs attention 1" header.
Refined to a LAYERED card:

- soft destructive **header band** (red-50) carrying an icon **medallion**
  (white seal + destructive ring), the title, a delicate **count chip**, and
  a new one-line **`summary`** prop that states what + why in plain language
  ("TX Comptroller News hasn't refreshed in 6w.") — the at-a-glance detail.
- a clean **`background-default` body** below a tinted hairline for the rows,
  so the red is a focused accent band and the rows stay maximally legible.

Sources passes a computed summary (singular: names the source + staleness;
plural: failing-vs-degraded split). Verified live: header `rgb(254,243,242)`,
body `rgb(255,255,255)`, count chip + summary present.

## Reusable — apply elsewhere as surfaces are confirmed

`NeedsAttentionPanel` is the one home for this treatment. Candidate surfaces to
convert when desired (NOT done here — these aren't currently framed as
"needs attention" cards, and blanket-reddening warning surfaces would fight the
red-economy rule, so they want a deliberate call):

- /members expired-invite block (currently inline rows).
- Any future degraded/blocked/at-risk card.

Registered in DESIGN.md §4.11 primitive vocabulary.
