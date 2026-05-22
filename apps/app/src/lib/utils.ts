export { cn } from '@duedatehq/ui/lib/utils'

import { INTL_LOCALE } from '@duedatehq/i18n'
import { currentLocale } from '@/i18n/i18n'

function intlLocale(): string {
  return INTL_LOCALE[currentLocale()]
}

// Monetary cents → "$1,234.56" when fractional, "$1,234" when whole.
// Always pair with `font-mono tabular-nums` (docs/dev-file/05 §5.2).
//
// `trailingZeroDisplay: 'stripIfInteger'` removes the `.00` tail for
// whole-dollar amounts. The previous always-2-decimals version put
// `.00` noise on every filing-plan row (the demo's $88,000.00 reads
// as $88,000 now).
export function formatCents(cents: number): string {
  return new Intl.NumberFormat(intlLocale(), {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    trailingZeroDisplay: 'stripIfInteger',
  }).format(cents / 100)
}

function localTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

function readPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPart['type']): string {
  return parts.find((part) => part.type === type)?.value ?? ''
}

export function formatDate(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10)

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: localTimeZone(),
    numberingSystem: 'latn',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value))
  return `${readPart(parts, 'year')}-${readPart(parts, 'month')}-${readPart(parts, 'day')}`
}

/**
 * Prose-format a date for user-facing UI: "May 6, 2026" (or just "May 6"
 * when the date is in the current year so the year tag doesn't add noise
 * to the daily-driver surfaces).
 *
 * Use this for any human-facing date string the user reads. `formatDate`
 * (ISO `YYYY-MM-DD`) stays for sort attributes, `data-*` props, audit-log
 * meta, and CSV exports — anywhere a machine consumes the value.
 *
 * Pass `{ alwaysShowYear: true }` when the surface ambiguates across
 * multiple tax years (e.g. filing-plan year headers).
 */
export function formatDatePretty(
  value: string,
  options: { alwaysShowYear?: boolean } = {},
): string {
  const date = parseDateInput(value)
  if (!date) return value
  const includeYear =
    options.alwaysShowYear === true || date.getUTCFullYear() !== new Date().getUTCFullYear()
  return new Intl.DateTimeFormat(intlLocale(), {
    timeZone: 'UTC',
    numberingSystem: 'latn',
    month: 'short',
    day: 'numeric',
    ...(includeYear ? { year: 'numeric' } : {}),
  }).format(date)
}

function parseDateInput(value: string): Date | null {
  // Date-only inputs (`YYYY-MM-DD`) are normalized to UTC midnight so the
  // user's local time zone doesn't shift them a day backward. ISO-with-time
  // inputs stay untouched.
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (dateOnly) {
    const year = Number.parseInt(dateOnly[1] ?? '', 10)
    const month = Number.parseInt(dateOnly[2] ?? '', 10)
    const day = Number.parseInt(dateOnly[3] ?? '', 10)
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null
    return new Date(Date.UTC(year, month - 1, day))
  }
  const parsed = new Date(value)
  return Number.isFinite(parsed.getTime()) ? parsed : null
}

export function formatDateTimeWithTimezone(value: string, timeZone: string): string {
  const date = new Date(value)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    numberingSystem: 'latn',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    timeZoneName: 'short',
  }).formatToParts(date)

  const zoneName = readPart(parts, 'timeZoneName') || timeZone
  return `${readPart(parts, 'year')}-${readPart(parts, 'month')}-${readPart(parts, 'day')} ${readPart(parts, 'hour')}:${readPart(parts, 'minute')}:${readPart(parts, 'second')} ${zoneName}`
}
