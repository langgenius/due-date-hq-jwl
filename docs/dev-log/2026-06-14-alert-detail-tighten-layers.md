# 2026-06-14 — Alert detail: tighten the loose text layers + lighten rail active

Yuqi: "still flat, no hierarchy — text layers are loose, especially Change
details → Evidence to gather, the 2 bullets, and the table. Also the list
active bg is too dark."

## Evidence to gather → accent value-lead (protective-claim alerts)
Parallel to "What this means" for deadline shifts: the evidence checklist now
gets the accent value-anchor (left rule + accent header) so it's the clear top
layer of the section. Bullets tightened — leading-snug, gap-1.5, accent dots
that tie them to the block (were loose tertiary dots).

## Fact grid → tight key→value pairs
The label/value pairs read loose. Now: label 12px→**11px** caption, value
14/medium→**14/600** primary, label→value gap-1→**gap-0.5** (they bind as one
unit), cell py-3→**py-2.5** (denser), value leading-snug. The size+weight gap
(11/tertiary → 14/600 primary) is the layer — label recedes, value leads.

## Rail active fill → lighter
Selection was `state-base-active` (0.4 alpha) — too dark. Now `state-base-hover`
(0.2); unselected hover drops to `state-base-hover-subtle` (0.08) so the
selected row stays the most present without reading heavy.

## Verify
tsgo clean. Live on 5173: fact grid denser with 11px labels + 14/600 values;
"What this means" accent lead; rail active item visibly lighter. (Protective-
claim Evidence block code-verified — its alert sits in the Review queue; the
shared preview tab + demo reseeds made it hard to hold on screen, but the
structure + tsgo are clean.)
