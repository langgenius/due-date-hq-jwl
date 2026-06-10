/* eslint-disable typescript-eslint/no-unsafe-type-assertion --
 * Focused Worker doubles only implement the rule source scan job surface.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Env } from '../../env'
import {
  buildRuleDateAlertPlans,
  consumePulseRuleSourceScan,
  consumeRuleDateReconciliation,
  consumeRuleRegistryCatalogSync,
  enqueueDueRuleSourceScans,
  PULSE_RULE_SOURCE_SCAN_MESSAGE_TYPE,
  RULE_DATE_RECONCILIATION_MESSAGE_TYPE,
  RULE_REGISTRY_CATALOG_SYNC_MESSAGE_TYPE,
  shouldRunWeeklyRuleSourceGovernance,
} from './reconcile'
import type { ObligationRule, RuleSource } from '@duedatehq/core/rules'

const { coreMocks, dbMocks, fetchMocks, metricsMocks, pulseIngestMocks } = vi.hoisted(() => {
  const sources: unknown[] = []
  const rules: unknown[] = []
  const opsRepo = {
    listGlobalRuleTemplates: vi.fn(),
    deprecateGlobalRuleTemplates: vi.fn(),
    firmIdsWithReviewedRule: vi.fn(),
    fanoutReviewTasks: vi.fn(),
    listReleasedCohortFilingYears: vi.fn(),
    insertCatalogRelease: vi.fn(),
    fanoutCatalogReleaseNotifications: vi.fn(),
  }
  const rulesRepo = { upsertGlobalTemplates: vi.fn() }
  const pulseOpsRepo = {
    ensureSourceState: vi.fn(),
    ensureSourceStates: vi.fn(),
    getSourceState: vi.fn(),
    establishSourceBaseline: vi.fn(),
    createSourceSnapshot: vi.fn(),
    updateSourceSnapshotStatus: vi.fn(),
    recordSourceSuccess: vi.fn(),
    recordSourceFailure: vi.fn(),
    listUnclearedDriftRuleIds: vi.fn(async (): Promise<string[]> => []),
    createRuleSourceDriftPulse: vi.fn(async () => ({ pulseId: 'pulse-test', alertCount: 1 })),
    upsertRuleSourceDriftState: vi.fn(async () => undefined),
  }
  const aiRepo = {
    findSuccessfulGlobalRunsByContextRefs: vi.fn(),
    findGlobalContextRefsWithRecentFailures: vi.fn(),
  }
  return {
    coreMocks: {
      sources,
      rules,
      listRuleSources: vi.fn(() => sources),
      listObligationRules: vi.fn(() => rules),
    },
    dbMocks: {
      createDb: vi.fn(() => ({})),
      makeAiRepo: vi.fn(() => aiRepo),
      makePulseOpsRepo: vi.fn(() => pulseOpsRepo),
      makeRulesOpsRepo: vi.fn(() => opsRepo),
      makeRulesRepo: vi.fn(() => rulesRepo),
      opsRepo,
      rulesRepo,
      pulseOpsRepo,
      aiRepo,
    },
    fetchMocks: {
      fetchTextSnapshot: vi.fn(),
      hashText: vi.fn(async (value: string) => `hash-${value.length}`),
      stableExternalId: vi.fn((value: string) => value),
      textExcerpt: vi.fn((value: string) => value.slice(0, 4000)),
    },
    metricsMocks: {
      recordPulseMetric: vi.fn(),
    },
    pulseIngestMocks: {
      archivePulseRaw: vi.fn(),
    },
  }
})

vi.mock('@duedatehq/core/rules', async (importActual) => ({
  // Spread the real module so the pure catalog-release helpers (detectNewCohort,
  // substantialCohortYears, expectedCatalogReleaseDate) run for real; only the
  // catalog *inputs* below are mocked.
  ...(await importActual<typeof import('@duedatehq/core/rules')>()),
  listRuleSources: coreMocks.listRuleSources,
  listObligationRules: coreMocks.listObligationRules,
  isTemporaryAnnouncementSource: (ruleSource: { authorityRole?: string; sourceType?: string }) =>
    ruleSource.authorityRole === 'watch' &&
    (ruleSource.sourceType === 'news' || ruleSource.sourceType === 'emergency_relief'),
}))

vi.mock('@duedatehq/db', () => ({
  createDb: dbMocks.createDb,
  makeAiRepo: dbMocks.makeAiRepo,
  makePulseOpsRepo: dbMocks.makePulseOpsRepo,
  makeRulesOpsRepo: dbMocks.makeRulesOpsRepo,
  makeRulesRepo: dbMocks.makeRulesRepo,
}))

vi.mock('@duedatehq/ingest/http', () => ({
  fetchTextSnapshot: fetchMocks.fetchTextSnapshot,
  hashText: fetchMocks.hashText,
  stableExternalId: fetchMocks.stableExternalId,
  textExcerpt: fetchMocks.textExcerpt,
}))

vi.mock('../pulse/ingest', () => ({
  archivePulseRaw: pulseIngestMocks.archivePulseRaw,
  // fetchTextSnapshot is mocked separately, so ctx.fetch is never invoked here;
  // the wrapper just needs to return a function (pass the fetch through).
  createPoliteFetch: (fn: typeof fetch) => fn,
  // Must mirror the real constant: the failure path computes
  // Math.min(cadence, PULSE_SOURCE_FAILURE_RETRY_MS) — undefined would be NaN.
  PULSE_SOURCE_FAILURE_RETRY_MS: 15 * 60 * 1000,
}))

vi.mock('../pulse/metrics', () => ({
  recordPulseMetric: metricsMocks.recordPulseMetric,
}))

function source(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ca.ftb_business_due_dates',
    jurisdiction: 'CA',
    title: 'California FTB Business Due Dates',
    url: 'https://www.ftb.ca.gov/file/business/due-dates.html',
    sourceType: 'tax_agency',
    acquisitionMethod: 'html_watch',
    cadence: 'weekly',
    priority: 'high',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    domains: ['income_tax'],
    entityApplicability: ['any_business'],
    authorityRole: 'basis',
    notificationChannels: ['source_change'],
    lastReviewedOn: '2026-05-01',
    ...overrides,
  }
}

function sourceDefinedRule(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ca.business_income_return.candidate.2026',
    title: 'California business income return',
    jurisdiction: 'CA',
    version: 1,
    status: 'candidate',
    ruleTier: 'source_defined',
    entityApplicability: ['any_business'],
    taxType: 'state_income_tax',
    formName: 'CA Form 100',
    eventType: 'annual_return',
    isFiling: true,
    isPayment: false,
    taxYear: 2026,
    applicableYear: 2026,
    dueDateLogic: { kind: 'source_defined_calendar' },
    extensionPolicy: null,
    coverageStatus: 'manual',
    requiresApplicabilityReview: true,
    quality: {
      filingPaymentDistinguished: false,
      extensionHandled: false,
      calendarFiscalSpecified: false,
      holidayRolloverHandled: false,
      crossVerified: false,
      exceptionChannel: false,
    },
    defaultTip: 'Review the official source before activation.',
    sourceIds: ['ca.ftb_business_due_dates'],
    evidence: [{ sourceId: 'ca.ftb_business_due_dates' }],
    nextReviewOn: '2027-05-01',
    ...overrides,
  }
}

function env(queueSend = vi.fn()): Pick<Env, 'DB' | 'PULSE_QUEUE' | 'R2_PULSE'> {
  return {
    DB: {} as D1Database,
    PULSE_QUEUE: {
      send: queueSend,
    } as unknown as Queue,
    R2_PULSE: {
      put: vi.fn(async () => undefined),
    } as unknown as R2Bucket,
  }
}

describe('rule source scan jobs', () => {
  beforeEach(() => {
    coreMocks.sources.splice(0, coreMocks.sources.length, source())
    coreMocks.rules.splice(0, coreMocks.rules.length, sourceDefinedRule())
    Object.values(fetchMocks).forEach((mock) => mock.mockClear())
    Object.values(metricsMocks).forEach((mock) => mock.mockClear())
    Object.values(pulseIngestMocks).forEach((mock) => mock.mockClear())
    dbMocks.createDb.mockClear()
    dbMocks.makeAiRepo.mockClear()
    dbMocks.makePulseOpsRepo.mockClear()
    dbMocks.makeRulesOpsRepo.mockClear()
    dbMocks.makeRulesRepo.mockClear()
    Object.values(dbMocks.opsRepo).forEach((mock) => mock.mockReset())
    Object.values(dbMocks.rulesRepo).forEach((mock) => mock.mockReset())
    Object.values(dbMocks.pulseOpsRepo).forEach((mock) => mock.mockReset())
    Object.values(dbMocks.aiRepo).forEach((mock) => mock.mockReset())
    dbMocks.aiRepo.findSuccessfulGlobalRunsByContextRefs.mockResolvedValue([])
    dbMocks.aiRepo.findGlobalContextRefsWithRecentFailures.mockResolvedValue(new Set<string>())
    dbMocks.opsRepo.listGlobalRuleTemplates.mockResolvedValue([])
    dbMocks.opsRepo.deprecateGlobalRuleTemplates.mockResolvedValue(0)
    dbMocks.opsRepo.fanoutReviewTasks.mockResolvedValue({
      newTaskTargets: 0,
      changedTaskTargets: 0,
      supersededTasks: 0,
    })
    dbMocks.opsRepo.firmIdsWithReviewedRule.mockResolvedValue([])
    dbMocks.opsRepo.listReleasedCohortFilingYears.mockResolvedValue([])
    dbMocks.opsRepo.insertCatalogRelease.mockResolvedValue(true)
    dbMocks.opsRepo.fanoutCatalogReleaseNotifications.mockResolvedValue(0)
    dbMocks.pulseOpsRepo.listUnclearedDriftRuleIds.mockResolvedValue([])
    dbMocks.pulseOpsRepo.createRuleSourceDriftPulse.mockResolvedValue({
      pulseId: 'pulse-test',
      alertCount: 1,
    })
    dbMocks.pulseOpsRepo.upsertRuleSourceDriftState.mockResolvedValue(undefined)
    dbMocks.rulesRepo.upsertGlobalTemplates.mockResolvedValue(undefined)
    dbMocks.pulseOpsRepo.ensureSourceState.mockResolvedValue({
      enabled: true,
      nextCheckAt: new Date('2026-05-25T09:00:00.000Z'),
    })
    // The batched ensureSourceStates delegates to the per-source ensureSourceState
    // mock so existing per-test mockResolvedValue/mockResolvedValueOnce setups
    // keep driving behavior; it returns a Map keyed by sourceId.
    dbMocks.pulseOpsRepo.ensureSourceStates.mockImplementation(
      async (inputs: ReadonlyArray<{ sourceId: string }>, now?: Date) => {
        const entries = await Promise.all(
          inputs.map(async (input) => {
            const state = await dbMocks.pulseOpsRepo.ensureSourceState({ ...input, now })
            return [input.sourceId, state] as const
          }),
        )
        return new Map(entries)
      },
    )
    dbMocks.pulseOpsRepo.getSourceState.mockResolvedValue(null)
    dbMocks.pulseOpsRepo.createSourceSnapshot.mockResolvedValue({
      inserted: true,
      snapshot: { id: 'snapshot-1' },
    })
    dbMocks.pulseOpsRepo.establishSourceBaseline.mockResolvedValue(undefined)
    dbMocks.pulseOpsRepo.updateSourceSnapshotStatus.mockResolvedValue(undefined)
    dbMocks.pulseOpsRepo.recordSourceSuccess.mockResolvedValue(undefined)
    dbMocks.pulseOpsRepo.recordSourceFailure.mockResolvedValue(undefined)
    pulseIngestMocks.archivePulseRaw.mockResolvedValue({
      contentHash: 'archived-item-hash',
      r2Key: 'pulse/item.txt',
    })
  })

  it('runs the weekly governance gate only during the Monday 09:00 UTC window', () => {
    expect(shouldRunWeeklyRuleSourceGovernance(new Date('2026-05-25T09:00:00.000Z'))).toBe(true)
    expect(shouldRunWeeklyRuleSourceGovernance(new Date('2026-05-25T09:29:59.000Z'))).toBe(true)
    expect(shouldRunWeeklyRuleSourceGovernance(new Date('2026-05-25T09:30:00.000Z'))).toBe(false)
    expect(shouldRunWeeklyRuleSourceGovernance(new Date('2026-05-26T09:00:00.000Z'))).toBe(false)
  })

  it('enqueues only due automated sources', async () => {
    const queueSend = vi.fn()
    coreMocks.sources.splice(
      0,
      coreMocks.sources.length,
      source({ id: 'daily-source', cadence: 'daily', acquisitionMethod: 'html_watch' }),
      source({ id: 'weekly-source', cadence: 'weekly', acquisitionMethod: 'html_watch' }),
    )
    dbMocks.pulseOpsRepo.ensureSourceState
      .mockResolvedValueOnce({
        enabled: true,
        nextCheckAt: new Date('2026-05-25T09:00:00.000Z'),
      })
      .mockResolvedValueOnce({
        enabled: true,
        nextCheckAt: new Date('2026-05-26T09:00:00.000Z'),
      })

    const result = await enqueueDueRuleSourceScans(
      env(queueSend),
      new Date('2026-05-25T09:00:00.000Z'),
    )

    expect(result).toEqual({ queued: 1 })
    expect(queueSend).toHaveBeenCalledWith({
      type: PULSE_RULE_SOURCE_SCAN_MESSAGE_TYPE,
      sourceId: 'daily-source',
      reason: 'cadence_due',
    })
  })

  it('enqueues due temporary announcement watch sources for Pulse scanning', async () => {
    const queueSend = vi.fn()
    coreMocks.sources.splice(
      0,
      coreMocks.sources.length,
      source({
        id: 'tx.temporary_announcements',
        jurisdiction: 'TX',
        title: 'Texas Comptroller News',
        sourceType: 'news',
        acquisitionMethod: 'api_watch',
        adapterKind: 'rss_or_announcement_list',
        feedUrl: 'https://comptroller.texas.gov/about/media-center/news/',
        cadence: 'daily',
        authorityRole: 'watch',
        notificationChannels: ['source_change', 'practice_rule_review'],
      }),
    )
    dbMocks.pulseOpsRepo.ensureSourceState.mockResolvedValueOnce({
      enabled: true,
      nextCheckAt: new Date('2026-05-25T09:00:00.000Z'),
    })

    const result = await enqueueDueRuleSourceScans(
      env(queueSend),
      new Date('2026-05-25T09:00:00.000Z'),
    )

    expect(result).toEqual({ queued: 1 })
    expect(queueSend).toHaveBeenCalledWith({
      type: PULSE_RULE_SOURCE_SCAN_MESSAGE_TYPE,
      sourceId: 'tx.temporary_announcements',
      reason: 'cadence_due',
    })
  })

  it('queues non-automated sources only during the weekly governance window', async () => {
    const queueSend = vi.fn()
    coreMocks.sources.splice(
      0,
      coreMocks.sources.length,
      source({ id: 'manual-source', acquisitionMethod: 'api_watch' }),
    )

    const outsideWindow = await enqueueDueRuleSourceScans(
      env(queueSend),
      new Date('2026-05-26T09:00:00.000Z'),
    )
    expect(outsideWindow).toEqual({ queued: 0 })
    expect(queueSend).not.toHaveBeenCalled()

    const insideWindow = await enqueueDueRuleSourceScans(
      env(queueSend),
      new Date('2026-05-25T09:00:00.000Z'),
    )

    expect(insideWindow).toEqual({ queued: 1 })
    expect(queueSend).toHaveBeenCalledWith({
      type: PULSE_RULE_SOURCE_SCAN_MESSAGE_TYPE,
      sourceId: 'manual-source',
      reason: 'weekly_governance',
    })
  })

  it('treats unchanged sources as freshness updates without Pulse extraction', async () => {
    const queueSend = vi.fn()
    fetchMocks.fetchTextSnapshot.mockResolvedValue({
      notModified: true,
      fetchedAt: new Date('2026-05-25T09:00:00.000Z'),
      etag: 'etag-1',
      lastModified: 'Mon, 25 May 2026 09:00:00 GMT',
    })

    await consumePulseRuleSourceScan(
      {
        type: PULSE_RULE_SOURCE_SCAN_MESSAGE_TYPE,
        sourceId: 'ca.ftb_business_due_dates',
        reason: 'cadence_due',
      },
      env(queueSend) as Env,
    )

    expect(dbMocks.pulseOpsRepo.recordSourceSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ sourceId: 'ca.ftb_business_due_dates', changed: false }),
    )
    expect(dbMocks.pulseOpsRepo.createSourceSnapshot).not.toHaveBeenCalled()
    expect(queueSend).not.toHaveBeenCalled()
  })

  it('routes changed automated source snapshots into Pulse extraction', async () => {
    const queueSend = vi.fn()
    fetchMocks.fetchTextSnapshot.mockResolvedValue({
      notModified: false,
      fetchedAt: new Date('2026-05-25T09:00:00.000Z'),
      contentHash: 'content-hash-1',
      r2Key: 'raw/source.html',
      etag: 'etag-2',
      lastModified: null,
    })

    await consumePulseRuleSourceScan(
      {
        type: PULSE_RULE_SOURCE_SCAN_MESSAGE_TYPE,
        sourceId: 'ca.ftb_business_due_dates',
        reason: 'cadence_due',
      },
      env(queueSend) as Env,
    )

    expect(dbMocks.pulseOpsRepo.createSourceSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceId: 'ca.ftb_business_due_dates',
        contentHash: 'content-hash-1',
        rawR2Key: 'raw/source.html',
      }),
    )
    expect(queueSend).toHaveBeenCalledWith({ type: 'pulse.extract', snapshotId: 'snapshot-1' })
  })

  it("caps a failed scan's retry at 15 minutes instead of the full cadence", async () => {
    coreMocks.sources.splice(
      0,
      coreMocks.sources.length,
      source({ id: 'quarterly-source', cadence: 'quarterly' }),
    )
    fetchMocks.fetchTextSnapshot.mockRejectedValue(
      new Error('fetch_timeout: https://example.gov exceeded 30000ms'),
    )
    const before = Date.now()

    await consumePulseRuleSourceScan(
      {
        type: PULSE_RULE_SOURCE_SCAN_MESSAGE_TYPE,
        sourceId: 'quarterly-source',
        reason: 'cadence_due',
      },
      env(vi.fn()) as Env,
    )

    const failure = dbMocks.pulseOpsRepo.recordSourceFailure.mock.calls[0]?.[0] as {
      sourceId: string
      nextCheckAt: Date
      error: string
    }
    expect(failure.sourceId).toBe('quarterly-source')
    expect(failure.error).toContain('fetch_timeout')
    const retryMs = failure.nextCheckAt.getTime() - before
    expect(retryMs).toBeGreaterThan(0)
    expect(retryMs).toBeLessThanOrEqual(15 * 60 * 1000 + 2000)
  })

  it('baselines a newly monitored Rule Library source without Pulse extraction', async () => {
    const queueSend = vi.fn()
    dbMocks.pulseOpsRepo.ensureSourceState.mockResolvedValue({
      enabled: true,
      nextCheckAt: null,
      monitoringBaselineAt: null,
      baselineMode: 'establish_on_first_seen',
    })
    fetchMocks.fetchTextSnapshot.mockResolvedValue({
      notModified: false,
      fetchedAt: new Date('2026-05-25T09:00:00.000Z'),
      contentHash: 'content-hash-1',
      r2Key: 'raw/source.html',
      etag: 'etag-2',
      lastModified: null,
    })

    await consumePulseRuleSourceScan(
      {
        type: PULSE_RULE_SOURCE_SCAN_MESSAGE_TYPE,
        sourceId: 'ca.ftb_business_due_dates',
        reason: 'cadence_due',
      },
      env(queueSend) as Env,
    )

    expect(dbMocks.pulseOpsRepo.updateSourceSnapshotStatus).toHaveBeenCalledWith('snapshot-1', {
      parseStatus: 'ignored',
      failureReason: 'monitoring_baseline_established',
    })
    expect(dbMocks.pulseOpsRepo.establishSourceBaseline).toHaveBeenCalledWith({
      sourceId: 'ca.ftb_business_due_dates',
      baselineAt: expect.any(Date),
    })
    expect(dbMocks.pulseOpsRepo.recordSourceSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceId: 'ca.ftb_business_due_dates',
        changed: false,
      }),
    )
    expect(queueSend).not.toHaveBeenCalled()
  })

  it('splits changed temporary announcement pages into detail snapshots', async () => {
    const queueSend = vi.fn()
    coreMocks.sources.splice(
      0,
      coreMocks.sources.length,
      source({
        id: 'tx.temporary_announcements',
        jurisdiction: 'TX',
        title: 'Texas Comptroller News',
        sourceType: 'news',
        acquisitionMethod: 'html_watch',
        cadence: 'daily',
        authorityRole: 'watch',
        notificationChannels: ['source_change', 'practice_rule_review'],
        url: 'https://comptroller.texas.gov/about/media-center/news/',
      }),
    )
    fetchMocks.fetchTextSnapshot.mockResolvedValue({
      notModified: false,
      fetchedAt: new Date('2026-05-25T09:00:00.000Z'),
      contentHash: 'list-hash',
      r2Key: 'raw/source.html',
      etag: 'etag-2',
      lastModified: null,
      body: '<main><a href="/about/media-center/news/20260408-deadline">Texas businesses: April 15 is deadline for filing renditions</a><a href="/about">About us</a></main>',
    })

    await consumePulseRuleSourceScan(
      {
        type: PULSE_RULE_SOURCE_SCAN_MESSAGE_TYPE,
        sourceId: 'tx.temporary_announcements',
        reason: 'cadence_due',
      },
      env(queueSend) as Env,
    )

    expect(pulseIngestMocks.archivePulseRaw).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        sourceId: 'tx.temporary_announcements',
        externalId: 'https://comptroller.texas.gov/about/media-center/news/20260408-deadline',
        contentType: 'text/plain; charset=utf-8',
      }),
    )
    expect(dbMocks.pulseOpsRepo.createSourceSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceId: 'tx.temporary_announcements',
        externalId: 'https://comptroller.texas.gov/about/media-center/news/20260408-deadline',
        title: 'Texas businesses: April 15 is deadline for filing renditions',
        rawR2Key: 'pulse/item.txt',
      }),
    )
    expect(queueSend).toHaveBeenCalledWith({ type: 'pulse.extract', snapshotId: 'snapshot-1' })
  })

  it('records non-automated source checks as healthy scheduler state only', async () => {
    coreMocks.sources.splice(
      0,
      coreMocks.sources.length,
      source({ id: 'manual-source', acquisitionMethod: 'api_watch' }),
    )

    await consumePulseRuleSourceScan(
      {
        type: PULSE_RULE_SOURCE_SCAN_MESSAGE_TYPE,
        sourceId: 'manual-source',
        reason: 'weekly_governance',
      },
      env() as Env,
    )

    expect(dbMocks.pulseOpsRepo.recordSourceSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ sourceId: 'manual-source', changed: false }),
    )
  })

  it('fans out changed/new catalog rules and enqueues current-version concrete drafts', async () => {
    const changedRule = sourceDefinedRule({
      id: 'ca.changed.rule',
      version: 2,
      sourceIds: ['ca.ftb_business_due_dates'],
      evidence: [{ sourceId: 'ca.ftb_business_due_dates' }],
    })
    const newRule = sourceDefinedRule({
      id: 'ca.new.rule',
      version: 1,
      sourceIds: ['ca.ftb_business_due_dates'],
      evidence: [{ sourceId: 'ca.ftb_business_due_dates' }],
    })
    coreMocks.rules.splice(0, coreMocks.rules.length, changedRule, newRule)
    dbMocks.opsRepo.listGlobalRuleTemplates.mockResolvedValue([
      { id: 'ca.changed.rule', version: 1, status: 'available', ruleJson: {}, sourceIds: [] },
    ])
    const queueSend = vi.fn()

    const result = await consumeRuleRegistryCatalogSync(
      { type: RULE_REGISTRY_CATALOG_SYNC_MESSAGE_TYPE, reason: 'scheduled' },
      env(queueSend) as Env,
    )

    expect(dbMocks.rulesRepo.upsertGlobalTemplates).toHaveBeenCalledWith(
      expect.objectContaining({
        sources: [expect.objectContaining({ id: 'ca.ftb_business_due_dates' })],
        rules: [
          expect.objectContaining({ id: 'ca.changed.rule', version: 2 }),
          expect.objectContaining({ id: 'ca.new.rule', version: 1 }),
        ],
      }),
    )
    expect(dbMocks.opsRepo.fanoutReviewTasks).toHaveBeenCalledWith({
      newRules: [{ ruleId: 'ca.new.rule', templateVersion: 1 }],
      changedRules: [{ ruleId: 'ca.changed.rule', templateVersion: 2 }],
      cohortRuleIds: [],
    })
    expect(dbMocks.opsRepo.deprecateGlobalRuleTemplates).toHaveBeenCalledWith([])
    expect(queueSend).toHaveBeenCalledTimes(2)
    expect(queueSend).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'rule.concreteDraft.generate',
        ruleId: 'ca.changed.rule',
        sourceId: 'ca.ftb_business_due_dates',
        reason: 'prewarm',
      }),
    )
    expect(result).toEqual({ newRules: 1, changedRules: 1, deprecatedRules: 0, draftMessages: 2 })
  })

  it('deprecates old catalog templates that are no longer in the current core catalog', async () => {
    const currentRule = sourceDefinedRule({ id: 'ca.current.rule', version: 1 })
    coreMocks.rules.splice(0, coreMocks.rules.length, currentRule)
    dbMocks.opsRepo.listGlobalRuleTemplates.mockResolvedValue([
      { id: 'ca.current.rule', version: 1, status: 'available', ruleJson: {}, sourceIds: [] },
      { id: 'ca.old.rule', version: 1, status: 'available', ruleJson: {}, sourceIds: [] },
      { id: 'ca.already.old.rule', version: 1, status: 'deprecated', ruleJson: {}, sourceIds: [] },
    ])
    dbMocks.opsRepo.deprecateGlobalRuleTemplates.mockResolvedValue(1)

    const result = await consumeRuleRegistryCatalogSync(
      { type: RULE_REGISTRY_CATALOG_SYNC_MESSAGE_TYPE, reason: 'scheduled' },
      env() as Env,
    )

    expect(dbMocks.opsRepo.deprecateGlobalRuleTemplates).toHaveBeenCalledWith(['ca.old.rule'])
    expect(dbMocks.opsRepo.fanoutReviewTasks).toHaveBeenCalledWith({
      newRules: [],
      changedRules: [],
      cohortRuleIds: [],
    })
    expect(result.deprecatedRules).toBe(1)
  })

  it('announces a brand-new annual cohort once: release row, firm notice, annual_review tasks', async () => {
    const cohort = Array.from({ length: 8 }, (_, index) =>
      sourceDefinedRule({ id: `fed.cohort.2027.${index}`, applicableYear: 2027 }),
    )
    coreMocks.rules.splice(0, coreMocks.rules.length, ...cohort)
    // A prior cohort is already released → this is the incremental announce path.
    dbMocks.opsRepo.listReleasedCohortFilingYears.mockResolvedValue([2026])
    dbMocks.opsRepo.listGlobalRuleTemplates.mockResolvedValue([])
    dbMocks.opsRepo.insertCatalogRelease.mockResolvedValue(true)
    dbMocks.opsRepo.fanoutCatalogReleaseNotifications.mockResolvedValue(8)

    await consumeRuleRegistryCatalogSync(
      { type: RULE_REGISTRY_CATALOG_SYNC_MESSAGE_TYPE, reason: 'scheduled' },
      env() as Env,
    )

    expect(dbMocks.opsRepo.insertCatalogRelease).toHaveBeenCalledWith({
      filingYear: 2027,
      newRuleCount: 8,
      changedRuleCount: 0,
    })
    expect(dbMocks.opsRepo.fanoutCatalogReleaseNotifications).toHaveBeenCalledWith({
      filingYear: 2027,
      newRuleCount: 8,
      changedRuleCount: 0,
    })
    expect(dbMocks.opsRepo.fanoutReviewTasks).toHaveBeenCalledWith(
      expect.objectContaining({ cohortRuleIds: cohort.map((rule) => rule.id) }),
    )
    expect(metricsMocks.recordPulseMetric).toHaveBeenCalledWith(
      'rule.catalog_release',
      expect.objectContaining({ filingYear: 2027, newRuleCount: 8 }),
    )
  })

  it('baselines existing cohorts silently on first run (no firm notifications)', async () => {
    const cohort = Array.from({ length: 8 }, (_, index) =>
      sourceDefinedRule({ id: `fed.cohort.2026.${index}`, applicableYear: 2026 }),
    )
    coreMocks.rules.splice(0, coreMocks.rules.length, ...cohort)
    // Empty release log → first run after the feature ships.
    dbMocks.opsRepo.listReleasedCohortFilingYears.mockResolvedValue([])
    dbMocks.opsRepo.listGlobalRuleTemplates.mockResolvedValue([])
    dbMocks.opsRepo.fanoutCatalogReleaseNotifications.mockClear()

    await consumeRuleRegistryCatalogSync(
      { type: RULE_REGISTRY_CATALOG_SYNC_MESSAGE_TYPE, reason: 'scheduled' },
      env() as Env,
    )

    // Existing cohort is recorded (back-dated releasedAt) but NOT announced.
    expect(dbMocks.opsRepo.insertCatalogRelease).toHaveBeenCalledWith(
      expect.objectContaining({ filingYear: 2026, releasedAt: expect.any(Date) }),
    )
    expect(dbMocks.opsRepo.fanoutCatalogReleaseNotifications).not.toHaveBeenCalled()
    expect(dbMocks.opsRepo.fanoutReviewTasks).toHaveBeenCalledWith(
      expect.objectContaining({ cohortRuleIds: [] }),
    )
  })

  it('raises a targeted rule_source_drift alert for a changed rule firms have adopted', async () => {
    const changedRule = sourceDefinedRule({
      id: 'ca.changed.rule',
      version: 2,
      sourceIds: ['ca.ftb_business_due_dates'],
      evidence: [{ sourceId: 'ca.ftb_business_due_dates' }],
    })
    coreMocks.rules.splice(0, coreMocks.rules.length, changedRule)
    dbMocks.opsRepo.listGlobalRuleTemplates.mockResolvedValue([
      { id: 'ca.changed.rule', version: 1, status: 'available', ruleJson: {}, sourceIds: [] },
    ])
    dbMocks.opsRepo.firmIdsWithReviewedRule.mockResolvedValue(['firm-a', 'firm-b'])

    await consumeRuleRegistryCatalogSync(
      { type: RULE_REGISTRY_CATALOG_SYNC_MESSAGE_TYPE, reason: 'scheduled' },
      env() as Env,
    )

    expect(dbMocks.opsRepo.firmIdsWithReviewedRule).toHaveBeenCalledWith('ca.changed.rule')
    expect(dbMocks.pulseOpsRepo.createRuleSourceDriftPulse).toHaveBeenCalledTimes(1)
    expect(dbMocks.pulseOpsRepo.createRuleSourceDriftPulse).toHaveBeenCalledWith(
      expect.objectContaining({
        reverifyRuleIds: ['ca.changed.rule'],
        parsedJurisdiction: 'CA',
        sourceId: 'ca.ftb_business_due_dates',
      }),
      { firmIds: ['firm-a', 'firm-b'] },
    )
    expect(dbMocks.pulseOpsRepo.upsertRuleSourceDriftState).toHaveBeenCalledWith(
      expect.objectContaining({ ruleId: 'ca.changed.rule', pulseId: 'pulse-test' }),
    )
  })

  it('does not raise a rule-change alert when no firm has adopted the changed rule', async () => {
    const changedRule = sourceDefinedRule({
      id: 'ca.changed.rule',
      version: 2,
      sourceIds: ['ca.ftb_business_due_dates'],
    })
    coreMocks.rules.splice(0, coreMocks.rules.length, changedRule)
    dbMocks.opsRepo.listGlobalRuleTemplates.mockResolvedValue([
      { id: 'ca.changed.rule', version: 1, status: 'available', ruleJson: {}, sourceIds: [] },
    ])
    dbMocks.opsRepo.firmIdsWithReviewedRule.mockResolvedValue([])

    await consumeRuleRegistryCatalogSync(
      { type: RULE_REGISTRY_CATALOG_SYNC_MESSAGE_TYPE, reason: 'scheduled' },
      env() as Env,
    )

    expect(dbMocks.pulseOpsRepo.createRuleSourceDriftPulse).not.toHaveBeenCalled()
  })

  it('skips a changed rule whose drift is already uncleared (dedup)', async () => {
    const changedRule = sourceDefinedRule({
      id: 'ca.changed.rule',
      version: 2,
      sourceIds: ['ca.ftb_business_due_dates'],
    })
    coreMocks.rules.splice(0, coreMocks.rules.length, changedRule)
    dbMocks.opsRepo.listGlobalRuleTemplates.mockResolvedValue([
      { id: 'ca.changed.rule', version: 1, status: 'available', ruleJson: {}, sourceIds: [] },
    ])
    dbMocks.opsRepo.firmIdsWithReviewedRule.mockResolvedValue(['firm-a'])
    dbMocks.pulseOpsRepo.listUnclearedDriftRuleIds.mockResolvedValue(['ca.changed.rule'])

    await consumeRuleRegistryCatalogSync(
      { type: RULE_REGISTRY_CATALOG_SYNC_MESSAGE_TYPE, reason: 'scheduled' },
      env() as Env,
    )

    expect(dbMocks.pulseOpsRepo.createRuleSourceDriftPulse).not.toHaveBeenCalled()
  })
})

describe('buildRuleDateAlertPlans (gap #5)', () => {
  const SOURCES = [{ id: 'fed.src', url: 'https://www.irs.gov/file' }] as unknown as RuleSource[]
  function rule(overrides: Record<string, unknown> = {}): ObligationRule {
    return {
      id: 'fed.1040.return.2026',
      jurisdiction: 'FED',
      taxType: 'federal_1040',
      entityApplicability: ['individual'],
      status: 'verified',
      applicableYear: 2026,
      dueDateLogic: {
        kind: 'fixed_date',
        date: '2026-04-15',
        holidayRollover: 'next_business_day',
      },
      sourceIds: ['fed.src'],
      evidence: [
        {
          sourceId: 'fed.src',
          authorityRole: 'basis',
          sourceExcerpt: 'Returns are due April 15, 2026.',
        },
      ],
      ...overrides,
    } as unknown as ObligationRule
  }

  it('plans one alert per stale rule with basis source + jurisdiction resolved', () => {
    const plans = buildRuleDateAlertPlans({
      rules: [rule({ id: 'fed.1040.return.2024', applicableYear: 2025 })],
      sources: SOURCES,
      currentYear: 2026,
      unclearedRuleIds: new Set<string>(),
    })
    expect(plans).toHaveLength(1)
    expect(plans[0]).toMatchObject({
      ruleId: 'fed.1040.return.2024',
      sourceId: 'fed.src',
      jurisdiction: 'FED',
      sourceUrl: 'https://www.irs.gov/file',
    })
    expect(plans[0]?.aiSummary).toContain('fed.1040.return.2024')
    expect(plans[0]?.verbatimQuote).toContain('April 15')
  })

  it('skips a rule that already carries an uncleared drift signal (dedup)', () => {
    const plans = buildRuleDateAlertPlans({
      rules: [rule({ id: 'fed.1040.return.2024', applicableYear: 2025 })],
      sources: SOURCES,
      currentYear: 2026,
      unclearedRuleIds: new Set(['fed.1040.return.2024']),
    })
    expect(plans).toEqual([])
  })

  it('plans an alert for a date-vs-excerpt mismatch', () => {
    const plans = buildRuleDateAlertPlans({
      rules: [
        rule({
          dueDateLogic: {
            kind: 'fixed_date',
            date: '2026-03-15',
            holidayRollover: 'next_business_day',
          },
        }),
      ],
      sources: SOURCES,
      currentYear: 2026,
      unclearedRuleIds: new Set<string>(),
    })
    expect(plans).toHaveLength(1)
    expect(plans[0]?.aiSummary).toMatch(/not within|not supported/i)
  })

  it('plans nothing when the catalog is consistent', () => {
    expect(
      buildRuleDateAlertPlans({
        rules: [rule()],
        sources: SOURCES,
        currentYear: 2026,
        unclearedRuleIds: new Set<string>(),
      }),
    ).toEqual([])
  })

  it('skips a stale rule whose basis source has no known url', () => {
    expect(
      buildRuleDateAlertPlans({
        rules: [rule({ id: 'fed.1040.return.2024', applicableYear: 2025 })],
        sources: [],
        currentYear: 2026,
        unclearedRuleIds: new Set<string>(),
      }),
    ).toEqual([])
  })
})

describe('consumeRuleDateReconciliation (gap #5)', () => {
  const driftSource = { id: 'fed.src', url: 'https://www.irs.gov/file' }
  function staleRule(overrides: Record<string, unknown> = {}) {
    return {
      id: 'fed.1040.return.2024',
      jurisdiction: 'FED',
      taxType: 'federal_1040',
      entityApplicability: ['individual'],
      status: 'verified',
      applicableYear: 2025,
      dueDateLogic: {
        kind: 'fixed_date',
        date: '2025-04-15',
        holidayRollover: 'next_business_day',
      },
      sourceIds: ['fed.src'],
      evidence: [
        {
          sourceId: 'fed.src',
          authorityRole: 'basis',
          sourceExcerpt: 'Returns are due April 15, 2025.',
        },
      ],
      nextReviewOn: '2026-05-01',
      ...overrides,
    }
  }

  beforeEach(() => {
    coreMocks.sources.splice(0, coreMocks.sources.length)
    coreMocks.rules.splice(0, coreMocks.rules.length)
    dbMocks.pulseOpsRepo.createRuleSourceDriftPulse.mockClear()
    dbMocks.pulseOpsRepo.upsertRuleSourceDriftState.mockClear()
    dbMocks.pulseOpsRepo.listUnclearedDriftRuleIds.mockClear()
    dbMocks.pulseOpsRepo.listUnclearedDriftRuleIds.mockResolvedValue([])
    metricsMocks.recordPulseMetric.mockClear()
  })

  it('raises a drift alert + records drift state for a newly stale rule', async () => {
    coreMocks.rules.push(staleRule())
    coreMocks.sources.push(driftSource)
    const result = await consumeRuleDateReconciliation(
      { type: RULE_DATE_RECONCILIATION_MESSAGE_TYPE, reason: 'manual' },
      env() as Env,
    )
    expect(result).toEqual({ staleRules: 1, alertsCreated: 1 })
    expect(dbMocks.pulseOpsRepo.createRuleSourceDriftPulse).toHaveBeenCalledTimes(1)
    expect(dbMocks.pulseOpsRepo.createRuleSourceDriftPulse).toHaveBeenCalledWith(
      expect.objectContaining({ sourceId: 'fed.src', reverifyRuleIds: ['fed.1040.return.2024'] }),
    )
    expect(dbMocks.pulseOpsRepo.upsertRuleSourceDriftState).toHaveBeenCalledWith(
      expect.objectContaining({ ruleId: 'fed.1040.return.2024', sourceId: 'fed.src' }),
    )
  })

  it('does not re-alert a rule whose drift is already uncleared (dedup)', async () => {
    coreMocks.rules.push(staleRule())
    coreMocks.sources.push(driftSource)
    dbMocks.pulseOpsRepo.listUnclearedDriftRuleIds.mockResolvedValue(['fed.1040.return.2024'])
    const result = await consumeRuleDateReconciliation(
      { type: RULE_DATE_RECONCILIATION_MESSAGE_TYPE, reason: 'manual' },
      env() as Env,
    )
    expect(result).toEqual({ staleRules: 1, alertsCreated: 0 })
    expect(dbMocks.pulseOpsRepo.createRuleSourceDriftPulse).not.toHaveBeenCalled()
  })

  it('creates nothing when the catalog has no stale rules', async () => {
    coreMocks.rules.push(
      staleRule({
        applicableYear: 2999,
        dueDateLogic: {
          kind: 'fixed_date',
          date: '2999-04-15',
          holidayRollover: 'next_business_day',
        },
        evidence: [
          {
            sourceId: 'fed.src',
            authorityRole: 'basis',
            sourceExcerpt: 'Returns are due April 15, 2999.',
          },
        ],
      }),
    )
    coreMocks.sources.push(driftSource)
    const result = await consumeRuleDateReconciliation(
      { type: RULE_DATE_RECONCILIATION_MESSAGE_TYPE, reason: 'manual' },
      env() as Env,
    )
    expect(result).toEqual({ staleRules: 0, alertsCreated: 0 })
    expect(dbMocks.pulseOpsRepo.createRuleSourceDriftPulse).not.toHaveBeenCalled()
    expect(dbMocks.pulseOpsRepo.listUnclearedDriftRuleIds).not.toHaveBeenCalled()
  })
})
