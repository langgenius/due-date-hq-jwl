# PRD — Coverage Status page (v4)

_Replaces the Coverage tab in the original Rules Console. Promoted to a
first-class sidebar destination in the May 18–19 IA redesign. This
PRD documents the page's purpose, surface, wiring, and integration._

## 1. Purpose

Answer one question for the practice owner / manager:

> **Do we have rules where clients file — and are the documents
> backing them still being watched?**

The page is the **situational read** of the rule catalog. It surfaces
attention items, links to action (Library) and provenance (Sources),
and carries the credential that every count traces back to an
official federal / state / DC document.

## 2. Where it lives

| Slot             | Value                                               |
| ---------------- | --------------------------------------------------- |
| URL              | `/rules/coverage`                                   |
| Sidebar group    | RULES                                               |
| Sidebar position | First entry in group                                |
| Icon             | `MapIcon` (lucide)                                  |
| Permission gate  | None (read-only page) — anyone in the firm can view |

## 3. Surface architecture

```
┌──────────────────────────────────────────────────────────┐
│  Coverage status                                          │
│  Do we have rules where clients file? ...                 │
│                                                           │
│  [Snapshot strip]                                         │
│    3 active · 123 needs review · 52 jurisdictions   ⚠ 11 │
│                                                  → Sources│
│                                                           │
│  DOT ORDER · LLC · Partnership · S-Corp · C-Corp · ...   │
│  ● active   ● review   ○ no rule                          │
│                                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │ JUR  NAME      ENTITY  ACT  PEND  SRC  STATUS      │  │
│  │ CA   California ●●●○●●● 0    7    6    Needs ...   │  │
│  │ FL   Florida   ●●○○○●● 0    3    4    Calendar... │  │
│  │ ... (6 attention rows)                              │  │
│  │ ─────────────────────────────────────────────────  │  │
│  │           Show 46 other jurisdictions               │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### 3.1 Snapshot strip (top)

One-line aggregate read. Layout:

- **Left cluster** — catalog state:
  - `N active` (verifiedRule concept tooltip)
  - `N needs review` (candidateRule concept tooltip)
  - `N jurisdictions` (coverage concept tooltip)
- **Right cluster** — source-of-truth state:
  - **Healthy state** — `N sources watched →` (link to /rules/sources)
  - **Incident state** — `⚠ N degraded · N failing → Sources` (bordered pill, link to /rules/sources)

The pointer is always visible. Snapshot stats themselves are
informational; only the Sources pointer is clickable today.

**Open gap**: the catalog stats (`123 needs review`) could be
clickable drills into Library to surface the "review queue"
workflow from a single click.

### 3.2 Legend (mid)

Two-row guide directly above the table:

- **Dot order row** — sequence of entity types in the 7-dot strip
  (LLC · Partnership · S-Corp · C-Corp · Sole prop · Trust ·
  Individual). Eliminates the "what are these dots?" question.
- **Tone meaning row** — ● active · ● review · ○ no rule.

### 3.3 Table (main)

Single jurisdiction table. Two zones:

**Zone 1 — Needs attention** (always visible):
Rows where (pending > 2) OR (jurisdiction has non-default status) OR
(at least one entity dot is not in the default "review" state).
Currently ~6 rows.

**Zone 2 — All clear** (collapsed by default):
Everything else. Hidden under "Show N other jurisdictions" expander.
When expanded, rows render with the STATUS pill replaced by a muted
em-dash (the default pill repeated 40+ times was pure noise).

Columns:

| Column          | Type                    | Affordance                                            |
| --------------- | ----------------------- | ----------------------------------------------------- |
| JUR             | Jurisdiction code badge | Static                                                |
| NAME            | Jurisdiction name       | Static                                                |
| ENTITY COVERAGE | 7 tone-coded dots       | Verified/review dots are buttons → drill into Library |
| ACTIVE          | Count                   | Static                                                |
| PENDING         | Count                   | Button when > 0 → drill into Library                  |
| SOURCES         | Count                   | Link when > 0 → drill into Sources                    |
| STATUS          | Plain-English pill      | Static                                                |

### 3.4 Status pill labels

Heuristic per-jurisdiction tags answering "why is this row
noteworthy?":

- **Needs owner approval** (FED, CA, NY) — pending rules require
  practice-owner judgment
- **Calendar from official source** (FL) — due dates come from
  IRS/state publication, not fixed dates
- **All rules pending** (TX) — no rules accepted yet
- **Filing cadence varies** (WA) — quarterly/monthly variance
- **Awaiting CPA review** (default) — standard pending state

## 4. Cross-page wiring

Every clickable on this page lands on a known destination with
context preserved:

```
┌───────────────┐
│ Coverage      │
│ status        │
│ /rules/coverage│
└──┬────┬───────┘
   │    │
   │    └─ Snapshot Sources pill ──→ /rules/sources
   │                                  (gap: should be ?health=degraded)
   │
   ├─ PENDING cell ─── /rules/library?library=pending_review
   │                   &jur={code}&from=coverage
   │                   → OriginBreadcrumb on Library
   │
   ├─ SOURCES cell ─── /rules/sources?jur={code}&from=coverage
   │                   → OriginBreadcrumb on Sources
   │
   └─ Entity dot ───── /rules/library?library={active|pending_review}
                       &jur={code}&entity={entity}&from=coverage
                       → OriginBreadcrumb resolves
                         "Pre-filtered from Coverage status:
                         California · Individual"
```

### Inbound links to Coverage status

- **Sidebar** — direct entry, RULES group
- **⌘K Command Palette** — "Coverage status" entry in Navigate group
- **Dashboard digest banner** — links to `/rules/coverage` when
  source health is degraded (anchored at the snapshot Sources pill)

### Outbound links from Coverage status

- `/rules/library` — pending drill (per row), entity drill (per dot)
- `/rules/sources` — sources pill (global) + sources count (per row)

## 5. URL state conventions

| Param                     | Source | Meaning                                         |
| ------------------------- | ------ | ----------------------------------------------- |
| (none for Coverage today) | —      | Coverage status table renders all jurisdictions |

Coverage does not yet support its own URL filter state (e.g.
`/rules/coverage?jur=NY` to filter to one jurisdiction). The drill
direction is always outward to Library or Sources. If a future flow
needs "filter Coverage to just NY", that would require:

- `?jur=` URL state on Coverage
- Snapshot strip recalc to per-jurisdiction stats
- An OriginBreadcrumb on Coverage when arrived from ⌘K or Dashboard

Deferred.

## 6. Data model integration

Reads from:

- `orpc.rules.coverage` — returns `RuleCoverageRow[]` with per-
  jurisdiction counts
- `orpc.pulse.listSourceHealth` (via `usePulseSourceHealthQueryOptions`) —
  live source health, joined for the snapshot strip's degraded/failing
  counts

No writes. This page is a pure read.

Dependent data:

- The PENDING / SOURCES drill destinations rely on Library's `?jur=`
  and Sources's `?jur=` URL state (both nuqs-backed)
- The entity-dot drill relies on Library's `?entity=` URL state
  (nuqs-backed) AND on `filterRules` honoring `matchesAnySelected(
rule.entityApplicability, entityFilters)` — known gap: rules with
  `entityApplicability: ['any_business']` are missed by an entity=llc
  drill

## 7. User journeys

### Journey 1: Daily coverage check (owner, 2 minutes)

1. Open sidebar → click "Coverage status".
2. Read snapshot: 3 active · 123 needs review · 52 jurisdictions.
   "Most of the catalog is still pending review."
3. Notice "⚠ 11 degraded → Sources" pill. "Watchers have issues."
4. Scan needs-attention zone: CA, NY, FL, FED, TX, WA. STATUS pills
   say "Needs owner approval" on most.
5. Decide: tackle CA today (highest pending: 7). Click PENDING count
   "7" → lands on Library filtered to CA pending. Origin breadcrumb
   reads "Pre-filtered from Coverage status: California".
6. Review and accept rules in Library.
7. (Optional) browser-back to Coverage status, repeat for NY.

### Journey 2: Source incident triage (manager, 5 minutes)

1. Land on Coverage status.
2. Snapshot's "⚠ 11 degraded" pill draws attention.
3. Click pill → land on /rules/sources. (Today shows all; ideally
   shows degraded-filtered.)
4. Filter chip "Degraded" → narrows to 11 rows.
5. Click a source's title → opens official URL in new tab.
6. Compare the page vs. what watcher captured.
7. (No in-app remediation; manual triage.)

### Journey 3: Verify entity coverage for a new client (preparer)

1. Land on Coverage status.
2. Find NY row → see its 7 entity dots.
3. Hover the "Trust" dot (7th position) → tooltip "Trust — review".
4. Click the dot → land on Library filtered to NY trust pending.
5. See the pending rules; verify whether they apply to the client.

## 8. Visual hierarchy

Order of attention (top → bottom):

1. **Page title** — "Coverage status" (h1, semibold, 2xl)
2. **Description** — answers "what does this page do?" in one
   sentence
3. **Snapshot strip** — at-a-glance read of catalog totals + source
   health
4. **Legend** — teaches the dot encoding before the user encounters dots
5. **Table** — needs-attention rows on top, all-clear hidden by
   default
6. **Expander** — gives access to the full list when needed

No marketing-style hero metrics. No standalone KPI cards.
Newspaper-kicker rhythm.

## 9. Affordance contract

- **Bordered pills** — primary cross-page nav (snapshot Sources pill,
  any breadcrumb Clear button)
- **Inline underline-on-hover** — in-row drills (PENDING, SOURCES
  counts)
- **Silent dots with hover scale** — entity-coverage drill targets
  (dots themselves are the interactive element when in verified or
  review state)
- **Static text** — informational counts (ACTIVE, total counts)

Tone signals **severity only** — never affordance. A click target's
tone is the same as a non-click target's tone of the same kind. Hover

- focus signals interactivity; color signals "needs attention."

## 10. Known issues and follow-ups

1. **Snapshot stats not clickable** — `123 needs review` should drill
   into Library. Today only the right-side Sources pill is clickable.
2. **Degraded pill destination is unfiltered** — links to /rules/sources
   (88 rows) instead of /rules/sources?health=degraded (11 rows). Fix:
   migrate `healthFilter` to nuqs URL state.
3. **`any_business` wildcard ignored in Library filter** — entity-dot
   drill to `?entity=llc` misses rules with
   `entityApplicability: ['any_business']`. Fix: update
   `matchesAnySelected` to treat `any_business` as a superset.
4. **No Coverage URL filter state** — no `?jur=` on Coverage today.
   Deferred until a clear use case (e.g. Dashboard digest links to
   "Coverage for NY").
5. **ACTIVE column reads as 0 in demo** — production data will show
   variance; demo seed needs accepted rules to exercise the column.
6. **Demo seed has no `matched` Pulse alerts** — separate gap; affects
   Radar's Dismiss button visibility (already documented in
   `2026-05-19-e2e-walkthrough-fixes.md`).

## 11. What this PRD does NOT cover

- Rule library page (separate PRD; see existing dev logs
  `2026-05-19-rules-ia-coverage-status-promotion.md` and
  `2026-05-19-library-row-source-citations.md`)
- Sources page (covered by gap #2 dev log
  `2026-05-19-sources-reverse-lookup.md`)
- Radar (Pulse) — kept its tab job, just renamed and elevated
- Temporary rules and Preview — unlisted in sidebar; reachable by
  URL only

## 12. Open product questions

1. Should the snapshot strip aggregate change when the user filters
   the table (currently no filter), OR remain a global catalog read?
2. Should the all-clear zone be hidden permanently (e.g. "46 other
   jurisdictions tracked — open Sources to verify") instead of
   click-to-expand?
3. Should the entity dots remain, or move to a row-expansion pattern
   for progressive disclosure?
4. Should STATUS pill copy include the pending count
   ("Owner must approve 7 pending rules" vs current
   "Needs owner approval")?
5. When the practice has 0 active rules across the catalog (early
   onboarding), what's the empty-state copy and the "next best
   action"?
