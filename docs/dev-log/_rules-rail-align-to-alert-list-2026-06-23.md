# Jurisdiction rail — align to the alert list panel (2026-06-23)

`states-rail.tsx` (the `JurisdictionRail` on `/rules/library`) and
`AlertListRail` (the alert detail's left list panel) had drifted: same shared
`ListRail*` shell, but different head grammar, a hand-rolled `<nav>` body, a
`px-3` search override, a misaligned head right-edge, and a meaningless
"Showing N of M states" footer. This pass makes the two rails read as one
system. One file edited (+ regenerated i18n catalogs).

## Changes

- **#1 Align to the alerts rail.** Search row drops its `px-3` override →
  plain `ListRailSection` (px-4), matching the alerts rail. The hand-rolled
  `<nav class="px-2 py-3">` body becomes the canonical `<ListRailBody>`
  primitive (the same one the alerts rail uses). Head is now title +
  **neutral `CountPill`** ("N to review"), mirroring the alerts rail's
  "Alerts · N open" head — replacing the accent `Button` review toggle.

- **#8 Sort/group control.** Added a `Segmented` (A–Z / Needs review) in a
  `ListRailSection` under the head — the same primitive + placement the alerts
  rail uses for its work-queue toggle. **A–Z** = the prior default order.
  **Needs review** floats jurisdictions with pending work to the top (most
  pending first, A–Z within each band) — a non-destructive sort, not a filter
  (all rows stay visible). This **supersedes the `reviewOnly` filter** from the
  2026-06-22 review-nudge pass: a sort serves the rail better than hiding rows.
  The "Needs review" option (and the head pill) only render when there's review
  work — no dead toggle when the queue is clear.

- **#7 Head padding alignment.** Each row's trailing count box sits at body
  `px-3` (12px) + row `px-3` (12px) = **24px** from the rail edge. The head used
  the shell's `px-[18px]`. Added `pr-6` (24px) to the head so its trailing
  element (the count pill) right-aligns with the per-row count column down the
  rail.

- **#16 Drop "X of Y" footer.** The list isn't paginated — every jurisdiction
  renders — so "Showing N of M states" read as truncation that never happens.
  Replaced with a plain honest total: **"{N} jurisdictions"**.

- **#15 Scroll active row into view.** `RailRow` now scrolls itself into view
  (`block:'nearest'`, `behavior:'smooth'`) when it becomes the selected
  jurisdiction. Selection is driven by the `?jurisdiction=` URL param — set
  when a user clicks a "Where to start" card on the overview — so the rail now
  reveals the row the user just drilled into. Gated on `code` so the Overview
  row (always at the top) never self-scrolls.

- **#12 Add-jurisdiction affordance — SKIPPED (no fiction).** There is no real
  "add jurisdiction" flow from the rule library: jurisdictions are derived from
  the firm's rules data and chosen during onboarding (`onboarding.tsx`), not
  added ad-hoc here. A "+ Add jurisdiction" footer action would map to nothing
  real, so per the no-fiction canon it was not added.

## i18n

- New: `A–Z`, `Sort jurisdictions`, `{0} jurisdictions`.
- Removed: `Showing {shownStateCount} of {0} states`, `No jurisdictions need
  review` (the review-only empty state is gone with the filter).
- Reused (unchanged): `{reviewRuleCount} to review`, `Needs review`,
  `Filter jurisdictions`, `Jurisdictions`.
- zh-CN filled (catalog keeps 0 missing): `排序辖区`, `A–Z`, `{0} 个辖区`.

`tsgo --noEmit` clean (exit 0); `lingui extract` → 0 missing; `lingui compile`
clean.
