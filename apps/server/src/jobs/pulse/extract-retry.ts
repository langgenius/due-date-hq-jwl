import { createDb, makePulseOpsRepo } from '@duedatehq/db'
import type { Env } from '../../env'
import type { PulseExtractQueueMessage } from './ingest'
import { recordPulseMetric } from './metrics'

// Mirrors the extraction-health canary window (cron.ts).
const HEALTH_WINDOW_MS = 6 * 60 * 60 * 1000
// Per-tick batch: 48 ticks/day x 25 drains a multi-hundred-row backlog within
// hours while staying far below the global system AI daily budget.
const RETRY_BATCH = 25
// Older failures are stale news no firm should be alerted about belatedly.
const RETRY_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000

/**
 * Re-drives transiently-failed extractions (gateway / credit / budget refusals).
 *
 * Without this, a refused extraction is terminal: the consumer returns
 * 'failed' without throwing, the queue ACKs, and the content-hash snapshot
 * dedupe guarantees an unchanged page never re-enqueues — so every
 * announcement published during an AI outage was silently lost (2026-06-04
 * onward: six days of zero alerts, 357 stranded snapshots).
 *
 * Health-gated: runs only when the pipeline demonstrably works again (a
 * successful extraction in the window and failures not dominating), so an
 * ongoing outage burns zero retry budget instead of duty-cycling like the
 * concrete-draft loop did. Deterministic failures never enter the retry set
 * (see listRetryableFailedSnapshots), and a re-failed row rotates to the back
 * of the oldest-first queue, so the sweep converges.
 */
export async function retryFailedPulseExtractions(
  env: Pick<Env, 'DB' | 'PULSE_QUEUE'>,
  now: Date = new Date(),
): Promise<{ queued: number }> {
  const repo = makePulseOpsRepo(createDb(env.DB))
  const { aiSucceeded, failed } = await repo.countRecentExtractionOutcomes({
    sinceMs: HEALTH_WINDOW_MS,
    now,
  })
  // Liveness = at least one successful AI verdict in the window and failures not
  // dominating. `aiSucceeded` counts no-change 'ignored' verdicts too (see
  // countRecentExtractionOutcomes), so a healthy pipeline whose recent content
  // happened to be all no-change still drains the failed backlog — `extracted`
  // alone went to zero in quiet windows and stranded the sweep.
  const attempted = aiSucceeded + failed
  const healthy = aiSucceeded > 0 && failed / attempted < 0.5
  if (!healthy) return { queued: 0 }

  const snapshots = await repo.listRetryableFailedSnapshots({
    limit: RETRY_BATCH,
    maxAgeMs: RETRY_MAX_AGE_MS,
    now,
  })
  if (snapshots.length === 0) return { queued: 0 }

  await Promise.all(
    snapshots.map((snapshot) =>
      env.PULSE_QUEUE.send({
        type: 'pulse.extract',
        snapshotId: snapshot.id,
      } satisfies PulseExtractQueueMessage),
    ),
  )
  recordPulseMetric('pulse.extract.retry_enqueued', { count: snapshots.length })
  return { queued: snapshots.length }
}
