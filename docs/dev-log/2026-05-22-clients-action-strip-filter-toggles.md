---
title: 'Action-strip counter chips become real filter toggles on /clients'
date: 2026-05-22
author: 'Yuqi pairing with Claude'
area: ux
---

# Clients action strip — counters become filter toggles

## Why

From the /clients critique pass:

> [P1] Action strip counters look static but should filter. "8 at risk · 1
> waiting on client · 4 Pulse hits · 1 missing facts" reads as a data
> summary. CPAs naturally think "I want to see the 8 at risk → click 8 at
> risk → filter table to those rows." Currently they're just numbers.

The previous behavior wired `onClick` on the at-risk / waiting chips to
navigation (`/clients?status=…`) — which never landed because the
clients route ignores those params for now. From the CPA's seat, the
chips looked clickable but did nothing visible. The right semantic is
**in-place filter** on the same table, mirroring how scope tabs work in
the obligations queue.

## What changed

### `SurfaceSummaryStrip` got a pressed-state visual

`SurfaceSummaryItem` gained an optional `active?: boolean`. When true,
the chip renders with `bg-state-base-hover-alt` (a subtle pill
background) and the label switches from `text-text-secondary` to
`text-text-primary`. `aria-pressed` is set so screen readers announce
the toggle state. The active visual is intentionally subtle — it sits
underneath the existing tone tints (destructive / warning / review) so
both can read at once: "this filter is on AND there are 8 overdue."

### `/clients` strip wires the toggles

Two new pieces of local state in `ClientFactsWorkspace`:

```tsx
const [atRiskActive, setAtRiskActive] = useState(false)
const [waitingActive, setWaitingActive] = useState(false)
```

A new `visibleClients` derivation narrows `filteredClients` further when
either toggle is on, using the `obligationSummariesByClient` map already
in scope:

```tsx
const visibleClients = useMemo(() => {
  if (!atRiskActive && !waitingActive) return filteredClients
  return filteredClients.filter((c) => {
    const summary = obligationSummariesByClient[c.id]
    if (!summary) return false
    if (atRiskActive && summary.overdueCount > 0) return true
    if (waitingActive && summary.waitingOnClientCount > 0) return true
    return false
  })
}, [filteredClients, atRiskActive, waitingActive, obligationSummariesByClient])
```

`useReactTable` switches from `data: filteredClients` to
`data: visibleClients`. The two toggles compose as an OR — a client
matches if it has _any_ of the selected risk shapes — which matches the
mental model "show me the rows I'd want to act on."

`ClientsActionStrip`'s API changes:

- Old: `onOpenAtRisk` / `onOpenWaitingOnClient` (navigation intents)
- New: `atRiskActive` / `waitingActive` / `onToggleAtRisk` /
  `onToggleWaiting`

Pulse-hits and missing-facts chips keep their existing semantics
(navigate-and-filter) — those are real cross-surface jumps, not
filters into the same table.

### Empty + edge cases

- When the toggle is on but the count is 0, the chip still works (the
  user can clear it). The handler is wired whenever `count > 0 || active`.
- When both toggles are off, the table is identical to before (no perf
  cost from the extra `useMemo` — early-returns the same reference).
- `aria-pressed` only renders when the chip is active, matching the
  pattern in the surface-vocab primitive.

## Verification

- `npx tsc --noEmit -p apps/app/tsconfig.json` → clean
- Manual: toggle at-risk → table narrows to 8 rows; toggle waiting →
  table narrows to the 1 client with `waitingOnClientCount > 0`; toggle
  both → union of the two; toggle off → full list returns
- The two toggles read correctly in NVDA as "8 at risk, toggle button,
  pressed" once activated

## Files

- M `apps/app/src/features/_surface-vocabulary/SurfaceSummaryStrip.tsx`
  — `active` prop on items + pressed-state visuals + `aria-pressed`
- M `apps/app/src/features/clients/ClientFactsWorkspace.tsx` — local
  toggle state, `visibleClients` derivation, updated
  `ClientsActionStrip` API
- A `docs/dev-log/2026-05-22-clients-action-strip-filter-toggles.md`
  (this file)

## What's left

- Pulse hits chip still navigates (this is correct — Pulse is a
  separate surface). If we later want a "Pulse-flagged" overlay on the
  clients table itself, that becomes a third toggle here.
- Missing-facts chip still navigates to Fix-now. Same reasoning — the
  fix flow is its own surface.
