const EASTERN_TIME_ZONE = 'America/New_York'
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

interface EasternTimeParts {
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
  return hour === 9 && minute < 30
}

function requiredPart(parts: ReadonlyMap<string, string>, key: string): string {
  const value = parts.get(key)
  if (!value) throw new Error(`Unable to resolve Eastern time ${key}.`)
  return value
}
