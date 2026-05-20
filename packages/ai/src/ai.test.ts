import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as z from 'zod'
import { createAI } from './index'
import { redactMigrationInput } from './pii'
import type { AiPorts, VectorMatch } from './ports'
import { modelForPromptTier } from './router'

const callGatewayMock = vi.hoisted(() => vi.fn())

vi.mock('./gateway', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./gateway')>()
  return {
    ...actual,
    callGateway: callGatewayMock,
  }
})

const CONFIGURED_ENV = {
  AI_GATEWAY_ACCOUNT_ID: 'test-account',
  AI_GATEWAY_SLUG: 'duedatehq',
  AI_GATEWAY_API_KEY: 'test-key',
  AI_GATEWAY_MODEL_FAST_JSON: 'fast-json-test-model',
  AI_GATEWAY_MODEL_FAST_JSON_SOLO_ONBOARDING: 'fast-json-solo-onboarding-test-model',
  AI_GATEWAY_MODEL_FAST_JSON_SOLO: 'fast-json-solo-test-model',
  AI_GATEWAY_MODEL_FAST_JSON_PAID: 'fast-json-paid-test-model',
  AI_GATEWAY_MODEL_QUALITY_JSON: 'quality-json-test-model',
  AI_GATEWAY_MODEL_REASONING: 'reasoning-test-model',
}

const OPENROUTER_ENV = {
  AI_GATEWAY_ACCOUNT_ID: 'test-account',
  AI_GATEWAY_SLUG: 'duedatehq',
  AI_GATEWAY_PROVIDER: 'openrouter',
  AI_GATEWAY_PROVIDER_API_KEY: 'test-openrouter-key',
  AI_GATEWAY_MODEL_FAST_JSON: 'google/gemini-2.5-flash-lite',
  AI_GATEWAY_MODEL_FAST_JSON_SOLO_ONBOARDING: 'google/gemini-3.1-flash-lite-preview',
  AI_GATEWAY_MODEL_FAST_JSON_SOLO: 'google/gemini-2.5-flash-lite',
  AI_GATEWAY_MODEL_FAST_JSON_PAID: 'google/gemini-3.1-flash-lite-preview',
  AI_GATEWAY_MODEL_QUALITY_JSON: 'google/gemini-3-flash-preview',
  AI_GATEWAY_MODEL_REASONING: 'openai/gpt-5-mini',
}

describe('@duedatehq/ai', () => {
  beforeEach(() => {
    callGatewayMock.mockReset()
  })

  it('keeps AI dependencies injectable through ports', async () => {
    const match: VectorMatch = { id: 'notice-2026-14', score: 0.9, metadata: { source: 'irs.gov' } }
    const ports: AiPorts = {
      vectors: {
        async query() {
          return [match]
        },
      },
      kv: {
        async get() {
          return null
        },
        async put() {},
      },
      writers: {
        async writeOutput() {},
        async writeLlmLog() {},
        async writeEvidence() {},
      },
      tracer: {
        span() {
          return { end() {} }
        },
      },
      aiGatewayAccountId: 'test-account',
      aiGatewaySlug: 'duedatehq',
      aiGatewayApiKey: 'test-gateway-key',
      aiGatewayModelFastJson: 'fast-json-test-model',
      aiGatewayModelQualityJson: 'quality-json-test-model',
      aiGatewayModelReasoning: 'reasoning-test-model',
    }

    await expect(ports.vectors.query([], { topK: 1 })).resolves.toEqual([match])
  })

  it('returns a structured refusal when the AI provider is not configured', async () => {
    const ai = createAI({})
    const result = await ai.runPrompt('mapper@v1', { header: [], sample_rows: [] }, z.object({}))

    expect(result.result).toBeNull()
    expect(result.refusal?.code).toBe('AI_UNAVAILABLE')
    expect(result.trace.inputHash).toMatch(/^[a-f0-9]{64}$/)
    expect(result.trace.refusalCode).toBe('AI_UNAVAILABLE')
  })

  it('redacts SSN-like columns without mutating the original input', () => {
    const input = {
      header: ['Client Name', 'SSN', 'Tax ID', 'Social Security Number', 'ITIN'],
      sample_rows: [
        ['Acme LLC', '123-45-6789', '12-3456789', '987-65-4321', '999-88-7777'],
        ['Bright Studio', '111-22-3333', '98-7654321', '222-33-4444', ''],
      ],
      preset: 'taxdome',
    }

    const result = redactMigrationInput(input)

    expect(result.blockedColumns).toEqual([1, 3, 4])
    expect(result.input).toEqual({
      header: ['Client Name', 'Tax ID'],
      sample_rows: [
        ['Acme LLC', '12-3456789'],
        ['Bright Studio', '98-7654321'],
      ],
      preset: 'taxdome',
    })
    expect(input.header).toEqual(['Client Name', 'SSN', 'Tax ID', 'Social Security Number', 'ITIN'])
    expect(input.sample_rows[0]).toEqual([
      'Acme LLC',
      '123-45-6789',
      '12-3456789',
      '987-65-4321',
      '999-88-7777',
    ])
  })

  it('returns SCHEMA_INVALID with trace metadata when output does not match schema', async () => {
    callGatewayMock.mockResolvedValueOnce({
      output: { nope: true },
      model: 'test-model',
      tokens: { input: 10, output: 5 },
    })
    const ai = createAI(CONFIGURED_ENV)

    const result = await ai.runPrompt(
      'normalizer-entity@v1',
      { values: ['LLC'] },
      z.object({ ok: z.boolean() }),
    )

    expect(result.result).toBeNull()
    expect(result.refusal?.code).toBe('SCHEMA_INVALID')
    expect(result.trace.guardResult).toBe('schema_fail')
    expect(result.trace.tokens).toEqual({ input: 10, output: 5 })
  })

  it('uses the OpenRouter provider key without requiring a gateway auth key', async () => {
    callGatewayMock.mockResolvedValueOnce({
      output: { ok: true },
      model: 'openai/gpt-5-mini',
    })
    const ai = createAI(OPENROUTER_ENV)

    const result = await ai.runPrompt(
      'normalizer-entity@v1',
      { values: ['LLC'] },
      z.object({ ok: z.boolean() }),
    )

    expect(result.result).toEqual({ ok: true })
    const request = callGatewayMock.mock.calls[0]?.[0]
    expect(request).toMatchObject({
      provider: 'openrouter',
      providerApiKey: 'test-openrouter-key',
      model: 'google/gemini-2.5-flash-lite',
    })
    expect(request).not.toHaveProperty('gatewayApiKey')
  })

  it('routes fast-json by billing plan and Solo onboarding state', async () => {
    callGatewayMock.mockResolvedValue({
      output: { ok: true },
      model: 'routed-model',
    })
    const ai = createAI(CONFIGURED_ENV)
    const schema = z.object({ ok: z.boolean() })

    await ai.runPrompt('normalizer-entity@v1', { values: ['LLC'] }, schema, {
      plan: 'solo',
      migrationOnboardingCompleted: false,
    })
    await ai.runPrompt('normalizer-entity@v1', { values: ['LLC'] }, schema, {
      plan: 'solo',
      migrationOnboardingCompleted: true,
    })
    await ai.runPrompt('normalizer-entity@v1', { values: ['LLC'] }, schema, { plan: 'pro' })
    await ai.runPrompt('normalizer-entity@v1', { values: ['LLC'] }, schema, { plan: 'team' })
    await ai.runPrompt('normalizer-entity@v1', { values: ['LLC'] }, schema, { plan: 'firm' })
    await ai.runPrompt('brief@v1', { summary: {}, sources: [] }, schema, { plan: 'firm' })

    expect(callGatewayMock.mock.calls.map((call) => call[0].model)).toEqual([
      'fast-json-solo-onboarding-test-model',
      'fast-json-solo-test-model',
      'fast-json-paid-test-model',
      'fast-json-paid-test-model',
      'fast-json-paid-test-model',
      'quality-json-test-model',
    ])
  })

  it('keeps the reasoning model as a task-tier route for future prompts', () => {
    expect(modelForPromptTier(CONFIGURED_ENV, 'reasoning')).toBe('reasoning-test-model')
  })

  it('falls back to the default fast-json model when plan overrides are missing', () => {
    expect(
      modelForPromptTier({ AI_GATEWAY_MODEL_FAST_JSON: 'base-fast-json-model' }, 'fast-json', {
        plan: 'team',
      }),
    ).toBe('base-fast-json-model')
  })

  it('returns AI_BUDGET_EXCEEDED before calling the gateway when fair-use is exhausted', async () => {
    const ai = createAI({
      ...CONFIGURED_ENV,
      CACHE: {
        async get() {
          return '15'
        },
        async put() {
          throw new Error('put should not run')
        },
      },
    })

    const result = await ai.runPrompt(
      'normalizer-entity@v1',
      { values: ['LLC'] },
      z.object({ ok: z.boolean() }),
      { plan: 'solo', firmId: 'firm-1', taskKind: 'migration' },
    )

    expect(result.result).toBeNull()
    expect(result.refusal?.code).toBe('AI_BUDGET_EXCEEDED')
    expect(result.trace.guardResult).toBe('budget_exceeded')
    expect(callGatewayMock).not.toHaveBeenCalled()
  })

  it('returns GUARD_REJECTED when mapper EIN hit rate fails', async () => {
    callGatewayMock.mockResolvedValueOnce({
      output: {
        mappings: [{ source: 'Tax ID', target: 'client.ein', confidence: 0.95 }],
      },
      model: 'test-model',
    })
    const ai = createAI(CONFIGURED_ENV)

    const result = await ai.runPrompt(
      'mapper@v1',
      { header: ['Tax ID'], sample_rows: [['not-an-ein'], ['12-3456789']] },
      z.object({
        mappings: z.array(
          z.object({
            source: z.string(),
            target: z.literal('client.ein'),
            confidence: z.number(),
          }),
        ),
      }),
    )

    expect(result.result).toBeNull()
    expect(result.refusal?.code).toBe('GUARD_REJECTED')
    expect(result.trace.guardResult).toBe('guard_rejected')
  })

  it('extracts Pulse output and requires a source-backed excerpt', async () => {
    callGatewayMock.mockResolvedValueOnce({
      output: {
        summary: 'IRS extends selected filing deadlines for Los Angeles County.',
        sourceExcerpt: 'Los Angeles County have until October 15, 2026',
        jurisdiction: 'CA',
        counties: ['Los Angeles'],
        forms: ['federal_1065'],
        entityTypes: ['llc'],
        originalDueDate: '2026-03-15',
        newDueDate: '2026-10-15',
        effectiveFrom: '2026-04-15',
        confidence: 0.94,
      },
      model: 'test-model',
    })
    const ai = createAI(CONFIGURED_ENV)

    const result = await ai.extractPulse({
      sourceId: 'irs.disaster',
      title: 'IRS CA storm relief',
      officialSourceUrl: 'https://www.irs.gov/newsroom/tax-relief-in-disaster-situations',
      rawText: 'Individuals and businesses in Los Angeles County have until October 15, 2026.',
    })

    expect(result.result?.jurisdiction).toBe('CA')
    expect(result.refusal).toBeNull()
  })

  it('rejects Pulse extract output when the excerpt is not in the source', async () => {
    callGatewayMock.mockResolvedValueOnce({
      output: {
        summary: 'IRS extends selected filing deadlines.',
        sourceExcerpt: 'made up quote',
        jurisdiction: 'CA',
        counties: ['Los Angeles'],
        forms: ['federal_1065'],
        entityTypes: ['llc'],
        originalDueDate: '2026-03-15',
        newDueDate: '2026-10-15',
        effectiveFrom: null,
        confidence: 0.94,
      },
      model: 'test-model',
    })
    const ai = createAI(CONFIGURED_ENV)

    const result = await ai.extractPulse({
      sourceId: 'irs.disaster',
      title: 'IRS CA storm relief',
      officialSourceUrl: 'https://www.irs.gov/newsroom/tax-relief-in-disaster-situations',
      rawText: 'Official text.',
    })

    expect(result.result).toBeNull()
    expect(result.refusal?.code).toBe('GUARD_REJECTED')
  })

  it('rejects rule concrete drafts when the source excerpt is not source-backed', async () => {
    callGatewayMock.mockResolvedValueOnce({
      output: {
        sourceExcerpt: 'made up rule quote',
        confidence: 0.9,
      },
      model: 'test-model',
    })
    const ai = createAI(CONFIGURED_ENV)

    const result = await ai.runPrompt(
      'rule-concrete-draft@v1',
      { sourceText: 'Official source says returns are due April 15, 2026.' },
      z.object({
        sourceExcerpt: z.string(),
        confidence: z.number(),
      }),
    )

    expect(result.result).toBeNull()
    expect(result.refusal?.code).toBe('GUARD_REJECTED')
  })

  it('returns AI_GATEWAY_ERROR with stable trace when the gateway throws', async () => {
    callGatewayMock.mockRejectedValueOnce(new Error('upstream failed'))
    const ai = createAI(CONFIGURED_ENV)

    const result = await ai.runPrompt('normalizer-entity@v1', { values: ['LLC'] }, z.object({}))

    expect(result.result).toBeNull()
    expect(result.refusal?.code).toBe('AI_GATEWAY_ERROR')
    expect(result.trace.refusalCode).toBe('AI_GATEWAY_ERROR')
  })
})
