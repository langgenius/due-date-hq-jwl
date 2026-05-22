import { createDb, firmSchema, scoped } from '@duedatehq/db'
import { eq } from 'drizzle-orm'
import type { Env } from '../env'
import { enqueueDashboardBriefRefresh } from './dashboard-brief/enqueue'
import { runPulseIngest } from './pulse/ingest'
import { linkPulseSourceSignals } from './pulse/signals'
import { dispatchDeadlineReminders } from './reminders/dispatch'
import { dispatchMorningDigests } from './notifications/morning-digest'
import { enqueueDueRuleRegistryReconcile, enqueueRuleRegistryCatalogSync } from './rules/reconcile'

function localTimeParts(
  timezone: string,
  date: Date,
): { hour: number; minute: number; weekday: string } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0')
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '0')
  const weekday = parts.find((part) => part.type === 'weekday')?.value ?? 'Mon'
  return { hour, minute, weekday }
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

export function shouldEnqueueScheduledDashboardBrief(input: {
  timezone: string
  now: Date
  hasCriticalRisk: boolean
}): boolean {
  const { hour, minute, weekday } = localTimeParts(input.timezone, input.now)
  if (hour !== 7 || minute >= 30) return false
  if ((weekday === 'Sat' || weekday === 'Sun') && !input.hasCriticalRisk) return false
  return true
}

async function hasCriticalDashboardRisk(
  env: Env,
  firmId: string,
  asOfDate: string,
): Promise<boolean> {
  const db = createDb(env.DB)
  const repo = scoped(db, firmId)
  const snapshot = await repo.dashboard.load({
    asOfDate,
    windowDays: 7,
    topLimit: 20,
  })
  return snapshot.topRows.some((row) => row.severity === 'critical')
}

async function enqueueScheduledDashboardBriefs(env: Env, now: Date): Promise<void> {
  const db = createDb(env.DB)
  const firms = await db
    .select({
      id: firmSchema.firmProfile.id,
      timezone: firmSchema.firmProfile.timezone,
    })
    .from(firmSchema.firmProfile)
    .where(eq(firmSchema.firmProfile.status, 'active'))

  await Promise.all(
    firms.map(async (firm) => {
      const asOfDate = dateInTimezone(firm.timezone, now)
      const { weekday } = localTimeParts(firm.timezone, now)
      const hasCriticalRisk =
        weekday === 'Sat' || weekday === 'Sun'
          ? await hasCriticalDashboardRisk(env, firm.id, asOfDate)
          : false
      if (
        !shouldEnqueueScheduledDashboardBrief({
          timezone: firm.timezone,
          now,
          hasCriticalRisk,
        })
      ) {
        return
      }
      await enqueueDashboardBriefRefresh(env, {
        firmId: firm.id,
        scope: 'firm',
        asOfDate,
        reason: 'scheduled',
        bypassDebounce: true,
      })
    }),
  )
}

// Cron Trigger entry — fan out by cron expression in Phase 0.
// Current schedule: */30 * * * * (see wrangler.toml). Drives Pulse ingest + reminders.
export async function scheduled(
  controller: ScheduledController,
  env: Env,
  _ctx: ExecutionContext,
): Promise<void> {
  const now = new Date(controller.scheduledTime)
  const pulseJobs = async () => {
    await runPulseIngest(env)
    await linkPulseSourceSignals(env)
  }
  await Promise.all([
    enqueueRuleRegistryCatalogSync(env),
    enqueueDueRuleRegistryReconcile(env, now),
    enqueueScheduledDashboardBriefs(env, now),
    pulseJobs(),
    dispatchDeadlineReminders(env, now),
    dispatchMorningDigests(env, now),
    env.EMAIL_QUEUE.send({ type: 'email.flush' }),
  ])
}
