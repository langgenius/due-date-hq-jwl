/**
 * /calendar/federal-deadlines-2026.ics — subscribable federal deadline calendar.
 *
 * Every date is the verified original from the rule keyDates dataset, with the
 * 26 U.S.C. §7503 weekend shift APPLIED and noted (2026 shifts: Jan 31→Feb 2,
 * Mar 15→Mar 16, Nov 15→Nov 16 — computed, none lands on a legal holiday).
 * Calendar-year filers. CPAs subscribe once in Outlook/Google and the firm's
 * calendar stays honest — the recurring-touchpoint linkable asset.
 */
import type { APIRoute } from 'astro'
import { getContentDates } from '../../lib/content-metadata'

interface Ev {
  /** effective (shifted) date, YYYYMMDD */
  date: string
  summary: string
  /** original statutory date if shifted, for the note */
  shiftedFrom?: string
  url: string
}

const EVENTS: Ev[] = [
  {
    date: '20260115',
    summary: 'Q4 2025 estimated tax due (Form 1040-ES)',
    url: 'https://duedatehq.com/rules/1040-es-estimated-tax-deadline',
  },
  {
    date: '20260202',
    summary: 'W-2/W-3, 1099-NEC, Form 941 Q4, Form 940 due',
    shiftedFrom: 'Jan 31 (Saturday)',
    url: 'https://duedatehq.com/rules/form-w-2-filing-deadline',
  },
  {
    date: '20260316',
    summary: 'Forms 1065 & 1120-S due (calendar year)',
    shiftedFrom: 'Mar 15 (Sunday)',
    url: 'https://duedatehq.com/rules/partnership-form-1065-deadline',
  },
  {
    date: '20260415',
    summary: 'Forms 1040, 1120, 1041, 709 + Q1 estimated tax due',
    url: 'https://duedatehq.com/rules/form-1040-individual-deadline',
  },
  {
    date: '20260430',
    summary: 'Form 941 Q1 due',
    url: 'https://duedatehq.com/rules/941-payroll-tax-deadline',
  },
  {
    date: '20260515',
    summary: 'Form 990 series due (calendar year)',
    url: 'https://duedatehq.com/rules/990-nonprofit-filing-deadline',
  },
  {
    date: '20260615',
    summary: 'Q2 estimated tax due (Form 1040-ES)',
    url: 'https://duedatehq.com/rules/1040-es-estimated-tax-deadline',
  },
  {
    date: '20260731',
    summary: 'Form 941 Q2 + Form 5500 due',
    url: 'https://duedatehq.com/rules/form-5500-benefit-plan-deadline',
  },
  {
    date: '20260915',
    summary: 'Q3 estimated tax + extended 1065/1120-S due',
    url: 'https://duedatehq.com/rules/partnership-form-1065-deadline',
  },
  {
    date: '20260930',
    summary: 'Extended Form 1041 due',
    url: 'https://duedatehq.com/rules/form-1041-estate-trust-deadline',
  },
  {
    date: '20261015',
    summary: 'Extended Forms 1040 & 1120 due',
    url: 'https://duedatehq.com/rules/form-1040-individual-deadline',
  },
  {
    date: '20261116',
    summary: 'Extended Form 990 due',
    shiftedFrom: 'Nov 15 (Sunday)',
    url: 'https://duedatehq.com/rules/990-nonprofit-filing-deadline',
  },
]

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,')

export const GET: APIRoute = () => {
  const { reviewedOn } = getContentDates('deadline-lookup')
  const stamp = `${reviewedOn.replace(/-/g, '')}T000000Z`
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DueDateHQ//Federal Tax Deadlines 2026//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:US Federal Tax Deadlines 2026 (DueDateHQ)',
    'X-WR-CALDESC:Verified federal filing deadlines for calendar-year filers with weekend shifts applied (26 U.S.C. §7503). Source-checked by DueDateHQ — not tax advice.',
  ]
  for (const ev of EVENTS) {
    const note = ev.shiftedFrom
      ? ` Statutory date ${ev.shiftedFrom} falls on a weekend — shifted to the next business day under 26 U.S.C. §7503.`
      : ''
    lines.push(
      'BEGIN:VEVENT',
      `UID:ddhq-2026-${ev.date}-${ev.url.split('/').pop()}@duedatehq.com`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ev.date}`,
      `SUMMARY:${esc(ev.summary)}`,
      `DESCRIPTION:${esc(`Calendar-year filers.${note} Details and official source: ${ev.url} — full lookup: https://duedatehq.com/deadline-lookup`)}`,
      `URL:${ev.url}`,
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  return new Response(lines.join('\r\n') + '\r\n', {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
  })
}
