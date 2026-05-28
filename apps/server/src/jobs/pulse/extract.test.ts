/* eslint-disable typescript-eslint/no-unsafe-type-assertion --
 * Focused Worker doubles only implement the Pulse extract repo/R2/AI surface.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Env } from '../../env'
import { extractPulseSnapshot } from './extract'

const { aiMocks, dbMocks, metricsMocks, repoMocks } = vi.hoisted(() => {
  const repo = {
    getSourceSnapshot: vi.fn(),
    updateSourceSnapshotStatus: vi.fn(),
    findDuplicatePulseForExtract: vi.fn(),
    createPulseForFirmReviewFromExtract: vi.fn(),
  }
  return {
    aiMocks: {
      createAI: vi.fn(),
      extractPulse: vi.fn(),
    },
    dbMocks: {
      createDb: vi.fn(() => ({
        insert: vi.fn(() => ({
          values: vi.fn(async () => undefined),
        })),
      })),
      makePulseOpsRepo: vi.fn(() => repo),
    },
    metricsMocks: {
      recordPulseAlert: vi.fn(),
      recordPulseMetric: vi.fn(),
    },
    repoMocks: repo,
  }
})

vi.mock('@duedatehq/ai', () => ({
  createAI: aiMocks.createAI,
}))

vi.mock('@duedatehq/db', () => ({
  createDb: dbMocks.createDb,
  makePulseOpsRepo: dbMocks.makePulseOpsRepo,
}))

vi.mock('./metrics', () => ({
  recordPulseAlert: metricsMocks.recordPulseAlert,
  recordPulseMetric: metricsMocks.recordPulseMetric,
}))

function env(
  rawText = 'extended from April 15, 2026 to October 15, 2026',
): Pick<
  Env,
  | 'AI_GATEWAY_ACCOUNT_ID'
  | 'AI_GATEWAY_SLUG'
  | 'AI_GATEWAY_API_KEY'
  | 'AI_GATEWAY_PROVIDER'
  | 'AI_GATEWAY_PROVIDER_API_KEY'
  | 'AI_GATEWAY_MODEL_FAST_JSON'
  | 'AI_GATEWAY_MODEL_QUALITY_JSON'
  | 'AI_GATEWAY_MODEL_REASONING'
  | 'DB'
  | 'R2_PULSE'
> {
  return {
    AI_GATEWAY_ACCOUNT_ID: 'account',
    AI_GATEWAY_SLUG: 'slug',
    AI_GATEWAY_API_KEY: 'gateway-key',
    AI_GATEWAY_PROVIDER: 'openai',
    AI_GATEWAY_PROVIDER_API_KEY: 'provider-key',
    AI_GATEWAY_MODEL_FAST_JSON: 'fast-json',
    AI_GATEWAY_MODEL_QUALITY_JSON: 'quality-json',
    AI_GATEWAY_MODEL_REASONING: 'reasoning',
    DB: {} as D1Database,
    R2_PULSE: {
      get: vi.fn(async () => ({
        text: vi.fn(async () => rawText),
      })),
    } as unknown as R2Bucket,
  }
}

describe('extractPulseSnapshot', () => {
  beforeEach(() => {
    Object.values(aiMocks).forEach((mock) => mock.mockReset())
    Object.values(dbMocks).forEach((mock) => mock.mockClear())
    Object.values(metricsMocks).forEach((mock) => mock.mockReset())
    Object.values(repoMocks).forEach((mock) => mock.mockReset())
    aiMocks.createAI.mockReturnValue({ extractPulse: aiMocks.extractPulse })
    repoMocks.findDuplicatePulseForExtract.mockResolvedValue(null)
    repoMocks.createPulseForFirmReviewFromExtract.mockResolvedValue({ pulseId: 'pulse-created' })
  })

  it('marks duplicate extracts without creating another Pulse alert', async () => {
    repoMocks.getSourceSnapshot.mockResolvedValue({
      id: 'snapshot-1',
      sourceId: 'policy-watch.ca.announcements',
      title: 'California relief',
      officialSourceUrl: 'https://www.ftb.ca.gov/about-ftb/newsroom/relief.html',
      publishedAt: new Date('2026-04-15T17:00:00.000Z'),
      rawR2Key: 'raw/pulse.txt',
      pulseId: null,
      parseStatus: 'pending_extract',
    })
    repoMocks.findDuplicatePulseForExtract.mockResolvedValue('pulse-existing')
    aiMocks.extractPulse.mockResolvedValue({
      result: {
        classification: 'regulatory_change',
        changeKind: 'deadline_shift',
        actionMode: 'due_date_overlay',
        summary: 'California extends selected filing deadlines.',
        sourceExcerpt: 'extended from April 15, 2026 to October 15, 2026',
        jurisdiction: 'CA',
        counties: ['Los Angeles'],
        forms: ['federal_1065'],
        entityTypes: ['llc'],
        originalDueDate: '2026-04-15',
        newDueDate: '2026-10-15',
        effectiveFrom: null,
        effectiveUntil: null,
        affectedRuleIds: [],
        structuredChange: null,
        confidence: 0.91,
      },
      trace: {
        promptVersion: 'pulse-extract@v2',
        model: 'test-model',
        inputHash: 'hash',
        guardResult: 'pass',
        latencyMs: 1,
      },
      model: 'test-model',
      refusal: null,
    })
    const result = await extractPulseSnapshot(env(), 'snapshot-1')

    expect(result).toEqual({ pulseId: 'pulse-existing', status: 'skipped' })
    expect(repoMocks.createPulseForFirmReviewFromExtract).not.toHaveBeenCalled()
    expect(repoMocks.updateSourceSnapshotStatus).toHaveBeenCalledWith('snapshot-1', {
      parseStatus: 'duplicate',
      pulseId: 'pulse-existing',
      aiOutputId: expect.any(String),
      failureReason: null,
    })
  })

  it('forces signal-only sources into review-only Alerts without Apply mode', async () => {
    repoMocks.getSourceSnapshot.mockResolvedValue({
      id: 'snapshot-fema',
      sourceId: 'fema.declarations',
      title: 'FEMA declaration',
      officialSourceUrl: 'https://www.fema.gov/disaster/123',
      publishedAt: new Date('2026-04-15T17:00:00.000Z'),
      rawR2Key: 'raw/fema.txt',
      pulseId: null,
      parseStatus: 'pending_extract',
    })
    aiMocks.extractPulse.mockResolvedValue({
      result: {
        classification: 'regulatory_change',
        changeKind: 'deadline_shift',
        actionMode: 'due_date_overlay',
        summary: 'FEMA declaration may affect tax relief.',
        sourceExcerpt: 'FEMA declaration for selected counties.',
        jurisdiction: 'CA',
        counties: ['Los Angeles'],
        forms: ['federal_1065'],
        entityTypes: ['llc'],
        originalDueDate: '2026-04-15',
        newDueDate: '2026-10-15',
        effectiveFrom: null,
        effectiveUntil: null,
        affectedRuleIds: [],
        structuredChange: null,
        confidence: 0.82,
      },
      trace: {
        promptVersion: 'pulse-extract@v2',
        model: 'test-model',
        inputHash: 'hash',
        guardResult: 'pass',
        latencyMs: 1,
      },
      model: 'test-model',
      refusal: null,
    })

    const result = await extractPulseSnapshot(env(), 'snapshot-fema')

    expect(result).toEqual({ pulseId: 'pulse-created', status: 'created' })
    expect(repoMocks.findDuplicatePulseForExtract).toHaveBeenCalledWith(
      expect.objectContaining({ actionMode: 'review_only' }),
    )
    expect(repoMocks.createPulseForFirmReviewFromExtract).toHaveBeenCalledWith(
      expect.objectContaining({ actionMode: 'review_only' }),
    )
  })
})
