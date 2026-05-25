# Clients — user-journey design pass (placeholder)

**Date:** 2026-05-22
**Author:** Yuqi (to be drafted properly in a separate session)
**Status:** Draft / scope-only. Seeded from a feedback note Yuqi
raised during the D-2/D-3 review:

> 因为现在 xxx at risk, 点击会去别的页面，现在一整个链路和 user
> journey 和 experience 都很零碎了。这是一个产品整体的问题，你需要
> 设计所有的用户动线，另外准备。

This file is **not yet a design**. It's a holder so the problem
stays visible and the next strategic session has a starting place.
No commit should attempt to "implement" this doc as-is.

---

## The problem (one sentence)

CPAs land on `/clients/[id]` to manage one client, but most clickable
signals on the page eject them to another surface — leaving the
"focus on this client" mental model broken.

## Evidence (current behavior, 2026-05-22)

| Element                            | Click target today                                 | Effect                                                                         |
| ---------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------ |
| `ClientSummaryStrip` Next-due tile | `openObligationDrawer(nextDue.id)`                 | In-page drawer ✅ (stays on client)                                            |
| `ClientSummaryStrip` At-risk tile  | `navigate('/obligations?client=…&status=blocked')` | **Leaves to queue** ❌                                                         |
| `ClientSummaryStrip` Team tile     | `navigate('/obligations?client=…')`                | **Leaves to queue** ❌ (now removed; this row reduced to 2 tiles)              |
| Active-alert section "Review →"    | `navigate('/rules/pulse')`                         | **Leaves to Pulse** ❌                                                         |
| Header overflow → View audit log   | `navigate('/audit?entityId=…')`                    | **Leaves to audit** ❌ (expected — but worth examining if it could be in-page) |
| Missing-facts chip in title row    | scrolls to `#client-filing-jurisdictions`          | In-page jump ✅                                                                |
| Filing-plan row click              | opens obligation panel in the right rail           | In-page panel ✅                                                               |
| Archive button                     | navigates back to /clients after success           | Leaves ✅ (correct — entity no longer exists in active view)                   |

So out of 8 actionable surfaces, **3 leave the page when they
shouldn't**. The pattern is inconsistent (we're not committing to
either "everything happens in place" or "this is a dashboard, click
drills out").

## Strategic question

> What is `/clients/[id]`'s job?

Two reasonable answers:

1. **Workspace** — manage this client end-to-end without leaving.
   Drawers, in-page filters, inline edits. Other surfaces only own
   firm-wide cross-cutting work.
2. **Dashboard** — read-only snapshot. Every action jumps to the
   surface that actually owns the work (queue / Pulse / audit).

The current state is half of each, which is the worst version.

## Sub-questions to design through

1. **At-risk: in-place or out?** Should clicking "At risk" filter the
   filing-plan to overdue rows in place, or route to the queue?
2. **Pulse review: in-place or out?** Should clicking a Pulse alert
   open a drawer scoped to this client+alert intersection, or route
   to the alert detail page on `/rules/pulse`?
3. **Team / Owner surfacing.** The Team tile was just an
   `reviewerUserId` count — meaningless. The right shape might be an
   avatar stack like the obligations queue row, with hover popovers.
   Where does it live? Header? Summary strip? A new identity card?
4. **Audit log: panel or page?** Same question as above. The audit
   panel could be a Sheet drawer on this surface vs. a destination.
5. **Cross-surface state.** When the user does jump out (e.g.
   Archive succeeded), where do they land — list page with a toast,
   or some "you just archived X" follow-up surface?

## Adjacent surfaces with the same fragmentation

- `/obligations` rows → some open a drawer, some navigate (depends
  on context)
- `/dashboard` action-list rows → currently open a Sheet, not the
  panel pattern; tracked separately in
  `2026-05-22-client-page-obligation-panel.md` follow-up
- `/rules/pulse` alert detail → no path back to a specific client

The journey work here will likely surface adjacent journey work for
the obligations queue + dashboard. Plan for it.

## Things this doc is NOT

- Not a place to list every individual UI fix (those live in
  `clients-list-and-detail-critique-2026-05-22.md`).
- Not a place to design the workspace-vs-dashboard answer right now
  — Yuqi will run a focused session for that.
- Not a backlog. The sequencing doc remains the backlog for tactical
  work; this doc holds the strategic question.

## Next session

When Yuqi sits down to design this, the input set is:

1. This page (the framing + sub-questions above)
2. `client-page-information-architecture.md` (the four canonical
   questions a CPA asks)
3. `clients-list-and-detail-critique-2026-05-22.md` (tactical
   findings, P0/P1/P2)
4. Live walk-through of `/clients/[id]` in the demo space with a
   real CPA persona (Avery / Miguel / Sarah) doing one common task

Output of that session should be:

- A decision on workspace vs. dashboard (or hybrid contract)
- A flow diagram for the 3-5 most common in-page tasks
- A revised set of click targets / route boundaries per surface
- A migration plan onto the resulting contract
