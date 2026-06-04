import { createDb, firmSchema, scoped } from '@duedatehq/db'
import { eq } from 'drizzle-orm'
import type { Env } from '../../env'
import { runAnnualRollover } from '../../procedures/obligations/_annual-rollover'

/**
 * Scheduled auto-projection. Generates NEXT filing year's deadlines as projected
 * (confirmed=false) so the pipeline is always pre-populated for planning — the
 * scheduled twin of the manual annual rollover.
 *
 * Runs only in the back half of the filing year (September onward), weekly on
 * Mondays ~6am firm-local, when the current season is wrapping and CPAs plan next
 * year. The weekly (not daily) cadence is the compute guard — see autoRolloverTarget.
 * Idempotent by construction: the obligation unique index means a re-run creates
 * nothing new for already-rolled clients (duplicate disposition), and projected
 * output never emails clients (Phase 1 reminder gate) — a CPA still confirms.
 */
export const AUTO_ROLLOVER_START_MONTH = 9
// Weekly throttle: the auto scan fires one day a week, not daily. This is the
// compute guard against re-running the full rollover for every firm every day
// across the Sept–Dec season; a late-completing prior-year return is still picked
// up at the next weekly scan (≤7 days), immaterial for a next-year planning deadline.
export const AUTO_ROLLOVER_WEEKDAY = 'Mon'
export const AUTO_ROLLOVER_ACTOR = 'system'

function localTimeParts(
  timezone: string,
  date: Date,
): { hour: number; minute: number; weekday: string } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
  }).formatToParts(date)
  return {
    hour: Number(parts.find((part) => part.type === 'hour')?.value ?? '0'),
    minute: Number(parts.find((part) => part.type === 'minute')?.value ?? '0'),
    weekday: parts.find((part) => part.type === 'weekday')?.value ?? '',
  }
}

function dateInTimezone(timezone: string, date: Date): string {
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

/**
 * Pure window guard. Returns the source/target filing years when auto-rollover
 * should run for the given firm-local time, else null. It fires at most once per
 * firm per week — on AUTO_ROLLOVER_WEEKDAY, in the 6:00–6:29 slot, from
 * AUTO_ROLLOVER_START_MONTH onward. The weekly throttle is the compute guard: a
 * daily full rollover across every firm all season is wasteful once the first scan
 * has run, so we throttle to weekly while still catching late (extension-season)
 * completers within ≤7 days.
 */
export function autoRolloverTarget(
  localDate: string,
  hour: number,
  minute: number,
  weekday: string,
): { sourceFilingYear: number; targetFilingYear: number } | null {
  if (weekday !== AUTO_ROLLOVER_WEEKDAY) return null
  if (hour !== 6 || minute >= 30) return null
  const month = Number(localDate.slice(5, 7))
  if (!Number.isFinite(month) || month < AUTO_ROLLOVER_START_MONTH) return null
  const year = Number(localDate.slice(0, 4))
  if (!Number.isFinite(year)) return null
  return { sourceFilingYear: year, targetFilingYear: year + 1 }
}

export async function dispatchAutoRollover(env: Env, now = new Date()): Promise<void> {
  const db = createDb(env.DB)
  const firms = await db
    .select({
      id: firmSchema.firmProfile.id,
      timezone: firmSchema.firmProfile.timezone,
      monitoringStartDate: firmSchema.firmProfile.monitoringStartDate,
      internalDeadlineOffsetDays: firmSchema.firmProfile.internalDeadlineOffsetDays,
    })
    .from(firmSchema.firmProfile)
    .where(eq(firmSchema.firmProfile.status, 'active'))

  await Promise.all(
    firms.map(async (firm) => {
      const { hour, minute, weekday } = localTimeParts(firm.timezone, now)
      const target = autoRolloverTarget(dateInTimezone(firm.timezone, now), hour, minute, weekday)
      if (!target) return

      const result = await runAnnualRollover({
        scoped: scoped(db, firm.id),
        userId: AUTO_ROLLOVER_ACTOR,
        mode: 'create',
        params: target,
        internalDeadlineOffsetDays: firm.internalDeadlineOffsetDays,
        monitoringStartDate: firm.monitoringStartDate,
        now,
      })

      console.info(
        JSON.stringify({
          type: 'auto_rollover.firm',
          at: now.toISOString(),
          firmId: firm.id,
          targetFilingYear: target.targetFilingYear,
          createdCount: result.summary.createdCount,
          reviewCount: result.summary.reviewCount,
        }),
      )
    }),
  )
}
