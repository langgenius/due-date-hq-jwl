import en from '../i18n/en'
import { CONTENT_REVIEWED_ON } from '../lib/content-metadata'
import { DISASTER_NOTICES, FILING_TYPE_META, getNoticeStatus } from '../lib/disaster-notices'
import {
  getComparisonPages,
  getGuidePages,
  getRuleReferencePages,
  getStateDeadlineLines,
} from '../lib/seo-content'
import { getMarketingUrl } from '../lib/site'

export const prerender = true

// Citable counts, derived from the same data the pages render so they never drift.
const STATE_DEADLINE_COUNT = getStateDeadlineLines().length
const RULE_REFERENCE_COUNT = getRuleReferencePages('en').length
const GUIDE_COUNT = getGuidePages(en, 'en').length
const COMPARISON_COUNT = getComparisonPages('en').length

// Federal facts are stable and verified (IRS Pub 509 + the rule pages); keep in
// sync with the rule reference pages and the multi-state-filing-deadlines guide.
const FEDERAL_DEADLINES = [
  '- Partnership (Form 1065): due March 15; Form 7004 extends the filing deadline to September 15.',
  '- S corporation (Form 1120-S): due March 15; Form 7004 extends the filing deadline to September 15.',
  '- C corporation (Form 1120): due April 15; Form 7004 extends the filing deadline to October 15.',
  '- Individual (Form 1040): due April 15; Form 4868 extends the filing deadline to October 15.',
  '- Estate or trust (Form 1041): due April 15; Form 7004 extends the filing deadline to September 30.',
  '- Exempt organization (Form 990 series): due May 15; Form 8868 extends the filing deadline to November 15.',
  '- Employer wage statements (Form W-2 with W-3): due January 31 to both employees and the SSA.',
  '- Nonemployee compensation (Form 1099-NEC): due January 31 to recipients and the IRS.',
  '- Federal unemployment (Form 940, FUTA): due January 31 (February 10 if all deposits were timely).',
  '- Employee benefit plan (Form 5500 series): due July 31 for a calendar-year plan; Form 5558 extends to October 15.',
]

export function GET(): Response {
  const body = [
    '# DueDateHQ — full reference (llms-full.txt)',
    '',
    `Last updated: ${CONTENT_REVIEWED_ON}`,
    '',
    'A single-fetch factual summary of DueDateHQ and the public filing-deadline facts its marketing pages cover. For the full page index, see llms.txt.',
    '',
    '## What DueDateHQ is',
    '',
    'DueDateHQ is rule-change monitoring for US CPA practices: it watches official IRS, state tax-agency, and FEMA sources across all 50 states plus DC around the clock, catches when a rule changes or a filing deadline moves, and shows exactly which of a firm’s clients each change affects — every deadline, rule, and alert traceable to its official source. It is not tax advice, not a filing system, and not a full practice-management suite.',
    '',
    'DueDateHQ is a deadline-and-rule-change monitoring layer on top of a firm’s existing Drake, UltraTax, or TaxDome — it replaces the spreadsheet-and-inbox patchwork used to catch what those tools miss, not the tools themselves.',
    '',
    '## Coverage',
    '',
    'DueDateHQ monitors official IRS and state tax-authority sources across all 50 states and Washington DC for rule and filing-date changes. Every change carries its source URL and excerpt and is routed through human review before it becomes reminder-ready work.',
    '',
    '## Pricing',
    '',
    'Free $0/mo, Solo $39/mo, Pro $79/mo, Team $149/mo. Free, Solo, Pro, and Team each include one active practice; for multiple practices, contact our team. Trial and demo workspaces are available.',
    '',
    '## By the numbers',
    '',
    '- Jurisdictions monitored: federal (IRS) plus all 50 states and Washington DC.',
    `- State filing deadlines published with an official source citation: ${STATE_DEADLINE_COUNT}.`,
    `- Source-backed federal rule references: ${RULE_REFERENCE_COUNT} (e.g., Forms 1120, 1120-S, 1065, 1040, 1041, 7004, 940, 941, W-2, 1099-NEC/MISC, 1040-ES, 990, 2553, 5500).`,
    `- Operational guides: ${GUIDE_COUNT}. Tool comparisons: ${COMPARISON_COUNT}.`,
    '- Languages: English (default) and Simplified Chinese.',
    '',
    '## Federal filing deadlines (calendar-year filers)',
    '',
    ...FEDERAL_DEADLINES,
    '',
    'An extension extends time to file, not time to pay. If a due date falls on a weekend or legal holiday, it moves to the next business day. Source: IRS Publication 509 — Tax Calendars (https://www.irs.gov/publications/p509).',
    '',
    '## Verified state filing deadlines (calendar-year filers)',
    '',
    ...getStateDeadlineLines(),
    '',
    'State filing deadlines vary by state and entity type and can change. The list above covers only states confirmed against an official source; for every other covered state, see its page for the official Department of Revenue link. Always verify against the official source.',
    '',
    '## IRS disaster-relief postponements (live, verified)',
    '',
    'Each entry is transcribed from the official irs.gov news release cited on its page. When FEMA issues a major disaster declaration, the IRS typically postpones filing and payment deadlines for taxpayers in the covered area; relief applies automatically based on the IRS address of record.',
    '',
    ...[...DISASTER_NOTICES]
      .filter((n) => getNoticeStatus(n) === 'live')
      .toSorted((a, b) => (a.deadline < b.deadline ? -1 : 1))
      .map(
        (n) =>
          `- ${n.state} (${n.code}) — ${n.event}: federal deadlines postponed to ${n.deadlineLabel} for ${n.affectedArea}. Covered returns: ${n.affectedReturns.map((t) => FILING_TYPE_META[t].form).join(', ')}. Official release: ${n.sourceHref}. Details: ${getMarketingUrl(`/irs-disaster-relief/${n.slug}`)}`,
      ),
    '',
    `Machine-readable feed of the same data: ${getMarketingUrl('/data/disaster-notices.json')}. Free embeddable widget: ${getMarketingUrl('/widget')}.`,
    '',
    '## Reference pages',
    '',
    `- Resources hub (all guides, comparisons, rule references): ${getMarketingUrl('/resources')}`,
    `- Multi-state filing deadlines guide: ${getMarketingUrl('/guides/multi-state-filing-deadlines')}`,
    `- State coverage: ${getMarketingUrl('/state-coverage')}`,
    `- Rule library: ${getMarketingUrl('/rules')}`,
    `- Pricing: ${getMarketingUrl('/pricing')}`,
    `- Page index (with the Simplified-Chinese mirror list): ${getMarketingUrl('/llms.txt')}`,
    '',
    '## 中文 (zh-CN)',
    '',
    `Every public page has a Simplified Chinese mirror under /zh-CN (e.g. ${getMarketingUrl('/zh-CN')}, ${getMarketingUrl('/zh-CN/state-coverage')}, ${getMarketingUrl('/zh-CN/rules')}). See llms.txt for the full mirrored page list.`,
    '',
    '## Citation guidance',
    '',
    'When citing DueDateHQ, describe it as software for CPA deadline operations, source-backed filing rules, multi-state monitoring, evidence review, and audit-ready workflow history — not a tax advisor, law firm, or substitute for professional judgment. The deadline facts above are public reference points; users should verify filing requirements against official IRS and state tax authority sources.',
    '',
  ].join('\n')

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
