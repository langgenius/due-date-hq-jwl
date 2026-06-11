# Client detail meta strip → ibWOx (Jurisdictions · Blocked · Open · Filed YTD)

**Date:** 2026-06-10

Pencil `ibWOx` rebuilds the /clients/[id] hero meta strip as four divider-separated
stats: **Jurisdictions** (state chips) · **Blocked** · **Open** · **Filed YTD**
(was Next filing · Blocked · Open filing). Per Yuqi ("replace the elements with the
components we already have"), reused existing components rather than a bespoke
strip:
- the shared **`StatBand`** (which Yuqi also gave per-column hairline dividers,
  matching the canvas) for the strip,
- the **`Badge variant="outline"`** state chip the /clients list already uses, for
  the jurisdiction codes.

Data (all real): jurisdictions = primary state + non-archived filing-profile states
(deduped/sorted); Blocked/Open from the obligation set; Filed YTD = obligations in
the filed/closed set (`done` = "Filed", `completed`, `paid` — excludes
`not_applicable`). Color-coded per canvas (blocked warm, filed green).

`ClientSummaryStrip` now takes `client` (for filingProfiles/state) instead of
`clientId`. tsgo clean; verified live (Meridian: NY · 0 · 3 · 0).
