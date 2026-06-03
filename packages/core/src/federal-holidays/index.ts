/**
 * US federal holidays as *observed* (the days the IRS / DC government offices are
 * closed), used to roll statutory due dates off non-business days.
 *
 * Returns UTC ISO `YYYY-MM-DD` strings to match the holiday-set lookup in
 * `../date-logic` — `applyNextBusinessDay` compares `date.toISOString().slice(0,10)`
 * against the set, so the strings produced here must be UTC-based.
 *
 * Includes DC Emancipation Day (April 16, observed). It is a District of Columbia
 * holiday that the IRS treats as moving the nationwide individual filing deadline:
 * in years where April 15/16 collide with a weekend it pushes Tax Day later
 * (e.g. 2023 → April 18). Omitting it is the classic April-15 rollover bug.
 *
 * Scope: fixed + floating *federal* holidays + Emancipation Day. It does NOT model
 * ad-hoc IRS disaster-relief postponements (those are unpredictable and handled
 * through the rule/pulse reconciliation path, not a static calendar).
 */

function isoUtc(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/**
 * Observed date for a fixed-date federal holiday: a Saturday holiday is observed
 * the preceding Friday, a Sunday holiday the following Monday (5 U.S.C. §6103).
 */
function observedFixedHoliday(year: number, monthZeroBased: number, day: number): Date {
  const date = new Date(Date.UTC(year, monthZeroBased, day))
  const dayOfWeek = date.getUTCDay()
  if (dayOfWeek === 6) date.setUTCDate(date.getUTCDate() - 1)
  else if (dayOfWeek === 0) date.setUTCDate(date.getUTCDate() + 1)
  return date
}

/** The nth (1-based) occurrence of `weekday` (0=Sun … 6=Sat) in a month. */
function nthWeekdayOfMonth(year: number, monthZeroBased: number, weekday: number, n: number): Date {
  const first = new Date(Date.UTC(year, monthZeroBased, 1))
  const offset = (weekday - first.getUTCDay() + 7) % 7
  return new Date(Date.UTC(year, monthZeroBased, 1 + offset + (n - 1) * 7))
}

/** The last occurrence of `weekday` (0=Sun … 6=Sat) in a month. */
function lastWeekdayOfMonth(year: number, monthZeroBased: number, weekday: number): Date {
  const last = new Date(Date.UTC(year, monthZeroBased + 1, 0))
  const offset = (last.getUTCDay() - weekday + 7) % 7
  last.setUTCDate(last.getUTCDate() - offset)
  return last
}

/**
 * Observed US federal holidays for a calendar year, as UTC ISO date strings.
 * The returned list is sorted and de-duplicated.
 */
export function federalHolidaysForYear(year: number): string[] {
  const holidays = [
    observedFixedHoliday(year, 0, 1), // New Year's Day — Jan 1
    nthWeekdayOfMonth(year, 0, 1, 3), // Birthday of MLK Jr. — 3rd Monday of January
    nthWeekdayOfMonth(year, 1, 1, 3), // Washington's Birthday — 3rd Monday of February
    observedFixedHoliday(year, 3, 16), // DC Emancipation Day — Apr 16 (shifts the 4/15 deadline)
    lastWeekdayOfMonth(year, 4, 1), // Memorial Day — last Monday of May
    observedFixedHoliday(year, 5, 19), // Juneteenth — Jun 19
    observedFixedHoliday(year, 6, 4), // Independence Day — Jul 4
    nthWeekdayOfMonth(year, 8, 1, 1), // Labor Day — 1st Monday of September
    nthWeekdayOfMonth(year, 9, 1, 2), // Columbus Day — 2nd Monday of October
    observedFixedHoliday(year, 10, 11), // Veterans Day — Nov 11
    nthWeekdayOfMonth(year, 10, 4, 4), // Thanksgiving — 4th Thursday of November
    observedFixedHoliday(year, 11, 25), // Christmas — Dec 25
  ].map(isoUtc)

  // When Jan 1 of next year falls on a Saturday it is observed on Dec 31 of THIS
  // year — a closed day inside this year, so a late-December deadline must roll
  // past it. Include it only when the observed date actually lands in `year`.
  const nextNewYear = observedFixedHoliday(year + 1, 0, 1)
  if (nextNewYear.getUTCFullYear() === year) holidays.push(isoUtc(nextNewYear))

  return [...new Set(holidays)].toSorted()
}

/** Observed US federal holidays across several years, merged + de-duplicated. */
export function federalHolidaysForYears(years: readonly number[]): string[] {
  return [...new Set(years.flatMap((year) => federalHolidaysForYear(year)))].toSorted()
}
