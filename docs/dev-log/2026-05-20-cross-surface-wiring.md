# 2026-05-20 · Cross-surface obligation wiring + harden + polish

## Why

`/critique` on "obligation across surfaces" surfaced one consistent
shape: the obligation drawer and queue are well-polished in
isolation, but every adjacent surface treats obligations as numbers
to display, not entities to link to. Client pages showed counts that
didn't navigate. Pulse alerts showed affected obligations with no
"open" affordance. The rule library had no way to see what a rule
actually produced. The drawer's "Open client detail" could silently
404 in seed data. Today's empty state pushed users to import data
they already had.

This batch ships the five P1+P2 items + the polish pass.

## What changed

### /adapt — wire inbound deep links into the queue

- **Client detail page** ([apps/app/src/features/clients/ClientFactsWorkspace.tsx](apps/app/src/features/clients/ClientFactsWorkspace.tsx)) — the "Open" column's count is now a `<Link>` to `/obligations?client=<id>`. `stopPropagation` on the link click prevents the row's open-client handler from swallowing the navigation.
- **Pulse alert detail** ([apps/app/src/features/pulse/components/AffectedClientsTable.tsx](apps/app/src/features/pulse/components/AffectedClientsTable.tsx)) — new trailing column with per-row "Open" link → `/obligations?id=<obligationId>&drawer=obligation`. CPAs can investigate the row before applying the relief.
- **Rule library** ([apps/app/src/features/rules/rule-library-tab.tsx](apps/app/src/features/rules/rule-library-tab.tsx)) — the trailing chevron cell replaced with "Obligations ↗" → `/obligations?rule=<ruleId>`. The inverse of the obligation drawer's rule citation.

### /adapt — make the drawer a hub, not a leaf

- **Blocked-by chip** ([apps/app/src/routes/obligations.tsx](apps/app/src/routes/obligations.tsx)) in `ObligationBlockerSection` — the "Waiting on X" line is now a `<Link>` to the upstream obligation's drawer. Inline mode swaps content in place; modal mode opens the new id in the same Sheet. Lets users walk a K-1 chain without losing context.
- **Risk-tab rule citation** — examined, deferred. The Risk tab's `penaltySourceRefs` are external URLs (authority citations), not internal rule ids. Linking to the Rule library would need a new payload field on the obligation row (rule id surfaces in the schema but isn't currently joined with rule metadata in the queue). Logged as a follow-up.
- **Evidence tab** — examined, deferred. `EvidenceDrawer` only exists as a context, not an overlay component. Building the stackable overlay is its own PR.

### /distill — footer "Copy obligation link"

Replaced the duplicate "Open client detail" in the sticky footer with "Copy link", which generates `/obligations?id=<id>&drawer=obligation&tab=<currentTab>` and writes it to the clipboard. Closes the shareability gap; removes the duplication.

### /harden — guard "Open client detail" against missing client

Header link now gates on both `clientId` AND `clientName`. When `clientName` is empty (orphaned obligation, missing seed, deleted client), the link is replaced with an inline italic note: *"Client record missing — obligation may be orphaned."* Users still see the gap is in the data, not the link. Footer "Copy link" still works regardless — sharing an orphaned obligation is a legitimate triage action.

### /clarify — Today widget empty state split

Was: *"No obligations this week. Import clients to get started."* — fired even when the practice had 12 active obligations beyond the 7-day window.

Now three states in priority order:
1. **`totalOpen > 0` and zero this week** → *"Nothing due this week."* + "View N open obligations →" linking to `/obligations`.
2. **`totalOpen === 0` and migration possible** → existing import CTA.
3. **`totalOpen === 0` and migration not possible** → existing "You're caught up."

Required passing `summary.openObligationCount` from `dashboard.tsx` into `DashboardActionsList` as a new `totalOpen` prop.

### /polish — row a11y

The obligation queue's `<TableRow>` now has `role="button"`, `tabIndex={0}`, and an `onKeyDown` handler that activates on Enter or Space. Focus ring uses inset `ring-state-accent-active-alt` so it's visible without disturbing the row layout. Matches the rule-library row pattern. Without this, keyboard-only users had to know about the J/K hotkeys to drive the queue.

### Backend (deferred per user instruction, included here)

Added `ruleIds` filter end-to-end so the Rule library link actually filters the queue:
- `packages/contracts/src/obligation-queue.ts` — added to `ObligationQueueListInputSchema`
- `packages/ports/src/obligation-queue.ts` — added to `ObligationQueueListInput`
- `packages/db/src/repo/obligation-queue.ts` — added to type + filter clause (`inArray(obligationInstance.ruleId, ruleIds)`)
- `apps/server/src/procedures/obligation-queue/index.ts` — wired through `toRepoInput`
- `apps/app/src/routes/obligations.tsx` — new `rule` URL param + `ruleQuery` derivation + `ruleIds` on `queryInputWithoutCursor`

The frontend filter currently has no header chip UI — it's set only via inbound deep links, by design (Rule library is the only entry point for now).

## Verified

- `npx tsgo --noEmit` → exit 0 (catches all 4-layer wiring: contracts → ports → db → server → app)
- Live browser verification on the queue, drawer, and pulse: started but the dev session expired mid-tour and required magic-link re-auth. Patterns mirror existing wiring (rule library row already had `role/tabIndex`; `?client=` filter is the working precedent for `?rule=`).

## Still deferred

- **Risk-tab rule → library link** — needs rule metadata joined into the queue payload (rule id is in the schema; rule label is not). Own PR.
- **Evidence overlay drawer** — building the stackable overlay so evidence rows in the drawer can open inline without obscuring the obligation.
- **Per-status milestone notes RPC + storage** (PRD §7.2, still deferred from prior batches).
- **Form 8879 / Signature stage** (PRD §7.2, still deferred from prior batches).
