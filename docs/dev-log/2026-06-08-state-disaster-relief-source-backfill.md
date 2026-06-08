# 2026-06-08 · Backfill state disaster/emergency relief sources

Closed the `relief_or_disaster_signal` Alert source-coverage gap that previously
left only FED (IRS + FEMA) and CA covered. Added verified official state
tax-authority disaster/emergency tax-relief sources for 34 jurisdictions to
`RULE_SOURCES` in `packages/core/src/rules/index.ts`. Each is a `sourceType:
'emergency_relief'` record, so `idsForReliefOrDisasterSources` detects it the
same way it already detects `ca.ftb_emergency_tax_relief`.

## Sources added (34)

- **Tier A — durable, canonical relief landing pages (24):** CO, IL, IN, IA, LA,
  MA, MD, ME, MI, MN, MS, MT, ND, NE, NJ, NC, RI, SC, TN, TX, UT, VT, WA, WI.
- **Tier B — event-specific best-available pages (10):** DC, FL, GA, HI, ID, KY,
  MO, OK, VA, WV. These states publish per-event/dated relief pages rather than a
  standing one; the registered URL was the live, verified relief page on
  2026-06-08 and is flagged `priority: 'medium'`. Refresh when superseded.

## Gaps left intentionally (16)

No official dedicated state tax-authority relief page exists, so no source was
fabricated: **AL, AK, AZ, AR, CT, DE, KS, NV, NH, NM, NY, OH, OR, PA, SD, WY.**
Most handle disaster relief via rotating press releases / executive orders, or
have no broad income tax and defer to the IRS. NY publishes relief as per-event
N-Notices; a future option is to watch the N-Notice index. These remain visible
as `missingRoles: ['relief_or_disaster_signal']` per jurisdiction.

## Coverage impact

- **TX, WA → comprehensive** (relief was their only missing required role).
- **FL, MA** gain relief coverage but stay **standard** (`multi_agency_sources`
  still missing — same host, no second agency).

## Verification

- `pnpm check` — 0 format/lint/type errors (826 files).
- `pnpm --filter @duedatehq/core test -- --run src/rules/index.test.ts` — 64 pass
  (incl. the all-source `isOfficialHost`, unique-id, and 52/104 coverage gates).
- `pnpm --filter @duedatehq/server test -- --run src/jobs/pulse/` and
  `src/procedures/pulse/` — 60 + 16 pass; contracts 29; db pulse repo 60.
- `pnpm rules:check-sources` (HTTP smoke) on the 34 new URLs: **30 return 200**;
  **MI, RI return 403** (host WAF); **MD, ND** block the probe (TLS / user-agent).
  **Zero 404s** — no dead or fabricated URLs. The four unreachable-by-checker
  pages are confirmed-real official pages (search-corroborated); 403/TLS blocks
  are a known tolerated condition in this checker. Confirm those four by hand once.

## Follow-ups

- One-time manual confirm of the four WAF/TLS-blocked pages (MI, RI, MD, ND).
- Refresh Tier B event URLs when a state supersedes them for a new disaster.
- Optional: author `SOURCE_EXCERPTS` entries for the new relief sources (they
  currently fall back to the generated summary).
