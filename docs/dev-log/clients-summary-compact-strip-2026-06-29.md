# /clients summary: tall StatBand → compact one-line strip

**Date:** 2026-06-29
**Files:** `apps/app/src/features/clients/ClientFactsWorkspace.tsx` (`ClientsKpiStrip`)

## Why

Carried the /deadlines density pass (Yuqi "wasteful of space") to /clients. `ClientsKpiStrip` rendered
the shared `StatBand` (`border-y py-7` ≈ 110px of 3 tall tiles) for `Total clients · Active deadlines
· At risk`.

## What changed

Replaced it with a slim one-line strip — `10 Total clients · 19 Active deadlines · 8 At risk`
(~24px), "At risk" tinted amber (the established tone) via a new `valueClass` on its cell. These cells
are **display-only** (no filter `onClick`, unlike the /deadlines summary), so the strip is plain text
segments, not buttons. Dropped the sub-labels: the jurisdiction count already rides the page eyebrow
("N clients · M jurisdictions"), and "need attention" / "all set up" were filler. ~80px reclaimed →
the card lanes rise up the fold. The shared `StatBand` is untouched and still used on
/rules/sources · /rules/library · /alerts/history · workload · audit · members.

## Verification

Live-verified: strip renders with the amber At-risk count; card lanes rise. `tsgo` clean.

## Update (same day) — less-fragmented trim, matching /deadlines

Yuqi "太零碎": dropped the title-redundant "Total clients" (already the "Clients · N" pill) + any
zero segment, and hid the strip when there are no clients. Now reads `19 Active deadlines · 8 At
risk`. Refactored onto the shared `StatSummaryStrip` in the interim.
