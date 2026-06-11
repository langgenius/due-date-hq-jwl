import { createDb, makePulseOpsRepo } from '@duedatehq/db'
import type { IngestCtx, SourceAdapter } from '@duedatehq/ingest/types'
import type { Env } from '../../env'
import { dispatchOpsAlert, type OpsAlertEnv } from '../ops-alerts'
import { createPoliteFetch } from './ingest'
import { recordPulseAlert, recordPulseMetric } from './metrics'
import { liveRegulatorySourceAdapters } from './rule-source-adapters'

// The recall benchmark: high-stakes reference sources re-parsed weekly and
// diffed against what ingestion actually captured. "正确监听" is a measurable
// claim only if something counts the misses — this is that something. Keep
// the set small (each audit pays real fetches, and irs.disaster's parse
// fetches its detail pages); favor sources whose misses are expensive
// (federal disaster relief, the states that produced past defects).
export const GOLDEN_AUDIT_SOURCE_IDS: readonly string[] = [
  'irs.disaster',
  'irs.newsroom',
  'ga.temporary_announcements',
  'sc.temporary_announcements',
  'ca.ftb.tax_news',
  'ny.dtf.press',
]

export interface GoldenAuditMiss {
  sourceId: string
  externalId: string
  title: string
}

export interface GoldenAuditResult {
  auditedSources: number
  parsedItems: number
  misses: GoldenAuditMiss[]
  missingAdapterIds: string[]
}

// Weekly, Monday 10:00–10:29 UTC — one slot of the */30 cron, an hour after
// the daily still-open sweep so the tick stays light.
export function shouldRunGoldenAudit(now: Date): boolean {
  return now.getUTCDay() === 1 && now.getUTCHours() === 10 && now.getUTCMinutes() < 30
}

/**
 * Re-fetch + re-parse the golden sources UNCONDITIONALLY (no etag hint, so a
 * 304 can't blind the audit) and verify every parsed item has at least one
 * ingested snapshot under any content hash. An item the page lists but the
 * pipeline never snapshotted is a recall MISS — exactly the failure class
 * that is otherwise invisible (nothing alerts on what never entered the
 * funnel). Misses raise an ops alert with the item identities so the gap is
 * actionable, not just counted. Read-only: nothing is archived or queued.
 */
export async function runPulseGoldenAudit(
  env: Pick<Env, 'DB'> & OpsAlertEnv,
  adapters: readonly SourceAdapter[] = liveRegulatorySourceAdapters,
): Promise<GoldenAuditResult> {
  const byId = new Map(adapters.map((adapter) => [adapter.id, adapter]))
  const missingAdapterIds = GOLDEN_AUDIT_SOURCE_IDS.filter((id) => !byId.has(id))
  const golden = GOLDEN_AUDIT_SOURCE_IDS.flatMap((id) => byId.get(id) ?? [])
  const repo = makePulseOpsRepo(createDb(env.DB))

  // Deliberately minimal ctx: no getSourceState (forces unconditional GETs),
  // an archiveRaw that must never be reached (parse paths don't archive),
  // and the polite fetch so audit traffic obeys the same per-host manners.
  const auditCtx: IngestCtx = {
    fetch: createPoliteFetch(fetch),
    archiveRaw: () => {
      throw new Error('golden audit is read-only; nothing may archive')
    },
  }

  const misses: GoldenAuditMiss[] = []
  let parsedItems = 0
  let auditedSources = 0

  for (const adapter of golden) {
    try {
      const rawSnapshots = await adapter.fetch(auditCtx)
      const itemGroups = await Promise.all(
        rawSnapshots.map(async (rawSnapshot) =>
          rawSnapshot.notModified ? [] : adapter.parse(rawSnapshot, auditCtx),
        ),
      )
      auditedSources += 1
      for (const item of itemGroups.flat()) {
        parsedItems += 1
        const hashes = await repo.listItemSnapshotContentHashes({
          sourceId: item.sourceId,
          externalId: item.externalId,
        })
        if (hashes.length === 0) {
          misses.push({
            sourceId: item.sourceId,
            externalId: item.externalId,
            title: item.title,
          })
        }
      }
    } catch (error) {
      // An unreachable golden source is itself a finding, but the regular
      // source-health path already alarms on fetch failures — log and move on
      // so one dead site can't abort the rest of the audit.
      console.error('pulse.golden_audit.source_failed', {
        sourceId: adapter.id,
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  recordPulseMetric('pulse.golden_audit.result', {
    auditedSources,
    parsedItems,
    misses: misses.length,
    missingAdapterIds: missingAdapterIds.join(',') || null,
  })
  if (misses.length > 0 || missingAdapterIds.length > 0) {
    const fields = {
      misses: misses.length,
      sample: misses
        .slice(0, 10)
        .map((miss) => `${miss.sourceId}: ${miss.title}`)
        .join(' | '),
      missingAdapterIds: missingAdapterIds.join(',') || null,
    }
    recordPulseAlert('pulse.golden_audit.misses', fields)
    await dispatchOpsAlert(env, 'pulse.golden_audit.misses', fields)
  }

  return { auditedSources, parsedItems, misses, missingAdapterIds }
}

// Cron-facing wrapper: no-op outside the weekly slot.
export async function runScheduledGoldenAudit(
  env: Pick<Env, 'DB'> & OpsAlertEnv,
  now: Date,
): Promise<GoldenAuditResult | null> {
  if (!shouldRunGoldenAudit(now)) return null
  return runPulseGoldenAudit(env)
}
