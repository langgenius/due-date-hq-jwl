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

// v1.5 dataset (2026-06-14, expanded via the assisted sweep). Disaster reliefs
// and FED regulatory events verified against irs.gov (HTTP 200 + JSON-LD
// datePosted for precise datelines); state DOR events verified against each
// agency newsroom. All 2026 disaster reliefs were announced before the pipeline
// went live (2026-06-01), so they seed the BACKTEST section (does the pipeline,
// post-fix, catch on the hub re-parse the HI/MS/TN events it historically
// missed?). The live section holds post-go-live items the pipeline must IGNORE
// (non-deadline IRS news) plus one live state new-obligation (IL amnesty). The
// weekly sweep grows live coverage as new declarations land; v1.5 is still
// disaster-dominated and ~38 states have zero coverage by design (see runbook).
export const RECALL_GROUND_TRUTH_EVENTS: readonly RecallGroundTruthEvent[] = [
  // ─────────── Backtest: 2026 IRS federal disaster reliefs ───────────
  {
    id: 'ga.2026.southeast-wildfires',
    title: 'IRS tax relief for Southeast Georgia wildfires; deadlines postponed to Aug. 20',
    jurisdiction: 'GA',
    expectedChangeKind: 'deadline_shift',
    announcedOn: '2026-05-06',
    officialUrls: [
      'https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-impacted-by-wildfires-in-southeast-georgia-various-deadlines-postponed-to-aug-20',
    ],
    keywords: ['ga-2026-03', 'southeast georgia wildfires', 'wildfires', 'straight-line winds'],
    expectedSourceIds: ['irs.disaster', 'irs.newsroom'],
    expectedCounties: ['Clinch', 'Echols', 'Brantley'],
    expectedNewDueDate: '2026-08-20',
    evalMode: 'backtest_only',
    origin: 'irs_disaster_page',
    addedOn: '2026-06-14',
    notes:
      'GA-2026-03 (JSON-LD datePosted 2026-05-07; body dateline May 6). Disaster began Apr 18 2026.',
  },
  {
    id: 'hi.2026.severe-storms',
    title: 'IRS tax relief for Hawaii severe storms; deadlines postponed to July 8, 2026',
    jurisdiction: 'HI',
    expectedChangeKind: 'deadline_shift',
    announcedOn: '2026-04-10',
    officialUrls: [
      'https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-impacted-by-severe-storms-in-the-state-of-hawaii-various-deadlines-postponed-to-july-8-2026',
    ],
    keywords: ['hi-2026-01', 'hawaii severe storms', 'flooding and mudslides', 'kona low'],
    expectedSourceIds: ['irs.disaster', 'irs.newsroom'],
    expectedCounties: ['Hawaii', 'Honolulu', 'Kauai', 'Maui'],
    expectedNewDueDate: '2026-07-08',
    evalMode: 'backtest_only',
    origin: 'irs_disaster_page',
    addedOn: '2026-06-14',
    notes:
      'HI-2026-01 (JSON-LD datePosted 2026-04-10). Historically MISSED (dev-log "Kona Low"). Storms began Mar 10 2026; a later Aug 20 extension may exist — sweep to confirm.',
  },
  {
    id: 'ms.2026.severe-winter-storm',
    title:
      'IRS tax relief for Mississippi severe winter storm; deadlines postponed to June 8, 2026',
    jurisdiction: 'MS',
    expectedChangeKind: 'deadline_shift',
    announcedOn: '2026-04-14',
    officialUrls: [
      'https://www.irs.gov/newsroom/irs-announces-tax-relief-for-mississippi-taxpayers-impacted-by-severe-winter-storm-various-deadlines-postponed-to-june-8-2026',
    ],
    keywords: ['ms-2026-01', 'mississippi severe winter storm', 'severe winter storm'],
    expectedSourceIds: ['irs.disaster', 'irs.newsroom'],
    expectedNewDueDate: '2026-06-08',
    evalMode: 'backtest_only',
    origin: 'irs_disaster_page',
    addedOn: '2026-06-14',
    notes:
      'MS-2026-01 (JSON-LD datePosted 2026-04-14, the all-82-county expansion). Historically MISSED. Storm began Jan 23 2026; statewide.',
  },
  {
    id: 'tn.2026.winter-storm-fern',
    title: 'IRS tax relief for Tennessee Winter Storm Fern; deadlines postponed to May 22, 2026',
    jurisdiction: 'TN',
    expectedChangeKind: 'deadline_shift',
    announcedOn: '2026-04-03',
    officialUrls: [
      'https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-impacted-by-winter-storm-fern-in-tennessee-various-deadlines-postponed-to-may-22-2026',
    ],
    keywords: ['tn-2026-01', 'winter storm fern', 'tennessee'],
    expectedSourceIds: ['irs.disaster', 'irs.newsroom'],
    expectedNewDueDate: '2026-05-22',
    evalMode: 'backtest_only',
    origin: 'irs_disaster_page',
    addedOn: '2026-06-14',
    notes:
      'TN-2026-01 (JSON-LD datePosted 2026-04-03). Storm began Jan 22 2026. An Apr 15 update expanded to all 95 counties / June 8 deadline — sweep to confirm.',
  },
  {
    id: 'la.2026.severe-winter-storms',
    title:
      'IRS tax relief for Louisiana severe winter storms; deadlines postponed to March 31, 2026',
    jurisdiction: 'LA',
    expectedChangeKind: 'deadline_shift',
    announcedOn: '2026-02-13',
    officialUrls: [
      'https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-impacted-by-severe-winter-storms-in-the-state-of-louisiana-various-deadlines-postponed-to-march-31-2026',
    ],
    keywords: ['la-2026-01', 'louisiana severe winter ice storms', 'winter ice storms'],
    expectedSourceIds: ['irs.disaster', 'irs.newsroom'],
    expectedNewDueDate: '2026-03-31',
    evalMode: 'backtest_only',
    origin: 'irs_disaster_page',
    addedOn: '2026-06-14',
    notes: 'LA-2026-01 (JSON-LD datePosted 2026-02-13). Storms began Jan 22 2026; statewide.',
  },
  {
    id: 'mt.2026.storms-flooding',
    title:
      'IRS tax relief for Montana severe storms and flooding; deadlines postponed to May 1, 2026',
    jurisdiction: 'MT',
    expectedChangeKind: 'deadline_shift',
    announcedOn: '2026-02-03',
    officialUrls: [
      'https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-impacted-by-severe-storms-and-flooding-in-the-state-of-montana-various-deadlines-postponed-to-may-1-2026',
    ],
    keywords: ['mt-2026-02', 'montana severe storms and flooding', 'flooding'],
    expectedSourceIds: ['irs.disaster', 'irs.newsroom'],
    expectedCounties: ['Blackfeet Indian Reservation', 'Lincoln', 'Sanders'],
    expectedNewDueDate: '2026-05-01',
    evalMode: 'backtest_only',
    origin: 'irs_disaster_page',
    addedOn: '2026-06-14',
    notes: 'MT-2026-02 (JSON-LD datePosted 2026-02-03). Storms/flooding began Dec 10 2025.',
  },
  {
    id: 'mp.2026.super-typhoon-sinlaku',
    title: 'IRS tax relief for CNMI Super Typhoon Sinlaku; deadlines postponed to Nov. 2, 2026',
    jurisdiction: 'FED',
    expectedChangeKind: 'deadline_shift',
    announcedOn: '2026-05-04',
    officialUrls: [
      'https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-impacted-by-super-typhoon-sinlaku-in-the-commonwealth-of-the-northern-mariana-islands-various-deadlines-postponed-to-nov-2-2026',
    ],
    keywords: ['nmi-2026-01', 'super typhoon sinlaku', 'northern mariana islands', 'cnmi'],
    expectedSourceIds: ['irs.disaster', 'irs.newsroom'],
    expectedNewDueDate: '2026-11-02',
    evalMode: 'backtest_only',
    origin: 'irs_disaster_page',
    addedOn: '2026-06-14',
    notes:
      'NMI-2026-01 (JSON-LD datePosted 2026-05-04). CNMI (territory) → mapped to FED coverage; USPS code MP not an MVP jurisdiction. Typhoon began Apr 11 2026.',
  },
  // ─────────── Backtest: FED regulatory / rights-window events ───────────
  {
    id: 'fed.2026.backup-withholding-threshold',
    title: 'Treasury/IRS proposed regs: OBBB backup-withholding threshold on third-party payments',
    jurisdiction: 'FED',
    expectedChangeKind: 'threshold_advisory',
    announcedOn: '2026-01-08',
    officialUrls: [
      'https://www.irs.gov/newsroom/treasury-irs-issue-proposed-regulations-reflecting-changes-from-the-one-big-beautiful-bill-to-the-threshold-for-backup-withholding-on-certain-payments-made-through-third-parties',
    ],
    keywords: ['ir-2026-03', 'backup withholding', '1099-k', 'one big beautiful bill'],
    expectedSourceIds: ['irs.newsroom'],
    evalMode: 'backtest_only',
    origin: 'irs_newsroom',
    addedOn: '2026-06-14',
    notes:
      'IR-2026-03. Raises the 1099-K / backup-withholding threshold ($20,000 / 200 transactions) per OBBB.',
  },
  {
    id: 'fed.2026.remittance-transfer-tax',
    title: 'Treasury/IRS proposed regs: new OBBB 1% remittance transfer excise tax',
    jurisdiction: 'FED',
    expectedChangeKind: 'new_obligation',
    announcedOn: '2026-04-10',
    officialUrls: [
      'https://www.irs.gov/newsroom/treasury-irs-issue-proposed-regulations-on-the-new-remittance-transfer-tax-established-under-the-one-big-beautiful-bill',
    ],
    keywords: ['ir-2026-48', 'remittance transfer tax', 'form 720', 'notice 2025-55'],
    expectedSourceIds: ['irs.newsroom'],
    evalMode: 'backtest_only',
    origin: 'irs_newsroom',
    addedOn: '2026-06-14',
    notes:
      'IR-2026-48. New 1% excise tax, Form 720 semimonthly deposits; companion penalty relief Notice 2025-55.',
  },
  {
    id: 'fed.2026.erc-disallowance-more-time',
    title: 'IRS: new option to request more time after an ERC claim disallowance',
    jurisdiction: 'FED',
    expectedChangeKind: 'protective_claim_window',
    announcedOn: '2026-04-27',
    officialUrls: [
      'https://www.irs.gov/newsroom/irs-announces-new-option-for-certain-taxpayers-to-request-more-time-after-erc-claim-disallowance',
    ],
    keywords: ['ir-2026-58', 'employee retention credit', 'erc disallowance', 'form 907'],
    expectedSourceIds: ['irs.newsroom'],
    expectedNewDueDate: '2026-04-27',
    evalMode: 'backtest_only',
    origin: 'irs_newsroom',
    addedOn: '2026-06-14',
    notes:
      'IR-2026-58. Extends the two-year refund-litigation window after Letter 105-C/106-C ERC disallowance.',
  },
  // ─────────── Backtest: state DOR deadline / relief events ───────────
  {
    id: 'la.2026.state-winter-storm-relief',
    title: 'Louisiana DOR: state filing/payment relief for the January winter storm',
    jurisdiction: 'LA',
    expectedChangeKind: 'deadline_shift',
    announcedOn: '2026-02-18',
    officialUrls: [
      'https://revenue.louisiana.gov/news-and-announcements/2026/state-tax-relief-available-to-louisiana-residents-affected-by-january-winter-storm/',
    ],
    keywords: ['rib 26-008', 'louisiana department of revenue', 'state tax relief', 'winter storm'],
    expectedNewDueDate: '2026-03-31',
    evalMode: 'backtest_only',
    origin: 'state_dor',
    addedOn: '2026-06-14',
    notes: 'State-side companion to la.2026.severe-winter-storms (RIB 26-008, 64 parishes).',
  },
  {
    id: 'hi.2026.state-kona-low',
    title: 'Hawaii DOT: state tax relief for the March 2026 Kona Low storm',
    jurisdiction: 'HI',
    expectedChangeKind: 'deadline_shift',
    announcedOn: '2026-04-09',
    officialUrls: ['https://tax.hawaii.gov/2026konalow/'],
    keywords: ['kona low', 'announcement no. 2026-03', 'form l-115', '2026konalow'],
    expectedNewDueDate: '2026-07-20',
    evalMode: 'backtest_only',
    origin: 'state_dor',
    addedOn: '2026-06-14',
    notes:
      'State-side companion to hi.2026.severe-storms. The 2026konalow page prints no publish date — announcedOn estimated, sweep to confirm.',
  },
  {
    id: 'sc.2026.conformity-deadline-extension',
    title: 'SCDOR extends the April 15 filing deadline for 2025 SC returns to Oct. 15',
    jurisdiction: 'SC',
    expectedChangeKind: 'deadline_shift',
    announcedOn: '2026-03-26',
    officialUrls: [
      'https://dor.sc.gov/news/scdor-statement-income-tax-conformity-april-15-filing-deadline-extended-sc-returns',
    ],
    keywords: ['h.3368', 'income tax conformity', 'october 15 2026', 'one big beautiful bill act'],
    expectedNewDueDate: '2026-10-15',
    evalMode: 'backtest_only',
    origin: 'state_dor',
    addedOn: '2026-06-14',
    notes:
      'Conformity/legislative extension (House Bill 3368), not disaster relief. SC is a golden-audit state.',
  },
  {
    id: 'wa.2026.capital-gains-due-date',
    title: 'Washington DOR: Capital Gains Excise Tax return due date moved to May 1, 2026',
    jurisdiction: 'WA',
    expectedChangeKind: 'deadline_shift',
    announcedOn: '2026-03-25',
    officialUrls: [
      'https://dor.wa.gov/about/news-releases/2026/capital-gains-excise-tax-returns-due-date-moved-may-1-2026',
    ],
    keywords: [
      'capital gains excise tax',
      'due date moved',
      'may 1 2026',
      'severe storms flooding',
    ],
    expectedNewDueDate: '2026-05-01',
    evalMode: 'backtest_only',
    origin: 'state_dor',
    addedOn: '2026-06-14',
    notes: 'WA capital-gains excise tax deadline shift (Dec 9 2025 storms).',
  },
  {
    id: 'pa.2026.ptrr-deadline',
    title: 'Pennsylvania DOR: Property Tax/Rent Rebate application deadline extended to Dec. 31',
    jurisdiction: 'PA',
    expectedChangeKind: 'deadline_shift',
    announcedOn: '2026-05-15',
    officialUrls: [
      'https://www.pa.gov/agencies/revenue/newsroom/shapiro-administration-extends-deadline-for-property-tax-rent-rebate-program-to-december-31,-2026,-allowing-more-time-for-pennsylvanians-to-apply-for-tax-relief',
    ],
    keywords: ['property tax rent rebate', 'ptrr', 'pa-1000', 'december 31 2026'],
    expectedNewDueDate: '2026-12-31',
    evalMode: 'backtest_only',
    origin: 'state_dor',
    addedOn: '2026-06-14',
    notes: 'PA PTRR program deadline extension (Shapiro administration).',
  },
  // ─────────── Live: post-go-live events ───────────
  {
    id: 'il.2026.remote-retailer-amnesty',
    title: 'Illinois DOR FY 2026-28: 2026 Remote Retailer Tax Amnesty Program',
    jurisdiction: 'IL',
    expectedChangeKind: 'new_obligation',
    announcedOn: '2026-06-08',
    officialUrls: ['https://tax.illinois.gov/research/publications/bulletins/fy-2026-28.html'],
    keywords: [
      'fy 2026-28',
      'remote retailer tax amnesty',
      'retailers occupation tax',
      'mytax illinois',
    ],
    expectedNewDueDate: '2026-08-01',
    evalMode: 'live',
    origin: 'state_dor',
    addedOn: '2026-06-14',
    notes:
      'Amnesty window Aug 1 – Oct 31 2026. Only confirmed post-go-live alerted event; dateline recent (verify) — within lag budget so it reads PENDING until 2026-06-22.',
  },
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
    addedOn: '2026-06-14',
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
    keywords: ['ir-2026-73', 'proposed regulations', 'executive compensation'],
    expectedSourceIds: ['irs.newsroom'],
    evalMode: 'live',
    expectedOutcome: 'filtered',
    origin: 'irs_newsroom',
    addedOn: '2026-06-14',
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
    addedOn: '2026-06-14',
    notes: 'Program participation news, not a filing deadline change — must not alert.',
  },
  // ─────────── Backtest: true negatives (must be ignored) ───────────
  {
    id: 'fed.2026.dirty-dozen',
    title: 'IRS Dirty Dozen tax scams for 2026 (IR-2026-30)',
    jurisdiction: 'FED',
    expectedChangeKind: 'other',
    announcedOn: '2026-03-05',
    officialUrls: [
      'https://www.irs.gov/newsroom/dirty-dozen-tax-scams-for-2026-irs-reminds-taxpayers-to-watch-out-for-dangerous-threats',
    ],
    keywords: ['ir-2026-30', 'dirty dozen', 'tax scams'],
    expectedSourceIds: ['irs.newsroom'],
    evalMode: 'backtest_only',
    expectedOutcome: 'filtered',
    origin: 'irs_newsroom',
    addedOn: '2026-06-14',
    notes: 'Fraud-awareness campaign, no deadline change — must not alert.',
  },
  {
    id: 'fed.2026.irsac-2027-applications',
    title: 'IRS requests applications for 2027 IRSAC membership (IR-2026-62)',
    jurisdiction: 'FED',
    expectedChangeKind: 'other',
    announcedOn: '2026-05-05',
    officialUrls: [
      'https://www.irs.gov/newsroom/irs-requests-applications-for-2027-irsac-membership',
    ],
    keywords: ['ir-2026-62', 'irsac', 'irs advisory council'],
    expectedSourceIds: ['irs.newsroom'],
    evalMode: 'backtest_only',
    expectedOutcome: 'filtered',
    origin: 'irs_newsroom',
    addedOn: '2026-06-14',
    notes:
      'Advisory-council membership solicitation (a program application window, not a taxpayer filing deadline) — must not alert.',
  },
  {
    id: 'tx.2026.sales-tax-holidays',
    title: 'Texas Comptroller newsroom: 2026 sales-tax holidays / Education Freedom Accounts',
    jurisdiction: 'TX',
    expectedChangeKind: 'other',
    announcedOn: '2026-04-25',
    officialUrls: ['https://comptroller.texas.gov/about/media-center/news/'],
    keywords: ['texas comptroller', 'sales tax holiday', 'education freedom accounts'],
    evalMode: 'backtest_only',
    expectedOutcome: 'filtered',
    origin: 'state_dor',
    addedOn: '2026-06-14',
    notes: 'Recurring sales-tax-holiday news, no filing-deadline change — must not alert.',
  },
  // ─────────── Backtest: deterministic threshold advisory (caught 2026-06-10) ───────────
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
    addedOn: '2026-06-14',
    notes:
      'Deterministic monitor (review_only). CAUGHT 2026-06-10 (pulse 67a52771) after the source URL fix.',
  },
]
