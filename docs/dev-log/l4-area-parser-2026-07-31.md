# L4 groundwork: affectedArea parser + audit artifacts (2026-07-31)

## What

`apps/marketing/scripts/parse-disaster-areas.mjs` — parses the 206 verbatim IRS
`affectedArea` strings into structured locality data, per the L4 gate in
`docs/marketing/disaster-cluster-architecture-2026-07-31.md` §3. Outputs (review
artifacts, NOT wired into the build):

- `docs/marketing/l4-area-parse-2026-07-31.json` — parsed rows
- `docs/marketing/l4-area-parse-audit-2026-07-31.md` — coverage stats, every
  partial/unparsed row, deterministic every-7th-row sample, reviewer checklist

Results: **177 parsed / 19 partial / 10 unparsed; 1,291 distinct state+county
pairs; 12 rows with first-class tribal designations.** LA-2026-02 patched to the
7/28 six-parish list via a dated override.

Design decisions that matter:

- **Tribal designations are first-class rows, never county aliases** (the §3
  landmine). A tribal tail clause is rejected if it contains county-family words
  so a county list can never be swallowed into the tribal field.
- **"Counties including …" is NON-EXHAUSTIVE** — the release covers more than the
  listed names. These parse to `counties-nonexhaustive` with confidence hard-capped
  at `partial`; a county page built from such a list would answer "No" wrongly for
  unlisted covered counties. Six big-hurricane rows (FL/GA/MN/VA 2024) are in this
  class.
- Conservative by default: unknown shapes → `unparsed` with raw text preserved
  (AK regional education attendance areas, USVI islands, mid-string event splits
  like LA-2020-06's dual-hurricane list).

## Gate status

County pages remain **BLOCKED**. Next steps in order: human review of the 29
flagged rows + sample (checklist in the audit doc), county master table, then
batched page generation starting with counties that have historical declarations.

## Verification

Parser run is deterministic (fixed sample stride, no RNG); re-run reproduces the
same outputs. Row/pair counts eyeballed against the audit tables.
