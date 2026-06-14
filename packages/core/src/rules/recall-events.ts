import type { RuleJurisdiction } from './index'

// Ground-truth registry for the alert-recall evaluation. Each entry is a real,
// independently-verified tax policy change event (deadline extension, disaster
// relief, threshold change). The recall evaluator (apps/server, out of band)
// matches these against what the pulse pipeline actually captured to measure
// recall — "正确监听" is only a claim a CPA can rely on if something counts the
// misses. This dataset is the SOURCE OF TRUTH and is curated by PR (weekly
// assisted sweep — see docs/ops/alert-recall-curation.md), never derived from
// the pipeline itself (that would let blind spots self-confirm).

// Mirrors a subset of PULSE_CHANGE_KINDS in @duedatehq/db. NOT imported (core
// must not depend on db); recall-events.test.ts in apps/server asserts this
// union stays a subset of the real enum.
export type RecallExpectedChangeKind =
  | 'deadline_shift'
  | 'filing_requirement'
  | 'applicability_scope'
  | 'form_instruction'
  | 'new_obligation'
  | 'protective_claim_window'
  | 'threshold_advisory'
  | 'other'

export type RecallEventOrigin =
  | 'irs_newsroom'
  | 'irs_disaster_page'
  | 'state_dor'
  | 'fema_cross_check'
  | 'aicpa_tracker'
  | 'manual'

export interface RecallGroundTruthEvent {
  /** Stable unique id, `jur.year.slug`. */
  id: string
  title: string
  /** Jurisdiction the relief/change APPLIES to (IRS relief for CA wildfire victims → CA). */
  jurisdiction: RuleJurisdiction
  expectedChangeKind: RecallExpectedChangeKind
  /** ISO date from the agency's own dateline, NOT the discovery date. */
  announcedOn: string
  /** Official agency announcement URLs (≥1), each an absolute https URL. */
  officialUrls: readonly string[]
  /** Lowercase distinctive match terms: disaster name, IR/notice number. ≥2, ≥1 near-unique. */
  keywords: readonly string[]
  /** Registry source(s) that SHOULD publish it, when known — overrides jurisdiction→coverage lookup. */
  expectedSourceIds?: readonly string[]
  expectedForms?: readonly string[]
  expectedCounties?: readonly string[]
  /** ISO date of the postponed deadline, if the announcement states one. */
  expectedNewDueDate?: string
  /** Days from announcedOn within which a catch counts toward headline recall. */
  lagBudgetDays?: number
  /**
   * `live` — measured in headline recall.
   * `backtest_only` — announced before the pipeline went live (or a historical
   * miss); attributed in a separate section, never in the headline number.
   */
  evalMode: 'live' | 'backtest_only'
  /**
   * `alerted` (default) — a real change the pipeline must surface.
   * `filtered` — a TRUE NEGATIVE the pipeline must deliberately ignore (grant
   * deadline, restatement, non-tax news); inverts pass/fail.
   */
  expectedOutcome?: 'alerted' | 'filtered'
  origin: RecallEventOrigin
  /** ISO date this row was added/last verified. */
  addedOn: string
  notes?: string
}

export const RECALL_LAG_BUDGET_DEFAULT_DAYS = 14
/** Pulse pipeline reached production; events before this can't have a fair lag. */
export const PIPELINE_LIVE_SINCE = '2026-06-01'

// v1 seed (2026-06-11). Disaster reliefs verified against the IRS disaster-relief
// hub (irs.gov/newsroom/tax-relief-in-disaster-situations) — real IR-numbers,
// headlines, URLs and postponed deadlines. All current 2026 disaster reliefs were
// announced before 2026-06-01, so they seed the BACKTEST section (does the pipeline,
// post-fix, catch on the hub re-parse the HI/MS/TN events it historically missed?).
// The live section is seeded with three post-go-live IRS releases that are NOT tax
// deadline changes — true negatives the pipeline must ignore. The weekly sweep grows
// the live section as new disaster declarations land (most announcedOn dates below
// other than GA are estimates flagged for sweep verification).
export const RECALL_GROUND_TRUTH_EVENTS: readonly RecallGroundTruthEvent[] = [
  // ── Backtest: 2026 IRS disaster reliefs (all on the live hub page) ──
  {
    id: 'ga.2026.southeast-wildfires',
    title: 'IRS tax relief for Southeast Georgia wildfires; deadlines postponed to Aug. 20',
    jurisdiction: 'GA',
    expectedChangeKind: 'deadline_shift',
    announcedOn: '2026-05-06',
    officialUrls: [
      'https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-impacted-by-wildfires-in-southeast-georgia-various-deadlines-postponed-to-aug-20',
    ],
    keywords: ['ga-2026-03', 'southeast georgia', 'wildfires', 'postponed to aug'],
    expectedSourceIds: ['irs.disaster', 'irs.newsroom'],
    expectedCounties: ['Clinch', 'Echols', 'Brantley'],
    expectedNewDueDate: '2026-08-20',
    evalMode: 'backtest_only',
    origin: 'irs_disaster_page',
    addedOn: '2026-06-11',
    notes:
      'Dateline GA-2026-03, May 6, 2026 (confirmed). Relief covers deadlines on/after Apr 18, 2026.',
  },
  {
    id: 'hi.2026.severe-storms',
    title: 'IRS tax relief for Hawaii severe storms; deadlines postponed to July 8, 2026',
    jurisdiction: 'HI',
    expectedChangeKind: 'deadline_shift',
    announcedOn: '2026-04-20',
    officialUrls: [
      'https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-impacted-by-severe-storms-in-the-state-of-hawaii-various-deadlines-postponed-to-july-8-2026',
    ],
    keywords: ['hi-2026-01', 'hawaii', 'severe storms', 'kona low', 'postponed to july 8'],
    expectedSourceIds: ['irs.disaster', 'irs.newsroom'],
    expectedNewDueDate: '2026-07-08',
    evalMode: 'backtest_only',
    origin: 'irs_disaster_page',
    addedOn: '2026-06-11',
    notes:
      'Historically MISSED (dev-log "Kona Low"). announcedOn estimated — sweep to confirm dateline.',
  },
  {
    id: 'ms.2026.severe-winter-storm',
    title:
      'IRS tax relief for Mississippi severe winter storm; deadlines postponed to June 8, 2026',
    jurisdiction: 'MS',
    expectedChangeKind: 'deadline_shift',
    announcedOn: '2026-03-15',
    officialUrls: [
      'https://www.irs.gov/newsroom/irs-announces-tax-relief-for-mississippi-taxpayers-impacted-by-severe-winter-storm-various-deadlines-postponed-to-june-8-2026',
    ],
    keywords: ['ms-2026-01', 'mississippi', 'severe winter storm', 'postponed to june 8'],
    expectedSourceIds: ['irs.disaster', 'irs.newsroom'],
    expectedNewDueDate: '2026-06-08',
    evalMode: 'backtest_only',
    origin: 'irs_disaster_page',
    addedOn: '2026-06-11',
    notes: 'Historically MISSED (dev-log). announcedOn estimated — sweep to confirm dateline.',
  },
  {
    id: 'tn.2026.winter-storm-fern',
    title: 'IRS tax relief for Tennessee Winter Storm Fern; deadlines postponed to May 22, 2026',
    jurisdiction: 'TN',
    expectedChangeKind: 'deadline_shift',
    announcedOn: '2026-02-05',
    officialUrls: [
      'https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-impacted-by-winter-storm-fern-in-tennessee-various-deadlines-postponed-to-may-22-2026',
    ],
    keywords: ['tn-2026-01', 'tennessee', 'winter storm fern', 'postponed to may 22'],
    expectedSourceIds: ['irs.disaster', 'irs.newsroom'],
    expectedNewDueDate: '2026-05-22',
    evalMode: 'backtest_only',
    origin: 'irs_disaster_page',
    addedOn: '2026-06-11',
    notes: 'Winter Storm Fern began Jan 22, 2026. Historically referenced. announcedOn estimated.',
  },
  {
    id: 'la.2026.severe-winter-storms',
    title:
      'IRS tax relief for Louisiana severe winter storms; deadlines postponed to March 31, 2026',
    jurisdiction: 'LA',
    expectedChangeKind: 'deadline_shift',
    announcedOn: '2026-01-15',
    officialUrls: [
      'https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-impacted-by-severe-winter-storms-in-the-state-of-louisiana-various-deadlines-postponed-to-march-31-2026',
    ],
    keywords: ['la-2026-01', 'louisiana', 'severe winter storms', 'postponed to march 31'],
    expectedSourceIds: ['irs.disaster', 'irs.newsroom'],
    expectedNewDueDate: '2026-03-31',
    evalMode: 'backtest_only',
    origin: 'irs_disaster_page',
    addedOn: '2026-06-11',
    notes: 'announcedOn estimated — sweep to confirm dateline.',
  },
  {
    id: 'mt.2026.storms-flooding',
    title:
      'IRS tax relief for Montana severe storms and flooding; deadlines postponed to May 1, 2026',
    jurisdiction: 'MT',
    expectedChangeKind: 'deadline_shift',
    announcedOn: '2026-03-01',
    officialUrls: [
      'https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-impacted-by-severe-storms-and-flooding-in-the-state-of-montana-various-deadlines-postponed-to-may-1-2026',
    ],
    keywords: ['mt-2026-02', 'montana', 'storms and flooding', 'postponed to may 1'],
    expectedSourceIds: ['irs.disaster', 'irs.newsroom'],
    expectedNewDueDate: '2026-05-01',
    evalMode: 'backtest_only',
    origin: 'irs_disaster_page',
    addedOn: '2026-06-11',
    notes: 'announcedOn estimated — sweep to confirm dateline.',
  },
  {
    id: 'mp.2026.super-typhoon-sinlaku',
    title: 'IRS tax relief for CNMI Super Typhoon Sinlaku; deadlines postponed to Nov. 2, 2026',
    jurisdiction: 'FED',
    expectedChangeKind: 'deadline_shift',
    announcedOn: '2026-05-20',
    officialUrls: [
      'https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-impacted-by-super-typhoon-sinlaku-in-the-commonwealth-of-the-northern-mariana-islands-various-deadlines-postponed-to-nov-2-2026',
    ],
    keywords: [
      'nmi-2026-01',
      'super typhoon sinlaku',
      'northern mariana islands',
      'postponed to nov 2',
    ],
    expectedSourceIds: ['irs.disaster', 'irs.newsroom'],
    expectedNewDueDate: '2026-11-02',
    evalMode: 'backtest_only',
    origin: 'irs_disaster_page',
    addedOn: '2026-06-11',
    notes:
      'CNMI has no MVP state jurisdiction → mapped to FED coverage. announcedOn estimated; may be post-go-live — sweep to confirm and reclassify to live if so.',
  },
  // ── Live: post-go-live IRS releases that are NOT deadline changes (true negatives) ──
  {
    id: 'fed.2026.free-file-reminder',
    title: 'IRS Free File reminder (IR-2026-71)',
    jurisdiction: 'FED',
    expectedChangeKind: 'other',
    announcedOn: '2026-06-02',
    officialUrls: ['https://www.irs.gov/newsroom/its-not-too-late-use-irs-free-file-today'],
    keywords: ['ir-2026-71', 'free file'],
    expectedSourceIds: ['irs.newsroom'],
    evalMode: 'live',
    expectedOutcome: 'filtered',
    origin: 'irs_newsroom',
    addedOn: '2026-06-11',
    notes: 'Restatement/reminder, no deadline change — pipeline must NOT mint a deadline alert.',
  },
  {
    id: 'fed.2026.execcomp-proposed-regs',
    title:
      'Treasury/IRS intent to propose excise-tax regs on excess exec compensation (IR-2026-73)',
    jurisdiction: 'FED',
    expectedChangeKind: 'other',
    announcedOn: '2026-06-05',
    officialUrls: [
      'https://www.irs.gov/newsroom/treasury-irs-announce-intent-to-issue-proposed-regulations-for-excise-tax-on-excess-tax-exempt-organization-executive-compensation',
    ],
    keywords: ['ir-2026-73', 'proposed regulations', 'excise tax', 'executive compensation'],
    expectedSourceIds: ['irs.newsroom'],
    evalMode: 'live',
    expectedOutcome: 'filtered',
    origin: 'irs_newsroom',
    addedOn: '2026-06-11',
    notes:
      'Intent to issue proposed regs — not yet an actionable filing obligation; must not alert.',
  },
  {
    id: 'fed.2026.scholarship-credit-program',
    title: 'States signing up for the federal scholarship tax credit program (IR-2026-76)',
    jurisdiction: 'FED',
    expectedChangeKind: 'other',
    announcedOn: '2026-06-08',
    officialUrls: [
      'https://www.irs.gov/newsroom/more-than-half-the-us-states-signed-up-to-participate-in-the-federal-scholarship-tax-credit-program',
    ],
    keywords: ['ir-2026-76', 'scholarship tax credit'],
    expectedSourceIds: ['irs.newsroom'],
    evalMode: 'live',
    expectedOutcome: 'filtered',
    origin: 'irs_newsroom',
    addedOn: '2026-06-11',
    notes: 'Program participation news, not a filing deadline change — must not alert.',
  },
  // ── Backtest: deterministic threshold advisory (caught 2026-06-10) ──
  {
    id: 'fed.2026.inflation-adjustments',
    title: 'IRS 2026 inflation adjustments (incl. OBBB amendments) — threshold advisory',
    jurisdiction: 'FED',
    expectedChangeKind: 'threshold_advisory',
    announcedOn: '2026-06-10',
    officialUrls: [
      'https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill',
    ],
    keywords: ['inflation adjustments', 'tax year 2026', 'one big beautiful bill', 'obbb'],
    expectedSourceIds: ['fed.irs_inflation_adjustments_2026'],
    lagBudgetDays: 60,
    evalMode: 'backtest_only',
    expectedOutcome: 'alerted',
    origin: 'irs_newsroom',
    addedOn: '2026-06-11',
    notes:
      'Deterministic monitor (review_only). CAUGHT 2026-06-10 (pulse 67a52771) after the source URL fix; lag is monitor-driven, not breaking-news.',
  },
]
