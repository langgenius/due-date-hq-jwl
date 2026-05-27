# Journey Audit — phi pass

**Date:** 2026-05-27
**Agent:** φ (phi-journey-audit)
**Branch:** `design/audit-drain-phi-journey-audit`
**Methodology shift:** previous audits walked surface × surface (ρ
permission matrix, σ cross-route consistency). Yuqi flagged that a
71-day-overdue payment was buried 4 layers deep — surface audits
missed it because each surface looked "consistent" with the others.
This pass walks **real CPA journeys end to end** and surfaces drift
between "what the user needs to see" and "what the product surfaces."

The journey is the test. The surface is the symptom.

---

## J1 — "I filed but haven't paid yet, what does my product show?"

**Seed:** Lakeview Medical Partners / Form 1065,
status=`'done'` (Filed), paymentDueDate=2026-03-16, asOfDate=2026-05-27.
The CPA filed on time. The wire transfer for the authority payment
never landed. 71 days have passed.

### Walk

| Click depth | Surface                                               | What the CPA needs                                        | What the product showed (before)                                            | Drift                               |
| ----------- | ----------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------- |
| 0           | Dashboard `/today`                                    | "Lakeview has an overdue payment"                         | Row absent — `DashboardTopRow` schema lacks `paymentDueDate`                | **P1 (deferred — contract change)** |
| 1           | Client list `/clients` row                            | "Lakeview has unresolved $$"                              | No payment-overdue cue. `Open count` excludes `done` rows.                  | P1 — same as #2 (deferred)          |
| 1           | `<ClientPeekHoverCard>` (hover the client name)       | "Filed but payment overdue on 1 filing"                   | Just `S corp · 0 open deadlines` — nothing                                  | **P0 — Drift #2 (shipped)**         |
| 1           | `<ClientDetailDrawer>` (legacy drawer peek)           | Same as hover card                                        | Same — no payment cue                                                       | **P0 — Drift #3 (shipped)**         |
| 2           | `/clients/[id]` header pill                           | "1 filed — payment overdue"                               | Bottomed out at "All on track" (silent green)                               | **P0 — Drift #4 (shipped)**         |
| 2           | `/clients/[id]` ClientSummaryStrip "At risk" tile     | Count = 1, with subline "1065 payment overdue"            | Count = 0 — `isAtRisk` excluded `'done'` via TERMINAL_STATUSES              | **P0 — Drift #1 (shipped)**         |
| 3           | Filing-plan row in the year section                   | Status pill = "Filed" + red "Payment 71d late" chip       | Just "Filed" pill, no chip                                                  | **P0 — Drift #5 (shipped)**         |
| 4           | Click row → drawer header chip cluster                | "Payment 71 days late" chip alongside Filed pill          | No chip, only "Filed" pill                                                  | **P0 — Drift #7 (shipped)**         |
| 5           | Drawer "Key deadlines" Payment tile                   | Red destructive surface, "PAYMENT DUE" eyebrow, red value | Hidden inside the compact terminal strip (`allTerminalDatesMatch === true`) | **P0 — Drift #8 (shipped)**         |
| 5           | Drawer "Key deadlines" Payment tile (full strip mode) | Red surface tone                                          | Neutral surface, red value text only                                        | **P1 — Drift #9 (shipped)**         |
| 5           | /deadlines queue row Status cell                      | "Filed" pill + red "Payment 71d late" chip                | Just "Filed" pill                                                           | **P0 — Drift #6 (shipped)**         |
| n           | Calendar feed `webcal://`                             | Filed row removed from iCal feed                          | Server-side iCal generation; out of scope                                   | **P2 — deferred**                   |
| n           | Audit log "missed payment deadline" event             | Auto-emit event when paymentDueDate crosses today         | No such audit event today                                                   | **P2 — deferred (new feature)**     |
| n           | Notification trigger                                  | Email/in-app push when payment date slips                 | No such trigger today                                                       | **P2 — deferred (new feature)**     |

### Root cause

`TERMINAL_STATUSES` (the "this row is closed" set) is overloaded.
Three different surfaces (ClientSummaryStrip, ClientPeekHoverCard,
ClientDetailDrawer) each defined their own
`new Set(['done', 'paid', 'completed', 'filed', 'not_applicable'])`,
treating ANY of those statuses as "this obligation is done — suppress
all date-based urgency." But `'done'` only means "filing leg is done."
A payment leg can still be outstanding.

### Fix shape

A new module — `apps/app/src/features/obligations/payment-overdue.ts`
— exports `isPaymentOverdue(o, today)` and `paymentOverdueDays(o, today)`.
The helper's payment-terminal set is just `{'completed', 'not_applicable'}`
(the only two statuses that mean "every leg of this obligation is
closed"). Status-status helpers still treat `'done'` as filing-terminal;
the payment-overdue helper is a separate, additive signal stacked on top.

Surfaces add a `Payment overdue` chip / red Payment tile / red header
pill / `paymentOverdueCount > 0` line independently — they don't
mutate `TERMINAL_STATUSES`. The Filed pill stays green; the payment
chip is its sibling.

---

## J2 — "Tuesday 8am. 60 clients. What's on fire?"

**Walk:** Login → Dashboard `/today`.

| Surface                                                 | Status         | Notes                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Login                                                   | OK             | Magic-link flow exists, redirects to `/today`                                                                                                                                                                                                                                                                                                      |
| `<PageHeader>` Today + date pill                        | OK             | Date pill formatted, neutral chrome — doesn't compete                                                                                                                                                                                                                                                                                              |
| `<NeedsAttentionSection>` (Pulse alerts)                | OK             | Tone derivation already canonical (per ν audit)                                                                                                                                                                                                                                                                                                    |
| `<DashboardActionsList>` Smart-Priority rows            | **P1 drift**   | Server filters terminal-state rows; client-side `DASHBOARD_TERMINAL_STATUSES` is defensive — but `DashboardTopRow` lacks `paymentDueDate`, so even if a `'done'` row slipped through the server filter, the dashboard couldn't tell "filed late" (quality stat) from "filed but payment overdue" (live signal). **Deferred — contract-level fix.** |
| Summary tiles (In review / Blocked / Waiting on client) | OK             | Each tile a count + link to filtered queue                                                                                                                                                                                                                                                                                                         |
| Empty state ("Nothing due this week")                   | OK             | Three distinct shapes (cold start vs caught-up vs migration-blocked) — already audited Step 6                                                                                                                                                                                                                                                      |
| Action-row sorting                                      | OK             | Server-side smart-priority; rows ordered by computed score                                                                                                                                                                                                                                                                                         |
| Time-to-scan                                            | **borderline** | 60-client firm with 6 alerts + 8 rows + 3 summary tiles = ~17 surface elements above the fold. Hard ceiling for a 5-second triage — not actionable as a fix, but the dashboard SHOULD NOT add new sections without dropping existing density                                                                                                       |

**No drift shipped for J2** beyond the J1-deferred contract-level fix.

---

## J3 — "Show me Client X. What's actually risky here?"

**Walk:** Click client → Peek hover-card → "Open full page" →
`/clients/[id]` → ClientSummaryStrip → Filing plan → individual row drawers.

| Surface                                       | Status                              | Notes                                                                                                                                                                                                                                                 |
| --------------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Peek `<ClientPeekHoverCard>` next-due summary | OK (post J1 #2 fix)                 | Now surfaces `Payment overdue on N filings` line under identity                                                                                                                                                                                       |
| Identity chips (entity, state, readiness)     | OK                                  | Per ν audit                                                                                                                                                                                                                                           |
| ClientSummaryStrip 3-tile strip               | OK (post J1 #1 fix)                 | Next due / At risk / Open Filing — At risk now picks up payment-overdue rows                                                                                                                                                                          |
| Header pill priority order                    | OK (post J1 #4 fix)                 | New `filed-payment-overdue` slot inserted between `statutory-late` and `extension-payment-due`                                                                                                                                                        |
| Filing-plan year section                      | OK (post J1 #5 fix)                 | Row now carries inline "Payment 71d late" chip next to the Filed status pill                                                                                                                                                                          |
| Row → drawer                                  | OK                                  | Same row drawer as `/deadlines` queue                                                                                                                                                                                                                 |
| asOfDate vs Date.now() drift                  | **P2 — known #83 from prior audit** | ClientSummaryStrip uses `Date.now()` directly; `asOfDate` from the parent route isn't threaded down. Filing-plan row uses `Date.now()` too. Both are accurate for "right now" but break the "rewind to a specific day" workflow. Deferred as per #83. |

**Shipped for J3:** the J1 cluster (Drifts #1-#5) which all materialize here.

---

## J4 — "I need to act on this deadline right now. What's the path?"

**Walk:** Click row → drawer → status change → bulk action → result toast.

| Step                          | Time-to-action       | Status                         |
| ----------------------------- | -------------------- | ------------------------------ |
| Click row → drawer opens      | < 200ms              | OK                             |
| Status pill click → dropdown  | < 100ms              | OK — dropdown with hotkeys 1-6 |
| Pick "Filed" → mutation fires | optimistic update    | OK                             |
| Toast confirmation            | "Marked as Filed"    | OK                             |
| ShortcutHintChip on toolbar   | already shipped by υ | OK                             |

**No drift shipped for J4.** The hotkey-discoverability work landed
in agent υ's pass (commit `0f008ac3` — hotkey chips on the queue
toolbar). J4's time-to-action path is healthy.

---

## J5 — "I returned from a 1-week vacation. What changed?"

**Walk:** Login → Dashboard → "Changes since I was last here" surface
(probably doesn't exist) → Audit log → Notifications.

| Surface                            | Status                                     | Notes                                                               |
| ---------------------------------- | ------------------------------------------ | ------------------------------------------------------------------- |
| "Changes since last visit" surface | **DOES NOT EXIST**                         | New feature — deferred to wave 7                                    |
| Audit log `/audit`                 | exists, not filtered by "since last visit" | Could add a "since" preset filter — deferred                        |
| Notifications page                 | exists                                     | Marks as read on view; no "show me what's new in last 7 days" pivot |
| Pulse alerts                       | new alerts surface                         | OK — wraps a new-since-X timestamp into the alert object            |

**No drift shipped for J5.** This is a missing feature, not a drift.
Deferred to wave 7 as a "vacation digest" workstream.

---

## J6 — "Tax season ramp. 200 clients. Can I scale?"

**Walk:** Queue at high row count → bulk operations → reassignment →
filter/group-by → export.

| Step                                | Status               | Notes                                                                          |
| ----------------------------------- | -------------------- | ------------------------------------------------------------------------------ |
| Queue at 200 rows                   | OK                   | Infinite query + responsive page-size + table virtualization (already shipped) |
| Bulk-select via checkbox            | OK                   | Year-level select-all + row-level + bulk bar                                   |
| Bulk-assign                         | OK                   | Per ρ audit                                                                    |
| Filter by state / status / tax-type | OK                   | Header multi-filter; URL state via nuqs                                        |
| Group by client                     | OK — current default | One-row-per-obligation, grouped via `clientId`                                 |
| Export                              | OK (CSV per σ audit) |                                                                                |

**No drift shipped for J6.** Performance + bulk-UX is mature; the
pieces that exist read as production-grade. Filing the journey-walk
proves we'd ship to a 200-client firm.

---

## Drift inventory

| ID      | Journey | Severity | Surface                                                                                                              | Status                                |
| ------- | ------- | -------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| **D1**  | J1, J3  | P0       | `ClientSummaryStrip.isAtRisk` excluded `'done'` rows                                                                 | **SHIPPED**                           |
| **D2**  | J1      | P0       | `ClientPeekHoverCard` peek body — no payment-overdue line                                                            | **SHIPPED**                           |
| **D3**  | J1      | P0       | `ClientDetailDrawer` legacy drawer peek — no payment-overdue line                                                    | **SHIPPED**                           |
| **D4**  | J1, J3  | P0       | `ClientFactsWorkspace` header pill bottomed out at "All on track"                                                    | **SHIPPED**                           |
| **D5**  | J1, J3  | P0       | Filing-plan row — no inline "Payment Nd late" chip next to Filed pill                                                | **SHIPPED**                           |
| **D6**  | J1      | P0       | `/deadlines` queue row Status cell — no payment-overdue chip                                                         | **SHIPPED**                           |
| **D7**  | J1      | P0       | Obligation drawer header chip cluster — no Payment-overdue chip                                                      | **SHIPPED**                           |
| **D8**  | J1      | P0       | Drawer `PrimaryDeadlineStrip` compact-terminal collapse hid Payment tile when payment was overdue                    | **SHIPPED**                           |
| **D9**  | J1      | P1       | Drawer `PrimaryDeadlineStrip` full-3-tile mode used neutral surface on overdue Payment tile (only the value was red) | **SHIPPED**                           |
| **D10** | J1      | P0       | `client-detail-model.ts` work-plan summary lacked `filedPaymentOverdueCount` (model layer)                           | **SHIPPED — backs D4**                |
| **D11** | J1, J3  | P1       | At-risk subline copy: "blocked or overdue" when every at-risk row was payment-overdue specifically                   | **SHIPPED**                           |
| D12     | J1      | P1       | `DashboardTopRow` schema lacks `paymentDueDate` — dashboard can't surface this journey                               | **DEFERRED — contract change**        |
| D13     | J1      | P1       | Calendar iCal feed — should drop Filed rows but keep payment-overdue ones                                            | **DEFERRED — server scope**           |
| D14     | J1      | P2       | Audit log "missed payment deadline" event                                                                            | **DEFERRED — new feature**            |
| D15     | J1      | P2       | Notification trigger on payment-date slip                                                                            | **DEFERRED — new feature**            |
| D16     | J3      | P2       | asOfDate not threaded to ClientSummaryStrip / filing-plan rows (rewind workflow broken)                              | **DEFERRED — was #83 in prior audit** |
| D17     | J5      | P2       | "Changes since last visit" surface                                                                                   | **DEFERRED — new feature wave 7**     |
| D18     | J2      | P2       | Dashboard's 17-element above-the-fold density borderline at 60-client firms                                          | **DEFERRED — UX call, not a drift**   |

**Total shipped: 11 (D1–D11)**
**Deferred: 7 (D12–D18)** — all in either contracts, server, or new-feature scope.

---

## Files touched

- `apps/app/src/features/obligations/payment-overdue.ts` (NEW)
- `apps/app/src/features/clients/ClientSummaryStrip.tsx`
- `apps/app/src/features/clients/ClientPeekHoverCard.tsx`
- `apps/app/src/features/clients/ClientDetailDrawer.tsx`
- `apps/app/src/features/clients/ClientFactsWorkspace.tsx`
- `apps/app/src/features/clients/client-detail-model.ts`
- `apps/app/src/features/clients/client-detail-model.test.ts`
- `apps/app/src/routes/obligations.tsx`
- `apps/app/src/i18n/locales/zh-CN/messages.po`
- `apps/app/src/i18n/locales/en/messages.po`

---

## Methodology notes for future drain passes

The journey-walk methodology surfaces drift the surface × surface
matrix can't. Two design rules emerged from this pass:

1. **`status` and `paymentDueDate` are independent.** Don't conflate
   "filing leg closed" with "obligation closed." Any helper named
   `TERMINAL_STATUSES` should be scoped to one of the two legs, not
   the obligation as a whole. The exception is `'completed'` and
   `'not_applicable'`, the only statuses that close every leg.
2. **A buried signal is invisible.** Yuqi's framing — "71 days
   overdue, buried 4 layers deep" — is the right test. Every live
   signal (red tone, date-past, AI alert) must surface at the
   shallowest scan distance where the user CAN act on it. The
   filing-plan row is the shallowest payment-overdue surface; the
   row had to grow the chip.
