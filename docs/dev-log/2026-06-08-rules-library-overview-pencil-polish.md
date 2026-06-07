# Rule library overview — Pencil pixel pass

Date: 2026-06-08

Pencil `O0pyRO` (`/rules — Rule library`). The overview surfaces existed
already (ActionHero / Status coverage / Recent changes) but the page chrome
had drifted from the design: a cluttered title row (count + needs-review
badges, ⋯/Sources/Start review/New rule cluster), a prose description, no
KPI band, and a thin banner subline. This pass brings the **all-jurisdictions
overview** to the Pencil layout, keeps it wired to real data, and fixes a
real horizontal-overflow bug in the grouped table.

No contract / DB change — everything reads from the queries already on the
page (`listRules`, `coverage`, `listSources`).

## What shipped

- `apps/app/src/features/rules/jurisdiction-rule-table.tsx`
  - Extracted a reusable **`KpiStrip`** (stats array, per-stat `valueClass` +
    `subClass`, 2-up grid on mobile → hairline-split row at `sm`). Rebuilt
    `JurisdictionKpiStrip` on top of it — no visual change to the
    per-jurisdiction band. The overview now reuses the same component instead
    of a parallel copy.

- `apps/app/src/routes/rules.library.tsx`
  - **Overview header** matches Pencil: a sentence-case status eyebrow
    (green sync dot · "Federal + N states" · "M sources active"), the
    "Rule library overview" title, and a lean **Export + Add new rule**
    action pair. Dropped the count/needs-review title badges and the
    description paragraph. The fuller `headerActions` (⋯ / Sources /
    Start review / New rule) is unchanged on the **per-jurisdiction** header.
    "Start review" now lives in the ActionHero ("Open review queue"); export
    was promoted out of the ⋯ menu.
  - **Overview KPI strip** (new): Total rules · Jurisdictions · Changed 30
    days · Pending review, via the shared `KpiStrip`. Derived from the wired
    rules/coverage/sources — `jurisdictionCount`, `stateCount`,
    `activeSources` (healthy), `changedLast30`, plus the existing
    `oldestReviewRelative`.
  - **ActionHero** gains the Pencil impact subline ("N high-impact · M
    medium · K low", from the pending rules' `riskLevel`) and a **"Remind me
    Friday"** snooze — persisted in `localStorage` until that Friday passes,
    gating the hero render.
  - **Horizontal-overflow fix (grouped table):** the 10-column overview
    matrix needed 1057px in a 926px pane and the `overflow-hidden` wrap
    clipped the Type column. The 7 narrow entity columns inherited the
    canonical `px-5` (20px) cell padding (~280px wasted). Tightened them to
    `px-2` on header + cells in both `GroupedRulesTable` and
    `SearchResultsTable` → table fits at 926px, no scroll, no clip. The
    per-jurisdiction `JurisdictionRuleTable` (entities are chips in one cell)
    was already fine.

- `apps/app/src/routes/rules.library.test.tsx`
  - The 4 batch-review tests drove the now-removed header "Start review N"
    button; pointed them at the ActionHero "Open review queue" (same
    `startReviewAll` handler). 19/19 pass.

## Round 2 — rail parity + cohesion

- `apps/app/src/features/rules/states-rail.tsx`
  - Added the Pencil rail's **library-section rows** between Overview and the
    FEDERAL section, via a new **`RailNavRow`** component (icon · label ·
    inline meta · trailing · subtext; links to a sibling route rather than
    selecting a jurisdiction in place):
    - **Sources** → `/rules/sources`, trailing health `PulsingDot` (green when
      every source is healthy, amber otherwise) + mono count.
    - **Temporary rules** → `/rules/temporary`, inline warning "N active" +
      "Applied to M obligations" subtext. Rendered only when there are active
      temporary rules (seed currently has 0, so it's hidden — appears
      automatically when data exists).
  - New props `sources` / `temporary` (typed `| undefined` for
    `exactOptionalPropertyTypes`).

- `apps/app/src/routes/rules.library.tsx`
  - Wired `listTemporaryRules` query; derived `railSources`
    (count + all-healthy) and `railTemporary` (active count + active-obligation
    sum) and passed them to the rail.
  - **Cohesion:** the overview eyebrow now uses the shared **`PulsingDot`**
    (same status-dot component the Alerts "Monitoring" header uses) instead of
    a loose `<span>` dot. Removed the now-unused `Badge` import.

- `apps/app/src/routes/rules.library.test.tsx`
  - Added the `listTemporaryRules` stub to the `orpc` mock (the new query was
    crashing every test on render). 19/19 pass.

## Responsive

Verified at 1440 / 768 / 375. Rail hides `<lg` (unchanged). KPI strip reflows
to a 2×2 grid on mobile. The ActionHero now stacks until `xl` — the rail eats
~288px at lg–xl, so switching to the horizontal layout at `sm` cramped the
body/CTA; `xl:flex-row` keeps it readable everywhere. No page-level or table
horizontal scroll at any width.
