# Rule library rail: flag high-severity jurisdictions

**Date:** 2026-06-29
**Files:** `apps/app/src/features/rules/states-rail.tsx` (`RailJurisdiction`, `RailRow`),
`apps/app/src/routes/rules.library.tsx` (`railItems`, `highSeverityByJurisdiction`)

## Why

Yuqi asked for the rail to get the same "use colour / grouping" pass as the overview. The rail already
had seals + FEDERAL/STATES caps groups + accent selection + an amber "pending review" dot — but it gave
no signal of WHICH jurisdictions carry high-severity rules, so it didn't echo the overview's new
"Review these first · high-severity" tier.

## What changed

`RailJurisdiction` gains `highCount`; `railItems` fills it from a new `highSeverityByJurisdiction` map
(same gate as the `highSeverityPending` StatBand stat — pending/candidate rules with `riskLevel:'high'`,
bucketed by jurisdiction). In `RailRow`, a jurisdiction with high-severity pending rules now shows a
small warning **triangle** (`text-text-warning`) in place of the plain amber dot — an escalation
(dot = pending → triangle = high-severity pending) so "review first" jurisdictions read at a glance.

Verified the rail flags exactly Federal + California + New York (the three with high-severity pending) —
including Federal, which doesn't make the top-6 overview cards, so the rail adds reach over the cards.

## Note — table view left as-is (deliberate)

The per-jurisdiction table was reviewed and NOT changed: severity is already on the canonical ramp
(HIGH → orange, MED/LOW intentionally quiet so high-severity pops), with jurisdiction seals, a
tone-coded stat band (green "in force" / amber "awaiting review"), and type pills. A view that's all-MED
(e.g. California) reads quiet because those rules genuinely are medium-severity — not a design flaw —
so adding colour there would fight the 3-tone budget, not improve it.

## Verification

Live-verified at 1600px on /rules/library: rail triangles render for Federal/CA/NY; overview cards
unchanged. `tsgo` clean; no console errors.
