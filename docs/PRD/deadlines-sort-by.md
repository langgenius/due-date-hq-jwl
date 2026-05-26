# PRD — /deadlines "Sort by" semantics

**Date:** 2026-05-26
**Author:** Yuqi + Claude (drafting)
**Status:** DRAFT — needs sign-off before implementation
**Trigger:** Yuqi: "Sort by Clients and Sort by Status do not work.
nothing happens. You probably need to write a PRD about what is the
sort by about, and what you need to do."

## Problem

The /deadlines page exposes a "Sort by ▾" dropdown in the toolbar
with three options:

- **Date** (default)
- **Client**
- **Status**

Today, clicking **Client** or **Status** changes the URL param but
the rendered rows do not reorder. Visually, "nothing happens."

Root cause: `useReactTable` is configured with `manualSorting:
true`. That flag tells TanStack the data ARRIVES pre-sorted and to
skip its built-in sort. But the data source (`orpc.obligations.list`
via `useInfiniteQuery`) does not receive the sort+group state — it
returns rows in whatever the server's default order is. So setting
the column sort state has no effect on row order.

The earlier "fix" (adding a custom `sortingFn` to the status column)
also does nothing — `sortingFn` is only consulted when TanStack
actually runs the sort, which it doesn't when `manualSorting: true`.

## User intent — what each option SHOULD mean

### Date (default)

**Sort:** ascending by internal due date (`internalDueDate` →
`currentDueDate` fallback). Today's "Date" sort uses
`getSortingState(sort)` which reads from the URL — Date ascending is
the canonical default.

**Grouping:** none. The rows form a single flat list.

**What the CPA sees:** the most urgent (oldest past-due → today →
upcoming) at the top. Matches the current behavior and is the
no-op baseline.

### Client

**Sort:** clusters all deadlines for the same client together.
Within each client cluster, secondary sort is by internal due date
ascending (so the CPA sees "Bright Studio S-Corp's nearest
deadline" first inside the cluster).

**Grouping:** rows visually grouped — same-client deadlines share a
2px left rail (already implemented for adjacent same-client rows
via `withinGroupRowIds`). Optional: client-name section header
above the first row of each cluster. **MVP**: skip section
headers, just visually cluster via the existing left-rail.

**What the CPA sees:** "show me everything for client X together."
Useful when working a portfolio review where the CPA wants to
process one client's full set of deadlines without page-jumping to
`/clients/[id]`.

**Sort order between clusters:** alphabetical by client name
ascending. (Open question: should clusters with overdue deadlines
float to the top? **MVP decision:** no — keep clusters
alphabetical. Urgency is communicated by the "X days late" copy on
each row. Re-sort by Date if the CPA wants urgency-first.)

### Status

**Sort:** orders rows by status using an explicit **workflow
priority** order (not alphabetical):

```
1. not_started     ← work hasn't begun, needs to start
2. blocked         ← actively blocked, needs unblock action
3. waiting_on_client  ← waiting on external input
4. review          ← drafted, awaiting reviewer
5. in_progress     ← (legacy alias for in-flight work)
6. in_review       ← (alias)
7. done            ← internal done but not yet filed
8. filed           ← submitted to authority
9. paid            ← paid (where applicable)
10. completed      ← fully closed
11. extended       ← extension granted; on a longer timeline
12. not_applicable ← does not apply
```

Within each status group, secondary sort is by internal due date
ascending.

**Grouping:** none for MVP — just a single list sorted by status
priority. Optional future enhancement: collapsible status section
headers ("Not started (3)", "Blocked (2)", …) but that is OUT of
scope for this fix.

**What the CPA sees:** the work that needs the most decisive
action at the top. "Not started" before "Blocked" because the
former is more urgent if the deadline is near; "Blocked" still
needs action but the unblock might be on another row.

**Open question:** should `blocked` come BEFORE `not_started`
because "blocked" is a known-bad state and "not_started" might be
a fine "future deadline, not yet started"? **MVP decision:** no —
`not_started` first. A future deadline already shows as "X days
late" or "due in N days" in the date column; the user can
visually distinguish urgent-not-started from non-urgent-not-started
by the date colour. `blocked` rows are ALWAYS bad regardless of
date, so they need to appear near the top, just below the
not-started cluster that may include same-day work.

## Implementation

Two options for where the sort happens.

### Option A — client-side sort (MVP)

**Approach:** flip `manualSorting: true` → `manualSorting: false`
and let TanStack sort the rendered rows. Add `getSortedRowModel()`
to the `useReactTable` config. The existing `sorting` useMemo
already returns the right column-id pairs (`clientName`, `status`,
plus the date-based default).

**Pros:**

- Smallest possible diff. No server changes.
- Works against the already-loaded paginated buffer.
- Status custom `sortingFn` (the workflow-priority order) gets
  consulted correctly once `manualSorting: false`.

**Cons:**

- The buffer is paginated (50 rows per server page via
  `PAGE_SIZE`). Sorting only the loaded buffer means clients
  beyond the buffer aren't seen. For 9 clients × ~2 deadlines
  avg (per the screenshot) this is fine; for firms with
  thousands of obligations it'd need server-side sort.
- Sort happens AFTER pagination — sorted "page 1" can differ
  from naturally-ordered "page 1," which can be confusing if
  the user pages back and forth.

**MVP scope:** ship Option A. Firms with ≤100 obligations (which
is the current target) will get correct, decisive sort behavior.
Server-side becomes a follow-up when the data grows.

### Option B — server-side sort (future)

**Approach:** add a `sort` parameter to `orpc.obligations.list`
that accepts `{ key: 'date' | 'clientName' | 'status', order:
'asc' | 'desc' }`. Server returns rows in that order. Flip
`manualSorting: true` (already true). Client passes the current
sort state to the query.

**Defer to a future PRD.** Scoped here as a known follow-up.

## Decision needed from Yuqi

Three things to confirm before I implement:

1. **Visual grouping for "Sort by Client" — section header or no?**
   MVP recommendation: no section header, just the existing 2px
   left rail clustering. Confirm.

2. **Status order edge cases — is `not_started → blocked → …` the
   right priority?** Or should `blocked` come first because it's
   always a known-bad state?

3. **Scope — Option A (client-side, MVP) or wait for Option B
   (server-side, more correct for scale)?** MVP recommendation:
   Option A now, Option B as a follow-up when data grows.

## Acceptance criteria (post-decisions)

- [ ] Clicking "Sort by Date" shows rows in due-date ascending
      order (default, no-op vs today).
- [ ] Clicking "Sort by Client" reorders rows so all of one
      client's deadlines appear together; clusters alphabetical
      by client name; within a cluster, by date ascending.
- [ ] Clicking "Sort by Status" reorders rows by workflow
      priority (not_started first, not_applicable last); within
      a status, by date ascending.
- [ ] The URL `?group=` parameter persists so refresh + share-
      link preserve the sort selection.
- [ ] No new horizontal/vertical scrollbar appears as a side
      effect.
- [ ] `pnpm check` clean.

## Out of scope

- Server-side sort (Option B above).
- Collapsible section headers for client / status grouping.
- Sort-direction toggle (ascending vs descending). Both Client
  and Status sorts have only one sensible direction; Date has
  a secondary toggle via the column header that already works.
- Multi-key sort UI (e.g. "sort by client THEN status"). The
  secondary sort key is hard-coded to internal due date for all
  three primary sorts.
