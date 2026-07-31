/**
 * extension-facts.ts — the ONE source of truth for the /extension-checker tool.
 *
 * DATA INTEGRITY — hard red line (same contract as penalty-facts.ts): every
 * fact below restates, in structured form, the SAME verified facts already
 * published on the corresponding /rules/* reference pages (form-4868,
 * form-7004, form-1120-c-corp, partnership-form-1065, s-corp, form-1041, 990,
 * fbar-fincen-114), each transcribed from the official irs.gov page cited in
 * `sourceHref`. Dates are the general calendar-year rule, as on the rule pages;
 * weekend/holiday shifts are covered by the linked guide, not computed here.
 * Re-verify against the cited URL before editing.
 */

export interface ExtensionFact {
  key: string
  /** Filer label shown on the picker chip. */
  filer: string
  filerZh: string
  /** The extension mechanism ("Form 7004", or "Automatic" for FBAR). */
  form: string
  formZh: string
  /** When the extension application is due (the original deadline). */
  applyBy: string
  applyByZh: string
  /** The extended filing deadline under the general calendar-year rule. */
  extendedTo: string
  extendedToZh: string
  /** The nuance a CPA must not miss. */
  note: string
  noteZh: string
  sourceLabel: string
  sourceHref: string
  /** The full reference page carrying the same verified facts. */
  ruleSlug: string
}

export const EXTENSION_FACTS: ExtensionFact[] = [
  {
    key: 'individual',
    filer: 'Individual (1040)',
    filerZh: '个人（1040）',
    form: 'Form 4868 — automatic once filed',
    formZh: 'Form 4868——提交即自动生效',
    applyBy: 'April 15 (the original individual deadline)',
    applyByZh: '4 月 15 日（个人申报原截止日）',
    extendedTo: 'October 15',
    extendedToZh: '10 月 15 日',
    note: 'It extends time to file, not time to pay — tax owed is still due April 15.',
    noteZh: '只延长申报时间，不延长付款时间——应缴税款仍须在 4 月 15 日前缴纳。',
    sourceLabel: 'IRS — About Form 4868',
    sourceHref: 'https://www.irs.gov/forms-pubs/about-form-4868',
    ruleSlug: 'form-4868-extension-deadline',
  },
  {
    key: 'c-corp',
    filer: 'C corporation (1120)',
    filerZh: 'C 公司（1120）',
    form: 'Form 7004 — automatic once filed',
    formZh: 'Form 7004——提交即自动生效',
    applyBy: 'April 15 for calendar-year corporations',
    applyByZh: '日历年公司为 4 月 15 日',
    extendedTo: 'October 15 (calendar-year filers)',
    extendedToZh: '10 月 15 日（日历年纳税人）',
    note: 'June 30 fiscal-year corporations follow a special rule (original deadline September 15). Payment is not extended.',
    noteZh: '6 月 30 日财年公司适用特殊规则（原截止日 9 月 15 日）。付款不延期。',
    sourceLabel: 'IRS — About Form 7004',
    sourceHref: 'https://www.irs.gov/forms-pubs/about-form-7004',
    ruleSlug: 'form-1120-c-corp-deadline',
  },
  {
    key: 's-corp',
    filer: 'S corporation (1120-S)',
    filerZh: 'S 公司（1120-S）',
    form: 'Form 7004 — automatic once filed',
    formZh: 'Form 7004——提交即自动生效',
    applyBy: 'March 15 (the original 1120-S deadline)',
    applyByZh: '3 月 15 日（1120-S 原截止日）',
    extendedTo: 'September 15',
    extendedToZh: '9 月 15 日',
    note: 'Shareholder K-1s ride on this return — a late extension cascades into every shareholder’s 1040.',
    noteZh: '股东 K-1 依赖这份申报——延期误了会连锁影响每位股东的 1040。',
    sourceLabel: 'IRS — About Form 7004',
    sourceHref: 'https://www.irs.gov/forms-pubs/about-form-7004',
    ruleSlug: 's-corp-deadline-operations',
  },
  {
    key: 'partnership',
    filer: 'Partnership (1065)',
    filerZh: '合伙企业（1065）',
    form: 'Form 7004 — automatic once filed',
    formZh: 'Form 7004——提交即自动生效',
    applyBy: 'March 15 (the original 1065 deadline)',
    applyByZh: '3 月 15 日（1065 原截止日）',
    extendedTo: 'September 15',
    extendedToZh: '9 月 15 日',
    note: 'Partner K-1s ride on this return; the $255-per-partner-per-month late penalty applies even with no tax due.',
    noteZh: '合伙人 K-1 依赖这份申报；即使无应缴税，每人每月 $255 的迟报罚金照样适用。',
    sourceLabel: 'IRS — About Form 7004',
    sourceHref: 'https://www.irs.gov/forms-pubs/about-form-7004',
    ruleSlug: 'partnership-form-1065-deadline',
  },
  {
    key: 'estate-trust',
    filer: 'Estate & trust (1041)',
    filerZh: '遗产与信托（1041）',
    form: 'Form 7004 — automatic once filed',
    formZh: 'Form 7004——提交即自动生效',
    applyBy: 'April 15 for calendar-year estates and trusts',
    applyByZh: '日历年遗产与信托为 4 月 15 日',
    extendedTo: 'September 30 (a 5½-month extension, not 6)',
    extendedToZh: '9 月 30 日（5 个半月而非 6 个月）',
    note: 'The odd 5½-month window is the classic tickler mistake — it ends September 30, not October 15.',
    noteZh: '5 个半月是最经典的记错点——到 9 月 30 日为止，不是 10 月 15 日。',
    sourceLabel: 'IRS — About Form 1041',
    sourceHref: 'https://www.irs.gov/forms-pubs/about-form-1041',
    ruleSlug: 'form-1041-estate-trust-deadline',
  },
  {
    key: 'nonprofit',
    filer: 'Nonprofit (990)',
    filerZh: '非营利（990）',
    form: 'Form 8868 — automatic once filed',
    formZh: 'Form 8868——提交即自动生效',
    applyBy: 'May 15 for calendar-year filers',
    applyByZh: '日历年纳税人为 5 月 15 日',
    extendedTo: 'November 15 (calendar-year filers)',
    extendedToZh: '11 月 15 日（日历年纳税人）',
    note: 'Form 990-N (the e-Postcard) cannot be extended.',
    noteZh: 'Form 990-N（e-Postcard）不能延期。',
    sourceLabel: 'IRS — Annual exempt organization return due date',
    sourceHref:
      'https://www.irs.gov/charities-non-profits/annual-exempt-organization-return-due-date',
    ruleSlug: '990-nonprofit-filing-deadline',
  },
  {
    key: 'fbar',
    filer: 'FBAR (FinCEN 114)',
    filerZh: 'FBAR（FinCEN 114）',
    form: 'No form — the extension is automatic',
    formZh: '无需表格——延期自动生效',
    applyBy: 'Nothing to file by April 15 — the extension requires no application',
    applyByZh: '4 月 15 日前无需任何申请——延期无须提交',
    extendedTo: 'October 15, automatically',
    extendedToZh: '自动延至 10 月 15 日',
    note: 'FBAR is filed with FinCEN, not the IRS, and sits outside the tax return itself.',
    noteZh: 'FBAR 提交给 FinCEN 而非 IRS，在报税表之外单独申报。',
    sourceLabel: 'IRS — Report of Foreign Bank and Financial Accounts (FBAR)',
    sourceHref:
      'https://www.irs.gov/businesses/small-businesses-self-employed/report-of-foreign-bank-and-financial-accounts-fbar',
    ruleSlug: 'fbar-fincen-114-deadline',
  },
]

/** Verification date shown on the page. */
export const EXTENSION_FACTS_VERIFIED_ON = '2026-07-31'
