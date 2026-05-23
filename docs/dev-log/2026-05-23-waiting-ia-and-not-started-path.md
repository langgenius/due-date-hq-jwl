---
title: 'Waiting card IA preview + Not Started → Waiting path'
date: 2026-05-23
author: 'Yuqi pairing with Claude'
area: ux
---

# Two IA fixes on the obligation drawer

Yuqi's critique on the Waiting stage card: "the status + current status
block overlap or repeat the Documents received." And on the Not Started
primary action: "why clicking on the Start drafting return button in
Not Started status, it will jump straight to In review status?"

Both are real. This commit lands a fix for the second one (single path)
and a 3-up A/B/C visual comparison for the first (temporary, until Yuqi
picks a winner).

## Not Started → Waiting path

The single primary button on the Not started stage used to be "Start
drafting the return" which fired `onChangeStatus('review')` directly —
skipping `waiting_on_client` entirely. A CPA with no docs in hand had
no honest way to advance the row; they either had to click "Start
drafting" (which lied about what was happening) or use the status
picker manually.

Per the canonical CPA workflow (engagement → request docs → wait →
receive → prep → review → file), the common case for a new row is
"docs not yet in hand". The fix: two explicit paths on Not started:

```
[Confirm engagement letter is on file]    ← manual reminder
[Assign a preparer to this return]        ← manual reminder
[Request documents from client]           ← PRIMARY → waiting_on_client
                                            + opens Readiness tab
[Skip ahead to drafting (docs already
 in hand)]                                ← secondary → review
```

The verb labels make the choice obvious. Request-docs is the common
path; "Skip ahead to drafting" is the honest label for the rare case
where docs are already in hand at engagement time. New `request-docs`
task id wired in `handleTaskClick` to fire `onChangeStatus('waiting_on_client')`
then `onChangeTab('readiness')` in the same tick — the CPA lands on
the Readiness surface with the row already in Waiting.

## Waiting card IA — A/B/C comparison (temporary)

The Waiting card on `waiting_on_client` (the docs-from-client case)
stacks four layers that all say "we need docs":

- Header sub-status: `WAITING · Waiting on client to send docs`
- Panel header: `3 outstanding documents`
- Routing button: `Send document request to client`
- Manual reminder: `Chase client for outstanding documents`
- Primary mutation: `Mark client docs received`

To pick a treatment without speculating, I built three variants
controlled by an inline `[A · B · C]` segmented picker at the top of
the Waiting card (only visible when `prepStage === 'waiting_on_client'`).
Yuqi flips between them to scan the difference; once a winner is
picked we delete the picker + the two losers in a follow-up commit.

### A — Strip (least chrome)

- Header: `WAITING` (no sub-status line)
- Panel: outstanding docs (unchanged)
- Buttons: `Mark client docs received` (primary only)

Drops the redundant sub-status line and the routing + manual rows.
The panel is already a click target into Readiness, so the routing
button is redundant.

### B — Differentiate by role

- Header: `WAITING · Awaiting client · N days so far` (computed from
  audit events; falls back to `Awaiting client response` when no
  audit row tags entry into the stage)
- Panel: outstanding docs (unchanged) — the WHAT
- Buttons: `Send reminder to client` (routing verb) + `Mark all
received` (primary verb)

Each layer answers a different question. Header = WHEN. Panel =
WHAT. Buttons = VERBS. The "chase" manual reminder drops because the
"Send reminder" routing is the actual chase.

### C — Merge panel into sub-status

- Header: `WAITING` (no sub-status line)
- Panel: outstanding docs, rendered tight against the header
  (becomes the de-facto sub-status surface)
- Buttons: full stack — routing + manual + primary (unchanged labels)

Drops the sub-status text and lets the panel speak for itself. The
button stack stays full so the affordances aren't lost. Smallest
behavioral change, biggest visual compression.

## Why I'd pick A

If I had to pick one without seeing them rendered: **A**. The
"chase" / "send request" / "mark received" stack is genuinely three
buttons for what feels like one decision (do you have docs yet?).
The WaitingOutstandingDocs panel is already a click target into the
Readiness tab — that IS the "send request" / "chase" surface. Once
the CPA gets the docs, they fire one button.

B is the most informative but the days-since text adds visual noise.
C compresses well but doesn't fix the button-stack repetition.

Yuqi has final call. Once picked, follow-up commit deletes the
switcher + the two losers + the unused i18n strings.

## Files touched

- `apps/app/src/routes/obligations.tsx`
  - Not started case in tasks memo: 2 explicit paths
    (`request-docs` primary + `start` secondary)
  - `handleTaskClick` routes `request-docs` → waiting_on_client +
    Readiness tab
  - New `waitingVariant` state inside ActiveStageDetailCard
  - subStatus IIFE branches on variant for the `waiting_on_client`
    prepStage case
  - tasks memo branches on variant when stageKey === waiting_on_client
  - Variant picker UI rendered above the WaitingOutstandingDocs panel
  - Panel placement tightens when variant === C
- `apps/app/src/i18n/locales/{en,zh-CN}/messages.po` — 19 new strings
  (5 from this change + 13 from the variant picker UI + 1 prior
  hanxujiang string completed)

## Verified

- `pnpm exec tsc --noEmit` — clean
- `pnpm exec vp check --fix` — clean
- `pnpm exec vp run @duedatehq/app#test` — 290 tests pass

## Out of scope (per Yuqi: await go-ahead before backend)

- No backend changes (the new `request-docs` path reuses the existing
  `updateStatus` RPC + `waiting_on_client` enum value)
- No drawer-shape changes
- No changes to Waiting stage when prepStage is third-party /
  bookkeeping_cleanup / ready_for_prep (those don't have the
  docs-overlap issue)
