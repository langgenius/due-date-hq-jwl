---
title: 'Inline ext. chip on the filing-plan internal-deadline cell (clarify)'
date: 2026-05-24
author: 'Claude (Yuqi pairing)'
area: clients
---

# Surface extension state inline on the filing-plan table (critique /polish)

## Why

The original critique flagged: _"The system allows Internal Deadline
to land AFTER Official Deadline — Lakeview row had Internal 2026-11-15
vs Official 2026-05-01."_ I read that as a bug.

Looking at the data model more carefully — it's not a bug. The row
was **extended**:

- `baseDueDate` / `filingDueDate` = 2026-05-01 (the original
  statutory date, immutable)
- `currentDueDate` = 2026-11-15 (the post-extension target)
- `extensionState` = 'filed'

The Internal Deadline column reads `currentDueDate`, the Official
Deadline column reads `filingDueDate ?? currentDueDate`. So
post-extension, Internal lands later than Official — and that's the
_correct_ picture per the canonical product model:

> "Extension does NOT mean payment is extended. Form 4868/7004 only
> extend filing. Payment is still due at original date."
> — anti-pattern #1

The "later Internal than Official" pattern IS what an extended row
looks like.

The actual problem was discoverability: a CPA scanning the filing
plan sees Internal > Official and reads it as wrong-data without
knowing which row carried the extension. The section-header "1
extended" badge said _some_ row in this year was extended, but
didn't point at which one.

## What changed

### `apps/app/src/features/clients/ClientFactsWorkspace.tsx`

Added a small `ext.` chip next to the Internal Deadline value when
the obligation has `extensionState === 'filed'` or `'accepted'`.

- Treatment: `bg-components-badge-bg-blue-soft`, `text-text-accent`,
  10px font, 1px padding. Slips in next to the date without
  shifting the column width because the Internal column already
  uses `flex items-baseline gap-1.5`.
- Tooltip carries the full explanation: _"This row's deadline has
  been extended. The Official Deadline column shows the original
  statutory date; the Internal Deadline reflects the new
  post-extension target."_
- Reads at-a-glance with the header pill's **Extended** badge
  (P0 #1 fix in `cfcdb7b0`) — the client-level signal and the
  row-level signal now reinforce each other.

## How to verify

`/clients/[id]` for Lakeview Medical Partners (or any client with
an extended row in the demo seed):

| Row                  | Internal              | Official   | Status    |
| -------------------- | --------------------- | ---------- | --------- |
| Form 1065 (filed)    | 2026-03-16            | 2026-03-16 | Filed     |
| Form 1065 (extended) | **2026-11-15 [ext.]** | 2026-05-01 | In review |

Hovering the `ext.` chip shows the tooltip. Header sub-line still
reads "Extended" blue badge.

## What was NOT added — a write-time invariant

The original critique called for "a server guard at the obligation
update boundary that rejects Internal AFTER Official." Now that we
understand the post-extension shape IS valid, no guard is needed —
adding one would actually reject legitimate extended-row writes.

If we ever want a guard on a different axis (e.g. "internal soft
target should be earlier than current effective deadline"), that's
a separate model-level invariant that would need a real
`firmInternalSoftTarget` field, which doesn't exist today.

## Files touched

- M `apps/app/src/features/clients/ClientFactsWorkspace.tsx`
