# /alerts — impact sort: flat list, no date headers, High Impact badge

Date: 2026-06-08

Yuqi (/alerts sort): "sort by impact … remove the date header … for the top 3
most affecting client alert, add a High Impact badge" + "dont need to show the
date header on map view."

## Changes
- `lib/impact-level.ts`: extracted `alertImpactCount()` (matchedCount +
  needsReviewCount) as the single impact metric; `alertImpactLevel` reuses it.
- `AlertsListPage.tsx`:
  - the `highest_impact` sort now ranks by the raw impacted-client count (was
    the coarse high/med/low tier), ties broken by recency — "how many clients
    are affecting".
  - new `highImpactIds` memo = the top 3 alerts by impact count (zero-impact
    alerts never qualify), independent of the active sort so the flag is stable.
  - list view: `grouped={sortOrder !== 'highest_impact'}` — date-group headers
    drop when ordered by impact. Map rail: `grouped={false}` always.
  - both call sites pass `highImpactIds`.
- `PulseAlertRow.tsx`:
  - `PulseAlertList` gained `grouped` (flat vs day-grouped, shared `renderRow`)
    and `highImpactIds`.
  - `PulseAlertRow` gained `highImpact` → renders an amber "HIGH IMPACT" badge in
    the head-row meta cluster. Amber (not red) so the one red urgent cue per
    surface stays intact.

## Verify
tsgo clean; `/alerts` Sort by Impact → flat list, no day headers, top-3 (3/3/2
clients) badged HIGH IMPACT, 4th (2 clients) not. Map view rail flat, no headers.
