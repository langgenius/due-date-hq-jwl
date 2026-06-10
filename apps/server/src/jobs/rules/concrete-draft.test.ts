/* eslint-disable typescript-eslint/no-unsafe-type-assertion --
 * Focused Worker binding doubles only implement the concrete draft job surface.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listObligationRules } from '@duedatehq/core/rules'
import type { Env } from '../../env'
import {
  consumeRuleConcreteDraftGenerate,
  enqueueMissingRuleConcreteDrafts,
  isConcreteDraftAiHealthy,
  RULE_CONCRETE_DRAFT_GENERATE_MESSAGE_TYPE,
} from './concrete-draft'

const { dbMocks, draftMocks, metricsMocks, pulseRepoMocks } = vi.hoisted(() => {
  const aiRepo = {
    findSuccessfulGlobalRunsByContextRefs: vi.fn(),
    findGlobalContextRefsWithRecentFailures: vi.fn(),
    countGlobalRunOutcomes: vi.fn(),
  }
  const concreteDraftRepo = {
    upsert: vi.fn(),
    listReadyContextRefs: vi.fn(),
    health: vi.fn(),
  }
  const pulseRepo = {
    getLatestSourceSnapshotBySourceId: vi.fn(),
  }
  return {
    dbMocks: {
      aiRepo,
      concreteDraftRepo,
      createDb: vi.fn(() => ({})),
      makeAiRepo: vi.fn(() => aiRepo),
      makeRuleConcreteDraftRepo: vi.fn(() => concreteDraftRepo),
      makePulseOpsRepo: vi.fn(() => pulseRepo),
    },
    draftMocks: {
      cachedConcreteDraftKey: vi.fn(
        (input: { ruleId: string; ruleVersion: number; sourceId: string }) =>
          `rule:${input.ruleId}:v${input.ruleVersion}:${input.sourceId}`,
      ),
      generateConcreteDraft: vi.fn(),
    },
    metricsMocks: {
      recordPulseMetric: vi.fn(),
    },
    pulseRepoMocks: pulseRepo,
  }
})

vi.mock('@duedatehq/db', () => ({
  createDb: dbMocks.createDb,
  makeAiRepo: dbMocks.makeAiRepo,
  makeRuleConcreteDraftRepo: dbMocks.makeRuleConcreteDraftRepo,
  makePulseOpsRepo: dbMocks.makePulseOpsRepo,
}))

vi.mock('../../procedures/rules/concrete-draft', () => ({
  cachedConcreteDraftKey: draftMocks.cachedConcreteDraftKey,
  generateConcreteDraft: draftMocks.generateConcreteDraft,
  RULE_CONCRETE_DRAFT_PROMPT: 'rule-concrete-draft@v2',
}))

vi.mock('../pulse/metrics', () => ({
  recordPulseMetric: metricsMocks.recordPulseMetric,
}))

function sourceDefinedRule() {
  const rule = listObligationRules({ includeCandidates: true }).find(
    (item) => item.dueDateLogic.kind === 'source_defined_calendar' && item.sourceIds[0],
  )
  if (!rule) throw new Error('Expected source-defined rule fixture.')
  return rule
}

function env(queueSend = vi.fn()): Pick<Env, 'DB' | 'PULSE_QUEUE'> {
  return {
    DB: {} as D1Database,
    PULSE_QUEUE: {
      send: queueSend,
    } as unknown as Queue,
  }
}

describe('rule concrete draft prewarm jobs', () => {
  beforeEach(() => {
    dbMocks.createDb.mockClear()
    dbMocks.makeAiRepo.mockClear()
    dbMocks.makeRuleConcreteDraftRepo.mockClear()
    dbMocks.makePulseOpsRepo.mockClear()
    dbMocks.aiRepo.findSuccessfulGlobalRunsByContextRefs.mockReset()
    dbMocks.aiRepo.findGlobalContextRefsWithRecentFailures.mockReset()
    dbMocks.aiRepo.findGlobalContextRefsWithRecentFailures.mockResolvedValue(new Set<string>())
    dbMocks.aiRepo.countGlobalRunOutcomes.mockReset()
    // Healthy by default so existing tests keep the ungated sweep behavior.
    dbMocks.aiRepo.countGlobalRunOutcomes.mockResolvedValue({ ok: 0, failed: 0 })
    dbMocks.concreteDraftRepo.upsert.mockReset()
    dbMocks.concreteDraftRepo.listReadyContextRefs.mockReset()
    dbMocks.concreteDraftRepo.health.mockReset()
    Object.values(draftMocks).forEach((mock) => mock.mockClear())
    Object.values(metricsMocks).forEach((mock) => mock.mockClear())
    Object.values(pulseRepoMocks).forEach((mock) => mock.mockReset())
    draftMocks.cachedConcreteDraftKey.mockImplementation(
      (input: { ruleId: string; ruleVersion: number; sourceId: string }) =>
        `rule:${input.ruleId}:v${input.ruleVersion}:${input.sourceId}`,
    )
    draftMocks.generateConcreteDraft.mockResolvedValue({})
    pulseRepoMocks.getLatestSourceSnapshotBySourceId.mockResolvedValue(null)
  })

  it('skips source-defined rules that already have global cached drafts', async () => {
    const queueSend = vi.fn()
    dbMocks.aiRepo.findSuccessfulGlobalRunsByContextRefs.mockImplementation(async (input) =>
      input.inputContextRefs.map((inputContextRef: string, index: number) => ({
        id: `ai-output-${index}`,
        inputContextRef,
      })),
    )

    const result = await enqueueMissingRuleConcreteDrafts(env(queueSend), { limit: 5 })

    expect(result.enqueued).toBe(0)
    expect(queueSend).not.toHaveBeenCalled()
  })

  it('skips rules whose drafts were abandoned by repeat recent failures', async () => {
    const rule = sourceDefinedRule()
    const queueSend = vi.fn()
    dbMocks.aiRepo.findSuccessfulGlobalRunsByContextRefs.mockResolvedValue([])
    dbMocks.aiRepo.findGlobalContextRefsWithRecentFailures.mockImplementation(
      async (input: { minFailures: number }) =>
        input.minFailures === 3
          ? new Set([`rule:${rule.id}:v${rule.version}:${rule.sourceIds[0]}`])
          : new Set<string>(),
    )

    const result = await enqueueMissingRuleConcreteDrafts(env(queueSend), { limit: 5 })

    expect(queueSend).not.toHaveBeenCalledWith(expect.objectContaining({ ruleId: rule.id }))
    expect(result.gated).toBe(false)
  })

  it('enqueues only a single canary when recent draft runs are unhealthy', async () => {
    const queueSend = vi.fn()
    dbMocks.aiRepo.findSuccessfulGlobalRunsByContextRefs.mockResolvedValue([])
    dbMocks.aiRepo.countGlobalRunOutcomes.mockResolvedValue({ ok: 0, failed: 4 })

    const result = await enqueueMissingRuleConcreteDrafts(env(queueSend), { limit: 25 })

    expect(result.gated).toBe(true)
    expect(result.enqueued).toBeLessThanOrEqual(1)
    expect(queueSend.mock.calls.length).toBeLessThanOrEqual(1)
  })

  it('classifies sweep health with success-dominant boundaries', () => {
    expect(isConcreteDraftAiHealthy({ ok: 0, failed: 0 })).toBe(true)
    expect(isConcreteDraftAiHealthy({ ok: 0, failed: 2 })).toBe(true)
    expect(isConcreteDraftAiHealthy({ ok: 0, failed: 3 })).toBe(false)
    expect(isConcreteDraftAiHealthy({ ok: 1, failed: 50 })).toBe(true)
  })

  it('continues queue consumption after model or guard failures', async () => {
    const rule = sourceDefinedRule()
    const sourceId = rule.sourceIds[0]!
    draftMocks.generateConcreteDraft.mockRejectedValue(new Error('schema mismatch'))

    await expect(
      consumeRuleConcreteDraftGenerate(
        {
          type: RULE_CONCRETE_DRAFT_GENERATE_MESSAGE_TYPE,
          ruleId: rule.id,
          sourceId,
          reason: 'prewarm',
        },
        {
          ...env(),
          R2_PULSE: {} as R2Bucket,
        } as Env,
      ),
    ).resolves.toBeUndefined()

    expect(metricsMocks.recordPulseMetric).toHaveBeenCalledWith(
      'rule.concrete_draft.generate_failure',
      expect.objectContaining({
        ruleId: rule.id,
        sourceId,
        error: 'schema mismatch',
      }),
    )
  })

  it('passes the mirror repo into concrete draft generation', async () => {
    const rule = sourceDefinedRule()
    const sourceId = rule.sourceIds[0]!

    await consumeRuleConcreteDraftGenerate(
      {
        type: RULE_CONCRETE_DRAFT_GENERATE_MESSAGE_TYPE,
        ruleId: rule.id,
        sourceId,
        reason: 'prewarm',
      },
      {
        ...env(),
        R2_PULSE: {} as R2Bucket,
      } as Env,
    )

    expect(draftMocks.generateConcreteDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        aiRepo: dbMocks.aiRepo,
        concreteDraftRepo: dbMocks.concreteDraftRepo,
      }),
    )
    expect(metricsMocks.recordPulseMetric).toHaveBeenCalledWith(
      'rule.concrete_draft.generate_success',
      expect.objectContaining({ ruleId: rule.id, sourceId }),
    )
  })
})
