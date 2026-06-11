import type {
  CalendarFeedObligationRow,
  CalendarFeedSubscriptionRow,
} from '@duedatehq/ports/calendar'

const MS_PER_DAY = 24 * 60 * 60 * 1000

export interface RenderCalendarFeedInput {
  appUrl: string
  generatedAt: Date
  subscription: CalendarFeedSubscriptionRow
  obligations: CalendarFeedObligationRow[]
}

function compactDate(value: Date): string {
  return value.toISOString().slice(0, 10).replaceAll('-', '')
}

function compactDateTime(value: Date): string {
  return value
    .toISOString()
    .replaceAll('-', '')
    .replaceAll(':', '')
    .replace(/\.\d{3}Z$/, 'Z')
}

function addDays(value: Date, days: number): Date {
  return new Date(value.getTime() + days * MS_PER_DAY)
}

function escapeText(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n')
    .replaceAll('\n', '\\n')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,')
}

function foldLine(value: string): string {
  if (value.length <= 75) return value
  const chunks: string[] = []
  let cursor = value
  while (cursor.length > 75) {
    chunks.push(cursor.slice(0, 75))
    cursor = ` ${cursor.slice(75)}`
  }
  chunks.push(cursor)
  return chunks.join('\r\n')
}

function icsLine(name: string, value: string): string {
  return foldLine(`${name}:${escapeText(value)}`)
}

function rawLine(value: string): string {
  return foldLine(value)
}

function appDeepLink(appUrl: string, obligationId: string): string {
  const baseUrl = appUrl.replace(/\/+$/, '')
  return `${baseUrl}/obligations?drawer=obligation&id=${encodeURIComponent(obligationId)}`
}

function eventSummary(
  row: CalendarFeedObligationRow,
  privacyMode: CalendarFeedSubscriptionRow['privacyMode'],
): string {
  return privacyMode === 'full'
    ? `${row.clientName}: ${row.taxType} deadline`
    : `${row.taxType} deadline`
}

function eventDescription(input: {
  row: CalendarFeedObligationRow
  privacyMode: CalendarFeedSubscriptionRow['privacyMode']
  dueDate: string
  url: string
}): string {
  const lines = [
    ...(input.privacyMode === 'full' ? [`Client: ${input.row.clientName}`] : []),
    `Tax type: ${input.row.taxType}`,
    `Due date: ${input.dueDate}`,
    `Status: ${input.row.status}`,
    `Readiness: ${input.row.readiness}`,
    `Open in DueDateHQ: ${input.url}`,
    '',
    'Subscribed from DueDateHQ. Calendar reminders are informational — DueDateHQ email and in-app reminders are authoritative.',
  ]
  return lines.join('\n')
}

function alarm(offsetDays: number, description: string): string[] {
  return [
    'BEGIN:VALARM',
    `TRIGGER:-P${offsetDays}D`,
    'ACTION:DISPLAY',
    icsLine('DESCRIPTION', description),
    'END:VALARM',
  ]
}

function emptyFeedComponent(input: RenderCalendarFeedInput): string[] {
  return [
    'BEGIN:VFREEBUSY',
    rawLine(`UID:calendar-subscription-${input.subscription.id}@duedatehq.com`),
    rawLine(`DTSTAMP:${compactDateTime(input.generatedAt)}`),
    rawLine(`DTSTART:${compactDateTime(input.generatedAt)}`),
    rawLine(`DTEND:${compactDateTime(addDays(input.generatedAt, 1))}`),
    icsLine('COMMENT', 'DueDateHQ calendar feed has no active deadlines in the current window.'),
    'END:VFREEBUSY',
  ]
}

export function renderCalendarFeed(input: RenderCalendarFeedInput): string {
  const calendarName =
    input.subscription.scope === 'firm'
      ? `${input.subscription.firmName} deadlines`
      : `${input.subscription.firmName} - My deadlines`
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DueDateHQ//Deadline Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    rawLine(`X-WR-CALNAME:${escapeText(calendarName)}`),
    rawLine(`X-WR-TIMEZONE:${escapeText(input.subscription.firmTimezone)}`),
  ]

  if (input.obligations.length === 0) {
    lines.push(...emptyFeedComponent(input))
  }

  for (const row of input.obligations) {
    const dueDate = compactDate(row.currentDueDate)
    const endDate = compactDate(addDays(row.currentDueDate, 1))
    const url = appDeepLink(input.appUrl, row.id)
    const summary = eventSummary(row, input.subscription.privacyMode)
    lines.push(
      'BEGIN:VEVENT',
      rawLine(`UID:obligation-${row.id}@duedatehq.com`),
      rawLine(`DTSTAMP:${compactDateTime(input.generatedAt)}`),
      rawLine(`LAST-MODIFIED:${compactDateTime(row.updatedAt)}`),
      rawLine(`DTSTART;VALUE=DATE:${dueDate}`),
      rawLine(`DTEND;VALUE=DATE:${endDate}`),
      'TRANSP:TRANSPARENT',
      icsLine('SUMMARY', summary),
      icsLine(
        'DESCRIPTION',
        eventDescription({
          row,
          privacyMode: input.subscription.privacyMode,
          dueDate: row.currentDueDate.toISOString().slice(0, 10),
          url,
        }),
      ),
      rawLine(`URL:${url}`),
      ...alarm(30, `${summary} due in 30 days`),
      ...alarm(7, `${summary} due in 7 days`),
      ...alarm(1, `${summary} due tomorrow`),
      'END:VEVENT',
    )
  }

  lines.push('END:VCALENDAR')
  return `${lines.join('\r\n')}\r\n`
}
