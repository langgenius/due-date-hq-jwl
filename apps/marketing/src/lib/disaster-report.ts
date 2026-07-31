/**
 * disaster-report.ts — computed statistics behind /irs-disaster-relief/by-the-numbers.
 *
 * Every number on the report page comes from here, and everything here is
 * computed from the joined dataset (lib/disaster-dataset.ts → the 2020–present
 * archive + current verified notices). Nothing is hand-written, so the report
 * can never drift from the downloadable data. The one derived metric — "runway",
 * days from the IRS announcement (issuedOn) to the postponed deadline — is
 * defined here once and labeled on the page exactly that way; it is NOT the
 * length of the postponement window (the archive does not carry incident start
 * dates), and must never be presented as such.
 */
import { getDisasterDatasetRows, type DisasterDatasetRow } from './disaster-dataset'

/** Parse the IRS's verbatim issuance date strings ("July 13, 2026", "Dec. 23, 2025",
 *  "Sept. 28, 2026"). Returns null rather than guessing on anything unexpected. */
export function parseIrsDate(s: string | null): Date | null {
  if (!s) return null
  const MONTHS: Record<string, number> = {
    january: 0,
    jan: 0,
    february: 1,
    feb: 1,
    march: 2,
    mar: 2,
    april: 3,
    apr: 3,
    may: 4,
    june: 5,
    jun: 5,
    july: 6,
    jul: 6,
    august: 7,
    aug: 7,
    september: 8,
    sep: 8,
    sept: 8,
    october: 9,
    oct: 9,
    november: 10,
    nov: 10,
    december: 11,
    dec: 11,
  }
  const m = s.trim().match(/^([A-Za-z]+)\.?\s+(\d{1,2}),\s*(\d{4})$/)
  if (!m) return null
  const month = MONTHS[m[1].toLowerCase()]
  if (month === undefined) return null
  return new Date(Date.UTC(Number(m[3]), month, Number(m[2])))
}

export interface DisasterReport {
  total: number
  fromYear: number
  toYear: number
  statesAffected: number
  liveNow: number
  /** Notices per year, ascending year order. */
  byYear: { year: number; count: number }[]
  peakYear: { year: number; count: number }
  /** Top states by notice count, descending. */
  topStates: { state: string; abbreviation: string | null; count: number }[]
  /** Announcement seasonality: counts by month of the IRS issuance date. */
  byMonth: { month: string; count: number }[]
  /** Runway = days from IRS announcement to the postponed deadline. */
  runway: { median: number; mean: number; max: number; maxRow: DisasterDatasetRow; sample: number }
}

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

export function getDisasterReport(today: Date = new Date()): DisasterReport {
  const rows = getDisasterDatasetRows(today)

  const years = rows.map((r) => r.year)
  const fromYear = Math.min(...years)
  const toYear = Math.max(...years)

  const yearCounts = new Map<number, number>()
  for (const r of rows) yearCounts.set(r.year, (yearCounts.get(r.year) ?? 0) + 1)
  const byYear = [...yearCounts.entries()]
    .map(([year, count]) => ({ year, count }))
    .toSorted((a, b) => a.year - b.year)
  const peakYear = byYear.reduce((a, b) => (b.count > a.count ? b : a))

  const stateCounts = new Map<string, { abbreviation: string | null; count: number }>()
  for (const r of rows) {
    if (!r.state) continue
    const cur = stateCounts.get(r.state)
    if (cur) cur.count += 1
    else stateCounts.set(r.state, { abbreviation: r.abbreviation, count: 1 })
  }
  const topStates = [...stateCounts.entries()]
    .map(([state, v]) => ({ state, abbreviation: v.abbreviation, count: v.count }))
    .toSorted((a, b) => b.count - a.count || a.state.localeCompare(b.state))
    .slice(0, 10)

  const monthCounts = Array.from({ length: 12 }, () => 0)
  const runways: { days: number; row: DisasterDatasetRow }[] = []
  for (const r of rows) {
    const issued = parseIrsDate(r.issuedOn)
    if (!issued) continue
    monthCounts[issued.getUTCMonth()] += 1
    if (r.deadline) {
      const deadline = new Date(`${r.deadline}T00:00:00Z`)
      const days = Math.round((deadline.getTime() - issued.getTime()) / 86_400_000)
      // Guard against data errors — a deadline before its announcement would be
      // a transcription bug, not a fact worth aggregating.
      if (days >= 0) runways.push({ days, row: r })
    }
  }
  const sortedDays = runways.map((r) => r.days).toSorted((a, b) => a - b)
  const median =
    sortedDays.length % 2 === 1
      ? sortedDays[(sortedDays.length - 1) / 2]
      : Math.round((sortedDays[sortedDays.length / 2 - 1] + sortedDays[sortedDays.length / 2]) / 2)
  const mean = Math.round(sortedDays.reduce((a, b) => a + b, 0) / sortedDays.length)
  const maxEntry = runways.reduce((a, b) => (b.days > a.days ? b : a))

  return {
    total: rows.length,
    fromYear,
    toYear,
    statesAffected: stateCounts.size,
    liveNow: rows.filter((r) => r.status === 'live').length,
    byYear,
    peakYear,
    topStates,
    byMonth: MONTH_LABELS.map((month, i) => ({ month, count: monthCounts[i] })),
    runway: {
      median,
      mean,
      max: maxEntry.days,
      maxRow: maxEntry.row,
      sample: runways.length,
    },
  }
}
