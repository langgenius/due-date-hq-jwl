# /deadlines `+ New deadline` CTA + audit status sweep — 2026-05-26

Closes audit P0 #8 / Q1 (deadlines queue had no labeled primary CTA)
and annotates audit P0 #9 / T1 (dashboard h1 routes through
`PageHeader`) as already-shipped.

## What shipped

### 1 · `+ New deadline` CTA on `/deadlines`

`apps/app/src/routes/obligations.tsx`

```diff
+ import { CreateObligationDialog } from '@/features/obligations/CreateObligationDialog'

  <PageHeader
    actions={
      <>
        <Button … >Export</Button>
        <CalendarSyncPopover />
+       <CreateObligationDialog />
      </>
    }
  />
```

The most common CPA mid-day task — "I just learned client X owes a
thing, add it" — had no entry point from the queue. Users had to
navigate back to the dashboard or open a client detail to find the
`CreateObligationDialog` trigger.

`CreateObligationDialog` is already a global dialog used by the
dashboard and the client detail page. Surfacing its trigger on the
queue costs nothing: same component, same state, same audit hooks.

Order matches the audit's recommendation: `Export` →
`CalendarSyncPopover` → `+ New deadline` (primary, right-edge).
Parity with `/clients`'s `+ Add client` placement.

## Audit status sweep — what's actually open vs. already shipped

The audit was written 2026-05-25 against a code snapshot from that
day. Yuqi's "seventy-fourth pass" (committed to main 2026-05-26,
before PR #28 branched) shipped several of the audit's prescribed
fixes ahead of the formal sweep. Picking off the open P1s today
turned up two that were already done — annotated this commit so the
audit's open-threads list stays accurate:

| Audit ref   | Finding                                         | Actual status                                                                                                                                                                                                     |
| ----------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **#9 / T1** | Dashboard h1 inline `<header>` not `PageHeader` | **Already shipped** in Yuqi's seventy-fourth pass. Dashboard now routes through `<PageHeader>`; date renders as a rounded-full pill in the title slot — matches `/clients` + `/alerts` + `/rules/library` family. |
| **#8 / Q1** | `/deadlines` missing `+ New deadline` CTA       | **Shipped this commit.**                                                                                                                                                                                          |

The audit table and per-surface findings (#9, T1, #8, Q1) all carry
"Status (2026-05-26)" annotations now so the next reader doesn't
re-derive what's done.

## Why the audit was stale

The 2026-05-25 audit was a snapshot survey. Yuqi's day-to-day
polish passes (sixty-eighth → seventy-fourth) ran in parallel and
fixed several of the same findings via the natural design-iteration
flow. The audit doc is now mostly an annotated record of what each
finding's resolution was, not a live punch-list.

With this commit, **8 of the audit's top-10 findings have shipped**
(7 by Yuqi's prior passes + this commit's #8; 1 by PR #25). Remaining
top-10 open: **#3** (vocabulary drift), **#10** (Pulse width switch).

## With T1 shipped, the StatTile canonical is now visually correct

The 2026-05-26 StatTile extract (commit `6b077d44` on this PR) set
the canonical tile value at `text-xl semibold` per DESIGN.md §3.2.
That commit's dev-log flagged a soft regression on the dashboard:
the dashboard's inline `<h1 text-xl>` would have read at the same
scale as the new tile value, breaking the title-to-tile ratio.

T1 was assumed open at that time but turns out to have been shipped
in the prior seventy-fourth pass. So the dashboard's h1 is already
`text-2xl` (via PageHeader), and the new text-xl tile value reads
correctly as the smaller scale. No follow-up needed.

## Verification

```bash
CI=true pnpm exec vp check
# Expected: 0 errors, pre-existing warnings unchanged
```

Manual:

- Open `/deadlines`; right-edge of the header now shows `Export · 📅
Sync · + New deadline`. Click `+ New deadline` → existing dialog
  opens; pick a client, create, dialog closes, new row appears in
  the queue.

## Out-of-scope follow-ups

- **Audit P0 #10** — `/rules/pulse` switches `max-w-page-wide` ↔
  `max-w-[1440px]` when the panel opens. The container visibly jumps
  left by ~80 px. Fix: pick one width (probably `max-w-[1440px]` so
  the panel has room) and let the panel column grow without changing
  the container. Truly open per my grep.
- **Audit P0 #3** — Vocabulary drift across Deadlines/obligations/
  actions/filings. Touches nav + URL params + page titles + tile
  copy. Bigger scope, deserves its own commit.
