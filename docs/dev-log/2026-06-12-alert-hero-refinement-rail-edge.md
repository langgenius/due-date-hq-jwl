# 2026-06-12 — Alert hero refined to one line; rail gets its left edge

Yuqi: "don't like the gap between the alert list and the sidebar" + the hero
key-fact block "太粗糙了……好难看" (too crude… so ugly).

## Hero key fact → one refined line

The first hoist moved the WHOLE callout (warning left-rule + caps eyebrow +
28px mono date + evidence checklist) into the masthead, where:

- the rule read as an error marker,
- the 28px date OUTSIZED the 22px title (hierarchy inversion),
- the evidence to-do list weighed the masthead down,
- ~36px of dead air floated between hero and nav.

Now the hero carries ONE composed line:
`🗓 Act by  Jul 10, 2026  · 28 days left`
— lead-in 13/500 tertiary, date mono 18px/700 (one step UNDER the title),
countdown the single hot word. The evidence checklist returns to the Change
details section (a to-do belongs with depth, not in the masthead). The
deadline-shift new date drops 24→18px for the same inversion fix. Body pt-6 →
pt-4 + the stale -mt-3 removed (it had paired with pt-6; against pt-4 it
crushed the header→nav gap to 4px — now a clean 16px; nav sticky -top-4
matches).

## Rail left edge

The rail sat ~30px from the floating sidebar card (12px shell slot margin +
18px rail padding) with nothing marking where the pane begins — the void read
as sloppy. `ListRail` gains a left hairline, mirroring its border-r against
the detail pane: the gutter now reads as the app's intentional margin.
(Shared component — the deadline detail rail gets the same edge.)

## Verify

tsgo clean. Measured live (instance 5189): "Act by" 13px tertiary; date 18px
mono < 22px title; no border-l-2 rule in the hero; evidence renders inside
the details section; rail border-left-width 1px. The hero→nav gap re-measure
was blocked by demo-backend churn from the parallel session; the 16px result
follows arithmetically from the verified 4px + removed -mt-3 (12px).
