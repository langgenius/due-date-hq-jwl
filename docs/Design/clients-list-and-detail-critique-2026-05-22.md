# Clients list + detail — critique & sequencing

**Date:** 2026-05-22
**Author:** Yuqi pairing with Claude (after demo-space walk-through and
two external reference screenshots)
**Status:** Sequencing doc. Drives the next batch of /clients +
/clients/[id] work. Each P-line maps to one commit / dev-log.
**Inputs**

- Two reference screenshots Yuqi shared (header + detail body) — see
  Appendix at bottom for what was kept / dropped from each
- Demo-space inspection of the current `design/preview-integration`
  build (worktree `jolly-hopper-46479d`, ports 5188 + 8787)
- Prior IA work: `client-page-information-architecture.md`,
  `client-detail-page-amendments.md`, `clients-list-summary-strip-redesign.md`,
  `unified-table-surface-vocabulary.md`

---

## P0 — ship-blocker for a credible v1 of the client surfaces

These are either bugs, cross-surface consistency violations, or
visually broken states that undermine the rest of the work.

### L-1. `+ New client` becomes a split button with Import in the dropdown

- **Now:** two peer buttons in the action cluster — `+ Add client` and
  `Import CSV` — competing for visual weight even though one is daily
  and the other is once-a-quarter.
- **Change:** primary green button `+ New client`, right-edge chevron
  opens a dropdown with `Add manually` (default) / `Import from CSV`.
  Linear / Notion pattern.
- **Why P0:** import is onboarding-only; promoting it to peer status
  with create is misleading.

### L-3. Filter UI matches Obligations exactly (column-header popovers)

- **Now:** standalone `Entity ▾ State ▾ Tier ▾ Package ▾` chip row
  above the table.
- **Spec:** `unified-table-surface-vocabulary.md` V4 says filters live
  inside `TableHeaderMultiFilter` on each column header — never as a
  separate chip strip above. Obligations queue is the reference.
- **Change:** delete the standalone chip row. Move Entity / State /
  Tier / Package filter into the matching column header. Active-filter
  banner above the table only when ≥1 filter is on.
- **Why P0:** cross-surface inconsistency is the single biggest
  finding in the 2026-05-21 UX audit. Two filter UIs in the same app
  is a no-ship.

### L-7. Merge `OTHER STATES` and `JURISDICTION` into one `STATES` column

- **Now:** primary state filled badge + separate "Other states" column
  with outline badges.
- **Change:** one column. Primary state = filled dark badge, additional
  states = outline badge, in the same cell. The screenshot already
  does this half-right; the standalone column is pure cruft.

### L-8. Replace the three giant summary cards with `SurfaceSummaryStrip`

- **Now:** three full-width cards (`ACTIVE CLIENTS 41` / `MULTI-STATE 15`
  / `STUCK >14D 0`) eating the top quarter of the page, including a
  card whose number is zero.
- **Change:** use the existing `SurfaceSummaryStrip` (single-row chip
  format, zero-state auto-mutes, hides when nothing's actionable).
- **Active clients** moves into the page header subtitle (already
  shipped: "Clients **41 active**").
- **Multi-state** is questionable — it's a fact, not a daily action
  signal. Recommend dropping; resurface if data shows otherwise.
- **Stuck >14d** stays — it's the only one with action semantics.

### D-1. Breadcrumb "Clients" parent crumb must be clickable

- **Bug:** the parent `Clients ▾` segment only opens the picker. The
  word "Clients" itself is not a link to `/clients`.
- **Fix options:**
  - Text "Clients" wraps in `<Link to="/clients">`; the `▾` chevron
    is the popover trigger (two distinct hit targets, same visual)
  - **OR** popover gets `→ View all clients` as the first item
- **Why P0:** users get stuck on the detail page with no way back
  to the list.

### D-2. Header refactor — full hybrid of reference + current

The single biggest visual upgrade. Result:

```
Clients ▾ > Allegheny Forge C-Corp                          ‹ 1/9 ›

Allegheny Forge C-Corp  [C-CORP] [PA] [NJ]   📌 ⬇ ✏️  Archive  + Add deadline
1 open filing · next due May 6, 2026 · 1 late
```

- **Title size up.** Page-owner scale, not table-row scale.
- **Identity chips inline with title** — entity badge + filing states.
- **Readiness chip is conditional.** When `Needs filing state`,
  `Needs entity type`, etc. — render an additional small red chip in
  the same row. When clean, that chip disappears (don't leave
  ghost slot).
- **Action cluster:** `📌 Pin to sidebar` · `⬇ Download client PDF`
  · `✏️ Edit client info` · `Archive` (outline) · `+ Add deadline`
  (primary green).
  - Pin = add to sidebar favorites / quick-access list
  - Download = client dossier PDF export
  - Edit = enter inline edit mode for identity fields
- **Subtitle = single daily-signal line, tone-coded.** "1 late"
  renders in `text-text-destructive`; "All on track" is the positive
  state with a `[✓ All on track]` chip when zero overdue.
- **Drop "← Back to Clients"** — breadcrumb already does this.
- **Drop "View all obligations" button** — destination not action;
  filing-plan is already on the page; if needed, demote to overflow
  menu (`···`).
- **Keep:** breadcrumb dropdown switcher, prev/next cycle (`‹ 1/9 ›`)
  with `j`/`k` shortcut.

### D-3. Split `ClientAlertsBand` into header chip + dedicated section

Two signals are being smashed into one band. They have different
weights, different audiences, and different action paths.

- **Missing facts** (page-level setup gap, "Needs filing state")
  → render as **small red chip in the header line, inline with
  identity chips**. Visible from page-title scan, dismissible only
  by completing the field.
- **State alerts affecting this client** → render as a **labeled
  section** below the header, like the reference:

  ```
  📢 ACTIVE STATE ALERT FOR THIS CLIENT · 1
  ─────────────────────────────────────
  [PA]  myPATH portal outage May 6-7 — filings paused      Review →
        Pennsylvania Department of Revenue · Deadline shifts to May 8
  ```

  - Own section label, count chip
  - Tone-coded amber card per alert
  - "Review" link routes to Pulse alert detail

- **Why P0:** today both render in the same warning strip, so the
  CPA can't tell whether the page needs a setup fix or whether there's
  external work happening on this client. Two different jobs, two
  different visuals.

### D-5. Drop the outer card frame on the Work section

- **Now:** the Work tab body is wrapped in `<DetailSection>` (card),
  which then contains `<Card>` (card), which contains rows. Card
  inside card inside card → impossible to read.
- **Change:** the reference uses **section labels + flat row groups**.
  - Outer card frame: gone
  - Section label = `Filing plan   3 filings across 1 tax year`
    (no chrome around it)
  - Inner group = thin border around the year-stripped row list only
  - Federal forms catalog = `Hide` toggle, collapsed by default
- Pattern: replicate `SectionLabel` from `rules-console-primitives.tsx`.
- **Why P0:** body legibility on the most-visited surface is broken.

### X-1. Copy audit: `obligation` → `deadline` in user-facing strings

- **Schema** keeps `obligation` (it's the canonical model term)
- **User-facing copy** switches to `deadline` (the word CPAs use when
  talking to clients)
- Includes: button labels, page titles, empty states, toasts,
  digest emails
- **Excludes:** code identifiers, contract types, audit log action
  strings
- **Updated 2026-05-24:** the route slug is now `/deadlines`; legacy
  `/obligations` URLs redirect for compatibility.
- **Why P0:** "Obligation" is the single piece of jargon that betrays
  the product as internal-tool aesthetic. One pass kills it everywhere.

### X-2. Date format unification: ISO → prose

- **Now:** `2026-05-06` mixes with `May 6, 2026` across the detail
  page (6 `formatDate()` call sites; prose and ISO both rendered).
- **Change:** every user-facing date uses prose (`May 6, 2026` or
  `May 6` when current-year). Reserve ISO only for `data-*` attrs,
  audit-log meta, and the export CSV.
- **Why P0:** ISO dates in body copy are the second-biggest "made by
  engineers" tell after the obligation/deadline word.

---

## P1 — real work, ships in the next round

### L-2. "Fix now" becomes a batch facts-completion flow

- **Now:** "Fix now" on the missing-facts banner just sets a filter
  on the table. CPA still has to open each row, fill the field, save.
- **Change:** route to a dedicated inline flow:
  - Stacked list of clients-missing-facts rows
  - Each row expanded shows only the missing field(s) with inline form
  - Saves are per-row, optimistic, with batch progress (`3 of 12 saved`)
- **Why P1:** the "filter then drill" pattern is correct for
  audit/scan; wrong for batch data entry.

### L-5. Split the `Next due` composite cell

- **Now:** one cell shows date + form name + readiness chip stacked
  three lines. Information density beyond scan threshold.
- **Change:**
  - Main row cell = `14d late` with tone color, single line
  - Form name → moves to row hover peek (ClientPeekHoverCard)
  - Readiness chip → moves to the **client name** column, next to
    `PA alert` (mirroring the reference screenshot's `[Needs filing
state]` placement)

### L-6. Cut redundant columns: drop `ENTITY` + `TIER` from default view

- **Entity** is already in the client-name chip (`Allegheny Forge
Forge **C-Corp**`). The column duplicates the chip. Cut.
- **Tier** is low-frequency scan info (billing context). Move into
  the row hover peek + a `Tier` filter on the Name column.
- Resulting columns: `NAME · STATES · NEXT DEADLINE · WAITING ·
REVIEW · OPP` — fewer, more action-oriented.

### L-9. STATE ALERT banner becomes a filter toggle with session snooze

**Verified 2026-05-23: N/A for our codebase.** The standalone "STATE
ALERT — 34 clients have an active state alert affecting their
filings" banner is a feature in the reference-screenshot fork that
we never built. Our aggregate Pulse signal already lives in
`ClientsActionStrip` as a filter-toggleable chip (commit `a30ba70`)
— at-risk / waiting / Pulse hits / missing facts. Won't-do unless
a dedicated banner pattern earns its place separately.

Original text below kept for reference:

- **Bug today:** banner CTA `Open alerts ↗` navigates to `/rules/pulse`
  — leaves the table the CPA is scanning. Banner has an `X` close
  button, but alerts don't disappear when you dismiss the banner —
  it's a UI lie.
- **Change:**
  - Banner stays
  - "Open alerts" becomes a **toggle** that filters the table to the
    34 affected clients (same pattern as the at-risk / waiting chips
    we just shipped in commit `a30ba70`)
  - Dismiss `X` becomes **session-level snooze** (banner re-appears
    next session)
- **Wording:** "34 clients have an active state alert affecting
  their filings" → `[Show only the 34 affected →]` button instead
  of `Open alerts ↗`

### L-4. Cross-surface layout/element consistency pass

After L-3, L-7, L-8 land, run a consistency sweep against the
Obligations queue (the most mature surface):

- Page header size + action-cluster pattern
- Filter shape (column-header popovers only)
- Empty / loading / error state primitives
- Row hover timing (peek card open delay)
- Bulk-action floating bar position
- Filter chip active-state styling
- Pagination footer treatment
  Touch every surface that has a `useReactTable` instance to align.

### D-3 (cont.) Positive-status visual vocabulary

The reference has `✓ All on track` as a **positive status chip** in
the subtitle when nothing's wrong. Today the app has no positive
state — it either screams warning or stays text-neutral.

- Add `Badge variant="success"` (or `tone="positive"`) to the
  primitive set
- Use for `All on track` (detail subtitle), `All caught up`
  (queue empty state), `In good standing` (rule library)
- Stop relying on "absence of red" as the implicit positive

### D-2 (sidebar). Add counts to sidebar items

- Sidebar entries get a muted count: `Clients (51)`, `Obligations
(47)`, `Alerts (3)`, `Rules (12 need review)`
- Source: extend `firmProfile` with `firmCounts: {...}` aggregate
- Zero state hides the count (no `Clients (0)` ghost)
- **Touches:** sidebar component + a single new RPC procedure

### D-6a. Filing-row hover quick actions

The reference's pencil icon on `[Collecting ✏️]` is the seed of a
bigger pattern.

- Filing row hover → row-end actions appear: `Mark filed` ·
  `Open in queue ↗`
- Inline state advancement without opening the drawer
- Optimistic UI + undo toast (5s)

### D-6b. Status chip click → inline status picker

- Click `[Scope]` chip → popover with 5 statuses (`Scope` /
  `Collecting` / `Preparing` / `In review` / `Filed`)
- Drawer becomes optional, not required
- Same pattern as Linear's status menu

---

## P2 — power-user / polish / future

### L-10. Archive vs Delete semantics + bulk archive

CPA compliance requires soft-delete; we already have `deletedAt`
from commit `b925449` ("client deletion functionality with audit
logging"). But the **product wording** is wrong.

- **Daily UI says "Archive"** — never "Delete"
- "Delete" lives only in Settings → Compliance teardown, behind
  2-step confirm + type-client-name guard
- **Bulk archive** in list page (selected rows → floating action bar
  → `Archive 3 clients`)
- **Show Archived** toggle stays as a list scope switch (already
  in the reference)
- `Restore` action on archived-client detail page
- Audit log entry written on every archive / restore / delete

### D-6c. Right-click context menu (Linear-style)

- Right-click on any filing row → context menu (`Mark filed` /
  `Assign owner` / `Snooze 1 week` / `Open in queue` / `Copy link`)
- Right-click on client name → `Pin / Archive / Open in new tab`
- Single component, route by row type

### D-6d. State badge hover popover

- Hover `[PA]` chip → mini popover with jurisdiction details:
  filing profile, counties, tax types, primary contact at the DOR
- Saves one drawer-open to read jurisdiction context

### D-6e. "17 gap" hover lists the actual gap

- Today: hover does nothing. Click expands the Federal forms
  catalog accordion.
- Change: hover shows the missing forms inline (`7 critical, 10
optional`) with click-through to filter the catalog. Skip the
  accordion open entirely for read-only inspection.

### D-6f. Drag interactions for filings

- Drag filing row across year groups → re-assign to a different
  tax year
- Multi-select via checkboxes, then drag-group

### D-6g. Row-level pin (filing-plan)

- Pin one filing to top of Filing plan (sticky at top of year group)
- Different from client-level pin (header `📌`); same icon vocabulary

### D-6h. Optimistic checkbox + undo toast on the filing rows

- The Filing-plan rows have checkboxes already. Wire them to
  optimistic state updates with a 5-second undo toast.

### D-extra. Contact metadata row on detail header

The reference has a quiet `✉ ☎ Since —` row directly under the
title — once `primaryPhone` is rendered (already added to schema by
`7633eb7`), surface as:

```
Allegheny Forge C-Corp  [C-CORP] [PA] [NJ]
✉ contact@allegheny.com  ☎ +1 (412) 555-0143   Since Mar 2023
```

- Email + phone are clickable (`mailto:` / `tel:`)
- "Since" derived from `client.createdAt`
- Whole row muted; only shows when at least one field is on file

### D-extra-2. Compliance posture chips → inline-editable toggles

Already documented as blocked. Needs a generic `clients.update`
mutation on the contract before each chip becomes a checkbox-style
toggle. Tracked in `ClientCompliancePosturePanel.tsx` header
comment.

### D-extra-3. Schema growth (future)

Still unbuilt schema fields (no commit needed today, just tracked):

- `addressLine2`, `state`, no separate state tax IDs
- Multiple contacts (one CFO + one controller is normal)
- Engagement letter status (signed? expiration? doc id?)
- Billing context (annual fee, last invoice, balance)
- Linked entities ("this person owns 25% of XYZ")
- Document repository (engagement letter, prior returns)

---

## Sequencing — execution order

The order respects: (a) bugs first, (b) high-impact visual changes
that unblock the rest of the polish, (c) cross-cutting passes that
touch multiple files, (d) net-new functionality last.

### Commit 1: Bug + breadcrumb

- D-1 (breadcrumb "Clients" is clickable)
- Date-format ISO → prose (X-2) on /clients/[id] specifically

### Commit 2: List header trim

- L-1 (split button)
- L-7 (states column merge)
- L-8 (summary card → strip)

### Commit 3: List filter parity

- L-3 (column-header filter only, kill chip row)
- L-9 (STATE ALERT banner becomes toggle + session snooze)

### Commit 4: Detail header refactor

- D-2 (full hybrid header)
- D-3 split — header readiness chip + dedicated state-alert section

### Commit 5: Detail body chrome cleanup

- D-5 (drop outer card frame, section-label pattern)
- Positive status chip primitive added (`Badge variant="success"`)
  - applied to `✓ All on track` subtitle

### Commit 6: Copy audit (cross-cutting)

- X-1 (obligation → deadline in user-facing strings only)
- One commit touching many files; needs i18n re-extract + compile

### Commit 7: P1 batch — list polish

- L-2 (Fix-now batch flow)
- L-5 (Next-due composite cell split)
- L-6 (drop ENTITY + TIER columns)
- L-4 (cross-surface consistency pass)

### Commit 8: P1 batch — detail interactions

- D-2 sidebar counts
- D-6a (filing-row hover actions)
- D-6b (status chip → picker popover)

### Commit 9+: P2 backlog

- L-10 archive/delete semantics
- D-6c through D-6h power-user interactions
- D-extra contact metadata row (once primaryPhone is rendered)

---

## What's NOT in this doc on purpose

- **Mobile.** Whole audit is desktop. Mobile is its own pass.
- **Onboarding / first-run.** Empty firm renders are out of scope.
- **`/dashboard` panel pattern migration** — tracked separately in
  `2026-05-22-client-page-obligation-panel.md`.
- **Retire `ClientDetailDrawer` + `ClientDrawerProvider`** — tracked
  separately; 2 call sites still using click drawer.
- **Telemetry on breadcrumb switcher vs. prev/next arrows** —
  tracked in `client-detail-page-amendments.md` follow-up section.
- **E2E specs.** Listed as follow-ups in the relevant dev-logs.

---

## Appendix — Reference screenshots / what each contributed

### Reference 1 (header design)

Kept:

- Large title scale
- Identity chips inline with title
- Action cluster pattern: utility icons + Archive + primary green
- "Add **deadline**" wording

Dropped:

- "← Back to Clients" (breadcrumb already does this)
- Lack of urgency signal (no `1 late` in subtitle)

### Reference 2 (current preview-integration build)

Kept:

- Breadcrumb dropdown switcher
- Prev/Next cycle (`‹ 1/9 ›`)
- Subtitle daily signal

Dropped:

- "View all obligations" button (destination, not action)
- ISO date format `2026-05-06`
- Identity chips relegated to a third row below title

### Reference 3 (detail body)

Kept:

- Section-label pattern (no nested cards)
- Dedicated `ACTIVE STATE ALERT FOR THIS CLIENT · 1` section with
  count label
- `✓ All on track` as a positive-state chip in the subtitle
- Contact metadata row (`✉ ☎ Since —`) as quiet meta
- Federal forms catalog `Hide` toggle (collapsed by default)
- `[Collecting ✏️]` status chip with inline edit affordance →
  seed for D-6a/b

Dropped:

- Pure `← Back to Clients` (replaced by clickable breadcrumb)
- No prev/next visible (we keep ours)
