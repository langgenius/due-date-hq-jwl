# PRD — Original Rules Console (pre-2026-05-18)

_Reference document. The structure below describes the Rules
module **before** the May 18–19 IA redesign. Use this PRD to
understand what was there before, what each tab did, and how the
pieces linked. The new merged page is documented in
[06-prd-coverage-status-page.md](06-prd-coverage-status-page.md)._

## 1. Product context

DueDateHQ is a tax-deadline operations product for US small CPA
practices. The Rules module governs the firm's catalog of practice
rules — the templates that generate per-client filing obligations.

Rules in this product model:

- **Rule** — a template (e.g., "California individual income tax
  return applicability"). Has a jurisdiction, entity applicability,
  tier, source citations, evidence.
- **Source** — an official document the rule cites (IRS Pub 509,
  state tax code, DC government bulletin). Watched by Pulse for
  changes.
- **Pulse alert** — a source-backed change the watcher detected
  (e.g., "IRS extends LA County partnership deadlines by 30 days").
  CPAs apply, dismiss, snooze, or revert these.

## 2. Audience

| Persona                   | Daily job on Rules Console                                                      |
| ------------------------- | ------------------------------------------------------------------------------- |
| **Practice owner**        | Approve / reject pending rule templates. Audit watched or paused sources.       |
| **Manager**               | Same as owner; can apply Pulse exceptions.                                      |
| **Preparer**              | Review which clients are affected by a Pulse change. Mostly read-only on rules. |
| **Coordinator / Partner** | Spot-check; primarily observers here.                                           |

## 3. Information architecture (original)

One sidebar entry: **Rules** → `/rules` → tabbed interface with
six tabs:

```
┌──────────────────────────────────────────────────────────────┐
│  Coverage │ Sources │ Library │ Pulse │ Temporary │ Preview  │
├──────────────────────────────────────────────────────────────┤
│  [tab content]                                                │
└──────────────────────────────────────────────────────────────┘
```

Tab state via URL: `?tab=coverage|sources|library|pulse|temporary|preview`.

### Tab 1: Coverage

**Purpose**: "Do we have rules where clients file?"

**Surface**: two side-by-side tables.

- Left: jurisdiction summary — 52 rows × {JUR, NAME, ACTIVE, PENDING, SOURCES, STATUS}
- Right: jurisdiction × entity matrix — 52 rows × 5–7 entity columns (LLC, Partnership, S-Corp, …)
  - Tone-coded dots (green = active, orange = review, gray = no rule)
  - Toggle: Business / Personal & fiduciary / All entity groups
  - Distill: 48 all-review jurisdictions hidden under "Show 48 jurisdictions defaulting to review" expander

**Stats above**: 4-card KPI strip — Active rules / Needs review / Sources watched / Jurisdictions.

**Clickables**:

- Pending cell drill → filters Library tab to `?library=pending_review&jur=X`
- Matrix toggle buttons → switches entity column set (local state)
- "Show 48 jurisdictions" expander → reveals collapsed matrix rows

**Read-only**: entity matrix cells themselves (just dot indicators).

### Tab 2: Sources

**Purpose**: "What documents are we watching, and which ones are paused?"

**Surface**: single table — N rows × {SOURCE (title + id), JUR, TYPE,
CADENCE, METHOD, WATCH, LAST CHECKED, external link icon}.

**Filters**:

- Filter chips: All · Watched · Paused (local state)
- Header dropdowns: JUR / TYPE / CADENCE / METHOD (local state, multi-select)

**Clickables**:

- Source title (anchor) → opens official document in new tab
- Row click → opens official document in new tab
- External-link icon → opens official document
- Pagination Previous / Next

**Read-only**: WATCH badge, LAST CHECKED timestamp.

### Tab 3: Library

**Purpose**: "Review pending rule templates; accept / reject / archive."

**Surface**: single table — N rows × {checkbox, JUR, RULE (title + id),
FORM, ENTITY, TIER, STATUS, VERSION, ›}.

**Filters**:

- Filter chips: Needs review · Active · All · Rejected · Archived ·
  Applicability review · Exception (7 chips, local state) — later
  reduced to 5 in summary-strip iteration
- Header dropdowns: JUR / ENTITY / TIER / STATUS (local state)

**Clickables**:

- Row body → opens RuleDetailDrawer (evidence cards, Accept / Reject buttons)
- Row checkbox → bulk-select for review
- Select-all checkbox → toggle all visible
- Review selected button → opens BulkReviewDrawer (Preview / Accept Selected / Batch note)
- Pagination

**Drawer actions**:

- Accept rule → mutates `orpc.rules.accept`, invalidates cache, closes drawer
- Reject rule → mutates `orpc.rules.reject`, similar
- Evidence card → opens source URL in new tab

### Tab 4: Pulse (renamed Radar in v4)

**Purpose**: "Live government changes that may affect client deadlines."

**Surface**: stacked alert cards. Each card carries:

- Alert title + source label
- AI confidence percentage
- Matched-client count or "No matching clients in this practice"
- Review button → opens PulseAlertDrawer
- (No Dismiss button in original tab; only on the Dashboard banner)

**Filters**:

- Impact filter select: All · Needs action · Needs review · Closed
- Status filter select: Active · Applied · Partially applied · Dismissed · Reverted · Snoozed
- Source filter select (dynamic per-alert list)
- Reset button

Source watcher diagnostics no longer appear in Pulse Changes. CPA users use the
Sources tab for watched/paused source inventory; fetch/parser failures stay in
internal ingest metrics and runbooks.

Pulse detail uses parsed fields only as product facts: source, jurisdiction,
forms, entity types, due-date delta when applicable, and official source
excerpt. Raw AI/source extraction payloads such as `structuredChange` remain
internal and are not rendered directly to CPA users.

### Tab 5: Temporary

**Purpose**: "Review applied Pulse exceptions that are temporarily
overriding due dates."

**Surface**: table of currently-applied exceptions with revert / expire-now affordances.

### Tab 6: Preview

**Purpose**: "Sandbox — given client facts, generate the obligation list
the rule engine would produce."

**Surface**: form input (client facts) + result panel. Internal QA / debugging surface, not a daily-use destination.

## 4. User journeys (original)

### Journey 1: Weekly pending-rule review (owner)

1. Land on `/rules`.
2. Tab defaults to `coverage`. See the matrix.
3. Notice 123 candidates in the KPI strip.
4. Click "Library" tab.
5. Filter chip "Needs review" already selected.
6. Click a row → drawer opens.
7. Read evidence. Accept or reject.
8. Drawer closes; table refetches.
9. Repeat. Or select multiple rows → Review selected → BulkReviewDrawer.

### Journey 2: Source inventory audit (owner/manager)

1. Land on `/rules`.
2. Tab `coverage` → see "Sources watched 88" KPI.
3. Click "Sources" tab.
4. Filter chip "Watched" or "Paused" narrows by CPA-facing watch state.
5. Click source title → opens official URL in new tab.
6. Compare what the page says vs. source metadata and the signal trail.
7. Fetch/parser diagnostics stay in ops runbooks, not this CPA surface.

### Journey 3: Pulse change triage (owner/manager)

1. Land on `/rules` from Dashboard banner ("8 Pulse changes need attention").
2. URL: `?tab=pulse&alert=<id>` — drawer opens.
3. Review evidence + matched clients.
4. Apply exception OR snooze OR (from banner only) dismiss.

## 5. Cross-tab navigation

Limited. The Coverage pending-cell drill is the only cross-tab link;
everything else is direct tab switching.

- Coverage → Library: PENDING cell click pushes `?tab=library&library=pending_review&jur=X`
- Library row click → opens RuleDetailDrawer (same tab)
- Sources row click → external URL (leaves the app)
- Pulse alert → PulseAlertDrawer (same tab)

No cross-page breadcrumb. No origin tagging. URL filter state is
sparse (only `?tab=`, `?library=`, `?alert=`).

## 6. Data model (relevant entities)

```
RuleSource {
  id, jurisdiction, title, url, sourceType,
  acquisitionMethod, cadence, priority, healthStatus,
  lastReviewedOn
}

ObligationRule {
  id, title, jurisdiction, entityApplicability[],
  taxType, formName, eventType, taxYear, ruleTier, status,
  coverageStatus, requiresApplicabilityReview,
  dueDateLogic, extensionPolicy,
  sourceIds[], evidence[], …
}

RuleCoverageRow {
  jurisdiction, sourceCount,
  verifiedRuleCount, candidateCount,
  activeRuleCount?, pendingReviewCount?, …
}

PulseAlertPublic {
  id, status, source, title, summary, publishedAt,
  matchedCount, needsReviewCount, …
}
```

## 7. Known issues / why we redesigned

1. **Coverage's two tables overlapped**: both scanning the same 52
   jurisdictions on the same axis. Information density without
   complementary information.
2. **KPI cards = AI-slop hero metrics**: four cards reading as a
   marketing dashboard instead of a working surface.
3. **No source citations on rule rows**: every rule had `sourceIds[]`
   but rows didn't render the citation. Users had to open the drawer
   to verify provenance.
4. **Tabbed IA buried high-traffic destinations**: Library (daily use)
   and Pulse / Radar (real-time) were one click deeper than they
   needed to be.
5. **Filter state was local**: cross-tab deep links couldn't carry
   filter context.
6. **No cross-page breadcrumb**: users couldn't tell why a tab
   looked pre-filtered.

The May 18–19 redesign addressed each of these. See
[06-prd-coverage-status-page.md](06-prd-coverage-status-page.md) for
the new IA.

## 8. What stayed the same (intentional)

- The Library row → RuleDetailDrawer interaction (Accept / Reject)
- The Pulse alert → PulseAlertDrawer interaction (Review action)
- The Source row → external URL behavior (with security attrs)
- The data model (no contract changes)
- Authority gates on mutating actions (`rules.accept`, `pulse.apply`)

## 9. Retroactive observations

This is a reference PRD describing the pre-redesign state, written
after the v4 IA shipped. Things we'd want to have measured if we'd
PRD'd this design originally:

| Dimension                   | Original Rules Console                                             |
| --------------------------- | ------------------------------------------------------------------ |
| Sidebar entries             | 1 (Rules)                                                          |
| Default tab                 | Coverage (matrix-heavy)                                            |
| Tabs to reach Library       | 1 click (after landing on Coverage)                                |
| Tabs to reach Pulse / Radar | 1 click                                                            |
| Tab switch state            | URL-preserved (`?tab=`)                                            |
| Cross-tab filter context    | None (each tab's filters were local)                               |
| Page weight at default      | ~5700 px scroll (Coverage matrix + Library)                        |
| Affordance vocabulary       | Mixed (Library uses drawers; Pulse uses cards; Coverage uses dots) |

## 10. Migration path (in case of partial rollback)

If we ever need to restore parts of the original design:

- The tabbed `/rules` route was not deleted — it now redirects via
  `rulesIndexLoader` to the corresponding standalone page.
- Old deep links (`/rules?tab=coverage`, `/rules?tab=library`, etc.)
  continue to work.
- Component files like `CoverageTab`, `RuleLibraryTab`, `SourcesTab`,
  `PulseChangesTab` still exist — they're rendered by the new
  standalone routes, just without the tab nav above them.
- The `RulesPageShell` wrapper unifies the page-header treatment.

A partial rollback would mean: restore the tabbed page that mounts
all four tabs. The data + procedures didn't change.

## 11. What this PRD does NOT cover

Same as the v4 PRD: this document is the design + IA story. PM
artifacts (success metrics, rollout phases, acceptance criteria) for
the historical version were never written — captured implicitly via
the user-feedback that drove the redesign.
