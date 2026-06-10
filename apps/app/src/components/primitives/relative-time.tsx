import { formatDateTimeWithTimezone, formatRelativeTime } from '@/lib/utils'

// Canonical pair for surfaces where a CPA scans for recency (Inbox,
// member LAST ACTIVE / JOINED,
// any "received at" / "last update" tail). Renders a scannable
// "2 days ago" / "3h ago" / "just now" string with the full
// `YYYY-MM-DD HH:MM:SS TZ` value as a `title` tooltip — so no
// precision is lost when the user needs it.
//
// For high-precision surfaces (audit log, evidence chain), keep
// using `formatDateTimeWithTimezone` directly — those readers WANT
// the second.
interface RelativeTimeProps {
  value: string
  timeZone: string
  className?: string
}

export function RelativeTime({ value, timeZone, className }: RelativeTimeProps) {
  const relative = formatRelativeTime(value)
  const absolute = formatDateTimeWithTimezone(value, timeZone)
  if (!relative) return null
  return (
    <time dateTime={value} title={absolute} className={className}>
      {relative}
    </time>
  )
}
