# Disaster cluster wave 3: data report + TN/CA/FL conformity (2026-07-31)

## What

1. **Annual data report v1** — `/irs-disaster-relief/by-the-numbers` from new
   `lib/disaster-report.ts`. Every figure computed from the joined dataset (206 notices):
   per-year counts (peak 2024 = 62), top-10 state table, announcement seasonality, and a
   "runway" metric — days from IRS announcement to postponed deadline (median 129, mean
   138, max 364) — explicitly labeled as announcement-to-deadline distance, NOT the
   postponement window (archive has no incident dates). Build-time inline SVG charts, no
   client JS. Dataset JSON-LD reused (shared @id). Uncoded-row fallback for the
   longest-runway callout (the Israel notice rendered as "()" before the fix).
2. **L3 wave 3** — standing-pattern conformity entries for the most disaster-postponed
   archive states without active notices: **tennessee** (12 notices; F&E auto-matches the
   IRS date every event under §67-1-114 as DOR paraphrases it, cannot exceed federal;
   other taxes via Revenue.DisasterExtension@tn.gov; county-list-lag caution; FEMA
   sales-tax refund program), **california** (R&TC §18572 conformity; LA fires matched
   Oct 15 in 3 days, automatic by county + annotation; June 2024 Director-of-Finance
   regime + FTB 3872; CDTFA 3-month / EDD 2-month clocks on the Governor's trigger),
   **florida** (§213.055(2) discretionary orders; Milton corporate May 16 vs federal
   May 1 — verified for that event only; sales tax weeks-only via EO 24-003).
   `[state].astro` already supported empty activeNoticeCodes — no template change.
3. Copy fixes for the expanded scope: conformity index lead + FAQ no longer claim all
   listed states have active relief or that only Wisconsin conforms (now 4 ok-tone);
   hub section lead likewise.
4. content-metadata + llms.txt (report line) wired; archive by-the-numbers block links
   the report.

## Verification

`pnpm build`: 269 pages green. Dist checks: report H1 "206 times since 2020", median 129
renders, Israel fallback label correct, index shows 12 cards with counts "12 / 4",
TN/CA/FL pages render with the federal-side section correctly absent. vp check clean on
changed files; hooks at commit.
