import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as z from 'zod'
import { createAI } from './index'
import { PulseDeadlineShiftFactsSchema } from './pulse'
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
  AI_GATEWAY_MODEL_QUALITY_JSON: 'quality-json-test-model',
  AI_GATEWAY_MODEL_REASONING: 'reasoning-test-model',
}

const OPENROUTER_ENV = {
  AI_GATEWAY_ACCOUNT_ID: 'test-account',
  AI_GATEWAY_SLUG: 'duedatehq',
  AI_GATEWAY_PROVIDER: 'openrouter',
  AI_GATEWAY_PROVIDER_API_KEY: 'test-openrouter-key',
  AI_GATEWAY_MODEL_FAST_JSON: 'google/gemini-3.5-flash',
  AI_GATEWAY_MODEL_QUALITY_JSON: 'google/gemini-3.5-flash',
  AI_GATEWAY_MODEL_REASONING: 'google/gemini-3.5-flash',
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
      model: 'google/gemini-3.5-flash',
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
      model: 'google/gemini-3.5-flash',
      providerOptions: { openrouter: { reasoning: { effort: 'low' } } },
    })
    expect(request).not.toHaveProperty('gatewayApiKey')
  })

  it('routes fast-json to a single model regardless of billing plan', async () => {
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
    await ai.runPrompt('normalizer-entity@v1', { values: ['LLC'] }, schema, { plan: 'pro' })
    await ai.runPrompt('normalizer-entity@v1', { values: ['LLC'] }, schema, { plan: 'firm' })
    await ai.runPrompt('brief@v1', { summary: {}, sources: [] }, schema, { plan: 'firm' })

    expect(callGatewayMock.mock.calls.map((call) => call[0].model)).toEqual([
      'fast-json-test-model',
      'fast-json-test-model',
      'fast-json-test-model',
      'quality-json-test-model',
    ])
  })

  it('attaches reasoning effort=high for quality-json on OpenRouter', async () => {
    callGatewayMock.mockResolvedValueOnce({
      output: { ok: true },
      model: 'google/gemini-3.5-flash',
    })
    const ai = createAI(OPENROUTER_ENV)
    await ai.runPrompt('brief@v1', { summary: {}, sources: [] }, z.object({ ok: z.boolean() }))
    expect(callGatewayMock.mock.calls[0]?.[0]).toMatchObject({
      providerOptions: { openrouter: { reasoning: { effort: 'high' } } },
    })
  })

  it('lets AI_GATEWAY_QUALITY_REASONING_EFFORT override the quality effort', async () => {
    callGatewayMock.mockResolvedValueOnce({
      output: { ok: true },
      model: 'google/gemini-3.5-flash',
    })
    const ai = createAI({ ...OPENROUTER_ENV, AI_GATEWAY_QUALITY_REASONING_EFFORT: 'medium' })
    await ai.runPrompt('brief@v1', { summary: {}, sources: [] }, z.object({ ok: z.boolean() }))
    expect(callGatewayMock.mock.calls[0]?.[0]).toMatchObject({
      providerOptions: { openrouter: { reasoning: { effort: 'medium' } } },
    })
  })

  it('omits reasoning options when the effort var is empty', async () => {
    callGatewayMock.mockResolvedValueOnce({
      output: { ok: true },
      model: 'google/gemini-3.5-flash',
    })
    const ai = createAI({ ...OPENROUTER_ENV, AI_GATEWAY_QUALITY_REASONING_EFFORT: '' })
    await ai.runPrompt('brief@v1', { summary: {}, sources: [] }, z.object({ ok: z.boolean() }))
    expect(callGatewayMock.mock.calls[0]?.[0]).not.toHaveProperty('providerOptions')
  })

  it('omits reasoning options for non-OpenRouter providers', async () => {
    callGatewayMock.mockResolvedValueOnce({
      output: { ok: true },
      model: 'quality-json-test-model',
    })
    const ai = createAI(CONFIGURED_ENV)
    await ai.runPrompt('brief@v1', { summary: {}, sources: [] }, z.object({ ok: z.boolean() }))
    expect(callGatewayMock.mock.calls[0]?.[0]).not.toHaveProperty('providerOptions')
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
        // Above the solo migration ceiling (2x clientLimit = 200) so the
        // fair-use guard trips before the gateway is called.
        async get() {
          return '500'
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

  it.each(['development', 'staging'] as const)(
    'skips fair-use budget enforcement in %s',
    async (envName) => {
      callGatewayMock.mockResolvedValueOnce({
        output: { ok: true },
        model: 'test-model',
      })
      const get = vi.fn(async () => '999')
      const put = vi.fn(async () => {
        throw new Error('put should not run')
      })
      const ai = createAI({
        ...CONFIGURED_ENV,
        ENV: envName,
        CACHE: { get, put },
      })

      const result = await ai.runPrompt(
        'normalizer-entity@v1',
        { values: ['LLC'] },
        z.object({ ok: z.boolean() }),
        { plan: 'solo', firmId: 'firm-1', taskKind: 'migration' },
      )

      expect(result.result).toEqual({ ok: true })
      expect(result.refusal).toBeNull()
      expect(get).not.toHaveBeenCalled()
      expect(put).not.toHaveBeenCalled()
      expect(callGatewayMock).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'fast-json-test-model',
        }),
      )
    },
  )

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
        classification: 'regulatory_change',
        changeKind: 'deadline_shift',
        actionMode: 'due_date_overlay',
        summary: 'IRS extends selected filing deadlines for Los Angeles County.',
        sourceExcerpt: 'Los Angeles County have until October 15, 2026',
        jurisdiction: 'CA',
        counties: ['Los Angeles'],
        forms: ['federal_1065'],
        entityTypes: ['llc'],
        originalDueDate: '2026-03-15',
        newDueDate: '2026-10-15',
        effectiveFrom: '2026-04-15',
        effectiveUntil: null,
        affectedRuleIds: ['ca.business_income_return.candidate.2026'],
        structuredChange: null,
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

  it('accepts federal Pulse extract jurisdiction labels', async () => {
    callGatewayMock.mockResolvedValueOnce({
      output: {
        classification: 'regulatory_change',
        changeKind: 'applicability_scope',
        actionMode: 'review_only',
        summary: 'IRS issued transitional relief guidance.',
        sourceExcerpt: 'grandfathering protection and transitional relief',
        jurisdiction: 'FED',
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
      model: 'test-model',
    })
    const ai = createAI(CONFIGURED_ENV)

    const result = await ai.extractPulse({
      sourceId: 'fed.irs_newswire',
      title: 'IRS Newswire',
      officialSourceUrl: 'https://www.irs.gov/newsroom/e-news-subscriptions',
      rawText: 'IRS guidance provides grandfathering protection and transitional relief.',
    })

    expect(result.result?.jurisdiction).toBe('FED')
    expect(result.refusal).toBeNull()
  })

  it('accepts protective claim window Pulse extracts as review-only', async () => {
    callGatewayMock.mockResolvedValueOnce({
      output: {
        classification: 'regulatory_change',
        changeKind: 'protective_claim_window',
        actionMode: 'review_only',
        summary: 'Review whether protective refund claims are needed before July 10, 2026.',
        sourceExcerpt: 'taxpayers should review protective claims before July 10, 2026',
        jurisdiction: 'FED',
        counties: [],
        forms: ['federal_1040'],
        entityTypes: ['individual'],
        originalDueDate: null,
        newDueDate: null,
        effectiveFrom: '2020-03-13',
        effectiveUntil: '2022-04-10',
        affectedRuleIds: [],
        structuredChange: {
          kind: 'protective_claim_window',
          actionDeadline: '2026-07-10',
          claimTaxYears: ['2019', '2020', '2021', '2022'],
          affectedTaxActs: ['COVID disaster period refund claims'],
          evidenceNeeded: ['filed return dates', 'refund claim support'],
          legalUncertainty: 'Eligibility depends on how the legal issue is resolved.',
          authorityRefs: ['Taxpayer Advocate Service'],
        },
        confidence: 0.86,
      },
      model: 'test-model',
    })
    const ai = createAI(CONFIGURED_ENV)

    const result = await ai.extractPulse({
      sourceId: 'fed.taxpayer_advocate_blog',
      title: 'Protective claims before July 10',
      officialSourceUrl: 'https://www.taxpayeradvocate.irs.gov/taxnews-information/blogs-nta/',
      rawText: 'taxpayers should review protective claims before July 10, 2026',
    })

    expect(result.result).toMatchObject({
      changeKind: 'protective_claim_window',
      actionMode: 'review_only',
      structuredChange: expect.objectContaining({
        kind: 'protective_claim_window',
        actionDeadline: '2026-07-10',
        legalUncertainty: expect.stringContaining('Eligibility depends'),
      }),
    })
    expect(result.refusal).toBeNull()
  })

  it('accepts deadline-shift Pulse extracts that carry deadlineShift relief facts', async () => {
    // 2026-06-08 (Aogxu parity Phase 3): the extractor must pass through the
    // AI-extracted deadlineShift block in the freeform structuredChange. We can
    // only assert the schema/shape here — live LLM extraction quality (whether
    // the model populates these honestly) needs a real run + prompt review.
    callGatewayMock.mockResolvedValueOnce({
      output: {
        classification: 'regulatory_change',
        changeKind: 'deadline_shift',
        actionMode: 'due_date_overlay',
        summary: 'Disaster relief postpones filing and payment deadlines for Los Angeles County.',
        sourceExcerpt: 'filing and payment deadlines postponed to October 15, 2026',
        jurisdiction: 'CA',
        counties: ['Los Angeles'],
        forms: ['federal_1040'],
        entityTypes: ['individual'],
        originalDueDate: '2026-04-15',
        newDueDate: '2026-10-15',
        effectiveFrom: '2026-04-15',
        effectiveUntil: null,
        affectedRuleIds: [],
        structuredChange: {
          deadlineShift: {
            kind: 'deadline_shift',
            reliefType: 'Disaster (auto-applied)',
            deadlineTypes: ['filing', 'payment'],
            optInRequired: false,
            penaltyRelief: true,
          },
        },
        confidence: 0.92,
      },
      model: 'test-model',
    })
    const ai = createAI(CONFIGURED_ENV)

    const result = await ai.extractPulse({
      sourceId: 'irs.disaster',
      title: 'IRS CA storm relief',
      officialSourceUrl: 'https://www.irs.gov/newsroom/tax-relief-in-disaster-situations',
      rawText: 'filing and payment deadlines postponed to October 15, 2026',
    })

    expect(result.refusal).toBeNull()
    expect(result.result).toMatchObject({
      changeKind: 'deadline_shift',
      structuredChange: {
        deadlineShift: {
          reliefType: 'Disaster (auto-applied)',
          deadlineTypes: ['filing', 'payment'],
          optInRequired: false,
          penaltyRelief: true,
        },
      },
    })

    // The exported facts schema parses the extracted block and the UI relies on
    // it to read relief type / deadline types / opt-in safely.
    const structuredChange = result.result?.structuredChange as {
      deadlineShift: unknown
    } | null
    const facts = PulseDeadlineShiftFactsSchema.parse(structuredChange?.deadlineShift)
    expect(facts).toEqual({
      reliefType: 'Disaster (auto-applied)',
      deadlineTypes: ['filing', 'payment'],
      optInRequired: false,
      penaltyRelief: true,
    })
  })

  it('keeps PulseDeadlineShiftFactsSchema backward-compatible with absent/partial facts', () => {
    // Old alerts carry no deadlineShift facts at all — an empty object must
    // parse (the UI then falls back to its generic cells). Partial facts must
    // parse too — the model omits any key the source doesn't support (F-041).
    expect(PulseDeadlineShiftFactsSchema.parse({})).toEqual({})
    expect(PulseDeadlineShiftFactsSchema.parse({ reliefType: 'Disaster (auto-applied)' })).toEqual({
      reliefType: 'Disaster (auto-applied)',
    })
    expect(PulseDeadlineShiftFactsSchema.parse({ deadlineTypes: ['filing'] })).toEqual({
      deadlineTypes: ['filing'],
    })
  })

  it('rejects Pulse extract output when the excerpt is not in the source', async () => {
    callGatewayMock.mockResolvedValueOnce({
      output: {
        classification: 'regulatory_change',
        changeKind: 'deadline_shift',
        actionMode: 'due_date_overlay',
        summary: 'IRS extends selected filing deadlines.',
        sourceExcerpt: 'made up quote',
        jurisdiction: 'CA',
        counties: ['Los Angeles'],
        forms: ['federal_1065'],
        entityTypes: ['llc'],
        originalDueDate: '2026-03-15',
        newDueDate: '2026-10-15',
        effectiveFrom: null,
        effectiveUntil: null,
        affectedRuleIds: [],
        structuredChange: null,
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

  it('keeps noisy Pulse news fixtures review-only or no-change unless dates are explicit', async () => {
    callGatewayMock
      .mockResolvedValueOnce({
        output: {
          classification: 'no_regulatory_change',
          changeKind: null,
          actionMode: null,
          summary: 'Agency warning does not change a filing or payment obligation.',
          sourceExcerpt: 'Tax fraud warning for taxpayers',
          jurisdiction: 'AZ',
          counties: [],
          forms: [],
          entityTypes: [],
          originalDueDate: null,
          newDueDate: null,
          effectiveFrom: null,
          effectiveUntil: null,
          affectedRuleIds: [],
          structuredChange: null,
          confidence: 0.88,
        },
        model: 'test-model',
      })
      .mockResolvedValueOnce({
        output: {
          classification: 'regulatory_change',
          changeKind: 'form_instruction',
          actionMode: 'review_only',
          summary: 'Agency published new form instructions without an explicit due-date move.',
          sourceExcerpt: 'new form instructions are available',
          jurisdiction: 'CA',
          counties: [],
          forms: ['Form 100'],
          entityTypes: ['c_corp'],
          originalDueDate: null,
          newDueDate: null,
          effectiveFrom: '2026-01-01',
          effectiveUntil: null,
          affectedRuleIds: [],
          structuredChange: null,
          confidence: 0.82,
        },
        model: 'test-model',
      })
      .mockResolvedValueOnce({
        output: {
          classification: 'regulatory_change',
          changeKind: 'deadline_shift',
          actionMode: 'due_date_overlay',
          summary: 'Disaster relief moved the filing and payment deadline.',
          sourceExcerpt: 'extended from April 15, 2026 to October 15, 2026',
          jurisdiction: 'CA',
          counties: ['Los Angeles'],
          forms: ['federal_1040'],
          entityTypes: ['individual'],
          originalDueDate: '2026-04-15',
          newDueDate: '2026-10-15',
          effectiveFrom: '2026-04-15',
          effectiveUntil: null,
          affectedRuleIds: [],
          structuredChange: null,
          confidence: 0.9,
        },
        model: 'test-model',
      })
    const ai = createAI(CONFIGURED_ENV)

    await expect(
      ai.extractPulse({
        sourceId: 'az.temporary_announcements',
        title: 'Tax fraud warning',
        officialSourceUrl: 'https://azdor.gov/news/fraud-warning',
        rawText: 'Tax fraud warning for taxpayers',
      }),
    ).resolves.toMatchObject({ result: { classification: 'no_regulatory_change' } })
    await expect(
      ai.extractPulse({
        sourceId: 'ca.temporary_announcements',
        title: 'New form instructions',
        officialSourceUrl: 'https://www.ftb.ca.gov/forms/',
        rawText: 'new form instructions are available',
      }),
    ).resolves.toMatchObject({ result: { actionMode: 'review_only' } })
    await expect(
      ai.extractPulse({
        sourceId: 'irs.disaster',
        title: 'Disaster relief',
        officialSourceUrl: 'https://www.irs.gov/newsroom/tax-relief-in-disaster-situations',
        rawText: 'extended from April 15, 2026 to October 15, 2026',
      }),
    ).resolves.toMatchObject({ result: { actionMode: 'due_date_overlay' } })
  })

  it('allows incomplete due-date candidates as due-date overlays', async () => {
    callGatewayMock.mockResolvedValueOnce({
      output: {
        classification: 'regulatory_change',
        changeKind: 'deadline_shift',
        actionMode: 'due_date_overlay',
        summary: 'Agency says some deadlines were extended.',
        sourceExcerpt: 'some deadlines were extended',
        jurisdiction: 'CA',
        counties: [],
        forms: [],
        entityTypes: [],
        originalDueDate: null,
        newDueDate: '2026-10-15',
        effectiveFrom: null,
        effectiveUntil: null,
        affectedRuleIds: [],
        structuredChange: null,
        confidence: 0.8,
      },
      model: 'test-model',
    })
    const ai = createAI(CONFIGURED_ENV)

    const result = await ai.extractPulse({
      sourceId: 'ca.temporary_announcements',
      title: 'Deadline extension',
      officialSourceUrl: 'https://www.ftb.ca.gov/file/when-to-file/emergency-tax-relief.html',
      rawText: 'some deadlines were extended',
    })

    expect(result.result).toMatchObject({
      changeKind: 'deadline_shift',
      actionMode: 'due_date_overlay',
      originalDueDate: null,
      newDueDate: '2026-10-15',
    })
    expect(result.refusal).toBeNull()
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
      'rule-concrete-draft@v2',
      { sourceText: 'Official source says returns are due April 15, 2026.' },
      z.object({
        sourceExcerpt: z.string(),
        confidence: z.number(),
      }),
    )

    expect(result.result).toBeNull()
    expect(result.refusal?.code).toBe('GUARD_REJECTED')
  })

  it('accepts rule concrete drafts when the excerpt is source-backed but not contiguous', async () => {
    callGatewayMock.mockResolvedValueOnce({
      output: {
        sourceExcerpt: 'Alabama individual income tax returns April 15 calendar year 2026',
        confidence: 0.9,
      },
      model: 'test-model',
    })
    const ai = createAI(CONFIGURED_ENV)

    const result = await ai.runPrompt(
      'rule-concrete-draft@v2',
      {
        sourceText:
          'Alabama individual income tax returns should be filed by April 15 for calendar year 2026.',
      },
      z.object({
        sourceExcerpt: z.string(),
        confidence: z.number(),
      }),
    )

    expect(result.result).toEqual({
      sourceExcerpt: 'Alabama individual income tax returns April 15 calendar year 2026',
      confidence: 0.9,
    })
    expect(result.refusal).toBeNull()
  })

  it('guides rule concrete drafts to year-fill month/day installment schedules', async () => {
    callGatewayMock.mockResolvedValueOnce({
      output: {
        dueDateLogic: {
          kind: 'period_table',
          frequency: 'quarterly',
          periods: [
            { period: 'Payment 1', dueDate: '2026-04-15' },
            { period: 'Payment 2', dueDate: '2026-06-15' },
            { period: 'Payment 3', dueDate: '2026-09-15' },
            { period: 'Payment 4', dueDate: '2026-12-15' },
          ],
          holidayRollover: 'source_adjusted',
        },
        sourceExcerpt:
          'Estimate tax due dates for calendar year filers: Payment 1 April 15 Payment 2 June 15 Payment 3 September 15 Payment 4 December 15',
        confidence: 0.86,
      },
      model: 'test-model',
    })
    const ai = createAI(CONFIGURED_ENV)

    const result = await ai.runPrompt(
      'rule-concrete-draft@v2',
      {
        rule: {
          id: 'al.individual_estimated_tax.candidate.2026',
          applicableYear: 2026,
        },
        sourceText:
          'Estimate tax due dates for calendar year filers: Payment 1 April 15 Payment 2 June 15 Payment 3 September 15 Payment 4 December 15\nEstimate tax due dates for fiscal year filers: Will be due on the 15th day of the fourth, sixth, ninth, and 12th months of the fiscal year.',
      },
      z.object({
        dueDateLogic: z.object({
          kind: z.literal('period_table'),
          frequency: z.literal('quarterly'),
          periods: z.array(
            z.object({
              period: z.string(),
              dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            }),
          ),
          holidayRollover: z.literal('source_adjusted'),
        }),
        sourceExcerpt: z.string(),
        confidence: z.number(),
      }),
    )

    expect(result.result?.dueDateLogic.periods.map((period) => period.dueDate)).toEqual([
      '2026-04-15',
      '2026-06-15',
      '2026-09-15',
      '2026-12-15',
    ])
    expect(result.refusal).toBeNull()
    expect(callGatewayMock.mock.calls[0]?.[0].prompt).toContain(
      'fill the year from rule.applicableYear',
    )
  })

  it('rejects rule concrete drafts that cite source-watch metadata as evidence', async () => {
    callGatewayMock.mockResolvedValueOnce({
      output: {
        sourceExcerpt:
          'Alabama official source registered for individual income tax return applicability; templates require practice owner or manager acceptance before customer reminders.',
        confidence: 0.9,
      },
      model: 'test-model',
    })
    const ai = createAI(CONFIGURED_ENV)

    const result = await ai.runPrompt(
      'rule-concrete-draft@v2',
      {
        sourceText:
          'Alabama official source registered for individual income tax return applicability; templates require practice owner or manager acceptance before customer reminders.',
      },
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
    // Gateway/transport/credit failures bucket as 'ai_unavailable', not 'schema_fail' —
    // so an exhausted-credit outage stays diagnosable instead of looking like bad model output.
    expect(result.trace.guardResult).toBe('ai_unavailable')
  })
})
