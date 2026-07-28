# outreach: AutoGTM-style segmentation (classifier + per-segment angles)

2026-07-28

Yuqi (after studying Explee's AutoGTM): segment our prospects like AutoGTM segments audiences.
Data check confirmed the `Notes` column (verifiable service mix from each firm's own site) can
drive it: the 191-firm WA list splits into payroll 15 / nonprofit 6 / audit 8 / ea-solo 14 /
bookkeeping 23 / generic 141.

Shipped: `outreach-kit/classify-segments.mjs` (CSV → per-segment CSVs, dedup by firm, no deps;
tested on the WA list) + `outreach-kit/segmented-outreach-plan-2026-07-28.md` (segment
definitions, per-segment alert angles with ⚠ FACT-CHECK gates — payroll-deposit relief nuance
must be verified per notice before any send — cadence red lines, and per-segment reply
measurement via a `seg` field in the send state).

Applies to the NEXT wave from day one and the single WA follow-up; not extra sends to WA-189.
