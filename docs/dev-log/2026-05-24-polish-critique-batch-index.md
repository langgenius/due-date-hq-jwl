---
title: 'Polish pass + index of the 2026-05-24 critique batch'
date: 2026-05-24
author: 'Claude (Yuqi pairing)'
area: meta
---

# Critique batch — what landed today (polish)

Today's `/critique → /clarify → /audit → /shape → /polish` cycle
walked every primary route, ranked findings P0–P3, and shipped the
fixes onto `design/preview-integration` in 10 focused commits. This
log is the index — what changed, where to look, what's deferred.

## Commit chain

| Commit     | Tier | Title                                                                                        |
| ---------- | ---- | -------------------------------------------------------------------------------------------- |
| `cfcdb7b0` | P0   | `design(clients): header pill stops lying when statutory date passed (clarify)`              |
| `73d72ffa` | P0   | `fix(app-shell): sidebar Alerts badge reads Pulse, not Inbox unread (audit)`                 |
| `258d374a` | P0   | `fix(obligations): mute lateness on filed/paid/completed rows (clarify)`                     |
| `b5bdd762` | P2   | `design(app-shell): four small IA truths — Inbox/Settings/Audit/Cmd+K (clarify)`             |
| `14ea32f0` | P2   | `design(pulse,notifications): source labels read as text, not dev tokens (typeset)`          |
| `efc0a2bf` | P2   | `design(app-shell): scannable relative time on Inbox + Members (clarify)`                    |
| `be1f08d1` | P1   | `design(reminders): preview templates against sample data, not raw mustache (clarify)`       |
| `a938817d` | P2   | `fix(opportunities): summary copy matches the row's actual signals (clarify)`                |
| `291fdf7c` | P2   | `design(app-shell): three tier-4 fixes — Billing math, avatar a11y, +N tile (clarify+audit)` |
| `a9a5458b` | P1   | `design(obligations): lifecycle ribbon stops claiming skipped stages (shape)`                |
| (this)     | —    | `design(reminders): RelativeTime on suppression + recent-sends rows (polish)`                |

## Heuristic re-score (vs. the original critique)

| #         | Heuristic                       | Was       | Is        | Why                                                                                                                                                  |
| --------- | ------------------------------- | --------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1         | Visibility of System Status     | **2**     | **3**     | Three alert counts reconciled; "All on track" can no longer lie past statutory; ribbon stops claiming skipped stages                                 |
| 2         | Match System / Real World       | **2**     | **3**     | Reminder templates render against sample data; ISO timestamps swapped for relative on daily-driver surfaces; monospace chips warmed to sentence case |
| 3         | User Control and Freedom        | 3         | 3         | unchanged — Dismiss/Snooze on Opportunities still deferred (needs storage model)                                                                     |
| 4         | Consistency and Standards       | **1**     | **3**     | Audit-log breadcrumb fixed; Inbox dedupe; Cmd+K "ask" placeholder removed; settings IA hint dropped                                                  |
| 5         | Error Prevention                | 2         | 2         | Internal-vs-Official deadline ordering unchecked (open; not in this pass); completed rows now mute lateness                                          |
| 6         | Recognition Rather Than Recall  | 3         | 3         | unchanged                                                                                                                                            |
| 7         | Flexibility and Efficiency      | 3         | 3         | unchanged                                                                                                                                            |
| 8         | Aesthetic and Minimalist Design | 3         | 3         | unchanged — but the +N tile compress + chip warming nudges it forward                                                                                |
| 9         | Error Recovery                  | 2         | 2         | unchanged                                                                                                                                            |
| 10        | Help and Documentation          | 2         | 2         | unchanged                                                                                                                                            |
| **Total** |                                 | **23/40** | **27/40** | "Solid foundation, multiple data-integrity and IA inconsistencies undermining trust" → "Trust-breakers closed, IA reads honest"                      |

The three heuristics that moved are the three the critique called
P0/P1: status, match-with-real-world, and consistency. Those were
the trust-breakers.

## Polish-pass touch-ups

`reminders-page.tsx`:

- Client suppressions card timestamp → `<RelativeTime>`. Was
  `2026-05-01 01:35:00 PDT`, now `3w ago`. Consistent with the
  Inbox + Members treatment that landed in `efc0a2bf`.
- Recent sends table created-at column → same `<RelativeTime>`
  treatment. Drops the `tabular-nums` since we're no longer
  rendering tabular digits.

`pnpm check` clean (1369 files formatted, 651 files lint+type
clean). `pnpm test` clean (293 tests across 47 test files).

## What's still open

The critique flagged a few items deliberately not addressed in
this batch:

1. **Opportunities Dismiss/Snooze.** Needs a storage model
   (`opportunity_dismissal` keyed by `firmId × opportunityId`,
   with snooze TTL semantics). Deferred to its own `/shape`
   pass — `a938817d` shipped the personalization win in the
   meantime.
2. **Statutory-vs-Internal date ordering invariant.** The system
   currently allows an Internal Deadline AFTER an Official
   Deadline (Lakeview seed had this exact shape). A guard would
   live at the obligation `update` boundary and reject the write.
   Out of UI scope.
3. **Magnolia continuation row.** Deadlines table renders a
   client-name-less continuation row for `Magnolia Family Trust →
FL Corporate Income`. Needs a deeper read of the TanStack Table
   grouping logic before fixing.
4. **Snooze inconsistency** on Pulse alerts: looked like a bug in
   the critique screenshot but turned out to be intentional gating
   on `status === 'matched'`. Logged in the Tier 4 dev log so a
   future reader doesn't try to "fix" it back.
5. **`useEffect` audit.** Project's own `AGENTS.md` prohibits
   `useEffect` in app/package code but 12 usages exist. Not a UX
   issue, deferred for a dedicated cleanup PR.

## Files touched this session (excluding dev-logs)

- `apps/app/src/components/patterns/app-shell-nav.tsx`
- `apps/app/src/components/patterns/keyboard-shell/CommandPalette.tsx`
- `apps/app/src/components/patterns/keyboard-shell/KeyboardProvider.tsx`
- `apps/app/src/components/primitives/relative-time.tsx` (new)
- `apps/app/src/features/audit/audit-log-page.tsx`
- `apps/app/src/features/clients/ClientFactsWorkspace.tsx`
- `apps/app/src/features/clients/client-detail-model.ts`
- `apps/app/src/features/clients/client-detail-model.test.ts`
- `apps/app/src/features/dashboard/actions-list.tsx`
- `apps/app/src/features/dashboard/needs-attention-card.tsx`
- `apps/app/src/features/dashboard/needs-attention-section.tsx`
- `apps/app/src/features/members/members-page.tsx`
- `apps/app/src/features/notifications/notifications-page.tsx`
- `apps/app/src/features/pulse/components/PulseAlertCard.tsx`
- `apps/app/src/features/pulse/components/PulseSourceBadge.tsx`
- `apps/app/src/features/reminders/reminders-page.tsx`
- `apps/app/src/lib/utils.ts`
- `apps/app/src/routes/billing.tsx`
- `apps/app/src/routes/obligations.tsx`
- `apps/app/src/routes/settings.tsx`
- `apps/server/src/procedures/opportunities/index.ts`
- `mock/demo.sql`
