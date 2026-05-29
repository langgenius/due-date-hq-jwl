const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/

export function dateInTimezone(timezone: string, date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value
  return `${year}-${month}-${day}`
}

export function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10)
}

export function isDateOnly(value: string): boolean {
  if (!DATE_ONLY_RE.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return toDateOnly(date) === value
}

export function isOnOrAfterDateOnly(value: string, floor: string): boolean {
  return isDateOnly(value) && isDateOnly(floor) && value >= floor
}
