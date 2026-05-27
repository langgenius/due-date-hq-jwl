# /clients audit pass — follow-ups

**Date:** 2026-05-27 (after `b0df1ef0`)
**Branch:** `design/audit-drain-pass-1`
**Source:** Remaining items from `docs/Design/clients-critique-2026-05-27-audit-pass.md` after the first commit landed.

## Shipped

### L7 — disambiguate two "Opportunities" surfaces

Per-client tab labeled "Opportunities" collided with the firm-wide
`/opportunities` sidebar surface. Renamed the per-client tab to
"Suggested forms" — the body content is already a forms-catalog list,
so the label now matches what the tab actually shows. URL key stays
`opportunities` (L6 rename); only the visible label and the hotkey
description changed.

### L12 — "Forms catalog · 8 gap" copy

Two issues:
1. Plural was broken — singular and plural both rendered "# gap".
2. "Gap" is opaque — carries baggage from the rule-library surface
   where it means "no rule exists for this jurisdiction+form combo."

Switched the badge to "# not yet scheduled" which names the actual
product state. Also fixed the adjacent applicable count to use proper
plural forms ("# applicable form" / "# applicable forms").

### P2-2 — Client info tab count "(1)" tooltip

Bare "1" warning badge on the Client info tab was unlabeled. Added
`title` + `aria-label` reading "# required fact(s) missing" so a CPA
hovering the badge sees what it counts.

### P3-2 / P3-3 — workspace cleanup

- Dropped three unused workspace props (`readinessFilter`,
  `sourceFilter`, `pulseFilter`) + the matching `on*Change` handlers
  from the `ClientFactsWorkspace` type signature. They were declared
  and threaded through from the route but never consumed inside the
  workspace body. Also removed unused type imports
  (`ClientReadinessStatus`, `ClientSourceType`, `ClientPulseFilter`).
- Dropped the route's matching pass-through props.
- Removed the dead `SectionFrame` / `SectionLabel` comment-only import
  block (retired 2026-05-24 with the switch to `<TabSection>`).

### Q5 — `useClientNextDue` hook

Three peek surfaces (`ClientSummaryStrip`, `ClientDetailDrawer`,
`ClientPeekHoverCard`) each shipped their own `TERMINAL_STATUSES`
set + their own next-due / open-count / payment-overdue math. Audit
called out the drift risk after the `'done'` re-classification was
manually propagated by hand.

Extracted to `apps/app/src/features/clients/use-client-next-due.ts`:
- `CLIENT_TERMINAL_STATUSES` — the canonical set.
- `useClientNextDue(obligations)` — memoized hook returning
  `{ nextDue, openCount, paymentOverdueCount }`, anchored on
  `useFirmAsOfDate()`.

All three surfaces consume the hook now. The next status-taxonomy
change touches one file.

### P1-3 — lazy-gate Activity-tab queries

`riskSummaryQuery` and `auditQuery` are only consumed inside the
Activity tab body. Gated both on `activeTab === 'activity'`. Saves
~2 round-trips per detail-page open in the common case (CPA opens
Work / Client info / Suggested forms but never Activity).

`pulseHistoryQuery` + `pulseDetailsQueries` stay eager — they feed the
"Active alerts for this client" section which renders above the tabs
regardless of which tab is open. Will be addressed separately by
P1-4 (server batch endpoint).

## Tradeoffs

- L7 — `?tab=opportunities` URL key kept. Visible label is now
  "Suggested forms" but the URL hasn't been renamed to match (a second
  rename so soon after L6's `discover → opportunities` would be more
  churn than value).
- L12 — chose "not yet scheduled" over alternatives ("missing",
  "unscheduled", "pending"). Reads as the actual state ("we know these
  forms apply, but you haven't created deadline rows yet") rather than
  a value judgment.
- P3-2 — removed-prop comment in the type body explains why the props
  vanished so the next caller knows to wire them through if filter
  surfaces come back.
- P1-3 — `pulseHistoryQuery` stays eager; gating it would require
  duplicating Active-alerts logic. The right fix is P1-4 (server batch
  endpoint), deferred.

## Outstanding (still deferred)

- **P1-1** Split `ClientFactsWorkspace.tsx` (5,672 lines)
- **P1-4** Server-side `pulse.getDetailsBatch` endpoint
- **P2-4** Eyebrow back-link → canonical `breadcrumbs` prop
- **P3-5** Eye-icon Peek button hover-only opacity + focus tab order
