# Disaster dataset layer + state-conformity pages (2026-07-31)

## What

1. **Dataset layer** — `apps/marketing/src/lib/disaster-dataset.ts` joins
   `disaster-archive.json` (206 notices, 2020–2026, superset) with the current verified
   `disaster-notices.ts` entries (enrichment by relief-code match). New/changed surfaces:
   - NEW `/data/disaster-notices.csv` (`pages/data/disaster-notices.csv.ts`) — full
     dataset, RFC-4180-style escaping, forms joined with `;`.
   - `/data/disaster-notices.json` — `notices` array unchanged (widget consumers safe);
     added `archive` (all 206 joined rows), `stats`, `csvUrl`.
   - `Dataset` JSON-LD node (shared `@id` `/irs-disaster-relief#dataset`) emitted on the
     hub AND archive pages via `disasterDatasetNode()` / `disasterArchiveStructuredData()`
     in `lib/structured-data.ts`; stats computed from rows.
   - Download links on hub roster foot, archive by-the-numbers, /widget feed section.
2. **L3 state-conformity page family** — `/irs-disaster-relief/state-conformity/[state]`
   (`pages/irs-disaster-relief/state-conformity/[state].astro`) rendering
   `lib/state-conformity.ts`. Entries live for **washington, hawaii, michigan,
   louisiana, wisconsin**. Every fact agent-verified 2026-07-31 against
   official state sources; each section carries its source links; `warn/info/ok` status
   chip. `stateConformityStructuredData()` (WebPage + FAQPage + breadcrumb). Cross-links:
   hub "State conformity" section; conformity card on notice pages
   (`DisasterNoticePage.astro` new optional `conformity` prop, wired in `[slug].astro`).
3. **L2 data fix (verified against the IRS release's update banner):** LA-2026-02 was
   updated 7/28/26 to add Lafourche and Pointe Coupee parishes — `affectedArea` now lists
   six parishes; comment documents the banner trap (same as WA-2025-03).
4. `content-metadata.ts`: `irs-disaster-relief` reviewedOn → 2026-07-31; added
   `state-conformity-*` entries.

## Why

Yuqi supplied an external GEO strategy draft (five-layer disaster cluster). Ground-truthing
against the repo showed the highest-leverage gaps were the Dataset/CSV layer (turns the
site into a citable data source) and the state-conformity layer (zero-competition; no
central source exists). Full corrected plan + L4 gating (tribal-jurisdiction landmine) in
`docs/marketing/disaster-cluster-architecture-2026-07-31.md`.

Federal-legislation facts verified via congress.gov/govinfo before use: P.L. 119-29
(H.R. 517, 7/24/25, governor-request postponements + 60→120-day §7508A(e)); P.L. 119-64
(H.R. 1491, **12/26/25**, refund-lookback/collection-notice fix — the draft's "Jan 2026"
was wrong); P.L. 119-21 casualty-loss expansion; P.L. 118-148.

## Verification

`pnpm build` (marketing): 254 pages green. llms.txt + llms-full.txt list the CSV and all
five conformity pages. Checked built output: CSV 206 rows + header;
JSON keys/stats correct; `Dataset` node present in hub JSON-LD graph; conformity pages
render H1/FAQ/sources; LA notice page shows six parishes + conformity link; hub shows the
conformity section. `pnpm run ci` before commit.
