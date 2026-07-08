# Wave-3 CPA sourcing — "crank it" deep pass

**Date:** 2026-07-08
**Deliverable:** `duedatehq-MASTER-verified-wave3.csv` — **1,003 verified, emailable, target-user CPA contacts** across 35 states.
**Status:** hand-off only. NOT merged into the master send list, NOT sent. Your call on both.

## What this pass did
Three things, at ~40-firms-per-state depth (vs the earlier ~15-20 skim):
1. **4 new disaster-frequent states** sourced fresh: MT, NV, UT, ID.
2. **12 wave-3 tornado/disaster states deepened**: IL, IN, OH, IA, KS, NE, MN, WI, SD, ND, VA, NM (metro skim + secondary/tertiary-city deep pass).
3. **19 already-covered states deepened** into secondary/tertiary cities: FL, GA, CA, TX, NY, WA, AZ, NC, MS, AL, LA, OR, MO, OK, SC, AR, KY, TN, CO.
4. **Email-recovery pass** over the 194 firms we previously could only reach by web form / no email — recovered **53 unique real emails** (all literally published, none guessed).

35 agents for sourcing + 13 for recovery, run in rate-safe batches.

## Hard rules enforced
- **No guessed emails.** Every address was literally seen on the firm's own site or quoted verbatim in a reputable listing. Pattern-only (`j***@firm.com`) and AI-summary-only hits were rejected → left as `find manually`.
- **Deduped** against the 649-row master (688 emailable + form-only) AND internally. Dropped 7 vs master, 3 internal. Final file has **0 duplicate emails**.
- **No fabricated Fit/Notes** — disaster relevance flagged only where a firm's own site/geography supports it (several agents explicitly declined to claim disaster ties they couldn't verify).

## Target-user (ICP) fit gate — YOUR requested guardrail
Every row was gated against DueDateHQ's ideal customer: **a US CPA / CPA-solo tax-compliance practice that carries a recurring filing-deadline calendar across a book of clients.**

- **1,003 QUALIFIED** target users → the main deliverable file.
- **3 flagged for your review** (`wave3-review-fit.csv`) — surfaced, not deleted, so you decide:
  - *Welch, Couch & Company PA* (AR) — public accounting **+ wealth management** hybrid.
  - *Julie Duda CPA* (CA) — solo, IRS-resolution-leaning, no business-entity work.
  - *ProActive Tax CPA* (MT) — site says **not accepting new clients**.

Disqualifiers the gate screens for: wealth/investment/insurance-only firms, tax-resolution/1040 mills with no entity work, and "not accepting new clients."

## Files
| file | rows | what |
|---|---|---|
| `duedatehq-MASTER-verified-wave3.csv` | 1,003 | verified emailable target-user contacts (9-col schema) — the send-ready set |
| `wave3-review-fit.csv` | 3 | ICP-questionable, for your eyeball (has a ReviewReason column) |
| `wave3-form-and-manual.csv` | 265 | firms with only a web form / no findable email — reference, not emailable |

## Per-state emailable counts (qualified)
AL 19 · AR 21 · AZ 29 · CA 27 · CO 19 · FL 27 · GA 26 · IA 34 · ID 30 · IL 41 · IN 37 · KS 31 · KY 17 · LA 23 · MN 34 · MO 29 · MS 21 · MT 28 · NC 39 · ND 24 · NE 27 · NM 32 · NV 36 · NY 28 · OH 42 · OK 25 · OR 27 · SC 29 · SD 27 · TN 21 · TX 33 · UT 27 · VA 34 · WA 24 · WI 35

## Before you send
1. **Re-check against your live suppress list** — this worktree's `outreach-suppress.txt` was empty, so no bounce/opt-out filtering was applied here.
2. Decide whether to merge into `duedatehq-MASTER-verified.csv` + `duedatehq-OUTREACH-sequence.csv`, or run this as a separate wave-3 cohort.
3. The `.outreach-state.json` send record is untouched — these are all net-new, so they'll gate as fresh touch-1s.
