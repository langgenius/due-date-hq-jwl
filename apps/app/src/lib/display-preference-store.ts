type DateFormatPreference = 'mmm_d_yyyy' | 'mm_dd_yyyy' | 'yyyy_mm_dd'
type TimeFormatPreference = '12h' | '24h'

type DisplayPreferences = {
  dateFormat: DateFormatPreference
  timeFormat: TimeFormatPreference
}

const DISPLAY_PREFERENCE_STORAGE_KEY = 'duedatehq.display-preferences'
const DISPLAY_PREFERENCE_CHANGE_EVENT = 'duedatehq-display-preference-change'

const DEFAULT_DISPLAY_PREFERENCES: DisplayPreferences = {
  dateFormat: 'mmm_d_yyyy',
  timeFormat: '12h',
}

const DATE_FORMAT_LABELS: Record<DateFormatPreference, string> = {
  mmm_d_yyyy: 'MMM d, yyyy',
  mm_dd_yyyy: 'MM/dd/yyyy',
  yyyy_mm_dd: 'yyyy-MM-dd',
}

const DATE_FORMAT_OPTIONS: readonly DateFormatPreference[] = [
  'mmm_d_yyyy',
  'mm_dd_yyyy',
  'yyyy_mm_dd',
]

const TIME_FORMAT_OPTIONS: readonly TimeFormatPreference[] = ['12h', '24h']

let cachedDisplayPreferences: DisplayPreferences | null = null

function isDateFormatPreference(value: unknown): value is DateFormatPreference {
  return value === 'mmm_d_yyyy' || value === 'mm_dd_yyyy' || value === 'yyyy_mm_dd'
}

function isTimeFormatPreference(value: unknown): value is TimeFormatPreference {
  return value === '12h' || value === '24h'
}

function normalizeDisplayPreferences(value: unknown): DisplayPreferences {
  if (!value || typeof value !== 'object') return DEFAULT_DISPLAY_PREFERENCES

  const candidate = value as Partial<Record<keyof DisplayPreferences, unknown>>
  return {
    dateFormat: isDateFormatPreference(candidate.dateFormat)
      ? candidate.dateFormat
      : DEFAULT_DISPLAY_PREFERENCES.dateFormat,
    timeFormat: isTimeFormatPreference(candidate.timeFormat)
      ? candidate.timeFormat
      : DEFAULT_DISPLAY_PREFERENCES.timeFormat,
  }
}

function readStoredDisplayPreferences(storage: Storage): DisplayPreferences {
  const raw = storage.getItem(DISPLAY_PREFERENCE_STORAGE_KEY)
  if (!raw) return DEFAULT_DISPLAY_PREFERENCES

  try {
    return normalizeDisplayPreferences(JSON.parse(raw))
  } catch {
    return DEFAULT_DISPLAY_PREFERENCES
  }
}

function cacheStoredDisplayPreferences(storage: Storage, next: DisplayPreferences): void {
  cachedDisplayPreferences = next
  try {
    storage.setItem(DISPLAY_PREFERENCE_STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Keep the current tab reactive even when storage is unavailable.
  }
}

function clearStoredDisplayPreferencesCache(): void {
  cachedDisplayPreferences = null
}

function getStoredDisplayPreferences(): DisplayPreferences {
  if (cachedDisplayPreferences) return cachedDisplayPreferences

  try {
    cachedDisplayPreferences = readStoredDisplayPreferences(window.localStorage)
  } catch {
    cachedDisplayPreferences = DEFAULT_DISPLAY_PREFERENCES
  }
  return cachedDisplayPreferences
}

function getServerDisplayPreferences(): DisplayPreferences {
  return DEFAULT_DISPLAY_PREFERENCES
}

function syncFromStoredDisplayPreferences(onStoreChange: () => void): void {
  clearStoredDisplayPreferencesCache()
  getStoredDisplayPreferences()
  onStoreChange()
}

function subscribeToDisplayPreferences(onStoreChange: () => void): () => void {
  function handleStorageChange(event: StorageEvent) {
    if (event.key !== DISPLAY_PREFERENCE_STORAGE_KEY) return
    syncFromStoredDisplayPreferences(onStoreChange)
  }

  function handleCurrentTabChange() {
    onStoreChange()
  }

  window.addEventListener('storage', handleStorageChange)
  window.addEventListener(DISPLAY_PREFERENCE_CHANGE_EVENT, handleCurrentTabChange)

  return () => {
    window.removeEventListener('storage', handleStorageChange)
    window.removeEventListener(DISPLAY_PREFERENCE_CHANGE_EVENT, handleCurrentTabChange)
  }
}

function persistDisplayPreferences(next: DisplayPreferences): void {
  cacheStoredDisplayPreferences(window.localStorage, next)
  window.dispatchEvent(new Event(DISPLAY_PREFERENCE_CHANGE_EVENT))
}

function switchDateFormatPreference(next: DateFormatPreference): void {
  if (!isDateFormatPreference(next)) return
  persistDisplayPreferences({
    ...getStoredDisplayPreferences(),
    dateFormat: next,
  })
}

function switchTimeFormatPreference(next: TimeFormatPreference): void {
  if (!isTimeFormatPreference(next)) return
  persistDisplayPreferences({
    ...getStoredDisplayPreferences(),
    timeFormat: next,
  })
}

function readPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPart['type']): string {
  return parts.find((part) => part.type === type)?.value ?? ''
}

function formatDateParts(date: Date, timeZone: string, dateFormat: DateFormatPreference): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    numberingSystem: 'latn',
    year: 'numeric',
    month: dateFormat === 'mmm_d_yyyy' ? 'short' : '2-digit',
    day: dateFormat === 'mmm_d_yyyy' ? 'numeric' : '2-digit',
  }).formatToParts(date)

  const year = readPart(parts, 'year')
  const month = readPart(parts, 'month')
  const day = readPart(parts, 'day')

  if (dateFormat === 'mm_dd_yyyy') return `${month}/${day}/${year}`
  if (dateFormat === 'yyyy_mm_dd') return `${year}-${month}-${day}`
  return `${month} ${day}, ${year}`
}

function formatTimeParts(
  date: Date,
  timeZone: string,
  timeFormat: TimeFormatPreference,
): { time: string; zoneName: string } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    numberingSystem: 'latn',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: timeFormat === '24h' ? 'h23' : 'h12',
    timeZoneName: 'short',
  }).formatToParts(date)

  const time = `${readPart(parts, 'hour')}:${readPart(parts, 'minute')}:${readPart(parts, 'second')}`
  const dayPeriod = readPart(parts, 'dayPeriod')

  return {
    time: timeFormat === '12h' && dayPeriod ? `${time} ${dayPeriod}` : time,
    zoneName: readPart(parts, 'timeZoneName') || timeZone,
  }
}

function formatDateTimeWithDisplayPreferences(
  value: string,
  timeZone: string,
  preferences: DisplayPreferences,
): string {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return value

  const dateText = formatDateParts(date, timeZone, preferences.dateFormat)
  const { time, zoneName } = formatTimeParts(date, timeZone, preferences.timeFormat)
  return `${dateText} ${time} ${zoneName}`
}

export {
  DATE_FORMAT_LABELS,
  DATE_FORMAT_OPTIONS,
  DEFAULT_DISPLAY_PREFERENCES,
  DISPLAY_PREFERENCE_CHANGE_EVENT,
  DISPLAY_PREFERENCE_STORAGE_KEY,
  TIME_FORMAT_OPTIONS,
  clearStoredDisplayPreferencesCache,
  formatDateTimeWithDisplayPreferences,
  getServerDisplayPreferences,
  getStoredDisplayPreferences,
  subscribeToDisplayPreferences,
  switchDateFormatPreference,
  switchTimeFormatPreference,
  type DateFormatPreference,
  type DisplayPreferences,
  type TimeFormatPreference,
}
