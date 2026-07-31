/**
 * state-w2-rows.ts — the ONE source of truth for /w2-filing-deadlines
 * (state W-2 filing / annual withholding reconciliation, B3a of the matrix).
 *
 * DATA INTEGRITY — hard red line (same contract as state-tax-rows.ts).
 * B3a batch, verified 2026-07-31 via the two-pass pipeline: 12 states, each
 * independently transcribed twice from the official agency page cited in
 * `sourceHref`, diffed; only agreeing facts kept. Washington's surprising cell
 * (the DOR page no longer says "no income tax") was additionally third-pass
 * fetched and grounded against leg.wa.gov (ESSB 6346, Chapter 238, Laws of
 * 2026, signed 2026-03-30). Single-pass extras (OH's IT 941 detail) were not
 * published. Re-verify against the cited URL before editing.
 */

export interface StateW2Row {
  /** Matches the /states/[slug] page for cross-linking. */
  stateSlug: string
  state: string
  /** Official form/return name, or the "none required" framing. */
  label: string
  labelZh: string
  due: string
  dueZh: string
  /** The nuance a CPA must not miss. */
  note?: string
  noteZh?: string
  sourceLabel: string
  sourceHref: string
}

export const STATE_W2_ROWS_VERIFIED_ON = '2026-07-31'

export const STATE_W2_ROWS: StateW2Row[] = [
  {
    stateSlug: 'pennsylvania',
    state: 'Pennsylvania',
    label: 'REV-1667 annual reconciliation + W-2s',
    labelZh: 'REV-1667 年度对账 + W-2',
    due: 'January 31 — the REV-1667 Annual Withholding Reconciliation Statement, with W-2 copies filed electronically alongside it through myPATH.',
    dueZh: '1 月 31 日——REV-1667 年度预扣对账表，W-2 副本经 myPATH 随表电子提交。',
    sourceLabel: 'PA Department of Revenue — W-2 Electronic Filing Requirement',
    sourceHref:
      'https://www.pa.gov/agencies/revenue/resources/tax-types-and-information/employer-withholding/w-2-electronic-filing-requirement',
  },
  {
    stateSlug: 'illinois',
    state: 'Illinois',
    label: 'W-2 electronic transmittal (no annual reconciliation)',
    labelZh: 'W-2 电子传送（无年度对账表）',
    due: 'January 31 of the following year. Electronic filing is mandatory — IDOR does not accept mailed W-2s. There is no separate annual reconciliation; ongoing withholding rides on Form IL-941.',
    dueZh:
      '次年 1 月 31 日。强制电子申报——IDOR 不接受邮寄 W-2。无单独年度对账表；日常预扣走 IL-941。',
    sourceLabel: 'Illinois DOR — Electronic W-2 and 1099 Transmittal Programs',
    sourceHref: 'https://tax.illinois.gov/programs/electronicservices/1099w2.html',
  },
  {
    stateSlug: 'georgia',
    state: 'Georgia',
    label: 'Form G-1003 + W-2s',
    labelZh: 'Form G-1003 + W-2',
    due: 'January 31 for W-2s and 1099-NEC filed with Form G-1003; all other 1099 income statements are due February 28.',
    dueZh: 'W-2 与 1099-NEC 随 G-1003 于 1 月 31 日前提交；其他 1099 为 2 月 28 日。',
    note: 'Late statements draw per-statement penalties in $10/$20/$50 tiers by lateness.',
    noteZh: '逾期按每份 $10/$20/$50 分档罚。',
    sourceLabel: 'Georgia DOR — G-1003 Withholding Income Statement Return (instructions)',
    sourceHref:
      'https://dor.georgia.gov/document/document/2025-g-1003-withholding-income-statement-returnpdf/download',
  },
  {
    stateSlug: 'north-carolina',
    state: 'North Carolina',
    label: 'Form NC-3 + W-2/1099 statements',
    labelZh: 'Form NC-3 + W-2/1099',
    due: 'January 31 of the following calendar year — NC-3 and the W-2/1099 statements filed together electronically via the eNC3 application.',
    dueZh: '次年 1 月 31 日——NC-3 与 W-2/1099 一并经 eNC3 电子提交。',
    note: 'The e-file mandate has teeth: $200 penalty for filing in the wrong format, plus $50 per day (max $1,000) for late filing.',
    noteZh: '电子申报强制且有牙齿：格式不符罚 $200，逾期每日 $50（上限 $1,000）。',
    sourceLabel: 'NCDOR — eNC3 Frequently Asked Questions',
    sourceHref: 'https://www.ncdor.gov/taxes-forms/withholding-tax/enc3-frequently-asked-questions',
  },
  {
    stateSlug: 'ohio',
    state: 'Ohio',
    label: 'W-2/1099 upload + IT 3 transmittal',
    labelZh: 'W-2/1099 上传 + IT 3 传送表',
    due: 'January 31 of the following year. All employers upload W-2/1099 information electronically through OH|TAX eServices; the upload creates the IT 3 automatically, so no paper transmittal is filed.',
    dueZh:
      '次年 1 月 31 日。所有雇主经 OH|TAX eServices 电子上传 W-2/1099；上传自动生成 IT 3，无需纸质传送表。',
    sourceLabel: 'Ohio Department of Taxation — Employer Withholding',
    sourceHref: 'https://tax.ohio.gov/business/employer-withholding',
  },
  {
    stateSlug: 'michigan',
    state: 'Michigan',
    label: 'State W-2 copies (+ Form 5081 separately)',
    labelZh: '州 W-2 副本（Form 5081 另算）',
    due: 'W-2s are due January 31 — NOT February 28. The Form 5081 SUW annual return is due February 28, but W-2s do not accompany it; no transmittal or reconciliation form is sent with the income record forms.',
    dueZh:
      'W-2 为 1 月 31 日——不是 2 月 28 日。Form 5081 年度申报为 2 月 28 日，但 W-2 不随它提交；提交 W-2 亦无需任何传送/对账表。',
    note: 'Issuers of 10 or more income record forms must file electronically via Michigan Treasury Online. Several 1099 types (MISC/K/R/DA) run later: Feb 28 paper / Mar 31 electronic.',
    noteZh:
      '开具 10 份及以上者须经 Michigan Treasury Online 电子申报。1099-MISC/K/R/DA 更晚：纸质 2 月 28 日 / 电子 3 月 31 日。',
    sourceLabel: 'Michigan Treasury — Income Record Form Remittance Guide',
    sourceHref:
      'https://www.michigan.gov/taxes/business-taxes/incomestatement/income-record-form-remittance-guide',
  },
  {
    stateSlug: 'new-jersey',
    state: 'New Jersey',
    label: 'Form NJ-W-3 + W-2s',
    labelZh: 'Form NJ-W-3 + W-2',
    due: 'February 15 — later than the January 31 norm. Electronic filing is mandatory for all year-end filings (NJ-W-3, W-2, 1099); paper is not accepted.',
    dueZh:
      '2 月 15 日——晚于常见的 1 月 31 日。所有年终申报（NJ-W-3、W-2、1099）强制电子提交，不收纸质。',
    note: 'Registered employers must file even if no wages were paid; on business closure, NJ-W-3 is due within 30 days.',
    noteZh: '已注册雇主即使未发工资也须申报；歇业后 30 天内须交 NJ-W-3。',
    sourceLabel: 'NJ Division of Taxation — Reconciling Tax Withheld With Form NJ-W-3',
    sourceHref: 'https://www.nj.gov/treasury/taxation/njit34.shtml',
  },
  {
    stateSlug: 'california',
    state: 'California',
    label: 'No state W-2 filing (quarterly DE 9/DE 9C instead)',
    labelZh: '无州级 W-2 提交（改为季度 DE 9/DE 9C）',
    due: 'None — the EDD Employer’s Guide (DE 44) states W-2s are not filed with the state. Wage detail is reported quarterly on DE 9/DE 9C, delinquent after April 30, July 31, early November, and February 1.',
    dueZh:
      '无——EDD 雇主指南（DE 44）明确 W-2 不向州提交。工资明细按季度经 DE 9/DE 9C 申报，逾期线为 4/30、7/31、11 月初、2/1。',
    note: 'All employment tax returns, wage reports, and deposits must be submitted to the EDD electronically.',
    noteZh: '所有就业税申报、工资报告与缴款均须电子提交 EDD。',
    sourceLabel: 'California EDD — California Employer’s Guide (DE 44)',
    sourceHref: 'https://edd.ca.gov/siteassets/files/pdf_pub_ctr/de44.pdf',
  },
  {
    stateSlug: 'new-york',
    state: 'New York',
    label: 'No annual W-2 transmittal (quarterly NYS-45 instead)',
    labelZh: '无年度 W-2 传送（改为季度 NYS-45）',
    due: 'None — employers report complete wage and withholding totals for every employee on NYS-45 Part C each quarter, due April 30, July 31, October 31, and January 31. No extensions are allowed.',
    dueZh:
      '无——雇主每季度在 NYS-45 Part C 报送全部员工的工资与预扣总额，截止 4/30、7/31、10/31、1/31。不允许延期。',
    note: 'Electronic filing and payment of withholding returns is mandatory.',
    noteZh: '预扣申报与缴款强制电子化。',
    sourceLabel: 'NYS Tax — Withholding tax filing requirements',
    sourceHref: 'https://www.tax.ny.gov/bus/wt/filing_requirements.htm',
  },
  {
    stateSlug: 'texas',
    state: 'Texas',
    label: 'No state income tax',
    labelZh: '无州所得税',
    due: 'None — Texas has no personal income tax, so there is no state W-2 filing or withholding reconciliation.',
    dueZh: '无——德州没有个人所得税，因此没有州级 W-2 提交或预扣对账。',
    note: 'Employers still file federal W-2s and Texas Workforce Commission unemployment reports (a separate agency).',
    noteZh: '雇主仍需联邦 W-2 和德州劳工委员会的失业保险申报（另一机构）。',
    sourceLabel: 'Texas Comptroller — Fiscal Notes',
    sourceHref: 'https://comptroller.texas.gov/economy/fiscal-notes/industry/2025/small-biz-info/',
  },
  {
    stateSlug: 'florida',
    state: 'Florida',
    label: 'No state income tax',
    labelZh: '无州所得税',
    due: 'None — Florida does not impose a personal income tax, so there are no state W-2 filing requirements.',
    dueZh: '无——佛州不征个人所得税，因此没有州级 W-2 提交要求。',
    note: 'Employers still owe Florida reemployment (unemployment) tax filings; corporations owe Florida corporate income tax.',
    noteZh: '雇主仍有佛州再就业（失业）税申报；公司另有佛州公司所得税。',
    sourceLabel: 'Florida DOR — Personal income tax FAQ',
    sourceHref: 'https://floridarevenue.com/faq/Pages/FAQDetails.aspx?FAQID=1466',
  },
  {
    stateSlug: 'washington',
    state: 'Washington',
    label: 'No employer W-2 filing — but a new income tax exists',
    labelZh: '无雇主 W-2 提交——但新所得税已立法',
    due: 'No employer income-tax withholding or state W-2 filing is stated by the DOR. RULE CHANGE: the DOR income-tax page now says the legislature "recently enacted an income tax on individuals with an annual adjusted gross income of $1,000,000 or more" — ESSB 6346 ("Establishing a tax on millionaires", Chapter 238, Laws of 2026), signed March 30, 2026.',
    dueZh:
      'DOR 未规定雇主所得税预扣或州级 W-2 提交。规则变化：DOR 所得税页现已写明立法机关「最近对年调整后总收入 100 万美元及以上的个人开征所得税」——ESSB 6346（《对百万富翁征税》，2026 年法律第 238 章），2026-03-30 签署。',
    note: 'It is an individual filing obligation — no employer withholding requirement is stated. Washington’s capital gains excise tax remains separate. Watch DOR guidance as implementation details publish.',
    noteZh:
      '这是个人申报义务——未规定雇主预扣。华州资本利得 excise tax 仍是另一回事。实施细则发布前持续盯 DOR 指引。',
    sourceLabel: 'Washington DOR — Income tax (+ ESSB 6346, leg.wa.gov)',
    sourceHref: 'https://dor.wa.gov/taxes-rates/income-tax',
  },
]
