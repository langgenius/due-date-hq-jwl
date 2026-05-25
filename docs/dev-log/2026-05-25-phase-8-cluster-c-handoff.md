# 2026-05-25 — Phase 8 Cluster C handoff: Summary tab + US map filter

## Why

Two feature builds confirmed in the AskUserQuestion answers but
both have ambiguous design intent / non-trivial scope. Rather than
guess and ship the wrong thing, capturing what each needs from
Yuqi before the next session.

## Cluster C #30 — Summary tab in obligation drawer

### What we know

The drawer today has a sticky-pinned snapshot block at the top of
the body containing:

- `PrimaryDeadlineStrip` (Internal / Filing / Payment dates)
- `PathToFilingSummary` (milestone chevron)
- `ActiveStageDetailCard` (current stage zoom)

Below that, tabs: Materials / Extension / Evidence. The Audit /
Timeline tab was removed 2026-05-21 because the milestone chevron
in the snapshot block covered the user's actual need.

Yuqi #30 asks for a "Summary tab + milestone strip inside."

### What's ambiguous

Two valid readings:

**Reading A — Summary tab as additional surface, snapshot stays.**
Add a Summary tab as the FIRST tab. Content is a fuller/expanded
milestone strip (PathToFilingSummary, but maybe with more dated
detail per milestone — when did we hit Collecting, Preparing, etc.).
The sticky snapshot block stays as the always-visible quick view.
Result: redundant surfaces, but the tab is the deep-dive view and
the snapshot is the at-a-glance view.

**Reading B — Summary tab replaces the snapshot's milestones.**
Move `PathToFilingSummary` OUT of the sticky snapshot and INTO the
Summary tab. Sticky block shrinks to just deadlines + stage card.
Summary tab becomes the milestone home. Trade: lose always-visible
milestones; gain a dedicated tab for the milestone story.

Reading B is cleaner but is a meaningful design reversal of the
2026-05-21 "milestone chevron always visible" call.

### Plumbing required (either reading)

- Extend `ObligationQueueDetailTabSchema` to add `'summary'`
- Update `TABS_BY_TYPE` in `obligation-type.ts` — likely Summary
  is the default-first tab for `filing` and possibly `information`
- Add `<TabsTrigger value="summary">` and `<TabsContent
value="summary">` to the drawer
- Update the tab-fallback logic so URLs without `?tab=` land on
  Summary for filing rows

Server side: no contract change beyond the schema enum extension.

### Recommended next step

Ask Yuqi: Reading A or Reading B? (Or sketch Option C if neither
fits.) Once direction is set, this is ~1 hour of client-side work.

## Cluster C — Alerts #9 — US map filter

### What we know

The alerts page (`apps/app/src/features/pulse/AlertsListPage.tsx`)
today has three text-based filters:

- Status (active / applied / dismissed / etc.)
- Change kind (deadline_shift / filing_requirement / etc.)
- Impact (severity tiers)

Each `PulseAlertPublic` carries a `jurisdiction: StateCodeSchema`
field — every alert is keyed to one US state. So a state filter is
data-feasible.

Yuqi #9 asks for a "US map filter" — SVG state-shape interaction
that filters alerts to the clicked state.

### Why it's a real build (not polish)

Component requirements:

1. **SVG state paths** — all 50 states + DC. Each state needs an
   accurate SVG `<path d="...">`. Either:
   - Hand-write (~50 path strings, each ~200-500 chars) — half a
     day of careful tracing.
   - Pull from a permissively-licensed library (e.g.
     `react-usa-map`, `react-simple-maps`) — adds a dep + ~30KB
     bundle.
   - Inline a minimal pre-built SVG file — a one-time copy if we
     can find one in MIT/Apache-licensed source.
2. **Interaction states** — default / hover (highlight + tooltip
   with state name + alert count) / active (this is the filter
   value) / empty (no alerts in this state — disable or mute).
3. **Accessibility** — keyboard-navigable (tab through states,
   Enter to select), screen-reader labels, focus ring on focused
   state path.
4. **Layout** — where does it sit on the alerts page? Above the
   list? Beside it? Collapsible? At 1100px page cap, a horizontal
   USA map is ~960×600px — that's a chunk of vertical real estate.
5. **Filter integration** — wire the selected state into the
   existing filter chain so the alerts list narrows. Add to the
   "active filters" chip strip + clear-filters affordance.

### Scope estimate

~3-4 hours for a polished v1. Half a day if we hand-trace SVGs;
~half that with a library dep.

### Recommended next step

Two design calls Yuqi should make first:

1. **Library or hand-traced SVGs?** Adding a dep is the faster path
   but brings ~30KB and a license check. Hand-tracing keeps the
   bundle clean but burns a day.
2. **Map placement?** Collapsible card above the list (default
   collapsed) keeps real estate tight. Always-visible commits the
   top third of the alerts page. Sidebar pull-out keeps it out of
   the reading flow but adds chrome.

Once those are decided, the build is mechanical.

## What's deferred to next session

- Cluster C #30 (Summary tab) — pending design call
- Cluster C #9 (US map) — pending library + placement calls

Everything else from the 89-item review is either closed or
already documented as designed-as-is / requires viewport replay /
copy audit.

## Current state of review

- **Closed**: 69 / 89
- **Open with clear deferral rationale**: 20

The 20 open items break down as:

- **2** awaiting design input (Cluster C — this doc)
- **4** awaiting viewport replay (Wizard #40 #41, Deadlines #16,
  Today #45)
- **4** documented as designed-as-is (Deadlines #23 #24 #25,
  Today doc gaps)
- **1** is a stretch feature (Deadlines #6 multi-deadline grouping)
- **9** other minor deferrals captured in prior dev-logs

That's the natural floor for what a polish-pass can close without
new design decisions or feature builds.
