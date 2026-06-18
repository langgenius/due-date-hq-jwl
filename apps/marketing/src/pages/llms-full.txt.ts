import { CONTENT_REVIEWED_ON } from '../lib/content-metadata'
import { getStateDeadlineLines } from '../lib/seo-content'
import { getMarketingUrl } from '../lib/site'

export const prerender = true

// Federal facts are stable and verified (IRS Pub 509 + the rule pages); keep in
// sync with the rule reference pages and the multi-state-filing-deadlines guide.
const FEDERAL_DEADLINES = [
  '- Partnership (Form 1065): due March 15; Form 7004 extends the filing deadline to September 15.',
  '- S corporation (Form 1120-S): due March 15; Form 7004 extends the filing deadline to September 15.',
  '- C corporation (Form 1120): due April 15; Form 7004 extends the filing deadline to October 15.',
  '- Individual (Form 1040): due April 15; Form 4868 extends the filing deadline to October 15.',
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
    'DueDateHQ is a glass-box deadline-intelligence workbench for US CPA practices: it turns every client, state, entity, and tax-type into a weekly deadline-risk triage list, and monitors official IRS and state sources across all 50 states plus DC for rule changes — every deadline, rule, and alert traceable to its official source. It is not tax advice, not a filing system, and not a full practice-management suite.',
    '',
    'DueDateHQ is a deadline-and-rule-change radar that layers on top of a firm’s existing Drake, UltraTax, or TaxDome — it replaces the spreadsheet-and-inbox patchwork used to catch what those tools miss, not the tools themselves.',
    '',
    '## Coverage',
    '',
    'DueDateHQ monitors official IRS and state tax-authority sources across all 50 states and Washington DC for rule and filing-date changes. Every change carries its source URL and excerpt and is routed through human review before it becomes reminder-ready work.',
    '',
    '## Pricing',
    '',
    'Solo $39/mo, Pro $79/mo, Team $149/mo, Enterprise from $399/mo. Solo, Pro, and Team each include one active practice; multiple practices are on Enterprise. Trial and demo workspaces are available.',
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
    '## Reference pages',
    '',
    `- Multi-state filing deadlines guide: ${getMarketingUrl('/guides/multi-state-filing-deadlines')}`,
    `- State coverage: ${getMarketingUrl('/state-coverage')}`,
    `- Rule library: ${getMarketingUrl('/rules')}`,
    `- Pricing: ${getMarketingUrl('/pricing')}`,
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
