# Rules Module Interaction Map (v5 IA)

_Last updated: 2026-05-22. Reflects the IA where Rule Library keeps Coverage
map as the only primary view; the standalone Rule List table is removed,
active rule browsing lives in the active rule queue, and bulk review lives in
the Coverage pending review queue._

## Summary

The Rules module has four user-facing surfaces:

| Slug                | URL               | Sidebar?                 | Primary job                                      |
| ------------------- | ----------------- | ------------------------ | ------------------------------------------------ |
| **Radar**           | `/rules/pulse`    | Yes (OPERATIONS)         | Real-time gov changes that may affect deadlines  |
| **Rule library**    | `/rules/library`  | Yes (RULES)              | Coverage map, active/pending queues, rule detail |
| **Coverage status** | `/rules/coverage` | Back-compat              | Legacy read-only coverage route                  |
| **Sources**         | `/rules/sources`  | **No** (incident-driven) | Watcher health, last-checked, official URL       |

Sources earns no sidebar slot because it's incident-driven sysops, not
daily-use. It's reachable from inline pointers on Rule Library Coverage
(sources summary strip + per-row source count) and Radar attention callouts,
plus ⌘K.

The Rule Library canonical URL state is `?filter=pending|active&q=CA`.
Legacy `?view=rules&library=pending_review&jur=CA` links are replaced to
the Coverage map equivalent. `?rule=<ruleId>` still opens the right-side
rule detail workflow.

---

## A. Coverage status — `/rules/coverage`

### Clickables

| Element                                                          | Type                    | Action                                  | Destination                          | Back-path                                 |
| ---------------------------------------------------------------- | ----------------------- | --------------------------------------- | ------------------------------------ | ----------------------------------------- |
| **Sidebar entries** (8)                                          | NavLink                 | Standard nav                            | route URLs                           | Sidebar persists across pages             |
| **Snapshot › Sources pill** (incident state)                     | Link                    | Open Sources filtered to all            | `/rules/sources`                     | Browser back ／ Coverage entry in sidebar |
| **Snapshot › "N sources watched" link** (healthy state)          | Link                    | Same as above                           | `/rules/sources`                     | Browser back                              |
| **Snapshot › active / needs review / jurisdictions counts**      | Static text             | None (informational)                    | —                                    | —                                         |
| **Snapshot › concept tooltip labels**                            | Hover only              | Show ConceptLabel definition            | — (inline)                           | Hover-off                                 |
| **Jurisdiction summary › PENDING cell**                          | Button (when count > 0) | Drill to Library, pre-filtered          | `/rules/library?filter=pending&q=AL` | Browser back ／ Coverage entry            |
| **Jurisdiction summary › SOURCES cell**                          | Link (when count > 0)   | Drill to Sources, jurisdiction-filtered | `/rules/sources?jur=AL`              | Browser back ／ Coverage entry            |
| **Jurisdiction summary › other cells** (JUR/NAME/ACTIVE/STATUS)  | Static                  | None                                    | —                                    | —                                         |
| **Entity matrix › Business / Personal & fiduciary / All toggle** | Button group            | Switch column set (local state)         | (re-renders matrix)                  | Toggle again                              |
| **Entity matrix › cells**                                        | Static                  | None (dot indicator only)               | —                                    | —                                         |
| **Entity matrix › "Show 48 jurisdictions defaulting to review"** | Button                  | Expand collapsed section (local state)  | (re-renders matrix)                  | Click again to hide                       |

### Notes

- Snapshot strip is _always_ visible and stable: `N sources watched → Sources`.
- Loading state: registry numbers render immediately; source watcher counts do not create incident UI.

---

## B. Rule library — `/rules/library`

### Clickables

| Element                                            | Type                   | Action                                  | Destination / result         | Back-path                     |
| -------------------------------------------------- | ---------------------- | --------------------------------------- | ---------------------------- | ----------------------------- | ------------ |
| **Coverage summary active / needs review numbers** | Button                 | Set `?filter=active                     | pending`                     | Same page, Coverage filtered  | Clear filter |
| **Coverage search**                                | Search input           | Set `?q=`                               | Same page, Coverage filtered | Clear search                  |
| **Jurisdiction row**                               | Row button             | Expand active / pending rule summary    | Inline expanded row          | Click again                   |
| **Pending count / entity coverage cell**           | Button                 | Filter Coverage to focused queue        | `?filter=pending&q=<jur>`    | Clear filter / browser back   |
| **Review pending rules CTA**                       | Button                 | Open review workspace                   | Pending queue + rule detail  | Esc / close detail            |
| **Queue toggle**                                   | Segmented control      | Switch Active / Pending queue           | First rule in target queue   | Toggle back                   |
| **Pending queue rule row**                         | Button                 | Open right-side RuleDetail workflow     | `?rule=<ruleId>`             | Close detail / next-previous  |
| **Active rule row**                                | Button                 | Open right-side read-only RuleDetail    | Active queue + rule detail   | Close detail / next-previous  |
| **Pending queue checkbox**                         | Checkbox               | Select batch-ready rule for bulk review | Updates selected count       | Uncheck / Clear               |
| **Select batch-ready checkbox**                    | Checkbox               | Toggle visible batch-ready rules        | Same queue                   | Toggle again                  |
| **Review selected button**                         | Button                 | Open BulkReview drawer                  | Drawer overlay               | Close drawer                  |
| **BulkReview › Preview button**                    | Button                 | Fetch + render impact preview           | Inline in drawer             | Accept / close drawer         |
| **BulkReview › Accept selected button**            | Button                 | Mutate `bulkAcceptTemplates`            | Drawer closes on success     | Failure → toast, drawer stays |
| **BulkReview › Batch note textarea**               | Textarea               | Capture review note                     | Required for accept          | Edit / clear                  |
| **Source citation link**                           | External `<a>` new tab | Open official document                  | `https://...` external       | Browser back in new tab       |

Source-defined pending rules without a global cached AI concrete draft and
`source_changed` tasks do not render row checkboxes; they remain single-rule
detail workflow rows. Source-defined rules with a cached AI concrete draft can
enter bulk review, where the drawer shows the draft fields and the server
re-validates the draft before activation. Opening a Rule Detail reads the same
cache data; it does not trigger `draftConcreteRule` generation in the customer
render path.

When the selected `?rule=` is already `active` / `verified`, the same workspace
switches its left rail to the Active rule queue. That queue keeps the Coverage
search and jurisdiction grouping, but removes batch-ready checkboxes and bulk
review controls because accepted practice rules are a browse/audit workflow.
The rail header has an Active / Pending toggle; switching queues selects the
first rule in the target queue so the left rail and right-side detail stay in
sync. Next/previous navigation stays inside the selected queue.

### Rule detail clickables

| Element                                      | Type                   | Action                     | Destination                  | Back-path                     |
| -------------------------------------------- | ---------------------- | -------------------------- | ---------------------------- | ----------------------------- |
| **Accept button**                            | Button                 | Mutate (orpc.rules.accept) | Drawer closes, rules refetch | Failure → toast, drawer stays |
| **Reject button**                            | Button                 | Mutate (orpc.rules.reject) | Drawer closes, rules refetch | Failure → toast, drawer stays |
| **Evidence card → source link**              | External `<a>`         | Open official document     | External URL (new tab)       | Browser back in new tab       |
| **Close button (X)** ／ Esc ／ outside click | Button / key / overlay | Close drawer               | Back to filtered Library     | Re-click row to reopen        |

---

## C. Sources — `/rules/sources`

### Clickables

| Element                                    | Type                     | Action                           | Destination         | Back-path                                |
| ------------------------------------------ | ------------------------ | -------------------------------- | ------------------- | ---------------------------------------- |
| **Filter chips** (All · Watched · Paused)  | Button                   | Set watch filter (local)         | Same page, filtered | Click another chip                       |
| **JURISDICTION header filter**             | Multi-select dropdown    | Set `?jur=` (URL state via nuqs) | Same page, filtered | Open dropdown, clear ／ remove URL param |
| **TYPE / CADENCE / METHOD header filters** | Multi-select dropdown    | Local filter state               | Same page, filtered | Open dropdown, clear                     |
| **Source title link**                      | External `<a>` (new tab) | Open official document           | External URL        | Browser back in new tab                  |
| **Pagination › Previous / Next**           | Button                   | Change page                      | Same page           | Opposite button                          |

### Notes

- The whole row used to be a click target (entire row opened the source URL). With nuqs URL-state, clicking elsewhere on the row is currently no-op except the title-link cell. Acceptable: rows are scannable; the URL only opens when explicitly clicked.

---

## D. Radar — `/rules/pulse`

### Clickables

| Element                                                                                          | Type            | Action                                                                                        | Destination                    | Back-path                  |
| ------------------------------------------------------------------------------------------------ | --------------- | --------------------------------------------------------------------------------------------- | ------------------------------ | -------------------------- |
| **Impact filter select** (all · needs_action · needs_review · closed)                            | Select dropdown | Set local filter                                                                              | Same page                      | Reset button ／ select all |
| **Status filter select** (active · applied · partially_applied · dismissed · reverted · snoozed) | Select dropdown | Set local filter                                                                              | Same page                      | Reset button               |
| **Source filter select** (per-alert dynamic list)                                                | Select dropdown | Set local filter                                                                              | Same page                      | Reset button               |
| **Reset button**                                                                                 | Button          | Clear all 3 filters                                                                           | Same page (all alerts visible) | Re-apply filters manually  |
| **Alert card › Review button**                                                                   | Button          | Open PulseAlertDrawer                                                                         | Drawer overlay                 | Close drawer (Esc / X)     |
| **Alert card › Dismiss button**                                                                  | —               | Not wired in Rules › Radar (omitted intentionally; dismiss lives in dashboard banner context) | —                              | —                          |
| **Source filter select** (per-alert dynamic list)                                                | Select dropdown | Filter by alert source                                                                        | Same page                      | Reset button               |

### PulseAlertDrawer clickables (opens on Review)

- Apply / Snooze / Dismiss / Revert actions (per alert status; not fully enumerated here)
- Cross-page navigation: drawer can link out to affected clients ／ rule preview

---

## Cross-page navigation diagram (text)

```
                    ┌─────────────────────┐
                    │   Sidebar (always)  │
                    └──┬──────────────────┘
                       │
       ┌───────────────┼─────────────────────────┐
       │               │                         │
       ▼               ▼                         ▼
┌──────────────┐  ┌───────────────────┐  ┌──────────────┐
│   Radar      │  │ Coverage status   │  │ Rule library │
│ /rules/pulse │  │ /rules/coverage   │  │ /rules/      │
│              │  │                   │  │   library    │
│  ┌────────┐  │  │  ┌────────────┐   │  │              │
│  │ Alert  │  │  │  │ Snapshot   │   │  │ ┌──────────┐ │
│  │ Drawer │  │  │  │   strip    │───┼──┼─┤Citation  │ │
│  └────────┘  │  │  └────────────┘   │  │ │  → ext   │ │
│              │  │                   │  │ └──────────┘ │
│  ┌────────┐  │  │  PENDING cell ────┼──┼─→ filtered   │
│  │ Health │  │  │                   │  │   Library    │
│  │ table  │  │  │  SOURCES cell ────┼──┼──┐           │
│  └────────┘  │  │                   │  │  │           │
└──────────────┘  └───────────────────┘  └──┼───────────┘
                                            │
                                            ▼
                                  ┌─────────────────────┐
                                  │  Sources            │
                                  │  /rules/sources     │
                                  │  (no sidebar slot)  │
                                  └─────────────────────┘
                                            │
                                            ▼
                                  External official docs
                                  (IRS, state DOR, etc.)
```

URL parameters shared across pages:

- `?filter=pending|active&q=CA` — Rule Library Coverage filter and search state
- `?rule=<ruleId>` — open right-side rule detail in the Coverage review workspace
- `?jur=AL,CA,NY` — Sources jurisdiction filter

---

## User journeys (3 primary)

### Journey 1: Owner reviews this week's pending rules (most frequent)

1. **Land** → Dashboard. See "23 rules need review" digest banner.
2. **Click** banner → `/rules/library?filter=pending`.
3. **Open review queue** → click `Review pending rules`.
4. **Scan queue rows**. Each row shows title, status, source citation.
5. **Verify source** for an unfamiliar rule → click `SOURCE Alabama DOR Individual Income Tax Return Filing FAQ ↗` (opens official doc in new tab).
6. **Switch tab back** → queue stays in the same scroll position.
7. **Click row** → right-side rule detail opens with full evidence.
8. **Decide** → Accept ／ Reject in detail.
9. **Repeat** for bulk: select visible queue rows → Review selected → BulkReviewDrawer → Preview → Accept selected.

**Back-paths**: Esc exits rule detail. Queue row remains scroll-stable across detail open/close.

### Journey 2: Manager audits watched sources

1. **Land** → Coverage status. Snapshot strip shows `All N sources watched → Sources`.
2. **Click** pill → `/rules/sources`.
3. **Filter chip** → choose `Watched` or `Paused`; use jurisdiction/type/cadence filters for focus.
4. **Verify source** → click source title link → opens official URL in new tab.
5. **Switch tab back** → Sources page persists.
6. **Drill to Coverage for the affected jurisdiction**: browser back to Coverage status ／ click sidebar Coverage status entry.

**Gap noted below**: there's no quick way to ask "which rules depend on this source?" from the Sources page. The relationship is sourceId → rules[] but the UI doesn't expose it.

### Journey 3: Preparer verifies a rule's provenance before applying

1. **Land** → Rule library. Filter to `Active`.
2. **Find rule** (e.g., NY annual S-corp filing). Click row → RuleDetailDrawer.
3. **Read evidence cards**. Each has the cited passage, retrieved-at date, source title.
4. **Verify** → click evidence-card source link → external doc.
5. **Cross-check** with Coverage status to see how many similar rules exist for NY: switch sidebar to Coverage status.
6. **Drill** → click NY pending count → `/rules/library?library=pending_review&jur=NY`.

**Back-paths**: drawer + library + coverage are all in sidebar; reaching any from any other is one click.

---

## Gaps and proposed fixes

| #   | Gap                                                                                                                                                                                         | Severity | Proposed fix                                                                                                                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Coverage status entity matrix cells are inert.** Dots indicate verified / review / no-rule but clicking doesn't drill anywhere.                                                           | P2       | Make each cell a button: drill to `/rules/library?library=active&jur=X&entity=Y` (or `pending_review` if status is review). Honest affordance: empty cells stay inert.                                            |
| 2   | **Sources → "which rules cite this source?"** is invisible.                                                                                                                                 | P2       | Add a small expander on each Source row showing the count of citing rules, with "View X rules" link to `/rules/library?source=ID` (requires new `?source=` filter).                                               |
| 3   | **Rule detail drawer evidence link has no back-path within the drawer.** Clicking opens external; user has to manage tabs.                                                                  | P3       | External links are fine. Optional: render the cited passage inline (already there in evidence cards) so the external open is "confirm what I just read", not "find what was said". Status: already there in v4. ✓ |
| 4   | **Radar dismiss not wired in `/rules/pulse`** (only in dashboard banner).                                                                                                                   | P2       | Verify intentional. If alerts should be dismissable here, pass `onDismiss` to `PulseAlertCard`.                                                                                                                   |
| 5   | **No "show me everything for jurisdiction NY" cross-page link.** Today you'd have to load each page (Library, Sources, Coverage) and apply `?jur=NY` manually.                              | P3       | A ⌘K command "Filter all Rules pages to NY" that pushes `?jur=NY` and lands on Coverage status.                                                                                                                   |
| 6   | **Library row click expands cell height to 3 lines** (title + id + SOURCE). Some rules cite 0 sources → no citation → row is 2 lines. Inconsistent vertical rhythm.                         | P3       | Either always reserve the third line (placeholder "No source on file" muted), or accept the variance and document it. Variance is honest.                                                                         |
| 7   | **PENDING and SOURCES cells in Coverage status use different affordance styles** — both underline-on-hover, but PENDING uses the same blue review tone while SOURCES is default text color. | P3       | Confirmed intentional: PENDING tone signals severity ("needs CPA attention"); SOURCES is informational (not "bad"). Keep as is, document in code comment. ✓                                                       |
| 8   | **Library has no breadcrumb to show "I came from Coverage status, pre-filtered to NY pending"** — the chip + jur filter is visible but the cross-page origin isn't.                         | P3       | Optional: small inline pill above the table "Pre-filtered from Coverage status → clear". Drops back to default filters.                                                                                           |

---

## Maintenance notes for future passes

- **Filter URL conventions are load-bearing.** `?jur=` and `?library=` are used across pages.
  Adding a new shared filter (e.g., `?entity=`, `?source=`) should follow the same pattern:
  nuqs `parseAsArrayOf(parseAsString).withDefault([]).withOptions({ history: 'replace' })`.
- **External links use new tab.** All source citations, evidence URLs, and watcher URLs open in `target="_blank" rel="noopener noreferrer"`. Internal nav stays in-tab.
- **Drawer return paths** are universal: Esc / outside click / X. No drawer has a custom close UX. Maintain.
- **Concept tooltips** (verifiedRule, candidateRule, evidence, coverage, requiresReview) use the shared `<ConceptLabel>` component. Adding new concepts should extend `concept-help.ts`, not invent ad-hoc tooltip patterns.

---

## What is **not** in this map

- Settings (`/settings`), Members, Billing, Practice profile — non-Rules surfaces.
- Dashboard digest banners that link into Rules — covered by Dashboard interaction map (TBD).
- Mobile drawer behavior — desktop only for this pass.
