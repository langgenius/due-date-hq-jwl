import { createDb, makePulseOpsRepo } from '@duedatehq/db'
import type { Env } from '../../env'
import type { PulseExtractQueueMessage } from './ingest'
import { recordPulseMetric } from './metrics'

// One-shot per source set — the candidate pool is the finite set of snapshots
// the baseline scan archived, so 200 covers any realistic backlog.
const BACKFILL_BATCH_LIMIT = 200

/**
 * Backfill seeding: extract the still-in-effect landscape that predates a
 * source's monitoring start.
 *
 * When a source is enabled, its first scan archives every item already on the
 * page as `ignored` / `monitoring_baseline_established` snapshots — content
 * the live watcher will never re-queue (contentHash dedupe). For sources
 * whose pages list announcements that remain in force for months (IRS
 * disaster relief), those archived snapshots ARE the backfill corpus: this
 * re-drives them through the normal extract pipeline (R2 raw, excerpt guard,
 * dedupe_key, confidence floors all apply) with `ingest_method='backfill_seed'`
 * so the resulting pulses take the quiet fan-out — impact-scoped
 * origin='catchup' rows, no digest emails — and expired items quarantine or
 * fall out of the active list via the read-time expiry predicate.
 *
 * Idempotent: re-running re-queues only rows still pending_extract; extracted
 * snapshots are skipped by the consumer's status guard, and re-observed
 * events fold onto their dedupe_key survivor.
 */
export async function seedBackfillFromBaselineSnapshots(
  env: Pick<Env, 'DB' | 'PULSE_QUEUE'>,
  opts: { sourceIds: string[]; limit?: number },
): Promise<{ queued: number; sourceIds: string[] }> {
  const repo = makePulseOpsRepo(createDb(env.DB))
  const candidates = await repo.listBackfillSeedCandidates({
    sourceIds: opts.sourceIds,
    limit: opts.limit ?? BACKFILL_BATCH_LIMIT,
  })
  if (candidates.length === 0) return { queued: 0, sourceIds: opts.sourceIds }

  await repo.markSnapshotsForBackfillExtract(candidates.map((snapshot) => snapshot.id))
  await Promise.all(
    candidates.map((snapshot) =>
      env.PULSE_QUEUE.send({
        type: 'pulse.extract',
        snapshotId: snapshot.id,
      } satisfies PulseExtractQueueMessage),
    ),
  )
  recordPulseMetric('pulse.backfill.seed_enqueued', {
    count: candidates.length,
    sourceIds: opts.sourceIds.join(','),
  })
  return { queued: candidates.length, sourceIds: opts.sourceIds }
}
