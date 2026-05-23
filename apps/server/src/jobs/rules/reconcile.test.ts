/* eslint-disable typescript-eslint/no-unsafe-type-assertion --
 * Focused Worker doubles only implement the rule source scan job surface.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Env } from '../../env'
import {
  consumePulseRuleSourceScan,
  consumeRuleRegistryCatalogSync,
  enqueueDueRuleSourceScans,
  PULSE_RULE_SOURCE_SCAN_MESSAGE_TYPE,
  RULE_REGISTRY_CATALOG_SYNC_MESSAGE_TYPE,
  shouldRunWeeklyRuleSourceGovernance,
} from './reconcile'

const { coreMocks, dbMocks, fetchMocks, metricsMocks, pulseIngestMocks } = vi.hoisted(() => {
  const sources: unknown[] = []
  const rules: unknown[] = []
  const opsRepo = {
    listGlobalRuleTemplates: vi.fn(),
    fanoutReviewTasks: vi.fn(),
  }
  const rulesRepo = { upsertGlobalTemplates: vi.fn() }
  const pulseOpsRepo = {
    ensureSourceState: vi.fn(),
    getSourceState: vi.fn(),
    createSourceSnapshot: vi.fn(),
    createSourceSignal: vi.fn(),
    recordSourceSuccess: vi.fn(),
    recordSourceFailure: vi.fn(),
  }
  const aiRepo = {
    findSuccessfulGlobalRunsByContextRefs: vi.fn(),
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

vi.mock('@duedatehq/core/rules', () => ({
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
    dbMocks.opsRepo.listGlobalRuleTemplates.mockResolvedValue([])
    dbMocks.opsRepo.fanoutReviewTasks.mockResolvedValue({
      newTaskTargets: 0,
      changedTaskTargets: 0,
      supersededTasks: 0,
    })
    dbMocks.rulesRepo.upsertGlobalTemplates.mockResolvedValue(undefined)
    dbMocks.pulseOpsRepo.ensureSourceState.mockResolvedValue({
      enabled: true,
      nextCheckAt: new Date('2026-05-25T09:00:00.000Z'),
    })
    dbMocks.pulseOpsRepo.getSourceState.mockResolvedValue(null)
    dbMocks.pulseOpsRepo.createSourceSnapshot.mockResolvedValue({
      inserted: true,
      snapshot: { id: 'snapshot-1' },
    })
    dbMocks.pulseOpsRepo.createSourceSignal.mockResolvedValue({
      inserted: true,
      signal: { id: 'signal-1' },
    })
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

  it('records non-automated source checks as Pulse source signals', async () => {
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

    expect(dbMocks.pulseOpsRepo.createSourceSignal).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceId: 'manual-source',
        signalType: 'source_check_due',
      }),
    )
    expect(dbMocks.pulseOpsRepo.recordSourceSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ sourceId: 'manual-source', changed: true }),
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
    })
    expect(queueSend).toHaveBeenCalledTimes(2)
    expect(queueSend).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'rule.concreteDraft.generate',
        ruleId: 'ca.changed.rule',
        sourceId: 'ca.ftb_business_due_dates',
        reason: 'prewarm',
      }),
    )
    expect(result).toEqual({ newRules: 1, changedRules: 1, draftMessages: 2 })
  })
})
