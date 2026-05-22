/* eslint-disable typescript-eslint/no-unsafe-type-assertion --
 * Focused Worker binding doubles only implement the concrete draft job surface.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listObligationRules } from '@duedatehq/core/rules'
import type { Env } from '../../env'
import {
  consumeRuleConcreteDraftGenerate,
  enqueueMissingRuleConcreteDrafts,
  RULE_CONCRETE_DRAFT_GENERATE_MESSAGE_TYPE,
} from './concrete-draft'

const { dbMocks, draftMocks, metricsMocks, pulseRepoMocks } = vi.hoisted(() => {
  const aiRepo = {
    findSuccessfulGlobalRunsByContextRefs: vi.fn(),
  }
  const pulseRepo = {
    getSourceSignal: vi.fn(),
    getLatestSourceSnapshotBySourceId: vi.fn(),
  }
  return {
    dbMocks: {
      aiRepo,
      createDb: vi.fn(() => ({})),
      makeAiRepo: vi.fn(() => aiRepo),
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
  makePulseOpsRepo: dbMocks.makePulseOpsRepo,
}))

vi.mock('../../procedures/rules/concrete-draft', () => ({
  cachedConcreteDraftKey: draftMocks.cachedConcreteDraftKey,
  generateConcreteDraft: draftMocks.generateConcreteDraft,
  RULE_CONCRETE_DRAFT_PROMPT: 'rule-concrete-draft@v1',
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
    dbMocks.makePulseOpsRepo.mockClear()
    dbMocks.aiRepo.findSuccessfulGlobalRunsByContextRefs.mockReset()
    Object.values(draftMocks).forEach((mock) => mock.mockClear())
    Object.values(metricsMocks).forEach((mock) => mock.mockClear())
    Object.values(pulseRepoMocks).forEach((mock) => mock.mockReset())
    draftMocks.cachedConcreteDraftKey.mockImplementation(
      (input: { ruleId: string; ruleVersion: number; sourceId: string }) =>
        `rule:${input.ruleId}:v${input.ruleVersion}:${input.sourceId}`,
    )
    draftMocks.generateConcreteDraft.mockResolvedValue({})
    pulseRepoMocks.getSourceSignal.mockResolvedValue(null)
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
})
