---
title: "Opportunities summary copy reads the row's actual signals (clarify)"
date: 2026-05-24
author: 'Claude (Yuqi pairing)'
area: opportunities
---

# Personalize opportunity summaries from facts (critique P2 — clarify)

## Why

The critique screenshot showed two different clients (Lakeview,
Arbor & Vale) each carrying a "Relationship check-in candidate" row
with the **identical** summary:

> "Repeated waiting or late-filing signals make this client worth a
> partner-level service conversation before the next cycle."

But Lakeview had `Waiting items: 0 · Late filings: 3` and Arbor had
`Waiting items: 0 · Late filings: 2`. The summary said "repeated
waiting" when waiting was zero — actively false. The CPA had to read
the evidence chips to figure out why each was on the queue.

When every row says the same thing, the feature stops earning
trust. Personalize the summary so the words match the evidence
right below them.

## What changed

### `apps/server/src/procedures/opportunities/index.ts`

Three new module-scope summary builders, one per kind:

- **`retentionCheckInSummary(waitingCount, lateFilingCount)`** —
  picks the dominant trigger. `waitingCount >= 3` → "3 obligations
  are currently waiting on this client …". `lateFilingCount >= 3` →
  "3 late filings in the last 12 months …". Two-bucket fallbacks for
  exactly-the-trigger-threshold cases. No more single boilerplate.

- **`scopeReviewSummary(openObligationCount, jurisdictionCount)`** —
  same shape. Names the actual counts, not a hand-wave at "workload
  footprint."

- **`advisoryConversationSummary({ importanceWeight, ... })`** —
  reads the importance / liability / owner-count combination and
  surfaces the dominant factor. Compliance guardrail tail
  (`DueDateHQ does not generate tax strategies or avoidance advice
here.`) factored out to a single `ADVISORY_GUARDRAIL_TAIL`
  constant so every advisory row still carries it and the existing
  test assertion (`opportunities[2]?.summary` contains "does not
  generate tax strategies") still passes.

The `summary:` field on each opportunity now calls into the
appropriate builder instead of using a static string.

## How to verify

`/opportunities` with the demo seed:

| Client                   | Old summary                                                                                                                                  | New summary                                                                                                   |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Lakeview                 | "Repeated waiting or late-filing signals make this client worth a partner-level service conversation before the next cycle."                 | "3 late filings in the last 12 months. A scope or service conversation is more useful than another reminder." |
| Arbor & Vale (retention) | same as above (identical)                                                                                                                    | "2 late filings in the last 12 months. Surface the pattern before the next cycle."                            |
| Arbor & Vale (scope)     | "The current workload footprint suggests a scope, staffing, or service-package review. This is a conversation cue, not a pricing benchmark." | "Workload spans 2 jurisdictions and 2 open obligations. Worth a scope check before renewal."                  |

## Out of scope — Dismiss / Snooze

The critique also flagged: _"there's no Dismiss action — only 'Open
client'. If you reject an opportunity, it stays forever."_

Adding Dismiss / Snooze is genuinely deferred-scope here because
opportunities are **computed**, not stored — they're derived from
the current state of clients + obligations on each `opportunities.
list` call. A meaningful Dismiss would need either:

- A new `opportunity_dismissal` table keyed by `(firmId,
opportunityId)` with an optional TTL (snooze = until date,
  dismiss = forever or until evidence changes). Plus the list
  handler joining against it. New DB migration, new contract, new
  mutation.
- Or a localStorage-only soft-dismiss that doesn't sync across
  devices and gets cleared on cache resets.

Neither fits inside a `/clarify` pass. Track as a future `/shape`
task — "Opportunities dismissal model."

## Files touched

- M `apps/server/src/procedures/opportunities/index.ts`
