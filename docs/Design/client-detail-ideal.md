# Ideal client detail page

**Date:** 2026-06-10
**Pencil reference:** `M7Ady4` (needs the 6 edits in `client-detail-page-layout.md` §7 to become faithful)
**Live code:** `apps/app/src/features/clients/ClientDetailWorkspace.tsx`
**Companions:** `client-detail-page-layout.md` · `deadline-row-interaction.md` · `2026-06-10-design-handoff-index.md`

This doc is the SOURCE OF TRUTH for what `/clients/:clientId` should be when polished. It's grounded in what exists and adds only what existing data supports.

---

## The macro question — what's this page for?

A CPA opens `/clients/:clientId` to answer one of four jobs:

| Job                                                                 | Frequency            | Implied layout need                                                    |
| ------------------------------------------------------------------- | -------------------- | ---------------------------------------------------------------------- |
| **A. "What needs my attention on this client today?"**              | Multiple times daily | Prominent at-a-glance status — KPI band + alerts banner above the fold |
| **B. "Work on a specific deadline / filing"**                       | Multiple times daily | Filings list → click → inline expand OR navigate to deadline detail    |
| **C. "Update client setup (jurisdictions, classification, owner)"** | Weekly               | Setup tab with editable section cards                                  |
| **D. "Audit / history — when did X happen?"**                       | Monthly              | History tab with audit log + AI summary                                |

A through D map cleanly to the four regions of an ideal client detail page: **above the fold · Work tab · Setup tab · History tab**. The existing `ClientDetailWorkspace` already follows this structure. The ideal version polishes it.

---

## The ideal layout (ASCII, 1440px)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Icon rail   │  PageHeader: Clients / Hudson & Wells LLP                      │
│  (56w app   │  Title + metaRow + actions [Edit / Reverify / Export]          │
│   shell)    │  ASIDE slot: <HealthChip status="healthy" />                   │
│             ├─────────────────────────────────────────────────────────────────│
│             │  ClientNotesStrip   (1-line preview, click to open editor)     │
│             ├─────────────────────────────────────────────────────────────────│
│             │  ClientActiveAlertsSection   (alerts banner — only if N > 0)   │
│             ├─────────────────────────────────────────────────────────────────│
│             │  ClientSummaryStrip   (StatBand: Next filing · Blocked · Open) │
│             ├─────────────────────────────────────────────────────────────────│
│             │  Tabs:   [Work*]  [Setup]  [History]                            │
│             │  ─────────────────────────────────────────────────────────────  │
│             │                                                                 │
│             │  ┌─ Filings (the heart of the page) ─────────────────────────┐ │
│             │  │ Sort: Smart priority   ·   Filter: pending+overdue ▾      │ │
│             │  │ ───────────────────────────────────────────────────────── │ │
│             │  │ [1099] Federal Form 1099-NEC      Waiting on client  3d   │ │
│             │  │ [568]  CA Form 568 — LLC return   Not started        9d   │ │
│             │  │ [1065] Federal Form 1065 (selected, accent-bar)           │ │
│             │  │   ┌─ EXPANDED INLINE ───────────────────────────────────┐ │ │
│             │  │   │ Workflow journey · Recent activity · What's left    │ │ │
│             │  │   │ [Mark filed] [Reassign] [Snooze]                    │ │ │
│             │  │   │                              Open full deadline →   │ │ │
│             │  │   └─────────────────────────────────────────────────────┘ │ │
│             │  │ [8879] Form 8879 e-file auth      Awaiting signature 22d  │ │
│             │  │ + 4 more filings (paginated)                              │ │
│             │  └───────────────────────────────────────────────────────────┘ │
│             │                                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

No master-detail rail. The page is full-width because the user is already inside the client — there's no "switch client" job here. To switch clients they go back to `/clients` (the list).

---

## Above-the-fold contract (the part that earns 80% of the value)

Four elements, in order, above the first tab:

### 1. `<PageHeader>`

**File:** `apps/app/src/components/patterns/page-header.tsx:34-150`

| Prop          | Value                                                                                                                                                                                                       |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `breadcrumbs` | `[{href:'/clients', label:'Clients'}, {label: client.name}]`                                                                                                                                                |
| `eyebrow`     | None — the breadcrumb is the eyebrow                                                                                                                                                                        |
| `title`       | `client.name` (e.g. "Hudson & Wells LLP")                                                                                                                                                                   |
| `metaRow`     | A flex-wrap row of identity chips: `Entity · Form 1065 · EIN 47-2901835 · NY · Partner: Mira Robinson` — each chip uses the canonical chip chrome `bg-subtle · cornerRadius:999 · padding:[3,10]` with icon |
| `description` | None (client has no tagline)                                                                                                                                                                                |
| `actions`     | `[<EditClientButton />, <ReverifyButton />, <ExportButton />]`                                                                                                                                              |
| `aside` (NEW) | `<HealthChip status={client.healthStatus} />` — small `success/warning/destructive` chip at right end of title row                                                                                          |

**Why aside slot is new:** the existing PageHeader has no right-aligned visual cue. The health chip is the most-glanced piece of state on this page — it should sit at the title level. Add an `aside?: ReactNode` prop to PageHeader (small change, doesn't break existing usage).

### 2. `<ClientNotesStrip>`

**File:** existing in `apps/app/src/features/clients/`

Persistent, read-only one-line preview of the client's notes. Click to open the inline editor. Keep as-is.

If notes are empty: render placeholder _"Add internal notes about this client — visible to your team only"_ with `+ Add note` link.

### 3. `<ClientActiveAlertsSection>`

**File:** existing

Banner for active alerts affecting THIS client. Only renders if `client.activeAlertsCount > 0`. Otherwise omit (no empty state — silence is the empty state).

Each alert row: `triangle-alert` icon + alert title + `View →` link to `/alerts/:id`.

### 4. `<ClientSummaryStrip>` (uses `<StatBand>`)

**File:** `apps/app/src/components/patterns/stat-band.tsx:62-150` + `apps/app/src/features/clients/components/ClientSummaryStrip.tsx`

Three slots, no card chrome (`border-y` only):

| Slot | Eyebrow      | Value               | Sub                      | Tone                            | Click                                                                          |
| ---- | ------------ | ------------------- | ------------------------ | ------------------------------- | ------------------------------------------------------------------------------ |
| 1    | NEXT FILING  | `Form 568 · Mar 16` | "9 days · Mira Robinson" | Neutral (or warning if <7 days) | Opens the filing — calls `setExpanded(filingId)` to expand the row in Work tab |
| 2    | BLOCKED      | `0` (or N)          | "in review / on client"  | Destructive if > 0              | Filters Work tab to blocked status                                             |
| 3    | OPEN FILINGS | `8`                 | "across 3 jurisdictions" | Neutral                         | Filters Work tab to all open                                                   |

**Don't add a 4th slot.** Per `client-detail-page-layout.md` §5.B.

### Above-the-fold height budget

- PageHeader: ~120px
- ClientNotesStrip: ~32px when empty/preview, expands inline when editing
- ClientActiveAlertsSection: ~64px per alert (typically 0–2)
- ClientSummaryStrip: ~96px (StatBand `py-7`)
- Tabs row: ~48px

**Total: ~360px above the fold.** On a 900px viewport, the user sees the first 4–5 filings rows in the Work tab. That's the right balance.

---

## Tabs — what each one does

### Work tab (default)

The heart of the page. **80% of user time is here.**

**Renders:** `<ClientWorkPlanPanel>` (existing) — filings table grouped by tax year.

**Required changes:**

1. **Each row uses `<DeadlineRow mode="inline-expand">`** per `deadline-row-interaction.md`. Clicking a row body expands inline. Clicking the title navigates to `/deadlines/:obligationRef/summary`.

2. **Filter bar at top of the panel:**
   - Status filter (chip dropdown — uses `?status=` URL param)
   - Tax year filter (defaults to "current year + upcoming")
   - Owner filter (uses `?assigneeNames=` URL param)
   - Search box (filter by form code / title)

3. **Sort affordance:** Smart priority (default), Due date asc, Due date desc, Updated desc.

4. **Empty state:** if 0 filings, render `<DetailSectionCard title="Filings"><EmptyState /></DetailSectionCard>` with `+ Add filing` action.

**What it does NOT have:**

- Bulk action toolbar (single client → batching across the client's deadlines is rare; defer to v1.1)
- Calendar view (lower priority; tables already do this job)
- Kanban view (low value for a single client's deadlines)

### Setup tab

Configuration. Lower frequency. Section cards.

**Renders, in order:**

```tsx
<DetailSectionCard title="Compliance posture" headerRight={<EditButton />}>
  {/* Tax classification, entity type, fiscal year, state of formation */}
</DetailSectionCard>

<DetailSectionCard title="Tax classification">
  {/* C-Corp, S-Corp, Partnership, etc. with effective date */}
</DetailSectionCard>

<DetailSectionCard title="Filing jurisdictions" headerRight={<AddJurisdictionButton />}>
  {/* List of states + Federal + their filing profiles */}
</DetailSectionCard>

<DetailSectionCard title="Primary contact" headerRight={<EditButton />}>  {/* NEW */}
  {/* Uses client.primaryPhone + client.email - SCALAR fields, not a list.
      See client-detail-page-layout.md §5.C */}
</DetailSectionCard>

<DetailSectionCard title="Risk profile">
  {/* Risk score, exposure flags, audit history summary */}
</DetailSectionCard>

<DetailSectionCard title="Import source">
  {/* Where this client was imported from + dedupe info */}
</DetailSectionCard>
```

Each card uses canonical chrome (h36 bg-subtle bar + body padding [16,20]).

### History tab

Read-only audit + AI insights. Loaded lazily.

```tsx
<DetailSectionCard title="AI summary" headerRight={<RegenerateButton />}>
  {/* 1-paragraph LLM summary of the client's recent activity */}
</DetailSectionCard>

<DetailSectionCard title="Audit log" headerRight={<ExportButton />}>
  {/* Timeline of state changes, mutations, alerts applied */}
</DetailSectionCard>
```

---

## Quick actions — what's reachable in one click

| Action                                     | Affordance                                          | Location                                           |
| ------------------------------------------ | --------------------------------------------------- | -------------------------------------------------- |
| Edit client identity                       | `Edit` button                                       | PageHeader actions                                 |
| Reverify (rerun coverage detection)        | `Reverify` button                                   | PageHeader actions                                 |
| Export client data (CSV)                   | `Export` button                                     | PageHeader actions                                 |
| View notes (full)                          | Click `ClientNotesStrip`                            | Above the fold                                     |
| Add internal note                          | `+ Add note` link                                   | Above the fold (when empty) OR inside notes editor |
| See most-pressing filing                   | Click `NEXT FILING` stat                            | StatBand → expands the filing row in Work tab      |
| Triage blocked filings                     | Click `BLOCKED` stat                                | StatBand → filters Work tab to `?status=blocked`   |
| Browse all open filings                    | Click `OPEN FILINGS` stat                           | StatBand → filters Work tab to all open            |
| Switch to a specific filing                | Click any row title                                 | Navigates to `/deadlines/:id/summary`              |
| Peek at a filing inline                    | Click any row body                                  | Expands inline (per deadline-row-interaction)      |
| Mark a filing done                         | `Mark filed` button in expanded row                 | Calls `obligations.updateStatus`                   |
| Reassign owner of a filing                 | `Reassign` button → popover                         | Calls `obligations.assign`                         |
| Update tax classification                  | Click `Edit` on Compliance posture card (Setup tab) | Inline editor                                      |
| View audit history                         | Switch to History tab                               | —                                                  |
| Open an active alert affecting this client | Click `View →` in `ClientActiveAlertsSection`       | Navigates to `/alerts/:id`                         |

Every high-frequency job is **one click** from above the fold. Every low-frequency job is **two clicks** (one tab switch + one action).

---

## URL state contract

All filter / expansion / tab state lives in URL params (via `nuqs`).

| Param           | Default    | Effect                                                                     |
| --------------- | ---------- | -------------------------------------------------------------------------- |
| `tab`           | `'work'`   | Active tab — `work` / `setup` / `history`                                  |
| `expanded`      | `''`       | Currently expanded filing row in Work tab                                  |
| `status`        | `[]`       | Status filter chip in Work tab — array `?status=blocked,waiting_on_client` |
| `assigneeNames` | `[]`       | Owner filter chip in Work tab                                              |
| `year`          | current FY | Tax year filter in Work tab                                                |
| `search`        | `''`       | Search query in Work tab                                                   |

`useQueryStates` setup in `ClientDetailWorkspace`:

```tsx
const [filters, setFilters] = useQueryStates({
  tab: parseAsStringLiteral(['work', 'setup', 'history']).withDefault('work'),
  expanded: parseAsString.withDefault(''),
  status: parseAsArrayOf(parseAsString).withDefault([]),
  assigneeNames: parseAsArrayOf(parseAsString).withDefault([]),
  year: parseAsInteger.withDefault(currentTaxYear()),
  search: parseAsString.withDefault(''),
})
```

**Deep-linkable example:** `/clients/hudson-wells?tab=work&status=blocked&expanded=ob_abc123` → land on Work tab, filtered to blocked, with row `ob_abc123` pre-expanded.

---

## What the ideal page is NOT

To avoid scope drift, here's what's explicitly out of scope:

| Anti-feature                                     | Why we don't ship                                                                    |
| ------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Master-detail with client navigator rail         | `/clients` list is the navigator; the detail is a destination, not a workspace       |
| Card grid layout for filings                     | Tables earn the job (see `clients-card-vs-table` discussion in the design doc index) |
| Kanban view of filings by status                 | Single-client deadlines don't need Kanban; the table sort handles it                 |
| Multi-client toggle / "compare two clients" view | Out of scope; rare job; build only if 3+ partners ask                                |
| Pipeline / opportunity tracking                  | This is `/opportunities` — keep separate                                             |
| Custom dashboards per client                     | Premature; do for v1 with the canonical layout                                       |
| Chat panel / direct messaging to client          | Belongs in `/alerts` or future comms surface, not here                               |
| Time tracking widgets                            | Out of scope — there's no time tracking model                                        |
| Document repository                              | `Setup` tab → defer to when a documents feature exists; no fictional UI              |

---

## Visual hierarchy ranking (what should command the eye)

1. **Page title** — the client's name (Geist 24/600)
2. **Health chip** — top-right of title row (semantic color)
3. **Active alerts banner** — only if present (semantic color)
4. **`NEXT FILING` stat value** — when there's something due soon (semantic color: warning if <7d)
5. **The selected filing row** in Work tab (accent left stroke)
6. **Action buttons** in PageHeader (Edit / Reverify / Export — primary is rare here; mostly secondary)
7. Everything else — quiet, scannable, supporting

A user with 8 seconds on this page should know:

- Whose client this is
- Is it healthy
- What's the most pressing thing
- Is there anything urgent (alert)

That's the test.

---

## Comparison: what the existing code already does ✅ vs. needs to add 🟡

| Element                                                          | Existing                           | Needs add                                                                  |
| ---------------------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------- |
| PageHeader with breadcrumb + title + metaRow + actions           | ✅                                 |                                                                            |
| `aside` slot for HealthChip on PageHeader                        |                                    | 🟡 small PageHeader extension                                              |
| ClientNotesStrip                                                 | ✅                                 |                                                                            |
| ClientActiveAlertsSection                                        | ✅                                 |                                                                            |
| ClientSummaryStrip (3-slot StatBand)                             | ✅                                 |                                                                            |
| 3 tabs (Work / Setup / History)                                  | ✅                                 |                                                                            |
| Work tab filings table                                           | ✅ via `ClientWorkPlanPanel`       |                                                                            |
| `<DeadlineRow mode="inline-expand">` rows                        |                                    | 🟡 swap existing rows for new component (per deadline-row-interaction doc) |
| Filter chips on Work tab (status / owner / year / search)        | Partial                            | 🟡 audit + complete                                                        |
| Setup tab compliance / tax / jurisdictions / risk / import cards | ✅                                 |                                                                            |
| Setup tab Primary contact card                                   |                                    | 🟡 NEW — use existing `client.primaryPhone` + `client.email`               |
| History tab AI summary + audit log                               | ✅                                 |                                                                            |
| URL state for tab + expanded + filters                           | Partial (some via Tanstack Router) | 🟡 audit + unify via `nuqs`                                                |

**~80% already exists.** The ideal version is mostly: refine `ClientWorkPlanPanel` to use `<DeadlineRow mode="inline-expand">` + add the Primary contact section + add the `aside` slot.

---

## Definition of done (the ideal page is shipped when…)

- [ ] `<PageHeader>` has an `aside` prop and renders a `HealthChip` for the client
- [ ] `<ClientNotesStrip>` renders inline editor on click (verify existing)
- [ ] `<ClientActiveAlertsSection>` renders only when alerts > 0
- [ ] `<ClientSummaryStrip>` uses `<StatBand>` with exactly 3 slots (Next filing · Blocked · Open) and each slot is clickable
- [ ] Tabs: Work · Setup · History (matches existing)
- [ ] Work tab uses `<DeadlineRow mode="inline-expand">` for every row
- [ ] Work tab supports `?status=` `?assigneeNames=` `?year=` `?search=` filters via `nuqs`
- [ ] Work tab supports `?expanded=` for the active expanded row
- [ ] Setup tab includes `<DetailSectionCard title="Primary contact">` reading from existing `client.primaryPhone` + `client.email`
- [ ] History tab AI summary + audit log work
- [ ] Above-the-fold height ≤ 360px on 1440×900 viewport
- [ ] Visual diff vs updated Pencil M7Ady4 (after the 6 edits in `client-detail-page-layout.md` §7): pixel-equivalent
- [ ] Zero hex leaks in `apps/app/src/features/clients/`
- [ ] Zero freelance corner radii
- [ ] All anti-pattern checks in `client-detail-page-layout.md` §11 pass
- [ ] No backend changes (no new mutations, no new fields, no schema work)
- [ ] Dev-log entry per project convention

---

## The principle (if you remember nothing else)

A great detail page answers four questions, in order, in 8 seconds:

1. **Who is this?** → PageHeader (title + identity meta)
2. **How are they doing?** → HealthChip + ClientActiveAlertsSection + ClientSummaryStrip
3. **What needs my attention?** → NEXT FILING stat + the top of the Work tab table
4. **How do I act on it?** → click the row → inline expand OR navigate

The existing `ClientDetailWorkspace` already answers 1, 2, 3 above the fold. The ideal version finishes the job by making (4) — the action moment — frictionless via the `<DeadlineRow mode="inline-expand">` pattern.

That's it. The "ideal" client detail page is not a redesign; it's a finished version of what's already there.

---

## Cross-references

- `docs/Design/deadline-row-interaction.md` — for the `<DeadlineRow>` component used in the Work tab
- `docs/Design/client-detail-page-layout.md` — for the 6 Pencil edits + the 4 divergences in M7Ady4
- `docs/dev-log/2026-06-10-design-handoff-index.md` — for canonical chrome specs + component reuse policy
- `docs/Design/rule-library-review-flow.md` — sibling design doc for /rules
- `apps/app/src/features/clients/ClientDetailWorkspace.tsx` — the page's React entry
- `apps/app/src/components/patterns/page-header.tsx` — PageHeader (needs `aside` slot addition)
- `apps/app/src/components/patterns/stat-band.tsx` — StatBand (no changes needed)
- `apps/app/src/components/patterns/detail-section-card.tsx` — DetailSectionCard (no changes needed)
- `packages/contracts/src/clients.ts` — `ClientPublic` schema (truth for what fields exist)

This doc is the canonical answer to "what is the ideal client detail page?" If implementation diverges, update this doc first, then code.
