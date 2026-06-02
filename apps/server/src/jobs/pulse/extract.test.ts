/* eslint-disable typescript-eslint/no-unsafe-type-assertion --
 * Focused Worker doubles only implement the Pulse extract repo/R2/AI surface.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Env } from '../../env'
import {
  CANONICAL_EMAIL_TEXT_BEGIN,
  CANONICAL_EMAIL_TEXT_END,
  RAW_EMAIL_ARTIFACT_BEGIN,
  RAW_EMAIL_ARTIFACT_END,
} from './email-artifact'
import { extractPulseSnapshot, normalizeExtractJurisdiction } from './extract'

const { aiMocks, coreMocks, dbMocks, metricsMocks, repoMocks } = vi.hoisted(() => {
  const repo = {
    getSourceSnapshot: vi.fn(),
    updateSourceSnapshotStatus: vi.fn(),
    findDuplicatePulseForExtract: vi.fn(),
    refreshFirmAlertsForApprovedPulse: vi.fn(),
    createPulseForFirmReviewFromExtract: vi.fn(),
    mergeReverifyRuleIdsIntoPulse: vi.fn(),
    upsertRuleSourceDriftState: vi.fn(),
    apply: vi.fn(),
    applyReviewed: vi.fn(),
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
    coreMocks: {
      rulesBySourceId: vi.fn(),
      ruleCitesSourceAsBasis: vi.fn(),
      sourceTextContainsExcerpt: vi.fn(),
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

vi.mock('@duedatehq/core/rules', async (importActual) => ({
  ...(await importActual<typeof import('@duedatehq/core/rules')>()),
  rulesBySourceId: coreMocks.rulesBySourceId,
  ruleCitesSourceAsBasis: coreMocks.ruleCitesSourceAsBasis,
}))

vi.mock('../../procedures/rules/concrete-draft', () => ({
  sourceTextContainsExcerpt: coreMocks.sourceTextContainsExcerpt,
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
    repoMocks.refreshFirmAlertsForApprovedPulse.mockResolvedValue(0)
    repoMocks.createPulseForFirmReviewFromExtract.mockResolvedValue({ pulseId: 'pulse-created' })
    repoMocks.apply.mockRejectedValue(new Error('extract must not apply deadline changes'))
    repoMocks.applyReviewed.mockRejectedValue(
      new Error('extract must not apply reviewed deadline changes'),
    )
    Object.values(coreMocks).forEach((mock) => mock.mockReset())
    // Default: the source backs no verified rule — drift is a no-op.
    coreMocks.rulesBySourceId.mockReturnValue([])
    coreMocks.ruleCitesSourceAsBasis.mockReturnValue(null)
    coreMocks.sourceTextContainsExcerpt.mockReturnValue(true)
  })

  const driftSnapshot = (id: string) => ({
    id,
    sourceId: 'fed.irs_pub_509_2026',
    title: 'IRS Publication 509',
    officialSourceUrl: 'https://www.irs.gov/pub509',
    publishedAt: new Date('2026-04-15T17:00:00.000Z'),
    fetchedAt: new Date('2026-04-15T17:00:00.000Z'),
    contentHash: 'hash-new',
    rawR2Key: 'raw/pub509.txt',
    pulseId: null,
    parseStatus: 'pending_extract' as const,
  })

  const noRegulatoryChange = {
    result: { classification: 'no_regulatory_change' as const, confidence: 0.2 },
    trace: {
      promptVersion: 'pulse-extract@v2',
      model: 'm',
      inputHash: 'h',
      guardResult: 'pass',
      latencyMs: 1,
    },
    model: 'm',
    refusal: null,
  }

  it('raises a review_only rule_source_drift alert when a cited basis excerpt disappears', async () => {
    repoMocks.getSourceSnapshot.mockResolvedValue(driftSnapshot('snapshot-drift'))
    aiMocks.extractPulse.mockResolvedValue(noRegulatoryChange)
    coreMocks.rulesBySourceId.mockReturnValue([{ id: 'fed.1040.return.2025', jurisdiction: 'FED' }])
    coreMocks.ruleCitesSourceAsBasis.mockReturnValue('Individual returns are due April 15.')
    coreMocks.sourceTextContainsExcerpt.mockReturnValue(false) // cited text no longer present

    const result = await extractPulseSnapshot(env('A totally different page.'), 'snapshot-drift')

    expect(result.status).toBe('created')
    expect(repoMocks.createPulseForFirmReviewFromExtract).toHaveBeenCalledWith(
      expect.objectContaining({
        changeKind: 'rule_source_drift',
        actionMode: 'review_only',
        reverifyRuleIds: ['fed.1040.return.2025'],
        parsedJurisdiction: 'FED',
        parsedNewDueDate: null,
      }),
    )
    expect(repoMocks.upsertRuleSourceDriftState).toHaveBeenCalledWith(
      expect.objectContaining({
        ruleId: 'fed.1040.return.2025',
        sourceId: 'fed.irs_pub_509_2026',
        excerptMatched: false,
      }),
    )
    expect(repoMocks.apply).not.toHaveBeenCalled()
  })

  it('ignores a no_regulatory_change snapshot when cited basis excerpts still match', async () => {
    repoMocks.getSourceSnapshot.mockResolvedValue(driftSnapshot('snapshot-ok'))
    aiMocks.extractPulse.mockResolvedValue(noRegulatoryChange)
    coreMocks.rulesBySourceId.mockReturnValue([{ id: 'fed.1040.return.2025', jurisdiction: 'FED' }])
    coreMocks.ruleCitesSourceAsBasis.mockReturnValue('Individual returns are due April 15.')
    coreMocks.sourceTextContainsExcerpt.mockReturnValue(true) // excerpt still present

    const result = await extractPulseSnapshot(env(), 'snapshot-ok')

    expect(result.status).toBe('skipped')
    expect(repoMocks.createPulseForFirmReviewFromExtract).not.toHaveBeenCalled()
    expect(repoMocks.upsertRuleSourceDriftState).not.toHaveBeenCalled()
    expect(repoMocks.updateSourceSnapshotStatus).toHaveBeenCalledWith(
      'snapshot-ok',
      expect.objectContaining({ parseStatus: 'ignored' }),
    )
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
    expect(repoMocks.refreshFirmAlertsForApprovedPulse).toHaveBeenCalledWith('pulse-existing')
    expect(repoMocks.createPulseForFirmReviewFromExtract).not.toHaveBeenCalled()
    expect(repoMocks.updateSourceSnapshotStatus).toHaveBeenCalledWith('snapshot-1', {
      parseStatus: 'duplicate',
      pulseId: 'pulse-existing',
      aiOutputId: expect.any(String),
      failureReason: null,
    })
    expect(repoMocks.apply).not.toHaveBeenCalled()
    expect(repoMocks.applyReviewed).not.toHaveBeenCalled()
  })

  it('creates due-date change Alerts without applying deadline changes', async () => {
    repoMocks.getSourceSnapshot.mockResolvedValue({
      id: 'snapshot-az',
      sourceId: 'policy-watch.az.announcements',
      title: 'Arizona deadline relief',
      officialSourceUrl: 'https://azdor.gov/news/relief',
      publishedAt: new Date('2026-04-15T17:00:00.000Z'),
      rawR2Key: 'raw/az.txt',
      pulseId: null,
      parseStatus: 'pending_extract',
    })
    aiMocks.extractPulse.mockResolvedValue({
      result: {
        classification: 'regulatory_change',
        changeKind: 'deadline_shift',
        actionMode: 'due_date_overlay',
        summary: 'Arizona extends selected filing deadlines.',
        sourceExcerpt: 'extended from April 15, 2026 to October 15, 2026',
        jurisdiction: 'AZ',
        counties: ['Maricopa'],
        forms: ['state_income_tax'],
        entityTypes: ['individual'],
        originalDueDate: '2026-04-15',
        newDueDate: '2026-10-15',
        effectiveFrom: null,
        effectiveUntil: null,
        affectedRuleIds: [],
        structuredChange: null,
        confidence: 0.9,
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

    const result = await extractPulseSnapshot(env(), 'snapshot-az')

    expect(result).toEqual({ pulseId: 'pulse-created', status: 'created' })
    expect(repoMocks.createPulseForFirmReviewFromExtract).toHaveBeenCalledWith(
      expect.objectContaining({
        actionMode: 'due_date_overlay',
        requiresHumanReview: true,
      }),
    )
    expect(repoMocks.apply).not.toHaveBeenCalled()
    expect(repoMocks.applyReviewed).not.toHaveBeenCalled()
  })

  it('suppresses alerts whose parsed policy dates are all before 2026', async () => {
    repoMocks.getSourceSnapshot.mockResolvedValue({
      id: 'snapshot-ca-2023',
      sourceId: 'policy-watch.ca.announcements',
      title: 'California 2022-23 winter storm relief',
      officialSourceUrl: 'https://ftb.ca.gov/news/storm-relief',
      publishedAt: new Date('2026-06-01T00:00:00.000Z'),
      rawR2Key: 'raw/ca.txt',
      pulseId: null,
      parseStatus: 'pending_extract',
    })
    aiMocks.extractPulse.mockResolvedValue({
      result: {
        classification: 'regulatory_change',
        changeKind: 'deadline_shift',
        actionMode: 'due_date_overlay',
        summary: 'California extended filing deadlines to November 2023 for storm victims.',
        sourceExcerpt: 'extended to November 16, 2023',
        jurisdiction: 'CA',
        counties: [],
        forms: ['state_income_tax'],
        entityTypes: ['individual'],
        originalDueDate: '2023-04-18',
        newDueDate: '2023-11-16',
        effectiveFrom: '2023-01-01',
        effectiveUntil: null,
        affectedRuleIds: [],
        structuredChange: null,
        confidence: 0.9,
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

    const result = await extractPulseSnapshot(env(), 'snapshot-ca-2023')

    expect(result).toEqual({ pulseId: null, status: 'skipped' })
    expect(repoMocks.createPulseForFirmReviewFromExtract).not.toHaveBeenCalled()
    expect(repoMocks.updateSourceSnapshotStatus).toHaveBeenCalledWith(
      'snapshot-ca-2023',
      expect.objectContaining({ parseStatus: 'ignored', failureReason: 'historical_pre_2026' }),
    )
  })

  it('keeps official email subscription sources eligible for Apply-readiness candidates', async () => {
    repoMocks.getSourceSnapshot.mockResolvedValue({
      id: 'snapshot-ny-email',
      sourceId: 'ny.email_services',
      title: 'NY Tax Department filing update',
      officialSourceUrl: 'https://www.tax.ny.gov/news/2026/deadline-relief.htm',
      publishedAt: new Date('2026-04-15T17:00:00.000Z'),
      rawR2Key: 'raw/ny-email.txt',
      pulseId: null,
      parseStatus: 'pending_extract',
    })
    aiMocks.extractPulse.mockResolvedValue({
      result: {
        classification: 'regulatory_change',
        changeKind: 'deadline_shift',
        actionMode: 'due_date_overlay',
        summary: 'New York extends selected filing deadlines.',
        sourceExcerpt: 'extended from April 15, 2026 to October 15, 2026',
        jurisdiction: 'NY',
        counties: [],
        forms: ['ny_it201'],
        entityTypes: ['individual'],
        originalDueDate: '2026-04-15',
        newDueDate: '2026-10-15',
        effectiveFrom: null,
        effectiveUntil: null,
        affectedRuleIds: [],
        structuredChange: null,
        confidence: 0.88,
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

    await extractPulseSnapshot(env(), 'snapshot-ny-email')

    expect(repoMocks.findDuplicatePulseForExtract).toHaveBeenCalledWith(
      expect.objectContaining({ actionMode: 'due_date_overlay' }),
    )
    expect(repoMocks.createPulseForFirmReviewFromExtract).toHaveBeenCalledWith(
      expect.objectContaining({ actionMode: 'due_date_overlay' }),
    )
  })

  it('extracts from canonical email text and normalizes federal US jurisdiction to FED', async () => {
    repoMocks.getSourceSnapshot.mockResolvedValue({
      id: 'snapshot-irs-newswire',
      sourceId: 'fed.irs_newswire',
      title: 'IR-2026-69',
      officialSourceUrl: 'https://www.federalregister.gov/public-inspection/2026-10841',
      publishedAt: new Date('2026-05-29T13:38:26.000Z'),
      rawR2Key: 'raw/irs-newswire.txt',
      pulseId: null,
      parseStatus: 'pending_extract',
    })
    aiMocks.extractPulse.mockResolvedValue({
      result: {
        classification: 'regulatory_change',
        changeKind: 'applicability_scope',
        actionMode: 'review_only',
        summary: 'IRS issued Section 892 transitional relief guidance.',
        sourceExcerpt: 'grandfathering protection and transitional relief',
        jurisdiction: 'US',
        counties: [],
        forms: [],
        entityTypes: [],
        originalDueDate: null,
        newDueDate: null,
        effectiveFrom: null,
        effectiveUntil: null,
        affectedRuleIds: [],
        structuredChange: null,
        confidence: 0.84,
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
    const artifact = [
      CANONICAL_EMAIL_TEXT_BEGIN,
      'Subject: IR-2026-69',
      '',
      'Body:',
      'This additional guidance provides grandfathering protection and transitional relief.',
      CANONICAL_EMAIL_TEXT_END,
      RAW_EMAIL_ARTIFACT_BEGIN,
      'This additional guidance provides grandfather=\r\ning protection and transitional relief.',
      RAW_EMAIL_ARTIFACT_END,
    ].join('\n')

    const result = await extractPulseSnapshot(env(artifact), 'snapshot-irs-newswire')

    expect(result).toEqual({ pulseId: 'pulse-created', status: 'created' })
    expect(aiMocks.extractPulse).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceId: 'fed.irs_newswire',
        rawText: expect.stringContaining('grandfathering protection and transitional relief'),
      }),
      { taskKind: 'pulse' },
    )
    expect(aiMocks.extractPulse).toHaveBeenCalledWith(
      expect.not.objectContaining({
        rawText: expect.stringContaining('grandfather='),
      }),
      { taskKind: 'pulse' },
    )
    expect(repoMocks.createPulseForFirmReviewFromExtract).toHaveBeenCalledWith(
      expect.objectContaining({
        actionMode: 'review_only',
        parsedJurisdiction: 'FED',
      }),
    )
  })

  it('keeps incomplete due-date overlay evidence as an Apply-readiness candidate', async () => {
    repoMocks.getSourceSnapshot.mockResolvedValue({
      id: 'snapshot-incomplete',
      sourceId: 'policy-watch.az.announcements',
      title: 'Arizona possible deadline relief',
      officialSourceUrl: 'https://azdor.gov/news/possible-relief',
      publishedAt: new Date('2026-04-15T17:00:00.000Z'),
      rawR2Key: 'raw/az-incomplete.txt',
      pulseId: null,
      parseStatus: 'pending_extract',
    })
    aiMocks.extractPulse.mockResolvedValue({
      result: {
        classification: 'regulatory_change',
        changeKind: 'deadline_shift',
        actionMode: 'due_date_overlay',
        summary: 'Arizona says selected deadlines may be extended.',
        sourceExcerpt: 'selected deadlines may be extended',
        jurisdiction: 'AZ',
        counties: [],
        forms: [],
        entityTypes: [],
        originalDueDate: null,
        newDueDate: '2026-10-15',
        effectiveFrom: null,
        effectiveUntil: null,
        affectedRuleIds: [],
        structuredChange: null,
        confidence: 0.65,
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

    const result = await extractPulseSnapshot(
      env('selected deadlines may be extended'),
      'snapshot-incomplete',
    )

    expect(result).toEqual({ pulseId: 'pulse-created', status: 'created' })
    expect(repoMocks.findDuplicatePulseForExtract).toHaveBeenCalledWith(
      expect.objectContaining({ actionMode: 'due_date_overlay' }),
    )
    expect(repoMocks.createPulseForFirmReviewFromExtract).toHaveBeenCalledWith(
      expect.objectContaining({
        actionMode: 'due_date_overlay',
        parsedOriginalDueDate: null,
        parsedNewDueDate: new Date('2026-10-15T00:00:00.000Z'),
      }),
    )
    expect(repoMocks.apply).not.toHaveBeenCalled()
    expect(repoMocks.applyReviewed).not.toHaveBeenCalled()
  })

  it('forces non-tax early-signal sources into review-only Alerts without Apply mode', async () => {
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
    expect(repoMocks.apply).not.toHaveBeenCalled()
    expect(repoMocks.applyReviewed).not.toHaveBeenCalled()
  })

  it('forces source-status rule changes into review-only Alerts', async () => {
    repoMocks.getSourceSnapshot.mockResolvedValue({
      id: 'snapshot-source-status',
      sourceId: 'ca.cdtfa_sales_use_filing_dates',
      title: 'CDTFA filing date page changed',
      officialSourceUrl:
        'https://www.cdtfa.ca.gov/taxes-and-fees/sales-use-tax-returns-filing-dates.htm',
      publishedAt: new Date('2026-04-15T17:00:00.000Z'),
      rawR2Key: 'raw/source-status.txt',
      pulseId: null,
      parseStatus: 'pending_extract',
    })
    aiMocks.extractPulse.mockResolvedValue({
      result: {
        classification: 'regulatory_change',
        changeKind: 'source_status',
        actionMode: 'due_date_overlay',
        summary: 'CDTFA filing date source changed and needs rule review.',
        sourceExcerpt: 'The filing dates table was updated.',
        jurisdiction: 'CA',
        counties: [],
        forms: [],
        entityTypes: [],
        originalDueDate: null,
        newDueDate: null,
        effectiveFrom: null,
        effectiveUntil: null,
        affectedRuleIds: ['ca.sales_use_tax.2026'],
        structuredChange: { sourceStatus: 'changed' },
        confidence: 0.8,
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

    const result = await extractPulseSnapshot(
      env('The filing dates table was updated.'),
      'snapshot-source-status',
    )

    expect(result).toEqual({ pulseId: 'pulse-created', status: 'created' })
    expect(repoMocks.findDuplicatePulseForExtract).toHaveBeenCalledWith(
      expect.objectContaining({
        changeKind: 'source_status',
        actionMode: 'review_only',
      }),
    )
    expect(repoMocks.createPulseForFirmReviewFromExtract).toHaveBeenCalledWith(
      expect.objectContaining({
        changeKind: 'source_status',
        actionMode: 'review_only',
      }),
    )
    expect(repoMocks.apply).not.toHaveBeenCalled()
    expect(repoMocks.applyReviewed).not.toHaveBeenCalled()
  })

  it('resets the snapshot to failed and rethrows when extraction throws mid-flight', async () => {
    repoMocks.getSourceSnapshot.mockResolvedValue({
      id: 'snapshot-throw',
      sourceId: 'policy-watch.az.announcements',
      title: 'Arizona deadline relief',
      officialSourceUrl: 'https://azdor.gov/news/relief',
      publishedAt: new Date('2026-04-15T17:00:00.000Z'),
      rawR2Key: 'raw/throw.txt',
      pulseId: null,
      parseStatus: 'pending_extract',
    })
    aiMocks.extractPulse.mockRejectedValue(new Error('gateway 503'))

    await expect(extractPulseSnapshot(env(), 'snapshot-throw')).rejects.toThrow('gateway 503')

    expect(repoMocks.updateSourceSnapshotStatus).toHaveBeenCalledWith('snapshot-throw', {
      parseStatus: 'extracting',
    })
    expect(repoMocks.updateSourceSnapshotStatus).toHaveBeenCalledWith('snapshot-throw', {
      parseStatus: 'failed',
      failureReason: 'gateway 503',
    })
    expect(repoMocks.createPulseForFirmReviewFromExtract).not.toHaveBeenCalled()
  })

  it('re-processes a snapshot stranded in the extracting state', async () => {
    repoMocks.getSourceSnapshot.mockResolvedValue({
      id: 'snapshot-stranded',
      sourceId: 'policy-watch.az.announcements',
      title: 'Arizona deadline relief',
      officialSourceUrl: 'https://azdor.gov/news/relief',
      publishedAt: new Date('2026-04-15T17:00:00.000Z'),
      rawR2Key: 'raw/stranded.txt',
      pulseId: null,
      parseStatus: 'extracting',
    })
    aiMocks.extractPulse.mockResolvedValue({
      result: {
        classification: 'regulatory_change',
        changeKind: 'deadline_shift',
        actionMode: 'due_date_overlay',
        summary: 'Arizona extends selected filing deadlines.',
        sourceExcerpt: 'extended from April 15, 2026 to October 15, 2026',
        jurisdiction: 'AZ',
        counties: ['Maricopa'],
        forms: ['state_income_tax'],
        entityTypes: ['individual'],
        originalDueDate: '2026-04-15',
        newDueDate: '2026-10-15',
        effectiveFrom: null,
        effectiveUntil: null,
        affectedRuleIds: [],
        structuredChange: null,
        confidence: 0.9,
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

    const result = await extractPulseSnapshot(env(), 'snapshot-stranded')

    expect(result).toEqual({ pulseId: 'pulse-created', status: 'created' })
    expect(repoMocks.createPulseForFirmReviewFromExtract).toHaveBeenCalled()
  })
})

describe('normalizeExtractJurisdiction', () => {
  it('maps US/USA to FED regardless of source', () => {
    expect(normalizeExtractJurisdiction('irs.newsroom', 'US')).toBe('FED')
    expect(normalizeExtractJurisdiction('fed.irs_newswire', 'usa')).toBe('FED')
  })

  it('keeps a legal FED or 2-letter code, including a state on a federal source', () => {
    expect(normalizeExtractJurisdiction('irs.newsroom', 'FED')).toBe('FED')
    expect(normalizeExtractJurisdiction('wa.dor.news', 'WA')).toBe('WA')
    // IRS disaster relief is federally sourced but state-scoped — keep the state.
    expect(normalizeExtractJurisdiction('irs.disaster', 'CA')).toBe('CA')
  })

  it('recovers garbage AI output via the source-id prefix, never returning an illegal value', () => {
    // The production incident: irs.* sources stored 'f!', 'f4', 'f:' and 500ed
    // the whole alerts list through the array-output validation.
    expect(normalizeExtractJurisdiction('irs.newsroom', 'f!')).toBe('FED')
    expect(normalizeExtractJurisdiction('irs.guidance', 'F4')).toBe('FED')
    expect(normalizeExtractJurisdiction('fed.irs_newswire', ':(')).toBe('FED')
    // A garbage value on a state source recovers to that state from the prefix.
    expect(normalizeExtractJurisdiction('ca.ftb.tax_news', '??')).toBe('CA')
  })
})
