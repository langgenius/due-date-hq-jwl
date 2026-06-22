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

/**
 * Whole-dollar price formatting for billing-plan display ($19, $89,
 * $1,329). Used in `routes/billing.tsx` + `routes/billing.checkout.tsx`
 * where the price source is already integers in dollars (not cents,
 * unlike `formatCents`). Locale-respecting (the previous hand-rolled
 * `$${n.toLocaleString('en-US')}` hard-coded en-US).
 *
 * 0 fraction digits — billing plan prices are always whole dollars.
 * If a future plan adds a `.99` SKU, switch to `formatCents` and
 * multiply the source.
 */
export function formatDollarPrice(dollars: number): string {
  return new Intl.NumberFormat(intlLocale(), {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(dollars)
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

export function formatDateWithTimezone(value: string, timeZone: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value

  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return value

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    numberingSystem: 'latn',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
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
  const parts = new Intl.DateTimeFormat(intlLocale(), {
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

/**
 * Prose-format a timestamp for user-facing UI: "May 18, 2026, 2:20 AM PDT".
 * The datetime sibling of `formatDatePretty` — use it wherever a CPA reads
 * a moment in time (settings panes, import history, sync status).
 * `formatDateTimeWithTimezone` (ISO `YYYY-MM-DD HH:mm:ss`) stays for
 * audit-ledger rows and exports, where machine precision is the point.
 */
export function formatDateTimePretty(value: string, timeZone: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(intlLocale(), {
    timeZone,
    numberingSystem: 'latn',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date)
}

// The ISO `2026-05-01 02:50:00 PDT` shape `formatDateTimeWithTimezone`
// returns is the right
// answer for audit-log rows (where precision is the value) but the
// wrong answer for inbox + members LAST_ACTIVE surfaces (where a
// CPA scans for recency, not exact second). This helper returns a
// scannable, locale-aware "2 days ago" / "3 hours ago" / "now" string
// (zh-CN: "2天前" / "3小时前" / "现在") via `Intl.RelativeTimeFormat`, so
// the phrasing follows the active locale with no catalog strings. Callers
// pair it with the absolute string on hover via the `title` attr so
// no precision is lost — see `<RelativeTime>` below for the
// canonical pattern.
//
// Buckets, in order of dominance (phrasing comes from the Intl runtime
// per locale; shown here in en for reference):
//   < 45s            → "now"
//   < 60min          → "N minutes ago" / "in N minutes"
//   < 24h            → "N hours ago" / "in N hours"
//   < 7d             → "N days ago" / "in N days"
//   ≥ 7d & past      → absolute date ("Jun 4" / "Jun 4, 2025")
//   < 30d & future   → "in N weeks"
//   < 365d & future  → "in N months"
//   otherwise future → "in N years"
const MS_PER_MINUTE = 60_000
const MS_PER_HOUR = 60 * MS_PER_MINUTE
const MS_PER_DAY = 24 * MS_PER_HOUR
const MS_PER_WEEK = 7 * MS_PER_DAY
const MS_PER_MONTH = 30 * MS_PER_DAY
const MS_PER_YEAR = 365 * MS_PER_DAY

export function formatRelativeTime(value: string, now: Date = new Date()): string {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  const diffMs = now.getTime() - date.getTime()
  const past = diffMs >= 0
  const abs = Math.abs(diffMs)

  // Locale-aware relative formatting (`numeric: 'auto'` yields "now",
  // "yesterday", "in 3 days" in en; the same buckets in zh-CN: "现在",
  // "3天前", "3天后"). No new catalog strings — the Intl runtime owns the
  // phrasing per locale. Signed value: negative = past, positive = future
  // (the inverse of `diffMs`, which is now − then).
  const rtf = new Intl.RelativeTimeFormat(intlLocale(), { numeric: 'auto' })
  const rel = (n: number, unit: Intl.RelativeTimeFormatUnit): string =>
    rtf.format(past ? -n : n, unit)

  if (abs < 45_000) return rtf.format(0, 'second')

  if (abs < MS_PER_HOUR) return rel(Math.round(abs / MS_PER_MINUTE), 'minute')
  if (abs < MS_PER_DAY) return rel(Math.round(abs / MS_PER_HOUR), 'hour')
  if (abs < MS_PER_WEEK) return rel(Math.round(abs / MS_PER_DAY), 'day')

  // Past the 1-week mark, "2 weeks ago" / "1 month ago" tell the CPA basically
  // nothing — the original date is more informative AND less ambiguous
  // (does "1mo" mean 30 days or "early last month"?).
  // Switch to absolute, locale-aware formatting once we're outside the
  // human-meaningful relative window. Format:
  //   • Same year → "Jun 4"          (e.g. "Jun 4")
  //   • Different year → "Jun 4, 2025"
  // Future dates (past === false) keep the relative format because
  // "in 3 months" is a plan, not a memory.
  if (past) {
    const sameYear = date.getFullYear() === now.getFullYear()
    return new Intl.DateTimeFormat(intlLocale(), {
      month: 'short',
      day: 'numeric',
      ...(sameYear ? {} : { year: 'numeric' }),
    }).format(date)
  }
  if (abs < MS_PER_MONTH) return rel(Math.round(abs / MS_PER_WEEK), 'week')
  if (abs < MS_PER_YEAR) return rel(Math.round(abs / MS_PER_MONTH), 'month')
  return rel(Math.round(abs / MS_PER_YEAR), 'year')
}

/**
 * Whole-day count from start → end, floored at zero. Both inputs are
 * ISO-8601 date or datetime strings. Used for cycle-time / aging
 * calculations where partial days round to whole days.
 */
export function daysBetween(startIso: string, endIso: string): number {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime()
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)))
}
