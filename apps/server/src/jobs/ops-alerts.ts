import { Resend } from 'resend'
import type { PulseMetricFields } from './pulse/metrics'

/**
 * All-optional on purpose: callers pass whatever slice of Env they hold, and
 * the dispatcher no-ops when the sink isn't configured — so narrow `Pick`
 * signatures (and their test doubles) keep type-checking unchanged.
 */
export interface OpsAlertEnv {
  OPS_ALERT_EMAIL?: string | undefined
  RESEND_API_KEY?: string | undefined
  EMAIL_FROM?: string | undefined
  CACHE?: KVNamespace | undefined
}

const DEDUPE_TTL_SECONDS = 6 * 60 * 60

/**
 * Routes an operator-grade alert to a human via email. The console JSON lines
 * (`pulse.alert` / `cron.branch_failed`) stay for Workers Logs, but nothing
 * watches them — the 2026-06-08 fetch stall ran 38 hours unnoticed because
 * every documented alert terminated in console output.
 *
 * No-op unless OPS_ALERT_EMAIL (+ Resend) is configured. Repeat firings of the
 * same alert name are deduped for 6h via KV so an ongoing incident pages once
 * per window, not once per tick. Never throws into the caller: an alerting
 * failure must not take down the job that emitted the alert.
 */
export async function dispatchOpsAlert(
  env: OpsAlertEnv,
  name: string,
  fields: PulseMetricFields,
): Promise<void> {
  if (!env.OPS_ALERT_EMAIL || !env.RESEND_API_KEY || !env.EMAIL_FROM) return
  try {
    const dedupeKey = `ops-alert:${name}`
    if (env.CACHE && (await env.CACHE.get(dedupeKey)) !== null) return

    const resend = new Resend(env.RESEND_API_KEY)
    const { error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: [env.OPS_ALERT_EMAIL],
      subject: `[DueDateHQ ops] ${name}`,
      text: JSON.stringify(fields, null, 2),
    })
    if (error) throw new Error(error.message)

    // Mark after a successful send so a failed send retries on the next firing.
    if (env.CACHE) {
      await env.CACHE.put(dedupeKey, '1', { expirationTtl: DEDUPE_TTL_SECONDS })
    }
  } catch (error) {
    console.error(
      JSON.stringify({
        type: 'ops_alert.dispatch_failed',
        name,
        at: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Ops alert dispatch failed.',
      }),
    )
  }
}
