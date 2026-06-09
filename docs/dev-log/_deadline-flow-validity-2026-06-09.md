# Deadline-flow validity audit, 2026-06-09

**Purpose:** Every datum on the Pencil designs for the deadline lifecycle must trace to a real backend capability OR be explicitly tagged NET-NEW with an eng-brief follow-up. This doc captures the audit + fixes shipped in the 2026-06-09 polish pass.

**Companion**: `feedback_no_fiction_on_canvas` memory (the principle) + `reference_data_consistency_contract` (the mock-data registry).

## Scope: deadline-flow surfaces

The validity contract applies to every Pencil frame in the deadline lifecycle:

| Surface                     | Pencil frames                                                                   |
| --------------------------- | ------------------------------------------------------------------------------- |
| `/deadlines` list           | `MF9jE`, `HuYeb`, `gdrPF`, OVERDUE TIMELINE `OOEeZ`                             |
| `/deadlines/[id]` Status    | `csTbj` workflow card, `UlSXb` strip, `MWhnh` active card, qI2Et blocking panel |
| `/deadlines/[id]` Materials | `rzzww`, `JMgJf` C-Received, `HThur`, `DeZE3`, `g8Bna2`                         |
| `/deadlines/[id]` Record    | `WYh19` body                                                                    |
| `/deadlines/[id]` Audit     | `K4Go6X`, `ZCiJY` body, `o3tcn` Activity timeline                               |
| `/alerts/[id]` apply panel  | `ibEoz` Affects-status band + Linked-deadline row pill + Resolve action         |

## Fictions identified and fixed (this pass)

### `/deadlines` list (MF9jE)

| Was (FICTION)                                         | Now (REAL)                     | Reason                     |
| ----------------------------------------------------- | ------------------------------ | -------------------------- |
| `$1,840 penalty exposure`                             | `24 days late`                 | No penalty engine          |
| `est. 1h 40m focus across the three`                  | `Mar 12-15 internal targets`   | No time estimation         |
| `2 evidence, 2 e-sign` breakdown                      | `review the rejection details` | No e-signature integration |
| `≈3 hours focus today`                                | `8 need attention today`       | No time estimation         |
| `$4,210 cumulative exposure` on OVERDUE TIMELINE meta | `4 over 7 days`                | No penalty engine          |

### `/deadlines/[id]` Status tab (MWhnh + csTbj)

| Was (FICTION)                                     | Now (REAL)                                               |
| ------------------------------------------------- | -------------------------------------------------------- |
| Any `~Nd projected to unlock` chip                | Deleted entirely (user banned 2026-06-09)                |
| `K-1 from Lakeside is the holdout.` headline      | `8 materials still outstanding.` (count-only)            |
| `auto-reminds every 3 days` SystemMeta            | `last reminded Apr 7 via client portal` (REAL audit log) |
| Top-blocker `K-1 Lakeside longest 7d` specificity | Generic count `6 of 14 · 8 outstanding`                  |

### Record + Audit tabs (WYh19 + K4Go6X)

| Was (FICTION)                                            | Now (REAL)                                       |
| -------------------------------------------------------- | ------------------------------------------------ |
| `View signed 8879` / `Download workpaper` / file preview | Removed; honesty banner explains storage gap     |
| Black source chips on audit events                       | Light state-hover bg + chromatic text per source |
| `Generating bundle... 60%` progress streaming            | Disabled CTA + `ready in ~Ns` text from job poll |

## NET-NEW items that ARE allowed (logged in eng brief)

These are not fiction — they're contract additions explicitly logged in `_eng-brief-2026-06-09-v1-v2-ship-plan.md`:

1. `markAllReceivedForObligation(obligationId)` — bulk receive mutation for Waiting on client `Mark received` ghost
2. `markWaivedForObligation(obligationId)` — for Blocked stage `Mark waived` ghost
3. `obligations.timeInStageAnalytics()` — for v2 analytics chart
4. `obligations.weeklyDigest()` cron — for v2 digest email
5. IRS ACK webhook + `efileSubmissionId` field — for v2 auto-completion
6. E-signature integration — for v2 In review primary CTA
7. File storage primitive (R2 bucket + `attachments[]` schema + 5 endpoints) — for full Record tab
8. `auditEvent.source` field (User/System/Partner/External) — for the source chip on transition rows
9. Per-firm SLA threshold setting — for `Waiting on client > Nd` SLA flagging

Each is cited with mutation signature and effort estimate in the eng brief.

## What this validity contract refuses to ship

- A frame with un-tagged fiction
- "Placeholder copy" that looks like real data (mock data must come from the hudson-1040 registry in `reference_data_consistency_contract`)
- Dollar amounts before the penalty engine ships
- Time-estimation copy before the estimation model ships
- File-access affordances before the storage primitive ships
- Auto-reminder cadence claims before the scheduler ships
- Top-blocker specificity (`{name} is the holdout`) before the `daysOutstanding` sort ships

If a future session reintroduces any of these, the `feedback_no_fiction_on_canvas` memory's banned list catches it.

## How to use this doc going forward

When engineering picks up a Pencil frame to implement:

1. Read this doc first
2. If the frame has any element that's not in the REAL column above, check if it's listed in NET-NEW (allowed) or banned (refuse to implement; flag to design)
3. Refuse silently filling in fictional values — if the data doesn't exist, the UI should show an empty state, not a fake value
4. The mock data values in Pencil (Hudson Industries, 8 outstanding, Apr 15 deadline, etc.) come from `reference_data_consistency_contract`; engineering binds to real obligations data and the values flow naturally

## Workflow audit still running

A parallel Workflow audit is auditing every text node in the deadline-flow surfaces in detail. When it returns, any remaining fictions get added to the table above as follow-up fixes. The principle and the banned list are locked regardless.

## Related

- Memory `feedback_no_fiction_on_canvas` — the principle
- Memory `reference_data_consistency_contract` — mock data registry
- Memory `reference_record_tab_storage_gap` — storage gap details
- Brief `_eng-brief-2026-06-09-v1-v2-ship-plan.md` — NET-NEW mutations engineering must ship
- Brief `_eng-brief-2026-06-09-status-bus-and-integrations.md` — 18-touchpoint catalog with REAL/NET-NEW per surface
