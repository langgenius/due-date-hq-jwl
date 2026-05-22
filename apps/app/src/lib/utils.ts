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
