---
title: 'Client detail header pill: surface statutory-late + Extended truthfully'
date: 2026-05-24
author: 'Claude (Yuqi pairing)'
area: clients
---

# Truthful header pill on `/clients/[id]` (critique P0)

## Why

The critique surfaced a P0: Lakeview Medical Partners — a partnership
whose statutory 1065 filing date (2026-03-16) passed two months ago —
was rendering **"All on track"** under the client name. The pill was
green. The CPA reading the page in <1 second came away thinking
nothing was on fire.

Root cause: `buildClientWorkPlanSummary.overdueOpenCount` checked
`currentDueDate < asOfDate`. For Lakeview the row's
`currentDueDate` had shifted to 2026-11-15 (post-extension), so
`overdueOpenCount` was 0 and the pill fell through to the green
fallback. Two problems in one:

1. **The fallback was too eager.** "All on track" lit up whenever
   there were open rows and `overdueOpenCount` was zero, with no
   check that statutory dates had actually been honored.
2. **The data model could lie.** The seed for Lakeview's 1065 set
   `extension_filed_at` but never updated `extension_state` (default
   `'not_started'`), so even truthful code reading
   `extension_state` would think no extension was filed. Two columns
   told two different stories about the same row.

Per the canonical product model:

- Anti-pattern #1: **Extension does NOT mean payment is extended.**
- Anti-pattern #3: **Filed ≠ Done.** "All on track" should never be
  a lazy fall-through past missed statutory dates.

## What changed

### `apps/app/src/features/clients/client-detail-model.ts`

Added three counts to `ClientWorkPlanSummary`:

- `statutoryLateUnextendedCount` — open rows where
  `baseDueDate < asOfDate` AND `extensionState` is **not**
  `'filed'` or `'accepted'`. The "real late" count: statutory
  date passed and no extension on the wire.
- `extensionPaymentDueCount` — count from the existing
  `findExtensionWithoutPaymentObligations` helper. Anti-pattern #1
  in numeric form.
- `extensionFiledOpenCount` — informational. Lets the header read
  **"Extended"** (info blue) instead of green when an extension is
  the reason there's no live red.

`overdueOpenCount` is kept unchanged — multiple downstream surfaces
still rely on the currentDueDate-based "X late" check, and the new
counts compose without breaking anything that already worked.

### `apps/app/src/features/clients/ClientFactsWorkspace.tsx`

`renderClientHeaderSubLine` now consumes the four counts in
priority order, most severe first:

1. `statutoryLateUnextendedCount > 0` → red destructive Badge
   "**N statutory late**" with `AlertTriangleIcon`. Tells the CPA
   there's a statutory date in the past that nobody's covered.
2. `extensionPaymentDueCount > 0` → amber warning Badge
   "**Extension filed — payment still due**". Surfaces the
   anti-pattern #1 trap directly.
3. `overdueOpenCount > 0` → existing red "N late" treatment. Catches
   the case where the **extended** deadline was also missed.
4. `extensionFiledOpenCount > 0` → blue info Badge **"Extended"**.
   Replaces the lazy green fall-through for rows on a valid
   extension.
5. `openCount > 0` → existing green "All on track". Now only fires
   when all four severity checks are clean.

### `mock/demo.sql` — Lakeview seed truthfulness

Added `extension_state = 'filed'` to the UPDATE that flips
Lakeview's Federal 1065 to extended. The seed already set
`extension_filed_at`; without the state update, the row claimed an
extension was filed _and_ claimed no extension state had changed.
Two columns telling different stories made the pill flicker between
"Extended" and "1 statutory late" depending on which column the
caller read.

### `client-detail-model.test.ts`

Three new test cases plus a tightened existing one:

- _summarizes filing and payment work…_ — original test, now pins
  `baseDueDate` explicitly on each row so the new counts are
  unambiguous.
- _flags statutory-late rows even after currentDueDate shifts past
  asOf_ — the Lakeview-with-no-extension scenario. Confirms
  `statutoryLateUnextendedCount: 1` even when intuitive
  "currentDueDate based" checks would say "in future".
- _does not count statutory-late when an extension is on the wire_
  — the real Lakeview seed scenario. Confirms `Extended` path.
- _flags extension-with-unsettled-payment per anti-pattern #1_ —
  confirms the warning-amber path lights up.

## How to verify

```
pnpm --filter @duedatehq/app test client-detail-model
```

Then in the running app, with the demo seed:

- `/clients/10000000-0000-4000-8000-000000000007` (Lakeview Medical
  Partners) → header reads **"Extended"** (blue info badge).
- `/clients/10000000-0000-4000-8000-000000000004` (Copperline
  Studios Inc.) → header reads **"1 statutory late"** (red badge);
  TX Franchise Report's official deadline 2026-05-05 is past with
  no extension on file.

Before this change both clients read **"All on track"**.

## Out of scope (deferred)

- Aggregating the same logic into the `/clients` list summary strip
  (`buildClientObligationListSummaries`) — that path currently uses
  a different upstream type (`ObligationQueueRow`) that doesn't
  carry `baseDueDate` or `extensionState`. Threading those fields
  through the list query is a separate change.
- Re-tagging extensions with `extends_filing | extends_payment |
extends_both` per the memory product spec. The contract supports
  the data; no UI consumes it yet.
- The dashboard "This week's work" 3-tile triage uses its own queue
  source and is unaffected by this change.

## Files touched

- M `apps/app/src/features/clients/client-detail-model.ts`
- M `apps/app/src/features/clients/client-detail-model.test.ts`
- M `apps/app/src/features/clients/ClientFactsWorkspace.tsx`
- M `mock/demo.sql`
