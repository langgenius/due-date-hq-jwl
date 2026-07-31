/**
 * state-tax-rows.ts — the ONE source of truth for /franchise-tax-deadlines
 * (state franchise / privilege / net-worth / annual-entity taxes).
 *
 * DATA INTEGRITY — hard red line (same contract as disaster-notices.ts).
 * B1a batch, verified 2026-07-31 via the two-pass pipeline in
 * docs/marketing/state-form-matrix-spec-2026-07-31.md: every row was
 * independently transcribed twice from the official state-agency page cited in
 * `sourceHref`, the two passes diffed, and only agreeing facts kept; details a
 * single pass could not confirm on an official page were dropped (e.g. the
 * Alabama extension rule) or third-pass verified by hand (TX extension detail,
 * GA "beginning of the tax year" wording). Re-verify against the cited URL
 * before editing.
 *
 * STANDBY cells (verified-insufficient, do NOT publish without re-checking):
 * - Illinois corporate franchise tax: ilsos.gov blocked automated access
 *   (HTTP 403) and ilga.gov was unreachable in both passes; a possible
 *   2026 repeal signal is unconfirmed. Needs manual verification.
 * (The CA corporation minimum franchise timing, standby at first publish, was
 * resolved same-day against the FTB 2026 Form 100-ES instructions and added.)
 */

export type StateTaxStatus = 'active' | 'phase-out' | 'repealed'

export interface StateTaxRow {
  /** Matches the /states/[slug] page for cross-linking. */
  stateSlug: string
  state: string
  /** Official tax name for the row heading. */
  label: string
  labelZh: string
  status: StateTaxStatus
  /** General due-date rule (calendar-year framing), per the cited source. */
  due: string
  dueZh: string
  /** Extension rule ONLY when stated by the cited official source. */
  ext?: string
  extZh?: string
  /** The nuance a CPA must not miss. */
  note?: string
  noteZh?: string
  sourceLabel: string
  sourceHref: string
}

export const STATE_TAX_ROWS_VERIFIED_ON = '2026-07-31'

export const STATE_TAX_ROWS: StateTaxRow[] = [
  {
    stateSlug: 'delaware',
    state: 'Delaware',
    label: 'Corporation annual report & franchise tax',
    labelZh: '公司年报与 franchise tax',
    status: 'active',
    due: 'March 1 for domestic corporations (annual report + franchise tax, received by that date); foreign corporations file the annual report by June 30.',
    dueZh: '本州公司 3 月 1 日前（年报 + franchise tax 须送达）；外州注册公司年报 6 月 30 日前。',
    note: 'Late filing: $200 penalty plus 1.5% per month interest on unpaid tax.',
    noteZh: '逾期：$200 罚金 + 未缴税额每月 1.5% 利息。',
    sourceLabel: 'Delaware Division of Corporations — Annual Report and Tax Information',
    sourceHref: 'https://corp.delaware.gov/frtax/',
  },
  {
    stateSlug: 'delaware',
    state: 'Delaware',
    label: 'LLC / LP annual tax ($300)',
    labelZh: 'LLC / LP 年税（$300）',
    status: 'active',
    due: 'June 1 each year — a flat $300 annual tax for every domestic and foreign LLC, LP, and GP; no annual report is required.',
    dueZh: '每年 6 月 1 日——所有本州与外州 LLC、LP、GP 固定 $300 年税；无需年报。',
    note: 'Not prorated: owed for any year the entity is active on Delaware’s records. Late: $200 penalty plus 1.5% per month interest.',
    noteZh:
      '不按比例折算：只要该年度实体在特拉华系统内在册即须缴纳。逾期 $200 罚金 + 每月 1.5% 利息。',
    sourceLabel: 'Delaware Division of Corporations — LLC/LP/GP Tax Instructions',
    sourceHref: 'https://corp.delaware.gov/alt-entitytaxinstructions/',
  },
  {
    stateSlug: 'texas',
    state: 'Texas',
    label: 'Franchise tax (annual report)',
    labelZh: 'Franchise tax（年报）',
    status: 'active',
    due: 'May 15 (next business day if it falls on a weekend or holiday).',
    dueZh: '5 月 15 日（逢周末或假日顺延至下一营业日）。',
    ext: 'On timely request: non-EFT filers extend to Nov. 15; mandatory-EFT payers get Aug. 15, with a second extension to Nov. 15 — valid only if 90% of current-year or 100% of prior-year tax is paid by May 15.',
    extZh:
      '按时申请可延期：非 EFT 纳税人延至 11 月 15 日；强制 EFT 纳税人先延至 8 月 15 日，可二次延至 11 月 15 日——须在 5 月 15 日前缴纳当年税额 90% 或上年税额 100% 方有效。',
    note: 'No-tax-due revenue threshold is $2,650,000 for reports due in 2026–2027; the No Tax Due Report itself was discontinued for report years 2024 and later.',
    noteZh:
      '2026–2027 年度报告的免税营收门槛为 $2,650,000；No Tax Due Report 表格自 2024 报告年起已取消。',
    sourceLabel: 'Texas Comptroller — Franchise Tax',
    sourceHref: 'https://comptroller.texas.gov/taxes/franchise/',
  },
  {
    stateSlug: 'california',
    state: 'California',
    label: 'LLC annual tax ($800, FTB 3522)',
    labelZh: 'LLC 年税（$800，FTB 3522）',
    status: 'active',
    due: 'The 15th day of the 4th month of the LLC’s tax year; a new LLC’s first payment is due the 15th day of the 4th month after filing with the Secretary of State.',
    dueZh: 'LLC 税年第 4 个月的第 15 日；新设 LLC 首次缴纳为向州务卿备案后第 4 个月的第 15 日。',
    note: 'The 2021–2023 first-year exemption has expired — first-year LLCs owe the $800 again. Owed every year, even with no activity, until the LLC is formally cancelled.',
    noteZh: '2021–2023 的首年豁免已到期——新设 LLC 首年也要缴 $800。即使无经营，注销前每年都要缴。',
    sourceLabel: 'California FTB — Limited liability company',
    sourceHref: 'https://www.ftb.ca.gov/file/business/types/limited-liability-company/index.html',
  },
  {
    stateSlug: 'california',
    state: 'California',
    label: 'LLC estimated fee (FTB 3536)',
    labelZh: 'LLC 预估费（FTB 3536）',
    status: 'active',
    due: 'LLCs with California income over $250,000 pay the estimated LLC fee by the 15th day of the 6th month of the current tax year.',
    dueZh: '加州收入超过 $250,000 的 LLC，须在当前税年第 6 个月的第 15 日前缴纳预估费。',
    note: 'Fee tiers run $900 to $11,790; underpaying the estimate triggers penalties and interest.',
    noteZh: '费用分档 $900–$11,790；预估不足会产生罚金和利息。',
    sourceLabel: 'California FTB — Limited liability company',
    sourceHref: 'https://www.ftb.ca.gov/file/business/types/limited-liability-company/index.html',
  },
  {
    stateSlug: 'california',
    state: 'California',
    label: 'Corporation minimum franchise tax ($800)',
    labelZh: '公司最低 franchise tax（$800）',
    status: 'active',
    due: 'Due as an estimate on or before the 15th day of the 4th month of the taxable year (with the first estimated-tax installment); weekend/holiday dates shift to the next business day.',
    dueZh:
      '作为预估税在税年第 4 个月第 15 日前缴纳（随第一期预估税分期）；逢周末假日顺延至下一营业日。',
    note: 'At least $800 is owed whether the corporation is active, inactive, operating at a loss, or filing a short-period return. Corporations newly incorporated or qualified on or after Jan. 1, 2020 are exempt for their first taxable year.',
    noteZh:
      '无论公司活跃、停业、亏损或短期申报，至少缴 $800。2020-01-01 起新设或新登记的公司首个税年豁免。',
    sourceLabel: 'California FTB — 2026 Instructions for Form 100-ES (Corporation Estimated Tax)',
    sourceHref: 'https://www.ftb.ca.gov/forms/2026/2026-100-es-instructions.html',
  },
  {
    stateSlug: 'tennessee',
    state: 'Tennessee',
    label: 'Franchise & excise tax',
    labelZh: 'Franchise & excise tax',
    status: 'active',
    due: 'The 15th day of the 4th month after the close of the taxpayer’s books — April 15 for calendar-year filers.',
    dueZh: '账簿年度结束后第 4 个月的第 15 日——日历年纳税人为 4 月 15 日。',
    ext: 'A seven-month extension is available.',
    extZh: '可申请 7 个月延期。',
    sourceLabel: 'Tennessee DOR — Franchise & Excise Tax: Due Dates and Tax Rates',
    sourceHref:
      'https://www.tn.gov/revenue/taxes/franchise---excise-tax/due-dates-and-tax-rates.html',
  },
  {
    stateSlug: 'arkansas',
    state: 'Arkansas',
    label: 'Annual franchise tax',
    labelZh: '年度 franchise tax',
    status: 'active',
    due: 'May 1 each year, filed with the Secretary of State (not DFA).',
    dueZh: '每年 5 月 1 日，向州务卿（而非 DFA）申报。',
    ext: 'None — Acts 1046 and 1140 of 1991 eliminated extensions; all reports are due on or before May 1.',
    extZh: '无延期——1991 年第 1046 与 1140 号法案取消了延期；所有报告须在 5 月 1 日前提交。',
    note: 'Late: $25 penalty plus daily interest. Corporate minimum $150 ($300 for corporations without authorized stock).',
    noteZh: '逾期：$25 罚金 + 按日利息。公司最低 $150（无授权股本的公司 $300）。',
    sourceLabel: 'Arkansas Secretary of State — Annual Corporation Franchise Tax Report 2026',
    sourceHref: 'https://www.sos.arkansas.gov/uploads/bcs/Corp1_FT_2026.pdf',
  },
  {
    stateSlug: 'alabama',
    state: 'Alabama',
    label: 'Business privilege tax (CPT / PPT)',
    labelZh: 'Business privilege tax（CPT / PPT）',
    status: 'active',
    due: 'Form CPT (C corporations): 3½ months after the taxable year begins — April 15 for calendar-year filers (June-30 fiscal-year C corps: September 15). Form PPT (pass-through entities): 2½ months after the year begins — March 15 calendar. Both track the corresponding federal due dates.',
    dueZh:
      'CPT（C 公司）：税年开始后 3 个半月——日历年为 4 月 15 日（6 月 30 日财年的 C 公司为 9 月 15 日）。PPT（穿透实体）：税年开始后 2 个半月——日历年为 3 月 15 日。均与对应联邦申报日一致。',
    note: 'For taxable years beginning after 12/31/2023, tax due of $100 or less is fully exempt and no return is required (Act 2022-252).',
    noteZh: '2023-12-31 之后开始的税年，应缴税额 ≤$100 者全额豁免且无需申报（Act 2022-252）。',
    sourceLabel: 'Alabama DOR — When is the Business Privilege Tax return due? (FAQ)',
    sourceHref:
      'https://www.revenue.alabama.gov/faqs/when-is-the-alabama-business-privilege-tax-return-due/',
  },
  {
    stateSlug: 'north-carolina',
    state: 'North Carolina',
    label: 'Franchise tax (combined return)',
    labelZh: 'Franchise tax（合并申报）',
    status: 'active',
    due: 'Reported on the combined franchise and corporate income return, due the 15th day of the 4th month after the income year closes — April 15 for calendar-year corporations.',
    dueZh: '与公司所得税合并申报，所得年度结束后第 4 个月的第 15 日到期——日历年公司为 4 月 15 日。',
    ext: 'Seven months from the original due date for tax years beginning on or after Jan. 1, 2025 (six months for earlier years); a federal automatic extension is honored when certified on the NC return.',
    extZh:
      '2025-01-01 起开始的税年延期为 7 个月（此前为 6 个月）；在 NC 申报表上确认联邦自动延期即获州延期。',
    note: 'The extension length changed from six to seven months starting with tax year 2025 — update ticklers.',
    noteZh: '延期时长自 2025 税年起由 6 个月改为 7 个月——记得更新提醒系统。',
    sourceLabel: 'NCDOR — Corporate Income & Franchise Tax: When to File',
    sourceHref: 'https://www.ncdor.gov/taxes-forms/corporate-income-franchise-tax/when-file',
  },
  {
    stateSlug: 'georgia',
    state: 'Georgia',
    label: 'Net worth tax (Form 600 / 600S)',
    labelZh: 'Net worth tax（Form 600 / 600S）',
    status: 'active',
    due: 'Filed as the net-worth portion of the corporate return (Form 600 / 600S) — April 15 for calendar-year C corporations. The FAQ words it as the 15th day of the 4th month "following the beginning" of the tax year because the net-worth year runs one year later than the income year.',
    dueZh:
      '作为公司申报表（Form 600 / 600S）的 net-worth 部分一并申报——日历年 C 公司为 4 月 15 日。官方 FAQ 表述为税年「开始后」第 4 个月第 15 日，因为 net-worth 税年比所得税年晚一年。',
    note: 'Computed on the prior year-end balance sheet — effectively paid in advance for the coming year.',
    noteZh: '按上一年度期末资产负债表计算——实质上是为下一年度预缴。',
    sourceLabel: 'Georgia DOR — Net Worth Tax for Corporations FAQ',
    sourceHref: 'https://dor.georgia.gov/net-worth-tax-corporations-faq',
  },
  {
    stateSlug: 'new-york',
    state: 'New York',
    label: 'Corporation franchise tax, Article 9-A (C corps, CT-3)',
    labelZh: '公司 franchise tax，Article 9-A（C 公司，CT-3）',
    status: 'active',
    due: 'Form CT-3 is due within 3½ months after the reporting period ends — April 15 for calendar-year filers.',
    dueZh: 'CT-3 在报告期结束后 3 个半月内申报——日历年为 4 月 15 日。',
    ext: 'Six months via Form CT-5, with properly estimated franchise tax and MTA surcharge paid by the original due date.',
    extZh: '通过 CT-5 延期 6 个月，须在原截止日前缴纳合理估算的 franchise tax 与 MTA 附加税。',
    sourceLabel: 'NYS Tax — Article 9-A: Franchise tax on general business corporations',
    sourceHref: 'https://www.tax.ny.gov/bus/ct/article9a.htm',
  },
  {
    stateSlug: 'new-york',
    state: 'New York',
    label: 'S corporation franchise tax (CT-3-S)',
    labelZh: 'S 公司 franchise tax（CT-3-S）',
    status: 'active',
    due: 'Form CT-3-S is due within 2½ months after the reporting period ends — March 15 for calendar-year filers, one month before C corporations.',
    dueZh: 'CT-3-S 在报告期结束后 2 个半月内申报——日历年为 3 月 15 日，比 C 公司早一个月。',
    ext: 'Six months via Form CT-5.4 with estimated tax paid by the original date; no extension beyond six months.',
    extZh: '通过 CT-5.4 延期 6 个月，须在原截止日前缴纳估算税额；6 个月之外不再延。',
    note: 'The March 15 vs April 15 split is the most commonly missed New York distinction.',
    noteZh: '3 月 15 日 vs 4 月 15 日是纽约最容易记错的区别。',
    sourceLabel: 'NYS Tax — Instructions for Form CT-3-S',
    sourceHref: 'https://www.tax.ny.gov/forms/current-forms/ct/ct3si.htm',
  },
  {
    stateSlug: 'louisiana',
    state: 'Louisiana',
    label: 'Corporation franchise tax — REPEALED',
    labelZh: '公司 franchise tax——已废止',
    status: 'repealed',
    due: 'Repealed for franchise tax periods beginning on or after Jan. 1, 2026 (2024 Third Extraordinary Session, Act 6). Filing obligations for prior franchise periods survive the repeal.',
    dueZh:
      '对 2026-01-01 起开始的 franchise 税期废止（2024 年第三次特别会议，Act 6）。此前税期的申报义务不因废止而消灭。',
    note: 'The final calendar-year franchise computation rode on the CIFT-620 due May 15, 2025.',
    noteZh: '日历年最后一次 franchise 计算随 2025 年 5 月 15 日到期的 CIFT-620 完成。',
    sourceLabel: 'Louisiana DOR — Is the corporation franchise tax repealed? (FAQ)',
    sourceHref:
      'https://revenue.louisiana.gov/tax-education-and-faqs/faqs/income-tax-reform/is-the-corporation-franchise-tax-repealed/',
  },
  {
    stateSlug: 'oklahoma',
    state: 'Oklahoma',
    label: 'Franchise tax — REPEALED',
    labelZh: 'Franchise tax——已废止',
    status: 'repealed',
    due: 'Eliminated by HB1039X (2023); tax year 2023 was the final reporting year — nothing to file for tax years 2024 and later.',
    dueZh: '经 HB1039X（2023）取消；2023 税年为最后申报年——2024 及以后税年无需申报。',
    note: 'Delinquent pre-2024 liabilities remain collectible, and unremitted final returns can lead to corporate suspension.',
    noteZh: '2024 前的欠缴仍会被追缴；未清缴的最终申报可能导致公司资格被暂停。',
    sourceLabel: 'Oklahoma Tax Commission — Franchise Tax Ends in Oklahoma',
    sourceHref: 'https://oklahoma.gov/tax/newsroom/2023/07-26-23.html',
  },
  {
    stateSlug: 'mississippi',
    state: 'Mississippi',
    label: 'Franchise tax — PHASING OUT',
    labelZh: 'Franchise tax——逐步废止中',
    status: 'phase-out',
    due: 'Tax year 2026 rate: $0.50 per $1,000 of capital over $100,000 (minimum $25), filed with the combined income & franchise return due the 15th day of the 4th month after year close. Falls to $0.25 for tax year 2027; repealed effective Jan. 1, 2028.',
    dueZh:
      '2026 税年税率：超过 $100,000 的资本每 $1,000 征 $0.50（最低 $25），随合并所得与 franchise 申报表申报，年度结束后第 4 个月第 15 日到期。2027 税年降至 $0.25；2028-01-01 起废止。',
    note: 'Computed from the ENDING balance sheet; the rate is keyed to the year the period begins. The TY2027 return (filed in 2028) is the last with a franchise computation.',
    noteZh:
      '按期末资产负债表计算；税率按税期开始年份确定。2027 税年申报表（2028 年提交）是最后一次 franchise 计算。',
    sourceLabel: 'Mississippi DOR — Corporate Income and Franchise Tax FAQs',
    sourceHref: 'https://www.dor.ms.gov/business/corporate-income-and-franchise-tax-faqs',
  },
]
