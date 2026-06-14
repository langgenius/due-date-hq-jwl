# Alert recall ground-truth curation

The alert-recall scorecard measures whether the pulse pipeline actually catches
real tax policy change events. It can only do that against an **independent**
list of real events — the ground-truth dataset in
[`packages/core/src/rules/recall-events.ts`](../../packages/core/src/rules/recall-events.ts).
The dataset must never be derived from the pipeline's own output, or blind spots
would self-confirm. It grows by PR — this runbook is the weekly procedure.

## How the pieces fit

- **Dataset** — `RECALL_GROUND_TRUTH_EVENTS` (typed, hand-curated, PR-reviewed).
- **Evaluator** — `apps/server/src/jobs/pulse/recall-eval.ts` (pure matcher).
- **CLI** — `scripts/eval-alert-recall.ts` (`vp run pulse:eval-recall`); reads
  remote staging D1 + the golden-audit KV blob; `--json out.json`, `--dry-run`,
  `--window-start <iso>`, `--threshold <0..1>`.
- **Workflow** — `.github/workflows/alert-recall.yml` (Mon 11:17 UTC); upserts the
  permanently-open **Alert 监听质量周报** issue (label `alert-quality-weekly`),
  folding in the golden-set audit (ingestion completeness) and rule-source health.

`live` events count toward headline recall. `backtest_only` events (announced
before the pipeline went live, `2026-06-01`, or known historical misses) are
attributed in a separate section and never in the headline number.
`expectedOutcome: 'filtered'` events are TRUE NEGATIVES the pipeline must ignore.

## Weekly sweep (≈15–20 min, then a PR)

Each Monday, sweep the current week's official sources for new events and open a
PR adding rows. **Every event needs an official `.gov` URL you actually opened**,
the agency's own dateline as `announcedOn` (not today), and ≥2 lowercase keywords
(≥1 near-unique: an IR/notice number or a disaster name).

1. **IRS disaster hub** — <https://www.irs.gov/newsroom/tax-relief-in-disaster-situations>.
   New entries since last sweep → one row each. Open the linked state release for
   the dateline, IR-number, postponed deadline, and counties.
   `origin: 'irs_disaster_page'`, `expectedSourceIds: ['irs.disaster','irs.newsroom']`.
2. **IRS newsroom** — <https://www.irs.gov/newsroom/news-releases-for-current-month>.
   Non-disaster events: e-file/outage relief, form-instruction changes, threshold
   advisories. Also pick up 1–2 **true negatives** (non-deadline news: Free File
   reminders, "intent to propose regs", program announcements) →
   `expectedOutcome: 'filtered'`.
3. **FEMA cross-check** — <https://www.fema.gov/disaster/declarations> (2026, Major
   Disaster). Declarations without IRS relief yet → note in the PR description as a
   watch item (IRS relief reliably follows); don't add a row until the IRS release
   exists.
4. **State DORs** — priority: states with a fresh FEMA declaration + the golden-set
   states (GA, SC, CA, NY) + historical-miss states (HI, MS, TN, AZ). A state's own
   conformity announcement is a **separate** event row from the IRS one
   (`origin: 'state_dor'`).
5. **Secondary trackers** (discovery only, never as `officialUrls`): AICPA state
   disaster-relief tracker, FTA (taxadmin.org). Everything must resolve to an
   official agency URL before entry.

Then: edit `recall-events.ts`, run `cd apps/server && npx vitest run
src/jobs/pulse/recall-events.test.ts` (enforces id uniqueness, ISO dates, official
hosts, ≥2 keywords, change-kind ∈ enum, and a **non-empty managed covering source
set** for every event), and open the PR. The PR review is the quality gate.

The scorecard emits a "GT curation stale" warning if the newest `addedOn` is >21
days old, and the CLI exits non-zero (bit 2) past 35 days — so a skipped sweep
surfaces instead of silently rotting the denominator.

## Assisted sweep — Claude prompt template

Paste into a fresh Claude Code session (it has WebFetch):

> Curate ground-truth tax policy change events for the alert-recall dataset.
> Today is `<DATE>`. For the window `<LAST_SWEEP_DATE>`..today, sweep:
> (1) <https://www.irs.gov/newsroom/tax-relief-in-disaster-situations> — every new
> 2026 disaster-relief entry; open each state release for its dateline, IR-number,
> postponed deadline, counties;
> (2) <https://www.irs.gov/newsroom/news-releases-for-current-month> — non-disaster
> deadline/threshold changes, plus 1–2 non-deadline releases as `filtered` true
> negatives;
> (3) state DOR newsrooms for GA, SC, CA, NY, HI, MS, TN, AZ.
> For each event verify the official `.gov` URL returns 200 and record: title,
> jurisdiction the relief APPLIES to, expectedChangeKind, announcedOn (page
> dateline), officialUrls, ≥2 lowercase keywords (≥1 the IR-number or disaster
> name), expectedNewDueDate, expectedCounties. Mark events announced before
> 2026-06-01 as `backtest_only`. Output ready-to-paste `RecallGroundTruthEvent` TS
> objects matching `packages/core/src/rules/recall-events.ts`, then open a PR.

## Reading the scorecard

- **Headline recall@budget** — share of countable `live` `alerted` events caught
  (approved or in-review) within the lag budget. `0/0` early on is expected: the
  pipeline went live `2026-06-01`, so most disaster events are `backtest_only` and
  the live section is seeded with true negatives until new declarations land.
- **Backtest caught** — did the pipeline (post-fix) catch the events it
  historically missed (HI/MS/TN)? This is the regression signal.
- **Missed/flagged table** — each row carries `failureReason` + `snapshot` id so you
  can audit the GT entry first, then the pipeline. `confirmed_by_golden_audit` on a
  `MISSED_NOT_PARSED` row = the golden audit independently saw the same ingestion
  gap (high-confidence, fix first).
- **MISSED_FILTERED with `monitoring_baseline_established` / `historical_policy_dates`**
  is usually correct pipeline behavior (baseline window, or an expired relief past
  the rolling floor), not a true miss — judge per row.
