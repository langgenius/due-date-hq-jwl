import {
  createDb,
  makeAiRepo,
  makePulseOpsRepo,
  makeRulesOpsRepo,
  makeRulesRepo,
} from '@duedatehq/db'
import {
  isTemporaryAnnouncementSource,
  listObligationRules,
  listRuleSources,
  type ObligationRule,
  type RuleSource,
} from '@duedatehq/core/rules'
import { announcementItemsFromSnapshot } from '@duedatehq/ingest'
import { fetchTextSnapshot } from '@duedatehq/ingest/http'
import type { Env } from '../../env'
import {
  cachedConcreteDraftKey,
  RULE_CONCRETE_DRAFT_PROMPT,
} from '../../procedures/rules/concrete-draft'
import { archivePulseRaw } from '../pulse/ingest'
import { recordPulseMetric } from '../pulse/metrics'
import {
  RULE_CONCRETE_DRAFT_GENERATE_MESSAGE_TYPE,
  type RuleConcreteDraftGenerateMessage,
} from './concrete-draft'

export const PULSE_RULE_SOURCE_SCAN_MESSAGE_TYPE = 'pulse.rule_source.scan'
export const RULE_REGISTRY_CATALOG_SYNC_MESSAGE_TYPE = 'rule.registry.catalog.sync'

const WEEKLY_GOVERNANCE_DAY_UTC = 1
const WEEKLY_GOVERNANCE_HOUR_UTC = 9
const AUTOMATED_SCAN_METHODS = new Set<RuleSource['acquisitionMethod']>(['html_watch', 'pdf_watch'])

export interface PulseRuleSourceScanMessage {
  type: typeof PULSE_RULE_SOURCE_SCAN_MESSAGE_TYPE
  sourceId: string
  reason: 'cadence_due' | 'weekly_governance'
}

export interface RuleRegistryCatalogSyncMessage {
  type: typeof RULE_REGISTRY_CATALOG_SYNC_MESSAGE_TYPE
  reason: 'scheduled' | 'manual'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isPulseRuleSourceScanMessage(value: unknown): value is PulseRuleSourceScanMessage {
  return (
    isRecord(value) &&
    value.type === PULSE_RULE_SOURCE_SCAN_MESSAGE_TYPE &&
    typeof value.sourceId === 'string' &&
    (value.reason === 'cadence_due' || value.reason === 'weekly_governance')
  )
}

export function isRuleRegistryCatalogSyncMessage(
  value: unknown,
): value is RuleRegistryCatalogSyncMessage {
  return (
    isRecord(value) &&
    value.type === RULE_REGISTRY_CATALOG_SYNC_MESSAGE_TYPE &&
    (value.reason === 'scheduled' || value.reason === 'manual')
  )
}

function sourceCadenceMs(source: Pick<RuleSource, 'cadence'>): number {
  const day = 24 * 60 * 60 * 1000
  if (source.cadence === 'daily') return day
  if (source.cadence === 'weekly') return 7 * day
  if (source.cadence === 'monthly') return 30 * day
  if (source.cadence === 'quarterly') return 90 * day
  return 14 * day
}

function sourceTier(source: Pick<RuleSource, 'priority'>): string {
  if (source.priority === 'critical' || source.priority === 'high') return 'T1'
  if (source.priority === 'medium') return 'T2'
  return 'T3'
}

function nextCheckAt(from: Date, source: RuleSource): Date {
  return new Date(from.getTime() + sourceCadenceMs(source))
}

export function shouldRunWeeklyRuleSourceGovernance(now: Date): boolean {
  return (
    now.getUTCDay() === WEEKLY_GOVERNANCE_DAY_UTC &&
    now.getUTCHours() === WEEKLY_GOVERNANCE_HOUR_UTC &&
    now.getUTCMinutes() < 30
  )
}

function sourceIsDue(state: { enabled?: boolean; nextCheckAt?: Date | null }, now: Date): boolean {
  return (
    state.enabled !== false && (!state.nextCheckAt || state.nextCheckAt.getTime() <= now.getTime())
  )
}

function sourceNeedsMonitoringBaseline(state: {
  monitoringBaselineAt?: Date | null
  baselineMode?: string
}): boolean {
  return state.monitoringBaselineAt === null && state.baselineMode !== 'backfill'
}

function sourceCanAutoScan(source: RuleSource): boolean {
  return (
    source.healthStatus !== 'paused' &&
    (AUTOMATED_SCAN_METHODS.has(source.acquisitionMethod) ||
      (isTemporaryAnnouncementSource(source) &&
        source.acquisitionMethod === 'api_watch' &&
        source.adapterKind === 'rss_or_announcement_list'))
  )
}

function sourceFetchUrl(source: RuleSource): string {
  return source.feedUrl ?? source.url
}

function sourceTemplateInput(source: RuleSource) {
  return {
    id: source.id,
    jurisdiction: source.jurisdiction,
    title: source.title,
    url: source.url,
    sourceType: source.sourceType,
    acquisitionMethod: source.acquisitionMethod,
    cadence: source.cadence,
    priority: source.priority,
    healthStatus: source.healthStatus,
    isEarlyWarning: source.isEarlyWarning,
    notificationChannels: [...source.notificationChannels],
    lastReviewedOn: source.lastReviewedOn,
    status: 'available' as const,
  }
}

function ruleTemplateInput(rule: ObligationRule) {
  return {
    id: rule.id,
    jurisdiction: rule.jurisdiction,
    title: rule.title,
    version: rule.version,
    status: rule.status === 'deprecated' ? ('deprecated' as const) : ('available' as const),
    ruleJson: rule,
    sourceIds: [...rule.sourceIds],
  }
}

function primarySourceIdForRule(rule: Pick<ObligationRule, 'sourceIds' | 'evidence'>) {
  return rule.sourceIds[0] ?? rule.evidence[0]?.sourceId ?? null
}

function isSourceDefinedRule(rule: Pick<ObligationRule, 'dueDateLogic'>): boolean {
  return rule.dueDateLogic.kind === 'source_defined_calendar'
}

export async function enqueueRuleRegistryCatalogSync(
  env: Pick<Env, 'PULSE_QUEUE'>,
  reason: RuleRegistryCatalogSyncMessage['reason'] = 'scheduled',
): Promise<void> {
  await env.PULSE_QUEUE.send({
    type: RULE_REGISTRY_CATALOG_SYNC_MESSAGE_TYPE,
    reason,
  } satisfies RuleRegistryCatalogSyncMessage)
}

export async function enqueueDueRuleSourceScans(
  env: Pick<Env, 'DB' | 'PULSE_QUEUE'>,
  now: Date,
): Promise<{ queued: number }> {
  const sources = listRuleSources()
  const weeklyGovernance = shouldRunWeeklyRuleSourceGovernance(now)
  const pulseOps = makePulseOpsRepo(createDb(env.DB))
  const queueItems = (
    await Promise.all(
      sources.map(async (source) => {
        const state = await pulseOps.ensureSourceState({
          sourceId: source.id,
          tier: sourceTier(source),
          jurisdiction: source.jurisdiction,
          cadenceMs: sourceCadenceMs(source),
          now,
          enabled: source.healthStatus !== 'paused',
        })
        if (!state.enabled) return null
        if (sourceCanAutoScan(source)) {
          return sourceIsDue(state, now) ? { source, reason: 'cadence_due' as const } : null
        }
        return weeklyGovernance ? { source, reason: 'weekly_governance' as const } : null
      }),
    )
  ).filter((item): item is NonNullable<typeof item> => item !== null)

  await Promise.all(
    queueItems.map(({ source, reason }) =>
      env.PULSE_QUEUE.send({
        type: PULSE_RULE_SOURCE_SCAN_MESSAGE_TYPE,
        sourceId: source.id,
        reason,
      } satisfies PulseRuleSourceScanMessage),
    ),
  )
  return { queued: queueItems.length }
}

export async function consumePulseRuleSourceScan(
  message: PulseRuleSourceScanMessage,
  env: Env,
): Promise<void> {
  const source = listRuleSources().find((item) => item.id === message.sourceId)
  const db = createDb(env.DB)
  const pulseOps = makePulseOpsRepo(db)
  if (!source) {
    recordPulseMetric('pulse.rule_source_scan.source_missing', { sourceId: message.sourceId })
    return
  }

  const now = new Date()
  const sourceState = await pulseOps.ensureSourceState({
    sourceId: source.id,
    tier: sourceTier(source),
    jurisdiction: source.jurisdiction,
    cadenceMs: sourceCadenceMs(source),
    now,
  })
  const establishingBaseline = sourceNeedsMonitoringBaseline(sourceState)

  if (!sourceCanAutoScan(source)) {
    await pulseOps.recordSourceSuccess({
      sourceId: source.id,
      checkedAt: now,
      nextCheckAt: nextCheckAt(now, source),
      changed: false,
    })
    return
  }

  try {
    const fetched = await fetchTextSnapshot(
      {
        fetch,
        getSourceState: async (sourceId) => {
          const currentState = await pulseOps.getSourceState(sourceId)
          return currentState
            ? { etag: currentState.etag, lastModified: currentState.lastModified }
            : null
        },
        archiveRaw: (input) => archivePulseRaw(env, input),
      },
      { sourceId: source.id, url: sourceFetchUrl(source) },
    )
    const checkedAt = fetched.fetchedAt

    if (fetched.notModified) {
      if (establishingBaseline) {
        await pulseOps.establishSourceBaseline({ sourceId: source.id, baselineAt: checkedAt })
      }
      await pulseOps.recordSourceSuccess({
        sourceId: source.id,
        checkedAt,
        nextCheckAt: nextCheckAt(checkedAt, source),
        changed: false,
        ...(fetched.etag !== undefined ? { etag: fetched.etag } : {}),
        ...(fetched.lastModified !== undefined ? { lastModified: fetched.lastModified } : {}),
      })
      return
    }

    const announcementItems = isTemporaryAnnouncementSource(source)
      ? announcementItemsFromSnapshot({ ...source, url: sourceFetchUrl(source) }, fetched)
      : []
    const snapshotResults =
      announcementItems.length > 0
        ? await Promise.all(
            announcementItems.map(async (item) => {
              const archived = await archivePulseRaw(env, {
                sourceId: item.sourceId,
                externalId: item.externalId,
                fetchedAt: checkedAt,
                body: item.rawText,
                contentType: 'text/plain; charset=utf-8',
              })
              return pulseOps.createSourceSnapshot({
                sourceId: item.sourceId,
                externalId: item.externalId,
                title: item.title,
                officialSourceUrl: item.officialSourceUrl,
                publishedAt: item.publishedAt,
                fetchedAt: checkedAt,
                contentHash: archived.contentHash,
                rawR2Key: archived.r2Key,
              })
            }),
          )
        : [
            await pulseOps.createSourceSnapshot({
              sourceId: source.id,
              externalId: source.url,
              title: `${source.title} official source snapshot`,
              officialSourceUrl: source.url,
              publishedAt: checkedAt,
              fetchedAt: checkedAt,
              contentHash: fetched.contentHash,
              rawR2Key: fetched.r2Key,
            }),
          ]
    const insertedSnapshots = snapshotResults.filter((result) => result.inserted)
    if (establishingBaseline) {
      await Promise.all(
        insertedSnapshots.map((snapshot) =>
          pulseOps.updateSourceSnapshotStatus(snapshot.snapshot.id, {
            parseStatus: 'ignored',
            failureReason: 'monitoring_baseline_established',
          }),
        ),
      )
      await pulseOps.establishSourceBaseline({ sourceId: source.id, baselineAt: checkedAt })
    }
    await pulseOps.recordSourceSuccess({
      sourceId: source.id,
      checkedAt,
      nextCheckAt: nextCheckAt(checkedAt, source),
      changed: !establishingBaseline && insertedSnapshots.length > 0,
      ...(fetched.etag !== undefined ? { etag: fetched.etag } : {}),
      ...(fetched.lastModified !== undefined ? { lastModified: fetched.lastModified } : {}),
    })

    if (establishingBaseline) return

    await Promise.all(
      insertedSnapshots.map((snapshot) =>
        env.PULSE_QUEUE.send({
          type: 'pulse.extract',
          snapshotId: snapshot.snapshot.id,
        }),
      ),
    )
    if (insertedSnapshots.length > 0) {
      recordPulseMetric('pulse.rule_source_scan.snapshots_created', {
        sourceId: source.id,
        count: insertedSnapshots.length,
      })
    }
  } catch (error) {
    const messageText = error instanceof Error ? error.message : 'Rule source scan failed.'
    await pulseOps.recordSourceFailure({
      sourceId: source.id,
      nextCheckAt: nextCheckAt(new Date(), source),
      error: messageText,
    })
    recordPulseMetric('pulse.rule_source_scan.source_failed', {
      sourceId: source.id,
      error: messageText,
    })
  }
}

export async function consumeRuleRegistryCatalogSync(
  _message: RuleRegistryCatalogSyncMessage,
  env: Env,
): Promise<{
  newRules: number
  changedRules: number
  deprecatedRules: number
  draftMessages: number
}> {
  const db = createDb(env.DB)
  const rulesRepo = makeRulesRepo(db, 'global')
  const ops = makeRulesOpsRepo(db)
  const oldTemplates = new Map((await ops.listGlobalRuleTemplates()).map((row) => [row.id, row]))
  const sources = listRuleSources()
  const rules = listObligationRules({ includeCandidates: true })
  const currentRuleIds = new Set(rules.map((rule) => rule.id))
  const staleRuleIds = Array.from(oldTemplates.values())
    .filter((template) => template.status !== 'deprecated' && !currentRuleIds.has(template.id))
    .map((template) => template.id)

  const newRules: Array<{ ruleId: string; templateVersion: number }> = []
  const changedRules: Array<{ ruleId: string; templateVersion: number }> = []
  for (const rule of rules) {
    if (rule.status === 'deprecated') continue
    const old = oldTemplates.get(rule.id)
    if (!old) {
      newRules.push({ ruleId: rule.id, templateVersion: rule.version })
      continue
    }
    if (old.version < rule.version) {
      changedRules.push({ ruleId: rule.id, templateVersion: rule.version })
    }
  }

  await rulesRepo.upsertGlobalTemplates({
    sources: sources.map(sourceTemplateInput),
    rules: rules.map(ruleTemplateInput),
  })
  const deprecatedRules = await ops.deprecateGlobalRuleTemplates(staleRuleIds)

  await ops.fanoutReviewTasks({ newRules, changedRules })

  const changedOrNewIds = new Set([...newRules, ...changedRules].map((rule) => rule.ruleId))
  const sourceDefinedRules = rules.filter(
    (rule) => rule.status !== 'deprecated' && isSourceDefinedRule(rule),
  )
  const contextRefByRuleId = new Map(
    sourceDefinedRules.flatMap((rule) => {
      const sourceId = primarySourceIdForRule(rule)
      return sourceId
        ? [
            [
              rule.id,
              cachedConcreteDraftKey({
                ruleId: rule.id,
                ruleVersion: rule.version,
                sourceId,
              }),
            ] as const,
          ]
        : []
    }),
  )
  const cachedRuns = await makeAiRepo(db, 'global').findSuccessfulGlobalRunsByContextRefs({
    kind: 'rule_concrete_draft',
    inputContextRefs: Array.from(contextRefByRuleId.values()),
    promptVersion: RULE_CONCRETE_DRAFT_PROMPT,
  })
  const cachedContextRefs = new Set(cachedRuns.map((run) => run.inputContextRef).filter(Boolean))
  const draftTargets = sourceDefinedRules.filter((rule) => {
    const contextRef = contextRefByRuleId.get(rule.id)
    if (!contextRef) return false
    return changedOrNewIds.has(rule.id) || !cachedContextRefs.has(contextRef)
  })
  await Promise.all(
    draftTargets.flatMap((rule) => {
      const sourceId = primarySourceIdForRule(rule)
      return sourceId
        ? [
            env.PULSE_QUEUE.send({
              type: RULE_CONCRETE_DRAFT_GENERATE_MESSAGE_TYPE,
              ruleId: rule.id,
              sourceId,
              reason: 'prewarm',
            } satisfies RuleConcreteDraftGenerateMessage),
          ]
        : []
    }),
  )

  recordPulseMetric('rule.registry.catalog_sync', {
    newRules: newRules.length,
    changedRules: changedRules.length,
    deprecatedRules,
    draftMessages: draftTargets.length,
  })
  return {
    newRules: newRules.length,
    changedRules: changedRules.length,
    deprecatedRules,
    draftMessages: draftTargets.length,
  }
}
