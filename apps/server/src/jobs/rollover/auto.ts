import { createDb, firmSchema, scoped } from '@duedatehq/db'
import { eq } from 'drizzle-orm'
import type { Env } from '../../env'
import { runAnnualRollover } from '../../procedures/obligations/_annual-rollover'

/**
 * Scheduled auto-projection. Generates NEXT filing year's deadlines as projected
 * (confirmed=false) so the pipeline is always pre-populated for planning — the
 * scheduled twin of the manual annual rollover.
 *
 * Runs only in the back half of the filing year (September onward), once daily
 * ~6am firm-local, when the current season is wrapping and CPAs plan next year.
 * Idempotent by construction: the obligation unique index means a re-run creates
 * nothing new for already-rolled clients (duplicate disposition), and projected
 * output never emails clients (Phase 1 reminder gate) — a CPA still confirms.
 */
export const AUTO_ROLLOVER_START_MONTH = 9
export const AUTO_ROLLOVER_ACTOR = 'system'

function localTimeParts(timezone: string, date: Date): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)
  return {
    hour: Number(parts.find((part) => part.type === 'hour')?.value ?? '0'),
    minute: Number(parts.find((part) => part.type === 'minute')?.value ?? '0'),
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
 * should run for the given firm-local time, else null. The cadence (~6am daily,
 * once it is past AUTO_ROLLOVER_START_MONTH) keeps the work to roughly once per
 * firm per day during the rollover season.
 */
export function autoRolloverTarget(
  localDate: string,
  hour: number,
  minute: number,
): { sourceFilingYear: number; targetFilingYear: number } | null {
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
      const { hour, minute } = localTimeParts(firm.timezone, now)
      const target = autoRolloverTarget(dateInTimezone(firm.timezone, now), hour, minute)
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
