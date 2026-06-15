# Parsed fields — caveat sat too close to the grid (Yuqi)

_2026-06-15_

Yuqi: the threshold-advisory caveat ("This alert points to the official IRS
Revenue Procedure…") sat ~6px under the parsed-fields table — too tight.

The parsed-fields container was a single `flex-col gap-1.5`. That 6px gap was
intentionally tight for the **sub-header → grid** pair, but the same gap also
applied between the **grid and the supporting notes** (evidence / caveats)
below it, jamming them against the table.

Fix (`AlertStructuredFields.tsx`): wrap the sub-header + grid in their own tight
`gap-1.5` group, and bump the outer container to `gap-4` (16px) — so the table
stays tight to its header but the caveat/evidence notes get real breathing room.

Verified live on the IRS threshold-advisory alert: grid→caveat gap is now 16px
(was 6px). tsgo + vp clean; `AlertStructuredFields.test` green (5/5).
