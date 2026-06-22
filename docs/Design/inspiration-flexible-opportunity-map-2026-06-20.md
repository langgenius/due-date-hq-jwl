# Inspiration board — flexible component opportunity map

> Second pass over the 201 reference images, this time through the **flexible /
> inspirational** lens (not literal function-matching): for each image, abstract
> the transferable design idea, then hunt the whole product for real
> **component-level** opportunities — multiple per image, grounded in real data,
> components-not-pieces. _2026-06-20._ 17 agents (separate sessions), each seeing
> the images + reading the codebase. **380 opportunities · 72 net-new-high · 52
> refines-high.** Raw data: the workflow result (task `w4tb045nz`).

## The honest synthesis

The flexible lens surfaced far more than the literal pass — but once each idea is
**grounded against the real backend + checked against canon + prior decisions**,
most resolve to one of:

- **Already built** — the mature product already implements the pattern (StatusRing,
  FilterTrigger, ValueDiff, ghost-card EmptyState, bulk bars, the workflow strip,
  the chipped transition row, ObligationStatusReadBadge = the "StatusPill" idea, the
  affected-clients recede-when-done, tab count-badges, InfoBanner = the coachmark).
- **Fiction-adjacent** — needs data we don't have (per-obligation role assignment,
  file upload/progress, a "source crawling now" state, per-stage actor tracking).
- **Redundant or contradictory** — would re-add something a deliberate decision
  removed (e.g. daily-brief workload counts were cut on purpose; the StatBand cells
  were deliberately unified to "four consistent numbers"; severity left-bar / hatch
  would double-signal).

That's not a dead end — it's the signal that this is a **mature, deliberately
restrained product**. The genuine net-new is concentrated in a few **bigger
features**, not scattered tweaks.

## Built this pass (1, verified)

- **Client StatBand filed-progress footer** (`ClientSummaryStrip.tsx`, img-080) — a
  subtle filed-of-total bar under the band + "N/M", a depth accent that leaves the
  uniform cell numbers untouched. Real data: `filedCount ÷ obligations.length`.

## The convergence — where many images pointed (the strong clusters)

| Cluster           | # opps | Status after grounding                                                                     |
| ----------------- | ------ | ------------------------------------------------------------------------------------------ |
| EmptyState        | 50     | mostly bespoke-illustration ideas (need a locked spot-art style); ghost-deck already built |
| StatBand          | 27     | cells deliberately uniform; **filed-progress footer built**; nat-lang line = dup of cells  |
| DetailSectionCard | 25     | metadata fact-card = real but **dedup risk** vs AuthorityFactStrip (deferred)              |
| ListRail          | 25     | rail already has the canonical treatment                                                   |
| daily-brief       | 24     | 3-node pipeline / mini-calendar = real but re-adds deliberately-cut counts                 |
| workflow strip    | 20     | strip already expresses asymmetric attention; segmented overlay = redundant                |
| FilterTrigger     | 17     | **two-panel cascading popover + saved-views = genuine net-new (big feature)**              |
| audit             | 16     | transition row already chipped; dashed-connector timeline **built earlier**                |
| priorities table  | 15     | asymmetric-column layout = real but a large /today refactor                                |
| StatusRing        | 14     | already covers icon + pill modes                                                           |

## Genuinely net-new BUILDS worth doing (the real backlog — bigger features)

These survive grounding as real, additive, "components-not-pieces" work — but each
is a substantial build, not a quick tweak:

1. **FilterTrigger two-panel cascading popover + saved views** (img-126/118/132) —
   one "Filter" trigger → left facet list (Status/Type/Jurisdiction/Assignee) with
   active-count CountPills → right option flyout. Has a reference spec. The biggest.
2. **Extension/penalty date-picker widget** (img-094/109) — paired date+time
   triggers + a calendar popover with a navy selected-date pill.
3. **Date-gutter audit rows** (img-134) — big day-number left column on `/audit-log`.
4. **Client detail 2-column summary card grid** (img-035) — re-flow the vertical
   DetailSectionCard stack into a scannable 2-col grid.
5. **Intro / 2×2 "what to do first" first-run cards** (img-093/189/144).
6. **AI-applying gradient pill** (img-043) + **metadata fact-card** (img-129/200) —
   from the prior pass, still real, still deferred for placement/dedup.

## What I won't build (grounded-out)

Per-obligation role pill + Materials upload progress (no backend); severity
left-bar, hatch texture, sources dark-inversion, two-signal rows (canon); the
sidebar account popover (parallel-session conflict); daily-brief count-pipeline +
StatBand nat-lang line (re-add deliberately-removed content).
