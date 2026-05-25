---
title: 'Client detail amendments: breadcrumb switcher, prev/next arrows, Work tab IA tightening, Activity tab rename'
date: 2026-05-21
author: 'Claude (Yuqi pairing)'
area: clients
---

# Client detail page amendments

## Context

Three friction points on `/clients/[id]` showed up in the same review:

1. **No fast jump between clients.** Switching from one client's
   detail to another required 3 navigations: breadcrumb → list →
   row click → detail. Scroll position lost on the way back.
2. **The Work tab interleaved daily-read content with onboarding
   edits.** Filing plan + compliance posture (the two things a CPA
   reads most often) sat above editable jurisdictions / risk inputs
   / fact readiness, with no visual break between "read" and
   "configure."
3. **The "Notes" tab was actually mostly the audit log.** Tab name
   undersold what's in it.

Anchor docs:

- [`docs/Design/client-page-information-architecture.md`](../Design/client-page-information-architecture.md) — the IA principles
- [`docs/Design/client-detail-page-amendments.md`](../Design/client-detail-page-amendments.md) — this iteration's plan

## Change

### 1. Searchable breadcrumb client switcher

New component: [`apps/app/src/features/clients/ClientBreadcrumbSwitcher.tsx`](apps/app/src/features/clients/ClientBreadcrumbSwitcher.tsx).

A Popover + `Command` + `CommandInput` picker that replaces the
static "Clients" breadcrumb on `/clients/[id]`. Searches by name /
state / EIN across the firm. Picking a client navigates to that
client's detail; a "Back to client list" item falls through to
`/clients` itself when the user actually wants the list.

Extended [`apps/app/src/components/patterns/breadcrumb.tsx`](apps/app/src/components/patterns/breadcrumb.tsx)
with an optional `render?: ReactNode` slot on `BreadcrumbItem`.
Existing callers are unaffected; ClientDetailWorkspace passes the
switcher as the parent crumb's `render`.

### 2. Prev / Next cycling arrows in the PageHeader

New module: [`apps/app/src/features/clients/client-cycle.ts`](apps/app/src/features/clients/client-cycle.ts).

The `/clients` route writes the current filtered client-ID list to
`sessionStorage` on every render. The detail page's new
[`ClientCycleArrows`](apps/app/src/features/clients/ClientCycleArrows.tsx)
reads that list, finds the current client's position, and surfaces
two arrow buttons + a `N / TOTAL` indicator in the PageHeader's
action cluster. Keyboard shortcuts `j` / `k` cycle next / prev,
gated by the existing `useKeyboardShortcutsBlocked()` + the shared
`isEditableEventTarget()` helper so the shortcuts don't fire inside
inputs or while a modal is open.

Hidden when:

- The cycle list is empty (deep link / refreshed tab).
- The current client isn't in the cycle.
- The cycle has only one entry.

### 3. Work tab IA — primary read above, Configure + Discover below

The Work tab is now ordered around the four canonical IA questions:

```
ClientWorkPlanPanel             ← "What do they owe?"
ClientCompliancePosturePanel    ← "What's their compliance posture?"

CONFIGURE  (section label)
  Filing jurisdictions          ← collapsible, default closed
  Risk inputs                   ← collapsible
  Fact readiness                ← collapsible

DISCOVER  (section label)
  Suggested forms catalog       ← collapsible
  Future business cues          ← collapsible
```

Edits vs. prior shape:

- `SuggestedFormsCatalogPanel` moves from between Work plan and
  Configure (where it broke the read flow) into the new Discover
  group.
- All four editable sections sit under a single CONFIGURE label so
  the day-to-day reader skims past them as one block.
- Suggested forms + Opportunities cluster under DISCOVER as a
  parallel "stuff to dip into intentionally, not every visit" group.

### 4. "Notes" tab renamed to "Activity"

The tab carries the AI risk narrative, free-text client notes, and
the activity audit log — the audit log dominates. The "Notes"
sub-section keeps its `SectionLabel` since that block IS the
freeform notes record; the tab itself reads "Activity" because
that's what the tab as a whole is about.

(`value="notes"` stays the same internally so any deep links into
the route still resolve.)

## Files

**Mine — ready to merge:**

- `apps/app/src/components/patterns/breadcrumb.tsx` — added optional
  `render` slot on `BreadcrumbItem`; the render path takes precedence
  over the default Link/span.
- `apps/app/src/features/clients/ClientBreadcrumbSwitcher.tsx` (new).
- `apps/app/src/features/clients/client-cycle.ts` (new) — sessionStorage
  read/write + `neighborsInClientCycle` resolver.
- `apps/app/src/features/clients/ClientCycleArrows.tsx` (new).
- `apps/app/src/features/clients/ClientFactsWorkspace.tsx` — wires the
  switcher into the breadcrumb, the arrows into PageHeader actions,
  and restructures the Work tab around CONFIGURE / DISCOVER labels.
  Tab label "Notes" → "Activity".
- `apps/app/src/routes/clients.tsx` — useEffect writes the filtered
  client list to sessionStorage every render.
- `docs/Design/client-detail-page-amendments.md` — design plan.
- `docs/dev-log/2026-05-21-client-detail-page-amendments.md` — this
  entry.

## Trade-offs and what we didn't do

- **No filter-aware narrowing in the breadcrumb dropdown.** Search
  is across the whole firm even when the cycle was built from a
  filtered list. Tracking the filter URL alongside the cycle was
  more state machinery than this PR earns; revisit if a CPA reports
  the friction.
- **No recent-clients section.** Plausible, but needs per-user
  persistence and isn't justified without usage data.
- **No mobile / narrow-viewport story for the breadcrumb popover.**
  The popover trigger word-wraps fine; the picker uses
  `max-w-[calc(100vw-2rem)]` so it doesn't overflow. Touch ergonomics
  for the small ChevronDown icon could improve.
- **No editable Configure mutations were added.** The Filing
  jurisdictions / Risk inputs panels already mutate today; the IA
  change is rendering-only.
- **Work tab content split (Configure / Discover) doesn't deep-link.**
  Inline collapsibles aren't independently routable. If the IA settles,
  we can add `?section=configure` later.

## Verification

- `pnpm check` — 2 errors / 15 warnings on the branch. **None in any
  client-area file.** Lone errors: the existing `breadcrumb.tsx`
  `no-array-index-key` (pre-existing on `Fragment key`) and the
  other session's `rules.library.tsx` TS issue.
- The breadcrumb extension is back-compat: existing callers passing
  `{ label, to }` keep their default Link rendering.
- The cycle list is bounded at 500 entries — the same cap as
  `clients.listByFirm`'s `limit`.
- `useEffect` in `ClientCycleArrows` consistently returns either a
  cleanup function or `undefined` (resolves the
  `consistent-return` lint).
- Keyboard listener uses the shared `isEditableEventTarget()` helper
  rather than ad-hoc target tag checks (resolves the
  `no-unsafe-type-assertion` lint).

## Try it

1. Open `/clients`, filter by anything.
2. Click a row → detail page.
3. Top-of-page:
   - Breadcrumb reads `Clients ▾ › <name>`. Click "Clients ▾" → search popover.
   - To the left of the action buttons: `‹  3 / 12  ›` arrow group. Press `j` to advance.
4. Work tab now reads: Filing plan → Compliance posture → CONFIGURE
   block → DISCOVER block.
5. Tabs: `Work` | `Activity` (renamed).

## Follow-up

- E2E spec for the cycle arrows (assert hidden on deep link; assert
  `j` advances; assert position indicator).
- Telemetry events for switcher vs. arrows vs. row-click so the team
  can decide whether to fold one of them.
- Eventual filter-aware switcher (if data shows it matters).
