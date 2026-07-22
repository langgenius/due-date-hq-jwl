export const EASTERN_TIME_ZONE = 'America/New_York'
export const X_DAILY_SLOT_HOUR = 9
const EASTERN_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: EASTERN_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

export interface EasternTimeParts {
  localDate: string
  hour: number
  minute: number
}

export function easternTimeParts(now: Date): EasternTimeParts {
  if (Number.isNaN(now.getTime())) throw new Error('A valid scheduled time is required.')
  const parts = new Map(
    EASTERN_FORMATTER.formatToParts(now)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  )
  const year = requiredPart(parts, 'year')
  const month = requiredPart(parts, 'month')
  const day = requiredPart(parts, 'day')
  const hour = Number(requiredPart(parts, 'hour'))
  const minute = Number(requiredPart(parts, 'minute'))

  return { localDate: `${year}-${month}-${day}`, hour, minute }
}
export function shouldRunXDailySlot(now: Date): boolean {
  const { hour, minute } = easternTimeParts(now)
  return hour === X_DAILY_SLOT_HOUR && minute < 30
}

/**
 * The first ET calendar date that a normal daily Cron can still publish on.
 *
 * The HTTP queue preview is deliberately conservative at 09:00 itself: the
 * 09:00 scheduled event is already due, so an unclaimed preview starts on the
 * following day instead of racing the Cron handler.
 */
export function nextXDailySlotLocalDate(now: Date): string {
  const { localDate, hour } = easternTimeParts(now)
  return hour < X_DAILY_SLOT_HOUR ? localDate : addLocalCalendarDays(localDate, 1)
}

/** Add whole ET calendar days without adding 24-hour UTC durations across DST. */
export function addLocalCalendarDays(localDate: string, days: number): string {
  if (!Number.isInteger(days)) throw new Error('Calendar day offset must be an integer.')
  const { year, month, day } = parseLocalDate(localDate)
  const value = new Date(Date.UTC(year, month - 1, day + days))
  return value.toISOString().slice(0, 10)
}

/** Resolve the normal 09:00 America/New_York publishing slot to an exact instant. */
export function xDailySlotInstant(localDate: string): Date {
  return easternLocalInstant(localDate, X_DAILY_SLOT_HOUR)
}

/** Resolve one ET calendar day's exact UTC bounds without assuming a 24-hour DST day. */
export function easternDayBounds(localDate: string): { start: Date; end: Date } {
  return {
    start: easternLocalInstant(localDate, 0),
    end: easternLocalInstant(addLocalCalendarDays(localDate, 1), 0),
  }
}

function easternLocalInstant(localDate: string, hour: number): Date {
  const { year, month, day } = parseLocalDate(localDate)
  const targetLocalMs = Date.UTC(year, month - 1, day, hour)
  let candidateMs = targetLocalMs

  // Iteratively correct the UTC guess by the wall-clock difference returned
  // by Intl. Midnight and 09:00 ET are outside DST's skipped/repeated hours,
  // so this converges to one unambiguous instant in at most two passes.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = easternTimeParts(new Date(candidateMs))
    const candidateDate = parseLocalDate(parts.localDate)
    const representedLocalMs = Date.UTC(
      candidateDate.year,
      candidateDate.month - 1,
      candidateDate.day,
      parts.hour,
      parts.minute,
    )
    const difference = targetLocalMs - representedLocalMs
    if (difference === 0) return new Date(candidateMs)
    candidateMs += difference
  }

  throw new Error(`Unable to resolve the Eastern daily slot for ${localDate}.`)
}

function requiredPart(parts: ReadonlyMap<string, string>, key: string): string {
  const value = parts.get(key)
  if (!value) throw new Error(`Unable to resolve Eastern time ${key}.`)
  return value
}

function parseLocalDate(localDate: string): { year: number; month: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(localDate)
  if (!match) throw new Error('Local date must use YYYY-MM-DD.')
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const parsed = new Date(Date.UTC(year, month - 1, day))
  if (parsed.toISOString().slice(0, 10) !== localDate) {
    throw new Error('Local date must be a real calendar date.')
  }
  return { year, month, day }
}
