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

## Correction (same day, after manual URL confirmation)

A manual check of the four checker-unreachable pages found:

- **MI, ND** — pages are correct; they only block automated probes (WAF / TLS). Kept as-is.
- **RI** — `tax.ri.gov/guidance/advisories` is RI's general **Advisories index**, not a
  dedicated disaster page. RI has no standing dedicated relief page; disaster relief is
  published as periodic advisories there, so the index is kept as RI's index-level relief
  signal (re-labelled in code).
- **MD** — the registered `Hurricane_Tax_Relief.shtml` URL is dead and MD has no standing
  dedicated relief page. Removed `md.comptroller_disaster_relief`; MD is now covered at the
  index level via the **Comptroller Newsroom** (`md.temporary_announcements` gains
  `alertCoverageRoles: ['relief_or_disaster_signal']`), a verified-200 official page.

Net relief coverage is unchanged in count (MD still covered, now index-level). Dedicated
Tier A relief pages: 23; index-level (RI, MD): 2; Tier B event pages: 10.

## Full-coverage pass — index-level relief + federal-only N/A

Closed the remaining `relief_or_disaster_signal` gaps so every jurisdiction is
resolved (covered or not-required):

- **Index-level coverage (11 states):** AL, AZ, AR, CT, DE, KS, NM, NY, OH, OR, PA
  have no dedicated relief page but post disaster relief on their official DOR
  news / press / tax-alert index. Tagged that existing index source with
  `alertCoverageRoles: ['relief_or_disaster_signal']` — a weaker, index-level
  signal (the extract layer must pick the relief item out of general news).
- **Federal-only (5 states):** AK, NV, NH, SD, WY have no broad state income tax;
  disaster relief is federally driven (FEMA/IRS, already covered) with no standing
  state page. Added `RELIEF_FEDERAL_ONLY_JURISDICTIONS` in rule-source-adapters so
  relief is **not required** for their comprehensive coverage rather than reported
  as a gap.

Result: no open `relief_or_disaster_signal` gaps remain — relief is covered for
FED + CA + ~45 states (dedicated, Tier B, or index-level) and not-required for the
5 federal-only states. TX/WA stay comprehensive; AL/NY gain relief (still standard
on other roles). Validated against the worktree core: core 64, server pulse jobs
60, rule-source-adapters 11. (NY uses the Press Office index; the N-Notice index
`tax.ny.gov/pubs_and_bulls/n_notices` is a stronger future target.)
