import {
  createDb,
  makeAiRepo,
  makePulseOpsRepo,
  makeRulesOpsRepo,
  makeRulesRepo,
} from '@duedatehq/db'
import {
  detectNewCohort,
  expectedCatalogReleaseDate,
  isTemporaryAnnouncementSource,
  listObligationRules,
  listRuleSources,
  ruleSourceFetchUrl,
  substantialCohortYears,
  type ObligationRule,
  type RuleSource,
} from '@duedatehq/core/rules'
import { announcementItemsFromSnapshotWithPdfLinks } from '@duedatehq/ingest'
import { fetchTextSnapshot, normalizeSourceText, textExcerpt } from '@duedatehq/ingest/http'
import { stripHtml } from '@duedatehq/ingest/selectors'
import type { IngestCtx } from '@duedatehq/ingest/types'
import type { Env } from '../../env'
import { cachedConcreteDraftKey } from '../../procedures/rules/concrete-draft'
import {
  archivePulseRaw,
  createPoliteFetch,
  isolatePoliteHostState,
  PULSE_SOURCE_FAILURE_RETRY_MS,
  suppressDedupeRehashMigration,
} from '../pulse/ingest'
import { pulseManagedSourceIds } from '../pulse/rule-source-adapters'
import { recordPulseMetric } from '../pulse/metrics'
import {
  RULE_CONCRETE_DRAFT_GENERATE_MESSAGE_TYPE,
  selectConcreteDraftSweepTargets,
  type RuleConcreteDraftGenerateMessage,
} from './concrete-draft'
import { findRuleDateReconciliationIssues } from '../../procedures/rules/rule-date-reconciliation'

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

export const RULE_DATE_RECONCILIATION_MESSAGE_TYPE = 'rule.date.reconciliation'

export interface RuleDateReconciliationMessage {
  type: typeof RULE_DATE_RECONCILIATION_MESSAGE_TYPE
  reason: 'scheduled' | 'manual'
}

export function isRuleDateReconciliationMessage(
  value: unknown,
): value is RuleDateReconciliationMessage {
  return (
    isRecord(value) &&
    value.type === RULE_DATE_RECONCILIATION_MESSAGE_TYPE &&
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
  // feedUrl ?? url with the {year} token resolved — shared with the adapter
  // path and the offline checker so all three fetch the same page.
  return ruleSourceFetchUrl(source)
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

/**
 * Enqueue the catalog-level rule-date reconciliation (gap #5). Scheduled runs are gated to the
 * weekly governance window — the findings (stale filing year / literal-vs-excerpt mismatch) only
 * change on a catalog edit or a year rollover, and the alert is deduped on the durable drift state,
 * so weekly is plenty. `manual` always enqueues for on-demand runs.
 */
export async function enqueueRuleDateReconciliation(
  env: Pick<Env, 'PULSE_QUEUE'>,
  now: Date,
  reason: RuleDateReconciliationMessage['reason'] = 'scheduled',
): Promise<{ queued: boolean }> {
  if (reason === 'scheduled' && !shouldRunWeeklyRuleSourceGovernance(now)) {
    return { queued: false }
  }
  await env.PULSE_QUEUE.send({
    type: RULE_DATE_RECONCILIATION_MESSAGE_TYPE,
    reason,
  } satisfies RuleDateReconciliationMessage)
  return { queued: true }
}

export async function enqueueDueRuleSourceScans(
  env: Pick<Env, 'DB' | 'PULSE_QUEUE'>,
  now: Date,
  opts: { pulseManagedSourceIds?: ReadonlySet<string> } = {},
): Promise<{ queued: number }> {
  const sources = listRuleSources()
  const pulseManaged = opts.pulseManagedSourceIds ?? pulseManagedSourceIds
  const weeklyGovernance = shouldRunWeeklyRuleSourceGovernance(now)
  const pulseOps = makePulseOpsRepo(createDb(env.DB))
  // One batched read+upsert for all rule sources instead of N serial
  // round-trips — the per-source loop here (plus the pulse-ingest one) blew the
  // cron's 15-minute wall-clock budget (exceededCpu), killing every fan-out.
  const states = await pulseOps.ensureSourceStates(
    sources.map((source) => ({
      sourceId: source.id,
      tier: sourceTier(source),
      jurisdiction: source.jurisdiction,
      cadenceMs: sourceCadenceMs(source),
      now,
      enabled: source.healthStatus !== 'paused',
    })),
    now,
  )
  const queueItems = sources.flatMap(
    (source): Array<{ source: RuleSource; reason: PulseRuleSourceScanMessage['reason'] }> => {
      // The pulse ingest pipeline already fetches+extracts these ids — a second
      // scan here would double-fetch and double-pay AI on every change. Their
      // ensureSourceStates row above is still reconciled (registry pause
      // semantics), only the scan fan-out skips. Skipping the governance branch
      // too matters: its recordSourceSuccess would clobber the shared state
      // row's nextCheckAt without fetching.
      if (pulseManaged.has(source.id)) return []
      const state = states.get(source.id)
      if (!state || !state.enabled) return []
      if (sourceCanAutoScan(source)) {
        return sourceIsDue(state, now) ? [{ source, reason: 'cadence_due' }] : []
      }
      return weeklyGovernance ? [{ source, reason: 'weekly_governance' }] : []
    },
  )

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
  opts: { pulseManagedSourceIds?: ReadonlySet<string> } = {},
): Promise<void> {
  const source = listRuleSources().find((item) => item.id === message.sourceId)
  const db = createDb(env.DB)
  const pulseOps = makePulseOpsRepo(db)
  if (!source) {
    recordPulseMetric('pulse.rule_source_scan.source_missing', { sourceId: message.sourceId })
    return
  }
  // Drains in-flight messages cleanly across the deploy that hands these ids to
  // the pulse pipeline, and guards any future manual producer.
  if ((opts.pulseManagedSourceIds ?? pulseManagedSourceIds).has(source.id)) {
    recordPulseMetric('pulse.rule_source_scan.pulse_managed_skip', { sourceId: source.id })
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
    // Wrap the global fetch: assigning the bare `fetch` to a context property
    // and calling it as `ctx.fetch(...)` runs it with `this === ctx`, which
    // workerd rejects with "Illegal invocation". createPoliteFetch calls fetch
    // as a free function (correct `this`) and adds the 30s/host rate limiting
    // this scan path otherwise lacks. The isolate-shared clock makes text, PDF
    // (binary) and concurrent pulse-ingest fetches to the same host coordinate
    // within this isolate.
    const politeFetch = createPoliteFetch(fetch, isolatePoliteHostState)
    const ingestCtx: IngestCtx = {
      fetch: politeFetch,
      binaryFetch: politeFetch,
      getSourceState: async (sourceId) => {
        const currentState = await pulseOps.getSourceState(sourceId)
        return currentState
          ? { etag: currentState.etag, lastModified: currentState.lastModified }
          : null
      },
      archiveRaw: (input) => archivePulseRaw(env, input),
    }
    const fetched = await fetchTextSnapshot(ingestCtx, {
      sourceId: source.id,
      url: sourceFetchUrl(source),
    })
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
      ? await announcementItemsFromSnapshotWithPdfLinks(
          { ...source, url: sourceFetchUrl(source) },
          fetched,
          ingestCtx,
        )
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
                ...(item.dedupeText ? { dedupeText: item.dedupeText } : {}),
              })
              const result = await pulseOps.createSourceSnapshot({
                sourceId: item.sourceId,
                externalId: item.externalId,
                title: item.title,
                officialSourceUrl: item.officialSourceUrl,
                publishedAt: item.publishedAt,
                fetchedAt: checkedAt,
                contentHash: archived.contentHash,
                rawR2Key: archived.r2Key,
              })
              const suppressed =
                result.inserted &&
                !establishingBaseline &&
                item.dedupeText !== undefined &&
                (await suppressDedupeRehashMigration(pulseOps, item, result.snapshot.id))
              return { result, suppressed }
            }),
          )
        : [
            {
              // Mirror parsedItemForSourceSnapshot (pulse path): hash + archive
              // the stripped 6000-char excerpt with a .full R2 sibling, instead
              // of the raw HTML body. The AI extract then reads <=6000 chars
              // (was the FULL untruncated page), the drift check reads the
              // sibling, and the stripped-text hash stops firing on markup
              // attribute churn. externalId stays source.url — no
              // dedupe-identity change. (fetchTextSnapshot's own raw archive
              // remains as the audit-trail copy.)
              result: await (async () => {
                const fullText = normalizeSourceText(stripHtml(fetched.body))
                const excerptText = textExcerpt(fullText)
                const archived = await archivePulseRaw(env, {
                  sourceId: source.id,
                  externalId: source.url,
                  fetchedAt: checkedAt,
                  body: excerptText || `${source.title} official source snapshot`,
                  contentType: 'text/plain; charset=utf-8',
                  ...(fullText.length > excerptText.length ? { fullText } : {}),
                })
                return pulseOps.createSourceSnapshot({
                  sourceId: source.id,
                  externalId: source.url,
                  title: `${source.title} official source snapshot`,
                  officialSourceUrl: source.url,
                  publishedAt: checkedAt,
                  fetchedAt: checkedAt,
                  contentHash: archived.contentHash,
                  rawR2Key: archived.r2Key,
                })
              })(),
              suppressed: false,
            },
          ]
    const insertedSnapshots = snapshotResults.filter((entry) => entry.result.inserted)
    // Migration-suppressed rows exist (and are marked ignored) but are not news —
    // they must not flip `changed`, enqueue extracts, or count as created.
    const actionableSnapshots = insertedSnapshots.filter((entry) => !entry.suppressed)
    if (establishingBaseline) {
      await Promise.all(
        insertedSnapshots.map((entry) =>
          pulseOps.updateSourceSnapshotStatus(entry.result.snapshot.id, {
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
      changed: !establishingBaseline && actionableSnapshots.length > 0,
      ...(fetched.etag !== undefined ? { etag: fetched.etag } : {}),
      ...(fetched.lastModified !== undefined ? { lastModified: fetched.lastModified } : {}),
    })

    if (establishingBaseline) return

    await Promise.all(
      actionableSnapshots.map((entry) =>
        env.PULSE_QUEUE.send({
          type: 'pulse.extract',
          snapshotId: entry.result.snapshot.id,
        }),
      ),
    )
    if (actionableSnapshots.length > 0) {
      recordPulseMetric('pulse.rule_source_scan.snapshots_created', {
        sourceId: source.id,
        count: actionableSnapshots.length,
      })
    }
  } catch (error) {
    const messageText = error instanceof Error ? error.message : 'Rule source scan failed.'
    await pulseOps.recordSourceFailure({
      sourceId: source.id,
      // Cap the failure retry like the pulse-ingest path: rescheduling on the
      // source's full cadence parked a quarterly source for 90 days after one
      // transient failure (docs/dev-log/2026-06-01-alert-pipeline-recovery.md).
      nextCheckAt: new Date(
        Date.now() + Math.min(sourceCadenceMs(source), PULSE_SOURCE_FAILURE_RETRY_MS),
      ),
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

  // Catalog-release event (Stage B): announce a brand-new annual cohort exactly
  // once, on a predictable cadence. The release row's unique filing_year keeps
  // detection idempotent across the 30-minute catalog-sync ticks.
  // The whole block is additive — wrapped so a release-row / notification
  // failure can never block the core sync's review-task fanout below.
  let cohortRuleIds: readonly string[] = []
  try {
    const releasedFilingYears = await ops.listReleasedCohortFilingYears()
    const cohort = detectNewCohort({ rules, existingReleaseFilingYears: releasedFilingYears })
    if (cohort) {
      if (releasedFilingYears.length === 0) {
        // First run after this feature ships: baseline every already-shipped
        // cohort silently — no notifications, and a back-dated releasedAt so the
        // banner's recency filter hides them. Real announcements start next cohort.
        for (const filingYear of substantialCohortYears(rules)) {
          await ops.insertCatalogRelease({
            filingYear,
            newRuleCount: rules.filter((rule) => rule.applicableYear === filingYear).length,
            changedRuleCount: 0,
            releasedAt: expectedCatalogReleaseDate(filingYear),
          })
        }
      } else {
        const created = await ops.insertCatalogRelease({
          filingYear: cohort.filingYear,
          newRuleCount: cohort.newCohortRuleIds.length,
          changedRuleCount: changedRules.length,
        })
        // Only the tick that actually created the row notifies + tags the cohort,
        // so a concurrent tick (or a re-run) never double-announces.
        if (created) {
          cohortRuleIds = cohort.newCohortRuleIds
          const notifications = await ops.fanoutCatalogReleaseNotifications({
            filingYear: cohort.filingYear,
            newRuleCount: cohort.newCohortRuleIds.length,
            changedRuleCount: changedRules.length,
          })
          recordPulseMetric('rule.catalog_release', {
            filingYear: cohort.filingYear,
            newRuleCount: cohort.newCohortRuleIds.length,
            changedRuleCount: changedRules.length,
            notifications,
          })
        }
      }
    }
  } catch {
    // Additive announcement must never break the core catalog sync.
    recordPulseMetric('rule.catalog_release.failed', { failed: 1 })
  }

  await ops.fanoutReviewTasks({ newRules, changedRules, cohortRuleIds })

  // Library version bump → unified Alert: for each changed rule that firms have adopted,
  // raise a targeted rule_source_drift Alert (only to the adopting firms) so CPAs handle it
  // in the alerts surface and re-verify inline. Mirrors consumeRuleDateReconciliation; deduped
  // on uncleared drift state (and on the persisted template version, since changedRules only
  // fires when old.version < current) so re-running catalog sync never double-alerts.
  if (changedRules.length > 0) {
    const pulseOps = makePulseOpsRepo(db)
    const unclearedRuleIds = new Set(
      await pulseOps.listUnclearedDriftRuleIds(changedRules.map((rule) => rule.ruleId)),
    )
    const ruleById = new Map(rules.map((rule) => [rule.id, rule]))
    const sourceUrlById = new Map(sources.map((source) => [source.id, source.url]))
    const detectedAt = new Date()
    // Serialized: each alert fans out to its adopting firms — avoid spiking D1 when many
    // rules change at once (e.g. a year-start catalog refresh).
    for (const changed of changedRules) {
      if (unclearedRuleIds.has(changed.ruleId)) continue
      const rule = ruleById.get(changed.ruleId)
      if (!rule) continue
      const sourceId = basisSourceIdForRule(rule)
      if (!sourceId) continue
      const sourceUrl = sourceUrlById.get(sourceId)
      if (!sourceUrl) continue
      const firmIds = await ops.firmIdsWithReviewedRule(changed.ruleId)
      if (firmIds.length === 0) continue
      const basisExcerpt = rule.evidence.find(
        (evidence) => evidence.authorityRole === 'basis' && evidence.sourceExcerpt.length > 0,
      )?.sourceExcerpt
      const { pulseId } = await pulseOps.createRuleSourceDriftPulse(
        {
          sourceId,
          sourceUrl,
          parsedJurisdiction: rule.jurisdiction,
          parsedForms: [rule.taxType],
          parsedEntityTypes: [...rule.entityApplicability],
          reverifyRuleIds: [changed.ruleId],
          aiSummary: `Rule ${changed.ruleId} was updated in the library (v${changed.templateVersion}). Re-verify the rule before relying on it.`,
          verbatimQuote:
            basisExcerpt ??
            `Library rule ${changed.ruleId} changed to v${changed.templateVersion}.`,
          publishedAt: detectedAt,
          structuredChange: {
            kind: 'rule_source_drift',
            origin: 'catalog_version_bump',
            sourceId,
            ruleIds: [changed.ruleId],
            templateVersion: changed.templateVersion,
          },
        },
        { firmIds },
      )
      await pulseOps.upsertRuleSourceDriftState({
        ruleId: changed.ruleId,
        sourceId,
        pulseId,
        contentHash: `catalog:${changed.ruleId}:v${changed.templateVersion}`,
        excerptMatched: false,
        detectedAt,
      })
    }
  }

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
  const aiRepo = makeAiRepo(db, 'global')
  // Drafts that keep failing (provider down / budget exhausted) would otherwise be
  // re-enqueued every catalog sync — the loop that drained the AI budget. The shared
  // selection drops cached/abandoned/parked refs and health-gates the sweep to a
  // single canary while recent runs all fail; changed/new rules always (re)try
  // since their source moved.
  const selection = await selectConcreteDraftSweepTargets({
    aiRepo,
    items: sourceDefinedRules.flatMap((rule) => {
      const contextRef = contextRefByRuleId.get(rule.id)
      return contextRef
        ? [{ item: rule, contextRef, alwaysRetry: changedOrNewIds.has(rule.id) }]
        : []
    }),
    now: new Date(),
  })
  if (selection.gated) {
    recordPulseMetric('rule.concrete_draft.sweep_gated', {
      ok: selection.health.ok,
      failed: selection.health.failed,
      enqueued: selection.targets.length,
    })
  }
  await Promise.all(
    selection.targets.flatMap((rule) => {
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
    draftMessages: selection.targets.length,
    gated: selection.gated,
  })
  return {
    newRules: newRules.length,
    changedRules: changedRules.length,
    deprecatedRules,
    draftMessages: selection.targets.length,
  }
}

export interface RuleDateAlertPlan {
  ruleId: string
  sourceId: string
  jurisdiction: string
  forms: string[]
  entityTypes: string[]
  sourceUrl: string
  aiSummary: string
  verbatimQuote: string
}

function basisSourceIdForRule(rule: Pick<ObligationRule, 'sourceIds' | 'evidence'>): string | null {
  const basis = rule.evidence.find(
    (evidence) => evidence.authorityRole === 'basis' && evidence.sourceExcerpt.length > 0,
  )
  return basis?.sourceId ?? rule.sourceIds[0] ?? rule.evidence[0]?.sourceId ?? null
}

/**
 * Turn rule-date reconciliation findings into rule_source_drift alert plans, one per stale rule:
 * group the issues by rule, drop any rule that already carries an uncleared drift signal (so a
 * re-run never re-alerts), resolve the rule's basis source + url, and compose the alert copy. Pure
 * — the consumer supplies the catalog, the sources, and the uncleared-rule set.
 */
export function buildRuleDateAlertPlans(input: {
  rules: readonly ObligationRule[]
  sources: readonly RuleSource[]
  currentYear: number
  unclearedRuleIds: ReadonlySet<string>
}): RuleDateAlertPlan[] {
  const issues = findRuleDateReconciliationIssues({
    rules: input.rules,
    currentYear: input.currentYear,
  })
  if (issues.length === 0) return []

  const detailsByRule = new Map<string, string[]>()
  for (const issue of issues) {
    const details = detailsByRule.get(issue.ruleId) ?? []
    details.push(issue.detail)
    detailsByRule.set(issue.ruleId, details)
  }
  const ruleById = new Map(input.rules.map((rule) => [rule.id, rule]))
  const sourceUrlById = new Map(input.sources.map((source) => [source.id, source.url]))

  const plans: RuleDateAlertPlan[] = []
  for (const [ruleId, details] of detailsByRule) {
    if (input.unclearedRuleIds.has(ruleId)) continue
    const rule = ruleById.get(ruleId)
    if (!rule) continue
    const sourceId = basisSourceIdForRule(rule)
    if (!sourceId) continue
    const sourceUrl = sourceUrlById.get(sourceId)
    if (!sourceUrl) continue
    const basisExcerpt = rule.evidence.find(
      (evidence) => evidence.authorityRole === 'basis' && evidence.sourceExcerpt.length > 0,
    )?.sourceExcerpt
    plans.push({
      ruleId,
      sourceId,
      jurisdiction: rule.jurisdiction,
      forms: [rule.taxType],
      entityTypes: [...rule.entityApplicability],
      sourceUrl,
      aiSummary: `Catalog date check flagged verified rule ${ruleId} for re-verification — ${details.join(' ')} Confirm the due date against the official source.`,
      verbatimQuote: basisExcerpt ?? details.join(' '),
    })
  }
  return plans
}

/**
 * Catalog-level rule-date reconciliation (gap #5): raise a rule_source_drift Alert for any verified
 * rule whose literal due date is stale (filing year already past) or contradicts its own cited basis
 * excerpt, and record the durable drift state so the rule cannot be (bulk-)adopted until re-verified.
 * Deduped on the uncleared drift state, so re-running never double-alerts.
 */
export async function consumeRuleDateReconciliation(
  _message: RuleDateReconciliationMessage,
  env: Env,
): Promise<{ staleRules: number; alertsCreated: number }> {
  const rules = listObligationRules({ includeCandidates: true })
  const currentYear = new Date().getUTCFullYear()
  const staleRuleIds = Array.from(
    new Set(findRuleDateReconciliationIssues({ rules, currentYear }).map((issue) => issue.ruleId)),
  )
  if (staleRuleIds.length === 0) {
    recordPulseMetric('rule.date_reconciliation', { staleRules: 0, alertsCreated: 0 })
    return { staleRules: 0, alertsCreated: 0 }
  }

  const pulseOps = makePulseOpsRepo(createDb(env.DB))
  const unclearedRuleIds = new Set(await pulseOps.listUnclearedDriftRuleIds(staleRuleIds))
  const plans = buildRuleDateAlertPlans({
    rules,
    sources: listRuleSources(),
    currentYear,
    unclearedRuleIds,
  })

  const detectedAt = new Date()
  // Serialized rather than Promise.all: each alert fans out to every active firm, so we avoid
  // spiking D1 when several rules go stale at once (e.g. a year rollover).
  const created = []
  for (const plan of plans) {
    const { pulseId } = await pulseOps.createRuleSourceDriftPulse({
      sourceId: plan.sourceId,
      sourceUrl: plan.sourceUrl,
      parsedJurisdiction: plan.jurisdiction,
      parsedForms: plan.forms,
      parsedEntityTypes: plan.entityTypes,
      reverifyRuleIds: [plan.ruleId],
      aiSummary: plan.aiSummary,
      verbatimQuote: plan.verbatimQuote,
      publishedAt: detectedAt,
      structuredChange: {
        kind: 'rule_source_drift',
        origin: 'date_reconciliation',
        sourceId: plan.sourceId,
        ruleIds: [plan.ruleId],
      },
    })
    await pulseOps.upsertRuleSourceDriftState({
      ruleId: plan.ruleId,
      sourceId: plan.sourceId,
      pulseId,
      contentHash: `reconcile:${plan.ruleId}`,
      excerptMatched: false,
      detectedAt,
    })
    created.push(pulseId)
  }

  recordPulseMetric('rule.date_reconciliation', {
    staleRules: staleRuleIds.length,
    alertsCreated: created.length,
  })
  return { staleRules: staleRuleIds.length, alertsCreated: created.length }
}
