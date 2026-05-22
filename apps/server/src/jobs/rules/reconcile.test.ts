/* eslint-disable typescript-eslint/no-unsafe-type-assertion --
 * Focused Worker doubles only implement the rule registry reconcile job surface.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Env } from '../../env'
import {
  consumeRuleRegistryCatalogSync,
  consumeRuleRegistrySourceReconcile,
  enqueueDueRuleRegistryReconcile,
  RULE_REGISTRY_CATALOG_SYNC_MESSAGE_TYPE,
  RULE_REGISTRY_SOURCE_RECONCILE_MESSAGE_TYPE,
  shouldRunWeeklyRuleRegistryGovernance,
  shouldRunWeeklyRuleRegistryReconcile,
} from './reconcile'

const { aiMocks, coreMocks, dbMocks, fetchMocks, metricsMocks, pulseIngestMocks } = vi.hoisted(
  () => {
    const sources: unknown[] = []
    const rules: unknown[] = []
    const ai = { runPrompt: vi.fn() }
    const opsRepo = {
      startReconcileRun: vi.fn(),
      recordReconcileSourceOutcome: vi.fn(),
      recordChangeProposal: vi.fn(),
      listGlobalRuleTemplates: vi.fn(),
      fanoutReviewTasks: vi.fn(),
    }
    const rulesRepo = { upsertGlobalTemplates: vi.fn() }
    const pulseOpsRepo = {
      ensureSourceState: vi.fn(),
      getSourceState: vi.fn(),
      createSourceSnapshot: vi.fn(),
      recordSourceSuccess: vi.fn(),
      recordSourceFailure: vi.fn(),
    }
    const aiRepo = {
      findSuccessfulGlobalRunsByContextRefs: vi.fn(),
      recordGlobalRun: vi.fn(),
    }
    return {
      aiMocks: {
        ai,
        createAI: vi.fn(() => ai),
      },
      coreMocks: {
        sources,
        rules,
        listRuleSources: vi.fn(() => sources),
        listObligationRules: vi.fn(() => rules),
      },
      dbMocks: {
        createDb: vi.fn(() => ({})),
        makeRulesOpsRepo: vi.fn(() => opsRepo),
        makeRulesRepo: vi.fn(() => rulesRepo),
        makePulseOpsRepo: vi.fn(() => pulseOpsRepo),
        makeAiRepo: vi.fn(() => aiRepo),
        opsRepo,
        rulesRepo,
        pulseOpsRepo,
        aiRepo,
      },
      fetchMocks: {
        fetchTextSnapshot: vi.fn(),
      },
      metricsMocks: {
        recordPulseMetric: vi.fn(),
      },
      pulseIngestMocks: {
        archivePulseRaw: vi.fn(),
      },
    }
  },
)

vi.mock('@duedatehq/ai', () => ({
  createAI: aiMocks.createAI,
}))

vi.mock('@duedatehq/core/rules', () => ({
  listRuleSources: coreMocks.listRuleSources,
  listObligationRules: coreMocks.listObligationRules,
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

function okAnalyzerResult(classification: 'no_rule_change' | 'existing_rule_update' | 'new_rule') {
  return {
    result: {
      classification,
      affectedRuleIds:
        classification === 'existing_rule_update'
          ? ['ca.business_income_return.candidate.2026']
          : [],
      proposedRuleIds: classification === 'new_rule' ? ['ca.new.rule.candidate.2026'] : [],
      diffSummary:
        classification === 'no_rule_change'
          ? 'Source content changed, but no rule semantics changed.'
          : 'Rule pack proposal requires review.',
      normalizedRuleJson: classification === 'no_rule_change' ? null : { rules: [] },
      confidence: 0.9,
      reasoning: 'Test analyzer result.',
    },
    refusal: null,
    trace: {
      promptVersion: 'rule-registry-reconcile@v1',
      model: 'test-model',
      latencyMs: 1,
      guardResult: 'ok',
      inputHash: 'hash-input',
    },
    model: 'test-model',
    confidence: 0.9,
    cost: null,
  }
}

describe('rule registry reconcile jobs', () => {
  beforeEach(() => {
    coreMocks.sources.splice(0, coreMocks.sources.length, source())
    coreMocks.rules.splice(0, coreMocks.rules.length, sourceDefinedRule())
    aiMocks.createAI.mockClear()
    aiMocks.ai.runPrompt.mockClear()
    Object.values(fetchMocks).forEach((mock) => mock.mockReset())
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
    dbMocks.opsRepo.recordReconcileSourceOutcome.mockResolvedValue({})
    dbMocks.opsRepo.recordChangeProposal.mockResolvedValue({})
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
    dbMocks.pulseOpsRepo.recordSourceSuccess.mockResolvedValue(undefined)
    dbMocks.pulseOpsRepo.recordSourceFailure.mockResolvedValue(undefined)
    dbMocks.aiRepo.recordGlobalRun.mockResolvedValue({ aiOutputId: 'ai-output-1' })
    aiMocks.ai.runPrompt.mockResolvedValue(okAnalyzerResult('no_rule_change'))
  })

  it('runs the weekly scheduler gate only during the Monday 09:00 UTC window', () => {
    expect(shouldRunWeeklyRuleRegistryGovernance(new Date('2026-05-25T09:00:00.000Z'))).toBe(true)
    expect(shouldRunWeeklyRuleRegistryGovernance(new Date('2026-05-25T09:29:59.000Z'))).toBe(true)
    expect(shouldRunWeeklyRuleRegistryGovernance(new Date('2026-05-25T09:30:00.000Z'))).toBe(false)
    expect(shouldRunWeeklyRuleRegistryGovernance(new Date('2026-05-26T09:00:00.000Z'))).toBe(false)
    expect(shouldRunWeeklyRuleRegistryReconcile(new Date('2026-05-25T09:00:00.000Z'))).toBe(true)
  })

  it('starts one cadence run and enqueues only due automated sources', async () => {
    const queueSend = vi.fn()
    coreMocks.sources.splice(
      0,
      coreMocks.sources.length,
      source({
        id: 'daily-source',
        cadence: 'daily',
        acquisitionMethod: 'html_watch',
      }),
      source({
        id: 'weekly-source',
        cadence: 'weekly',
        acquisitionMethod: 'html_watch',
      }),
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
    dbMocks.opsRepo.startReconcileRun.mockResolvedValue({
      inserted: true,
      run: { id: 'run-1', status: 'running' },
    })

    const result = await enqueueDueRuleRegistryReconcile(
      env(queueSend),
      new Date('2026-05-25T09:00:00.000Z'),
    )

    expect(dbMocks.opsRepo.startReconcileRun).toHaveBeenCalledWith(
      expect.objectContaining({
        runKey: 'cadence:2026-05-25T09:00Z',
        sourceCount: 1,
        triggeredBy: 'scheduled_cron',
      }),
    )
    expect(result).toEqual({ queued: 1, runId: 'run-1' })
    expect(queueSend).toHaveBeenCalledTimes(1)
    expect(queueSend).toHaveBeenCalledWith(
      expect.objectContaining({
        type: RULE_REGISTRY_SOURCE_RECONCILE_MESSAGE_TYPE,
        runId: 'run-1',
        sourceId: 'daily-source',
        reason: 'cadence_due',
      }),
    )
  })

  it('queues non-automated sources only during the weekly governance window', async () => {
    const queueSend = vi.fn()
    coreMocks.sources.splice(
      0,
      coreMocks.sources.length,
      source({
        id: 'fema-api',
        cadence: 'daily',
        acquisitionMethod: 'api_watch',
      }),
    )
    dbMocks.opsRepo.startReconcileRun.mockResolvedValue({
      inserted: true,
      run: { id: 'run-1', status: 'running' },
    })

    const outsideWindow = await enqueueDueRuleRegistryReconcile(
      env(queueSend),
      new Date('2026-05-26T09:00:00.000Z'),
    )
    expect(outsideWindow).toEqual({ queued: 0, runId: null })
    expect(queueSend).not.toHaveBeenCalled()

    const insideWindow = await enqueueDueRuleRegistryReconcile(
      env(queueSend),
      new Date('2026-05-25T09:00:00.000Z'),
    )

    expect(insideWindow).toEqual({ queued: 1, runId: 'run-1' })
    expect(queueSend).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceId: 'fema-api',
        reason: 'weekly_governance',
      }),
    )
  })

  it('does not enqueue paused or disabled sources', async () => {
    const queueSend = vi.fn()
    coreMocks.sources.splice(
      0,
      coreMocks.sources.length,
      source({ id: 'paused-source', healthStatus: 'paused' }),
      source({ id: 'disabled-source' }),
    )
    dbMocks.pulseOpsRepo.ensureSourceState
      .mockResolvedValueOnce({ enabled: false, nextCheckAt: new Date('2026-05-25T09:00:00.000Z') })
      .mockResolvedValueOnce({ enabled: false, nextCheckAt: new Date('2026-05-25T09:00:00.000Z') })

    const result = await enqueueDueRuleRegistryReconcile(
      env(queueSend),
      new Date('2026-05-25T09:00:00.000Z'),
    )

    expect(result).toEqual({ queued: 0, runId: null })
    expect(dbMocks.opsRepo.startReconcileRun).not.toHaveBeenCalled()
    expect(queueSend).not.toHaveBeenCalled()
  })

  it('treats unchanged sources as freshness updates without analyzer proposals', async () => {
    fetchMocks.fetchTextSnapshot.mockResolvedValue({
      notModified: true,
      fetchedAt: new Date('2026-05-25T09:00:00.000Z'),
      etag: 'etag-1',
      lastModified: 'Mon, 25 May 2026 09:00:00 GMT',
    })

    await consumeRuleRegistrySourceReconcile(
      {
        type: RULE_REGISTRY_SOURCE_RECONCILE_MESSAGE_TYPE,
        runId: 'run-1',
        sourceId: 'ca.ftb_business_due_dates',
        reason: 'cadence_due',
      },
      env() as Env,
    )

    expect(dbMocks.pulseOpsRepo.recordSourceSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ sourceId: 'ca.ftb_business_due_dates', changed: false }),
    )
    expect(dbMocks.opsRepo.recordReconcileSourceOutcome).toHaveBeenCalledWith({
      runId: 'run-1',
      changed: false,
    })
    expect(aiMocks.ai.runPrompt).not.toHaveBeenCalled()
    expect(dbMocks.opsRepo.recordChangeProposal).not.toHaveBeenCalled()
  })

  it('records changed-source no_rule_change analyzer output without invalidating drafts', async () => {
    fetchMocks.fetchTextSnapshot.mockResolvedValue({
      notModified: false,
      fetchedAt: new Date('2026-05-25T09:00:00.000Z'),
      contentHash: 'content-hash-1',
      r2Key: 'raw/source.html',
      body: 'Updated official page text.',
      etag: 'etag-2',
      lastModified: null,
    })
    aiMocks.ai.runPrompt.mockResolvedValue(okAnalyzerResult('no_rule_change'))

    await consumeRuleRegistrySourceReconcile(
      {
        type: RULE_REGISTRY_SOURCE_RECONCILE_MESSAGE_TYPE,
        runId: 'run-1',
        sourceId: 'ca.ftb_business_due_dates',
        reason: 'cadence_due',
      },
      env() as Env,
    )

    expect(dbMocks.opsRepo.recordChangeProposal).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceId: 'ca.ftb_business_due_dates',
        proposalType: 'no_rule_change',
        status: 'dismissed',
        aiOutputId: 'ai-output-1',
      }),
    )
    expect(dbMocks.opsRepo.recordReconcileSourceOutcome).toHaveBeenCalledWith({
      runId: 'run-1',
      changed: true,
      proposalCreated: false,
    })
  })

  it('records analyzer failures as open operational proposals and acks the source item', async () => {
    fetchMocks.fetchTextSnapshot.mockResolvedValue({
      notModified: false,
      fetchedAt: new Date('2026-05-25T09:00:00.000Z'),
      contentHash: 'content-hash-2',
      r2Key: 'raw/source.html',
      body: 'Updated official page text.',
      etag: null,
      lastModified: null,
    })
    aiMocks.ai.runPrompt.mockResolvedValue({
      result: null,
      refusal: { code: 'SCHEMA_INVALID', message: 'Schema mismatch' },
      trace: {
        promptVersion: 'rule-registry-reconcile@v1',
        model: 'test-model',
        latencyMs: 1,
        guardResult: 'schema_fail',
        inputHash: 'hash-input',
        refusalCode: 'SCHEMA_INVALID',
      },
      model: 'test-model',
      confidence: null,
      cost: null,
    })

    await consumeRuleRegistrySourceReconcile(
      {
        type: RULE_REGISTRY_SOURCE_RECONCILE_MESSAGE_TYPE,
        runId: 'run-1',
        sourceId: 'ca.ftb_business_due_dates',
        reason: 'cadence_due',
      },
      env() as Env,
    )

    expect(dbMocks.opsRepo.recordChangeProposal).toHaveBeenCalledWith(
      expect.objectContaining({
        proposalType: 'analyzer_failed',
        status: 'open',
        failureReason: 'Schema mismatch',
      }),
    )
    expect(dbMocks.opsRepo.recordReconcileSourceOutcome).toHaveBeenCalledWith({
      runId: 'run-1',
      changed: true,
      proposalCreated: true,
    })
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
