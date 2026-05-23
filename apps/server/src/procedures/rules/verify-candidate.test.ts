/* eslint-disable typescript-eslint/no-unsafe-type-assertion --
 * Focused helper tests use a narrow scoped-repo double for cached AI draft acceptance.
 */
import { describe, expect, it, vi } from 'vitest'
import type { AiOutputRow } from '@duedatehq/ports/ai'
import type { ScopedRepo } from '@duedatehq/ports/scoped'
import { loadAcceptedConcreteDraft } from './index'

const CONTEXT_REF = 'rule:ca.individual_income_return.candidate.2026:v2:ca.income_tax'
const AI_OUTPUT_ID = '44444444-4444-4444-8444-444444444444'

function concreteDraftOutput() {
  return JSON.stringify({
    dueDateLogic: {
      kind: 'fixed_date',
      date: '2026-04-15',
      holidayRollover: 'source_adjusted',
    },
    extensionPolicy: {
      available: false,
      paymentExtended: false,
      notes: 'No source-backed extension policy identified.',
    },
    coverageStatus: 'full',
    requiresApplicabilityReview: false,
    quality: {
      filingPaymentDistinguished: true,
      extensionHandled: true,
      calendarFiscalSpecified: true,
      holidayRolloverHandled: true,
      crossVerified: true,
      exceptionChannel: true,
    },
    sourceHeading: 'Personal filing due dates',
    sourceExcerpt: 'California personal income tax returns are due April 15.',
    confidence: 0.91,
    reasoning: 'The source excerpt states the due date.',
  })
}

function aiRun(overrides: Partial<AiOutputRow> = {}): AiOutputRow {
  return {
    id: AI_OUTPUT_ID,
    firmId: null,
    userId: null,
    kind: 'rule_concrete_draft',
    promptVersion: 'rule_concrete_draft_v1',
    model: 'gpt-test',
    inputContextRef: CONTEXT_REF,
    inputHash: 'hash_123',
    outputText: concreteDraftOutput(),
    citations: {
      sourceId: 'ca.income_tax',
      sourceUrl: 'https://example.test/source',
      sourceText: null,
      sourceExcerpt: 'California personal income tax returns are due April 15.',
    },
    guardResult: 'ok',
    refusalCode: null,
    generatedAt: new Date('2026-05-24T00:00:00.000Z'),
    ...overrides,
  }
}

function scopedWithRuns(runs: AiOutputRow[]): ScopedRepo {
  return {
    ai: {
      findSuccessfulGlobalRunsByContextRefs: vi.fn(async () => runs),
      findSuccessfulRunsByContextRefs: vi.fn(async () => []),
    },
  } as unknown as ScopedRepo
}

describe('rule candidate AI draft acceptance', () => {
  it('accepts a successful cached draft without requiring stored source text', async () => {
    const result = await loadAcceptedConcreteDraft({
      scoped: scopedWithRuns([aiRun()]),
      contextRef: CONTEXT_REF,
      aiOutputId: AI_OUTPUT_ID,
    })

    expect(result.cachedRun.id).toBe(AI_OUTPUT_ID)
    expect(result.draft.sourceExcerpt).toBe(
      'California personal income tax returns are due April 15.',
    )
  })

  it('rejects cached runs that are not a matching successful parsed draft', async () => {
    await expect(
      loadAcceptedConcreteDraft({
        scoped: scopedWithRuns([aiRun({ guardResult: 'guard_rejected' })]),
        contextRef: CONTEXT_REF,
        aiOutputId: AI_OUTPUT_ID,
      }),
    ).rejects.toThrow('AI concrete draft is not ready. Regenerate or wait for backfill.')

    await expect(
      loadAcceptedConcreteDraft({
        scoped: scopedWithRuns([aiRun({ inputContextRef: 'other-context' })]),
        contextRef: CONTEXT_REF,
        aiOutputId: AI_OUTPUT_ID,
      }),
    ).rejects.toThrow('AI concrete draft is not ready. Regenerate or wait for backfill.')

    await expect(
      loadAcceptedConcreteDraft({
        scoped: scopedWithRuns([aiRun({ outputText: '{' })]),
        contextRef: CONTEXT_REF,
        aiOutputId: AI_OUTPUT_ID,
      }),
    ).rejects.toThrow('AI concrete draft is not ready. Regenerate or wait for backfill.')
  })
})
