import { createDb, makePulseOpsRepo } from '@duedatehq/db'
import type { Env } from '../env'
import { dispatchOpsAlert } from './ops-alerts'
import { retryFailedPulseExtractions } from './pulse/extract-retry'
import { enqueuePulseIngestScans } from './pulse/ingest'
import { recordPulseAlert } from './pulse/metrics'
import { dispatchDeadlineReminders } from './reminders/dispatch'
import { dispatchMorningDigests } from './notifications/morning-digest'
import { dispatchAutoRollover } from './rollover/auto'
import {
  enqueueDueRuleSourceScans,
  enqueueRuleDateReconciliation,
  enqueueRuleRegistryCatalogSync,
} from './rules/reconcile'

// 2026-06-10: the scheduled firm-brief fan-out (one enqueue per active
// firm per day + a weekend critical-risk probe per firm) was removed —
// the Everyone view's Today line is deterministic now, so firm-scope
// briefs are never displayed and the consumer drops them. Personal
// ('me') briefs self-heal on dashboard view instead.

export function shouldRunStillOpenWindowSweep(now: Date): boolean {
  // Cron fires every 30 min (see wrangler.toml); run the daily still-open-window
  // sweep in a single UTC slot so it does not re-fan-out 48× a day.
  return now.getUTCHours() === 9 && now.getUTCMinutes() < 30
}

// Re-fan-out still-open, high-value alert windows (protective-claim windows +
// unexpired deadline shifts) to all active firms once a day. This reaches firms
// that joined — or imported clients — after a change was approved, since the
// live fan-out only touches firms that exist at approval time. Dismiss-safe and
// count-refreshing via the repo's preserveStatus path.
async function refreshStillOpenAlertWindows(env: Env, now: Date): Promise<number> {
  if (!shouldRunStillOpenWindowSweep(now)) return 0
  const db = createDb(env.DB)
  return makePulseOpsRepo(db).refreshStillOpenWindowsForAllFirms(now)
}

const PULSE_HEALTH_WINDOW_MS = 6 * 60 * 60 * 1000
const PULSE_HEALTH_MIN_ATTEMPTS = 8
const PULSE_HEALTH_FAILURE_RATE_THRESHOLD = 0.5

// Canary for the AI extraction pipeline. If most recent extraction attempts are
// failing (provider down / out of credits / excerpt rejects), emit a pulse.alert
// so a stalled pipeline is observable within a tick — the signal the 2026-06
// multi-day, zero-alert outage silently lacked. Runs every 30-min tick over a
// rolling window; downstream alerting dedupes the repeated signal.
async function checkPulseExtractionHealth(env: Env, now: Date): Promise<void> {
  const db = createDb(env.DB)
  const { extracted, failed } = await makePulseOpsRepo(db).countRecentExtractionOutcomes({
    sinceMs: PULSE_HEALTH_WINDOW_MS,
    now,
  })
  const attempted = extracted + failed
  if (attempted < PULSE_HEALTH_MIN_ATTEMPTS) return
  const failureRate = failed / attempted
  if (failureRate < PULSE_HEALTH_FAILURE_RATE_THRESHOLD) return
  const fields = {
    windowHours: PULSE_HEALTH_WINDOW_MS / (60 * 60 * 1000),
    attempted,
    failed,
    failureRate: Math.round(failureRate * 100) / 100,
  }
  recordPulseAlert('pulse.extract.failure_rate_high', fields)
  await dispatchOpsAlert(env, 'pulse.extract.failure_rate_high', fields)
}

// Cron Trigger entry — fan out by cron expression in Phase 0.
// Current schedule: */30 * * * * (see wrangler.toml). Drives Pulse ingest + reminders.
//
// Each branch is isolated with Promise.allSettled so one throwing branch can no
// longer abort its siblings (a single unhandled rejection in Promise.all would
// reject the whole tick and silently drop every other fan-out). Rejections are
// logged per-branch as `cron.branch_failed` console.error lines (visible in
// `wrangler tail` / Workers Observability) so a stalled sub-pipeline is
// diagnosable instead of invisible.
// Non-Error causes (drizzle sometimes attaches plain objects) must never crash
// the failure logger itself, so serialization is best-effort.
function describeUnknownCause(cause: unknown): string {
  try {
    return JSON.stringify(cause) ?? typeof cause
  } catch {
    return typeof cause
  }
}

export async function scheduled(
  controller: ScheduledController,
  env: Env,
  _ctx: ExecutionContext,
): Promise<void> {
  const now = new Date(controller.scheduledTime)
  const branches: Array<readonly [string, Promise<unknown>]> = [
    ['rule_registry_catalog_sync', enqueueRuleRegistryCatalogSync(env)],
    ['rule_source_scans', enqueueDueRuleSourceScans(env, now)],
    ['rule_date_reconciliation', enqueueRuleDateReconciliation(env, now)],
    ['pulse_ingest_scans', enqueuePulseIngestScans(env, undefined, now)],
    ['still_open_alert_windows', refreshStillOpenAlertWindows(env, now)],
    ['pulse_extract_health', checkPulseExtractionHealth(env, now)],
    ['pulse_extract_failed_retry', retryFailedPulseExtractions(env, now)],
    ['deadline_reminders', dispatchDeadlineReminders(env, now)],
    ['morning_digests', dispatchMorningDigests(env, now)],
    ['annual_rollover_auto', dispatchAutoRollover(env, now)],
    ['email_flush', env.EMAIL_QUEUE.send({ type: 'email.flush' })],
  ]

  const results = await Promise.allSettled(branches.map(([, promise]) => promise))

  const failures = results.flatMap((result, index) =>
    result.status === 'rejected' ? [{ branch: branches[index]![0], reason: result.reason }] : [],
  )
  for (const { branch, reason } of failures) {
    const errorMessage = reason instanceof Error ? reason.message : String(reason)
    console.error(
      JSON.stringify({
        type: 'cron.branch_failed',
        at: new Date().toISOString(),
        branch,
        scheduledTime: now.toISOString(),
        error: errorMessage,
        // Drizzle wraps the driver error ("Failed query: …") and the real D1
        // message only survives on .cause — without it a branch failure is
        // undiagnosable from logs (see the 2026-06-08 source-fetch stall).
        cause:
          reason instanceof Error && reason.cause !== undefined
            ? reason.cause instanceof Error
              ? reason.cause.message
              : describeUnknownCause(reason.cause)
            : undefined,
        stack: reason instanceof Error ? reason.stack : undefined,
      }),
    )
    await dispatchOpsAlert(env, `cron.branch_failed.${branch}`, {
      branch,
      scheduledTime: now.toISOString(),
      error: errorMessage,
      cause:
        reason instanceof Error && reason.cause !== undefined
          ? reason.cause instanceof Error
            ? reason.cause.message
            : describeUnknownCause(reason.cause)
          : null,
    })
  }
  console.info(
    JSON.stringify({
      type: 'cron.tick',
      at: new Date().toISOString(),
      scheduledTime: now.toISOString(),
      branches: branches.length,
      failed: failures.length,
      failedBranches: failures.map(({ branch }) => branch),
    }),
  )
}
