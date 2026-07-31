/**
 * state-sales-rows.ts — the ONE source of truth for /sales-tax-deadlines
 * (state sales & use tax return cadence, B2a of the state×tax matrix).
 *
 * DATA INTEGRITY — hard red line (same contract as state-tax-rows.ts).
 * B2a batch, verified 2026-07-31 via the same two-pass pipeline: 12 states,
 * each independently transcribed twice from the official state tax-agency page
 * cited in `sourceHref`, diffed, and only agreeing facts kept. Details the two
 * passes stated differently were NOT published (WA's frequency-assignment
 * thresholds — the passes cited different measures; OH's vendor-discount cap
 * and accelerated-payment rule and GA's e-file/prepayment thresholds — single
 * pass only). Re-verify against the cited URL before editing.
 */

export interface StateSalesRow {
  /** Matches the /states/[slug] page for cross-linking. */
  stateSlug: string
  state: string
  due: string
  dueZh: string
  /** How filing frequency is assigned, when both passes agreed. */
  freq?: string
  freqZh?: string
  /** The nuance a CPA must not miss. */
  note?: string
  noteZh?: string
  sourceLabel: string
  sourceHref: string
}

export const STATE_SALES_ROWS_VERIFIED_ON = '2026-07-31'

export const STATE_SALES_ROWS: StateSalesRow[] = [
  {
    stateSlug: 'california',
    state: 'California',
    due: 'Returns are due the LAST DAY of the month following the period — monthly returns at the end of the following month, quarterly returns April 30 / July 31 / October 31 / January 31, yearly returns January 31.',
    dueZh:
      '申报表在期间结束后次月的最后一天到期——月报为次月月末，季报为 4/30、7/31、10/31、1/31，年报为 1 月 31 日。',
    freq: 'CDTFA assigns the frequency (monthly, quarterly, quarterly-prepay, yearly) from your reported or anticipated taxable sales at registration.',
    freqZh: 'CDTFA 按注册时申报或预计的应税销售额指定频率（月/季/季度预缴/年）。',
    note: 'Quarterly-prepay accounts also owe prepayments due the 24th. A return is required even with no sales to report.',
    noteZh: '季度预缴账户另有 24 日到期的预缴。即使无销售也必须申报。',
    sourceLabel: 'CDTFA — Filing Dates for Sales & Use Tax Returns',
    sourceHref: 'https://cdtfa.ca.gov/taxes-and-fees/sales-use-tax-returns-filing-dates.htm',
  },
  {
    stateSlug: 'texas',
    state: 'Texas',
    due: 'The 20th of the month following the period — monthly returns the 20th of the next month; quarterly returns April 20 / July 20 / October 20 / January 20; yearly returns January 20. Weekend/holiday dates shift to the next business day.',
    dueZh:
      '期间结束后次月 20 日——月报为次月 20 日；季报为 4/20、7/20、10/20、1/20；年报为 1 月 20 日。逢周末假日顺延。',
    freq: 'The Comptroller notifies you by letter (monthly or quarterly) after your permit is approved.',
    freqZh: '许可证获批后 Comptroller 书面通知你按月还是按季申报。',
    note: 'Timely filers may keep a 0.5% discount; qualifying prepayers an additional 1.25%, with prepayments due the 15th.',
    noteZh: '按时申报可留存 0.5% 折扣；符合条件的预缴者另加 1.25%，预缴 15 日到期。',
    sourceLabel: 'Texas Comptroller — Sales and Use Tax',
    sourceHref: 'https://comptroller.texas.gov/taxes/sales/',
  },
  {
    stateSlug: 'new-york',
    state: 'New York',
    due: 'Returns are due no later than 20 days after the period ends — and New York’s sales-tax quarters are NOT calendar quarters: they end May 31, August 31, November 30, and February 28/29.',
    dueZh:
      '申报表在期间结束后 20 天内到期——且纽约的销售税季度不是日历季度：分别在 5/31、8/31、11/30、2/28-29 结束。',
    freq: 'Quarterly is the default; monthly (part-quarterly) filing is required once taxable receipts reach $300,000 or more in a quarter; annual filing is allowed at $3,000 or less of annual tax.',
    freqZh:
      '默认按季；单季应税收入达 $300,000 须改按月（part-quarterly）；年度税额 ≤$3,000 可按年。',
    note: 'The non-calendar quarter is the classic trap — a CPA assuming calendar quarters files a month late.',
    noteZh: '非日历季度是经典陷阱——按日历季度记的人会晚报一个月。',
    sourceLabel: 'NYS Tax — Filing Requirements for Sales and Use Tax Returns (TB-ST-275)',
    sourceHref:
      'https://www.tax.ny.gov/pubs_and_bulls/tg_bulletins/st/filing_requirements_for_sales_and_use_tax_returns.htm',
  },
  {
    stateSlug: 'florida',
    state: 'Florida',
    due: 'Returns and payments are due on the 1st and LATE after the 20th of the month following the period. Electronic payments must be initiated (with a confirmation number) by 5 p.m. ET on the business day BEFORE the 20th.',
    dueZh:
      '申报与缴款在期间结束后次月 1 日「到期」、过 20 日才算「逾期」。电子缴款须在 20 日前一个营业日 17:00（东部时间）前发起并取得确认号。',
    freq: 'Frequency (monthly / quarterly / semiannual / annual) is assigned by the Department of Revenue based on the tax you collect.',
    freqZh: '频率（月/季/半年/年）由税务局按你的实收税额指定。',
    note: 'The effective e-pay deadline is a day earlier than the paper one. Timely e-filers keep a collection allowance of 2.5% of the first $1,200 (max $30).',
    noteZh: '电子缴款的实际截止比纸面早一天。按时电子申报者可留存首 $1,200 的 2.5%（上限 $30）。',
    sourceLabel: 'Florida Department of Revenue — Florida Sales and Use Tax',
    sourceHref: 'https://floridarevenue.com/taxes/taxesfees/Pages/sales_tax.aspx',
  },
  {
    stateSlug: 'illinois',
    state: 'Illinois',
    due: 'Form ST-1 and payment are due on or before the 20th of the month following the period — monthly by the next 20th, quarterly by the 20th after the quarter, annual by January 20.',
    dueZh:
      'ST-1 与税款在期间结束后次月 20 日前到期——月报次月 20 日，季报季度后次月 20 日，年报 1 月 20 日。',
    freq: 'IDOR assigns monthly or quarterly at registration and reviews accounts annually.',
    freqZh: 'IDOR 在注册时指定按月或按季，并每年复核调整。',
    note: 'The timely-filing retailer’s discount is capped at $1,000 per month for returns due on or after Jan. 1, 2025.',
    noteZh: '按时申报的零售商折扣自 2025-01-01 起每月上限 $1,000。',
    sourceLabel: 'Illinois DOR — Form ST-1 filing requirements',
    sourceHref:
      'https://tax.illinois.gov/research/publications/pubs/retailers-overview-of-sales-and-use-tax/requirements-for-retailers-who-file-form-st-1.html',
  },
  {
    stateSlug: 'pennsylvania',
    state: 'Pennsylvania',
    due: 'Returns are due on or by the 20th of the month following the period — monthly by the next 20th; quarterly April 20 / July 20 / October 20 / January 20; semi-annual August 20 and February 20. Weekend/holiday dates shift to the next business day.',
    dueZh:
      '申报表在期间结束后次月 20 日前到期——月报次月 20 日；季报 4/20、7/20、10/20、1/20；半年报 8/20 与 2/20。逢周末假日顺延。',
    freq: 'The department assigns the frequency and may change it for later years based on the tax you report.',
    freqZh: '税务局指定频率，并可按你申报的税额在后续年度调整。',
    note: 'Accelerated (AST) prepayments apply once prior-year third-quarter liability reaches $25,000 — prepayment due the 20th of the current month.',
    noteZh: '上年第三季度税额达 $25,000 即适用 AST 预缴——预缴在当月 20 日到期。',
    sourceLabel: 'Pennsylvania DOR — 2026 REV-819 (SUT return due dates)',
    sourceHref:
      'https://www.pa.gov/content/dam/copapwp-pagov/en/revenue/documents/formsandpublications/formsforbusinesses/sut/documents/2026_rev-819.pdf',
  },
  {
    stateSlug: 'ohio',
    state: 'Ohio',
    due: 'Monthly UST-1 returns are due the 23rd of the following month; semi-annual returns July 23 (Jan–Jun) and January 23 (Jul–Dec). Weekend/holiday dates roll to the next business day.',
    dueZh:
      '月度 UST-1 在次月 23 日到期；半年报为 7 月 23 日（上半年）与 1 月 23 日（下半年）。逢周末假日顺延。',
    note: 'Ohio is a 23rd-of-the-month state — one of the calendar quirks that breaks a one-size-fits-all "20th" tickler.',
    noteZh: '俄亥俄是「23 号州」——用统一「20 号」提醒的日历在这里会错。',
    sourceLabel: 'Ohio Department of Taxation — Due Dates',
    sourceHref: 'https://tax.ohio.gov/help-center/resources/oldduedates',
  },
  {
    stateSlug: 'washington',
    state: 'Washington',
    due: 'Monthly combined excise returns (sales + B&O) are due the 25th of the following month; quarterly returns are due the END of the month following the quarter (Q1 → April 30); annual returns are due April 15.',
    dueZh:
      '月度合并 excise 申报（销售税 + B&O）在次月 25 日到期；季报在季度结束后次月月末（Q1 → 4 月 30 日）；年报 4 月 15 日。',
    freq: 'DOR assigns monthly, quarterly, or annual frequency and communicates it after registration; you can request a change.',
    freqZh: 'DOR 指定月/季/年频率并在注册后通知；可申请调整。',
    note: 'Three different patterns in one state: 25th (monthly), month-end (quarterly), April 15 (annual).',
    noteZh: '一个州三种节奏：月报 25 日、季报月末、年报 4 月 15 日。',
    sourceLabel: 'Washington DOR — Filing frequencies & due dates',
    sourceHref: 'https://dor.wa.gov/file-pay-taxes/filing-frequencies-due-dates',
  },
  {
    stateSlug: 'georgia',
    state: 'Georgia',
    due: 'Sales and use tax returns (ST-3) and payments are due no later than the 20th of the month following the period, across monthly, quarterly, and annual schedules.',
    dueZh: '销售与使用税申报（ST-3）与缴款在期间结束后次月 20 日前到期，月/季/年同一模式。',
    sourceLabel: 'Georgia DOR — Sales & Use Tax Due Dates',
    sourceHref: 'https://dor.georgia.gov/sales-use-tax-due-dates',
  },
  {
    stateSlug: 'new-jersey',
    state: 'New Jersey',
    due: 'Quarterly ST-50 returns are due by 11:59 p.m. on the 20th of the month after the quarter ends; required monthly remittances for the first two months of a quarter are due the 20th of the following month.',
    dueZh:
      '季度 ST-50 在季度结束后次月 20 日 23:59 前到期；季度前两个月的月度缴款（如需）在次月 20 日到期。',
    freq: 'Everyone files quarterly; monthly remittances apply only if you collected more than $30,000 of NJ sales tax in the prior year AND more than $500 in that month.',
    freqZh: '所有人按季申报；仅当上年 NJ 销售税实收超 $30,000 且当月超 $500 时才须按月缴款。',
    note: 'A month of $500 or less simply folds into the quarterly return — a $0 monthly voucher cannot be filed. The quarterly return is required even with no tax due.',
    noteZh: '单月 ≤$500 并入季度申报——不能提交 $0 的月度凭证。无税也必须交季度申报表。',
    sourceLabel: 'NJ Division of Taxation — Filing Sales and Use Tax Returns (ST-50/ST-51)',
    sourceHref: 'https://www.nj.gov/treasury/taxation/su_12.shtml',
  },
  {
    stateSlug: 'north-carolina',
    state: 'North Carolina',
    due: 'Monthly E-500 returns are due the 20th of the following month — but QUARTERLY returns are due the LAST DAY of January, April, July, and October.',
    dueZh: '月度 E-500 在次月 20 日到期——但季度申报在 1、4、7、10 月的最后一天到期。',
    freq: 'Assigned by liability: quarterly under $100/month; monthly from $100 to under $20,000/month; monthly with prepayment at $20,000+/month.',
    freqZh: '按税额指定：月均 <$100 按季；$100–$20,000 按月；≥$20,000 按月且须预缴。',
    note: 'The $20,000+ tier prepays at least 65% of the coming month’s liability with each return. Note the monthly/quarterly due-day split (20th vs month-end).',
    noteZh: '≥$20,000 档每次申报须预缴下月税额至少 65%。注意月报 20 日 vs 季报月末的差别。',
    sourceLabel: 'NCDOR — Filing Frequency and Due Dates',
    sourceHref:
      'https://www.ncdor.gov/taxes-forms/sales-and-use-tax/sales-and-use-tax-filing-requirements-payment-options/filing-frequency-and-due-dates',
  },
  {
    stateSlug: 'michigan',
    state: 'Michigan',
    due: 'Monthly and quarterly SUW returns (Form 5080) are due the 20th of the month following the period (quarters: April 20 / July 20 / October 20 / January 20) — and EVERY filer must also submit the annual reconciliation (Form 5081) by February 28.',
    dueZh:
      '月度与季度 SUW 申报（Form 5080）在期间结束后次月 20 日到期（季报 4/20、7/20、10/20、1/20）——且所有申报人还须在 2 月 28 日前提交年度对账（Form 5081）。',
    freq: 'Treasury determines the monthly, quarterly, or annual frequency each year.',
    freqZh: '财政厅每年确定按月、按季或按年。',
    note: 'The February 28 annual return applies to ALL filers regardless of frequency — the most commonly missed Michigan deadline.',
    noteZh: '2 月 28 日年度申报适用于所有频率的申报人——密歇根最容易漏的一个。',
    sourceLabel: 'Michigan Treasury — Sales and Use Taxes',
    sourceHref: 'https://www.michigan.gov/taxes/business-taxes/sales-use-tax',
  },
]
