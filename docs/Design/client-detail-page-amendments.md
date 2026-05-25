# Client detail page — amendments plan

**Date:** 2026-05-21
**Status:** Locks the direction for this iteration. See sibling doc
[`client-page-information-architecture.md`](./client-page-information-architecture.md)
for the underlying IA principles.

## What changes (summary)

1. **Searchable client switcher in the breadcrumb.** The "Clients"
   parent crumb on `/clients/[id]` becomes a click target that opens
   a searchable picker of all clients. One click + type → jump to
   another client without bouncing through the list page.
2. **Prev / Next arrows in the PageHeader.** Cycle through the
   filtered list a CPA was last looking at on `/clients`. The list
   order is preserved across the page boundary via sessionStorage.
   J / K keyboard shortcuts mirror the queue's hotkey contract.
3. **Detail page IA tightening.** The Work tab is reordered around
   the four canonical questions from the IA doc, and the editable
   surfaces (jurisdictions, risk inputs, fact checklist) collapse
   under a "Configure" header so the daily read path is the first
   thing on screen.

## What stays the same (intentional)

- Row click on `/clients` → full page at `/clients/[id]`. The page
  is the canonical destination; the drawer is reachable via the peek
  icon and ⌘-click for triage moments.
- Clicking an obligation inside the client page opens the canonical
  obligation drawer (the same singleton `ObligationDrawerProvider`
  serves `/obligations`, `/dashboard`, and this page).
- The detail page's three top-of-page surfaces — identity strip,
  `ClientAlertsBand`, `ClientSummaryStrip` — keep their order and
  treatment.

## The four canonical questions (recap)

A CPA opens the client page to answer, in order of frequency:

1. **"Where are we right now?"** — alerts, summary strip, identity.
2. **"What do they owe?"** — filing plan, grouped by tax year.
3. **"What's their compliance posture?"** — EIN, tax year type,
   activity-scope chips, owner counts.
4. **"What's been happening?"** — AI summary, activity / audit.

Edit-mode surfaces (filing jurisdictions, risk inputs, fact
readiness, future business cues) are NOT in this top-four list —
they're the work the CPA does once during onboarding and revisits
quarterly, not the daily read.

## Surface-by-surface plan

### Q1 surface — "Where are we right now?" (already shipped)

Render order above the tabs, unchanged:

1. **PageHeader** — title, action cluster (Add obligation / View all
   obligations / View audit log), **NEW** breadcrumb switcher,
   **NEW** prev/next arrows.
2. **Identity strip** — entity badge + filing-state chips +
   source badge + readiness badge + Pulse-radar badge.
3. **ClientAlertsBand** — Pulse + extension-without-payment +
   missing-facts in one warning strip.
4. **ClientSummaryStrip** — `Next due / At risk / Team` tiles.

### Q2 + Q3 — Work tab, primary read

```
TABS  [Work *]  [Activity]
─────────────────────────────────────────────
ClientWorkPlanPanel             ← Q2
ClientCompliancePosturePanel    ← Q3
─────────────────────────────────────────────
                                ↓ secondary content below the fold
SectionLabel "CONFIGURE"
  Filing jurisdictions          ← collapsible
  Risk inputs                   ← collapsible
  Fact readiness                ← collapsible
SectionLabel "DISCOVER"
  Suggested forms catalog       ← collapsible
  Future business cues          ← collapsible
```

Changes vs. today:

- **Reorder**: Work plan + Compliance posture are first. Today's
  order interleaves `SuggestedFormsCatalogPanel` between Compliance
  and the editable sections; demoted under "Discover."
- **Group editable sections under a "CONFIGURE" label.** They were
  flat `<DetailSection>` collapsibles before; the label makes the
  separation between "what to read" (above) and "what to configure"
  (below) explicit.
- **Group discovery sections under "DISCOVER".** `SuggestedFormsCatalogPanel`
  and `ClientOpportunitiesCard` are reference / future-business
  surfaces, not part of the daily read.
- **Default-open**: Work plan + Compliance posture remain expanded.
  All Configure / Discover sections default closed.

### Q4 — Activity tab (renamed from "Notes")

Rename rationale: the tab carries the AI risk narrative, free-text
notes, and the activity audit log. "Notes" undersells the audit
content. "Activity" matches the canonical "what's been happening?"
question.

```
TABS  [Work]  [Activity *]
─────────────────────────────────────────────
ClientRiskSummaryPanel          ← AI summary
SectionFrame "Notes"            ← read-only client.notes
ClientActivityPanel             ← audit events
```

## PageHeader changes (mechanics)

### Breadcrumb switcher

- Extend `BreadcrumbItem` with optional `render?: ReactNode`.
- When `render` is provided, the Breadcrumb component renders that
  node in place of the default Link/span. Existing callers are
  unaffected (back-compat — `render` is optional).
- `ClientDetailWorkspace` passes a `ClientBreadcrumbSwitcher` for
  the parent "Clients" crumb. The switcher is a Popover containing
  a `Command` + `CommandInput` + scrollable client list. Picking a
  client navigates to `/clients/{id}`.

### Prev / Next arrows

- Two-button cluster (`‹` `›`) in the PageHeader actions area,
  rendered before the existing buttons.
- Reads from `sessionStorage` key `clientCycleList` — an ordered
  array of client IDs written by `/clients` on every filtered-list
  render.
- Hidden when the cycle list is empty, has fewer than 2 entries, or
  the current client isn't in the cycle (e.g. direct deep link or
  refreshed tab).
- Tooltip shows the destination client's name so the action is
  predictable.
- Keyboard: `j` → next, `k` → previous. Skipped when a modal /
  drawer is open (`useKeyboardShortcutsBlocked` already gates this).

### What's NOT being added now

- **Search prefill in the breadcrumb dropdown from the current list
  filter.** The dropdown searches the whole firm by default. If a
  CPA filtered the list to "needs facts" before clicking in, the
  dropdown won't pre-narrow to that subset. Tracked as a
  future-polish item — would require lifting more state.
- **Recent clients section in the dropdown.** Could be useful but
  needs a per-user persistence story. Skip until usage data shows
  it matters.
- **A separate "Configure" route.** Inline collapsibles under the
  CONFIGURE label do the job today. A standalone route only earns
  its place if editing becomes a multi-step flow.

## Acceptance

- Breadcrumb crumb "Clients" on `/clients/[id]` is clickable; click
  opens a popover with search; typing filters; Enter navigates.
- Prev/Next arrows show when the user arrived via `/clients` (cycle
  list exists with the current client in it).
- Pressing `j` / `k` advances; tooltips name the destination.
- Work tab visibly groups primary read (top) vs. Configure (middle)
  vs. Discover (bottom).
- Tab name "Notes" reads "Activity."

## Verification before ship

- `pnpm check` clean in client-area files.
- Manual trace: navigate from `/clients` → row → detail; arrows and
  switcher visible. Direct-deep-link to a client → arrows hidden,
  switcher still works.
- E2E: not in scope this turn; flag a `clients.spec.ts` follow-up
  for the breadcrumb dropdown.
