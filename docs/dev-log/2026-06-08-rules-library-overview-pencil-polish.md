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

## Round 3 — rail flush, leaner detail header, table fits at narrow widths

- **Rail flush against the global sidebar** (`rules.library.tsx`): the
  jurisdiction rail was hoisted OUT of the centered `max-w-page-expanded`
  padded container so it sits flush against the app sidebar as a full-height
  secondary sidebar (Pencil O0pyRO). Content padding + width cap moved onto
  the main column. Verified: at 1280 the rail's left edge is flush at the
  sidebar's right edge (x=220).

- **Per-jurisdiction detail header leaned** to two buttons (`rules.library.tsx`,
  Yuqi): `headerActions` dropped the shortcut chip, ⋯ (Export coverage), and
  the standalone Sources button → now just **New rule + Start review N**.
  Removed the now-unused `ShortcutHintChip`, `DropdownMenu*`, `MoreHorizontalIcon`,
  `RadioTowerIcon` imports.

- **Per-jurisdiction table column-collapse bug fixed** (`jurisdiction-rule-table.tsx`):
  it was `table-fixed` with fixed columns summing ~692px, so at a 708px pane
  (viewport 1280 + rail) the Rule column collapsed to **14px** and headers
  overlapped. Rebalanced the fixed columns (Form 140→100, Entities 124→112,
  Due 220→140, Status 116→108, all tightened to `px-2`) and clamped the
  due-date text to 3 lines. Rule now gets 154px at 1280 / ~314px at 1440 —
  fits the pane, no overlap, no scroll.

- **Overview entity matrix hides less-important columns when narrow**
  (`rules.library.tsx`, Yuqi): the 10-column grouped table clipped its right
  edge below ~1440. Form is now `hidden xl:table-cell` and Type is
  `hidden 2xl:table-cell` (CSS-hidden columns are 0-width, so the
  `colSpan` full-width rows still span correctly). The Type cell's ⋯ menu
  only held non-critical conveniences (open/copy-id/copy-link, all reachable
  via the row click), so hiding it <2xl is an acceptable degradation. Fits at
  1280 (722 ≤ 724 pane), 1440, and shows the full matrix at 1536+.

## Round 4 — accept-time "Confirm impact" (honest aggregate)

Pencil `jpoZx` ("/rules/[ruleId]/review — confirm impact modal") designs a
per-client impact preview (8 named clients, $ amounts, deadline diffs,
created/retired/conflict counts). **None of that per-client data exists** —
`previewRuleImpact` → `RuleBulkImpactPreviewSchema` only returns aggregates
(`estimatedObligationCount`, `entityCounts[]`, `jurisdictionCounts[]`, …). Per
the repo's no-fake-data norm, we built the **honest aggregate** version
instead of fabricating clients (Yuqi's call).

- `apps/app/src/features/rules/rule-detail-drawer.tsx`
  - New `ConfirmImpactDialog` — matches the Pencil chrome (sparkles header,
    stats strip, footer with check + Accept & apply) but shows only real
    numbers: estimated deadlines generated + entity-type count, with the
    real `entityCounts` breakdown when > 0, or an honest "No client deadlines
    will be generated yet — accepting activates this rule for future filings."
  - `CandidateReviewSection`/`CandidateReviewForm` gain a `confirmImpact` prop.
    When set, the Accept button opens the dialog (real `previewRuleImpact`
    data) before committing; the dialog's Accept & apply runs the same
    `submitAccept`.
- `apps/app/src/routes/rules.library.tsx`
  - The single-rule **detail panel** passes `confirmImpact`. The **batch
    review** queue (RuleDetailCompact) keeps the fast one-click accept — so
    the 19 existing batch-accept tests are unaffected.

Still TODO (agreed order Review → Sources → gaps): Sources/Temporary rail-shell
embedding (full shared shell), then the small gaps (collapsible rail for
1024–1200, empty/loading states). The per-client confirm-impact + applied-next
(`Rrk1M`) await a backend per-client impact API.

## Round 5 — review-modal reject flow + edge-case hardening

The rule review/detail is a **modal popup** (Pencil `xSv9n` preview transition,
`jpoZx` confirm impact, `DvLC9` detail + reject). The current Dialog format is
correct; this round adds the missing reject flow and hardens every edge case.

- `apps/app/src/features/rules/rule-detail-drawer.tsx`
  - New `RejectReasonDialog` (Pencil `DvLC9` reject popover): preset reasons
    (Contains errors / Source or jurisdiction incorrect / Duplicate / Other)
    as a radiogroup + an "Other" free-text note. Wired to `rejectTemplate`
    (template rules) / `rejectCandidate` (source-defined), mirroring the
    accept branch. Reject is **detail-panel only** (gated on `confirmImpact`);
    the batch queue stays accept/skip-only (a test enforces "no Reject" there).
  - Edge cases: reason required (submit disabled until a reason is picked;
    "Other" requires a non-blank note); state resets on each open; dialog
    can't be dismissed mid-submit; success/error toasts incl. the
    version-conflict (409) message; reject writes no obligations so it only
    invalidates rule/review/audit caches.
  - Mutual exclusion: `reviewDisabled` now also covers reject in-flight, so
    accept and reject can't both fire (no double-write race).
  - `ConfirmImpactDialog` gained an `errored` state — on a failed impact
    preview it shows "—" + "Couldn't load the impact preview, you can still
    accept" instead of a misleading "0 deadlines".
- `apps/app/src/routes/rules.library.tsx`
  - Detail panel passes `onActionComplete={onClose}` so the modal closes after
    a decision (accept or reject).
- `apps/app/src/routes/rules.library.test.tsx`
  - Added `rejectCandidate` to the orpc mock (the shared form now calls it).
    19/19 pass.

## Round 6 — overview breathing room (Yuqi: "没有 overview 的感觉，太满，很闷")

- **Rail top padding** (`states-rail.tsx`): the rail header was `pt-1` (jammed
  to the top) while the main panel had `pt-8` — the "RULE LIBRARY" eyebrow sat
  ~36px above the page eyebrow. Bumped the rail header to `pt-6 md:pt-8` so the
  two eyebrows line up.
- **Centered, capped panel** (`rules.library.tsx`): the main content was
  `flex-1` left-aligned, so it filled edge-to-edge into a dense wall. Wrapped
  it in a test-matched `min-h-0 min-w-0 flex-1 flex-col` shell with an inner
  `mx-auto max-w-page-expanded` panel — same centered-with-side-margins feel as
  `/today`. The rail still hugs the global sidebar; only the content panel
  centers.
- **Vertical + horizontal rhythm**: card gap `gap-4 → gap-6` (24px, matches the
  Pencil `gap24`), padding `px-4 md:px-6 → px-5 md:px-8` for more side air.

Verified at 1280 / 1512 / 1920 — eyebrows aligned, cards breathe, no h-scroll;
19 tests pass.

## Round 7 — more aggressive overview dashboard (Yuqi: "可以更 aggressive")

- **Bigger KPI band**: `KpiStrip` gained a `size="lg"` (32px values, roomier
  padding); the overview uses it so the headline numbers read as a hero stat
  row.
- **2-column dashboard**: Status coverage + Recent changes now sit side-by-side
  at `2xl+` (equal height), stacked below — breaks the flat vertical stack into
  a real overview grid. Gated at `2xl` (not `xl`) because the two sidebars eat
  ~500px, so the columns only split when the pane is genuinely wide.
- **Richer Status coverage card**: replaced the three pill-chips with a
  per-status **breakdown** (Active / Awaiting review / Draft / Archived) — each
  a dot + label + proportion bar + count — so the card carries real weight
  next to the feed instead of sitting half-empty. Added an `archived` prop +
  `className` passthrough on both overview cards.

Verified at 1280 (stacked) / 1680 / 1920 (2-column). 19 tests pass, types +
lint clean.

## Round 8 — links/actions audit

Audited every interactive element on the rule library. One dead affordance
found + fixed:

- **Rail filter icon** was a decorative `<span aria-hidden>` (looked like a
  button, did nothing). Wired it to a real **"needs-review only" toggle**
  (`states-rail.tsx`): funnels the jurisdiction list to entries with
  `reviewCount > 0`, with active styling + `aria-pressed` + a labelled tooltip,
  and an honest empty state ("No jurisdictions need review").

Everything else confirmed wired: header Export (`handleExport`) / Add new rule
(`openNewRule`); ActionHero Open review queue (`startReviewAll`) / Remind me
Friday (`remindHeroLater`); rail Overview/Federal/state selects, Sources +
Temporary `Link`s, search; Recent-changes rows (open detail) + View all; scope
tabs; entity chips; table rows; detail Accept (confirm-impact) / Reject (reason
dialog); evidence links; bulk-review bar + batch modal. KPI strip and
status-coverage breakdown are display-only (no dead buttons).

## Round 9 — full cohesion audit vs Today/Alerts/Alert-detail

Ran an exhaustive element-by-element audit against the canonical house style.
Fixes applied (token/structure/component — non-contentious):

- **Card radii** unified to `rounded-[14px]` (was `rounded-md` 6px on the
  per-jurisdiction / grouped / search / loading table cards, and `rounded-xl`
  on the overview cards + KPI strip) — matches the Today actions table / Alerts
  list card.
- **Status badge color**: per-jurisdiction "Needs review" badge was blue
  (`info`) while the header chip + KPI + rail dot are amber — flipped
  `STATUS_BADGE_VARIANT.review` → `warning`.
- **Eyebrow tokens**: KPI labels + rail eyebrow + `RailSectionLabel` were
  `font-bold text-text-muted`; aligned to the canonical eyebrow
  `font-semibold text-text-tertiary`. Overview eyebrow `text-[13px]` →
  `text-xs`. Rail "Jurisdictions" title gained `tracking-tight`.
- **Components over hand-rolled spans**: Recent-changes change-kind pill →
  `Badge variant`; "Sources all working" → `Badge variant="secondary"`.
- **Impact pill geometry** matched the Alert "High impact" chip
  (`rounded-[4px] px-2 py-[3px] text-[11px] font-semibold tracking-[0.4px]`,
  was `rounded-full text-[10px] font-bold`).
- **Deprecated tokens** swapped: `text-severity-medium` → `text-text-warning`;
  `bg-accent-tint` / `bg-severity-medium-tint` → `state-accent-hover` /
  `state-warning-hover` on the authority-role badge.
- **Focus rings** added to the recent-changes + per-jurisdiction rows
  (`focus-visible:ring-2 ring-state-accent-active-alt`).
- **Banned left-stripe** removed from the coverage-gap row (signal now via the
  destructive ring-dot + tint fill); gap "Add rule" button → `size="xs"`.
- **Stray `shadow-xs`** dropped from the evidence card (no-shadow house rule).

Deferred (deliberate decisions / different register — flagged, not changed):

- The brown "needs review" tint (`REVIEW_*` util-colors) on the progress bar +
  status-group headers — Yuqi chose brown over amber on purpose (amber "read as
  alarm", 2026-05-27). Needs a call to flip to the house amber for full unity.
- Rule **detail modal** section headings stay sentence-case (modal register) vs
  the Alert **drawer**'s mono eyebrows — defensible as a distinct surface.
- Per-jurisdiction empty row stays an inline table cell (vs shared EmptyState).

## Responsive

Verified at 1440 / 768 / 375 (overview cards) and 1280 (rail flush + both
tables fit). Rail hides `<lg` (unchanged). KPI strip reflows
to a 2×2 grid on mobile. The ActionHero now stacks until `xl` — the rail eats
~288px at lg–xl, so switching to the horizontal layout at `sm` cramped the
body/CTA; `xl:flex-row` keeps it readable everywhere. No page-level or table
horizontal scroll at any width.
