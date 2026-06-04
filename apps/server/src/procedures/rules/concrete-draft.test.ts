/* eslint-disable typescript-eslint/no-unsafe-type-assertion --
 * focused concrete draft service tests use a minimal Env test double.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AiRepo } from '@duedatehq/ports/ai'
import type { RuleConcreteDraftRepo } from '@duedatehq/ports/rule-concrete-drafts'
import type { Env } from '../../env'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import {
  classifyExcerptMatch,
  CONCRETE_DRAFT_MIN_BULK_CONFIDENCE,
  concreteDraftBulkTrustIssue,
  concreteDraftSourceIsStale,
  dueDateLogicDateCodes,
  extractPdfSourceText,
  generateConcreteDraft,
  isUsableConcreteDraftOfficialSourceText,
  normalizeRuleConcreteDraftAiOutput,
  sourceTextContainsExcerpt,
  ruleConcreteDraftContextRef,
  RuleConcreteDraftAiOutputSchema,
  validateConcreteRuleDraft,
} from './concrete-draft'

const aiMocks = vi.hoisted(() => ({
  runPrompt: vi.fn(),
}))

vi.mock('@duedatehq/ai', () => ({
  createAI: vi.fn(() => ({
    runPrompt: aiMocks.runPrompt,
  })),
}))

const ALABAMA_ESTIMATED_SOURCE_TEXT = [
  'Estimate tax due dates for calendar year filers:',
  'Payment 1 - April 15',
  'Payment 2 - June 15',
  'Payment 3 - September 15',
  'Payment 4 - December 15',
  'Estimate tax due dates for fiscal year filers:',
  'Will be due on the 15th day of the fourth, sixth, ninth, and 12th months of the fiscal year.',
].join('\n')

const ALABAMA_BPT_SOURCE_TEXT = [
  'Business Privilege Tax',
  "C-Corporation Due no later than 15th day of the 4th month after the beginning of a taxpayer's taxable year.",
  "S-Corporation Due no later than 15th day of the 3rd month after the beginning of a taxpayer's taxable year.",
  "Limited Liability Entities Due no later than 15th day of the 3rd month after the beginning of a taxpayer's taxable year.",
].join('\n')

const SOURCE_TEXT = 'Return due April 15, 2026.'

function fakeAiRepo(): AiRepo {
  return {
    firmId: 'firm-1',
    findSuccessfulRun: vi.fn(async () => null),
    findSuccessfulGlobalRun: vi.fn(async () => null),
    findSuccessfulRunsByContextRefs: vi.fn(async () => []),
    findSuccessfulGlobalRunsByContextRefs: vi.fn(async () => []),
    recordRun: vi.fn(async () => ({
      aiOutputId: '00000000-0000-4000-8000-000000000001',
      llmLogId: '00000000-0000-4000-8000-000000000002',
    })),
    recordGlobalRun: vi.fn(async () => ({
      aiOutputId: '00000000-0000-4000-8000-000000000001',
      llmLogId: '00000000-0000-4000-8000-000000000002',
    })),
  }
}

function fakeConcreteDraftRepo(upsert = vi.fn(async () => undefined)): RuleConcreteDraftRepo {
  return {
    upsert,
    listReadyContextRefs: vi.fn(async () => []),
    health: vi.fn(async () => ({ readyContextRefs: [], missingContextRefs: [] })),
  }
}

function fakeRule() {
  return {
    id: 'ca.individual_income_return.candidate.2026',
    title: 'California individual income tax return applicability',
    jurisdiction: 'CA',
    version: 1,
    status: 'candidate',
    ruleTier: 'applicability_review',
    entityApplicability: ['individual'],
    taxType: 'state_income_tax',
    formName: 'Form 540',
    eventType: 'filing',
    isFiling: true,
    isPayment: false,
    taxYear: 2026,
    applicableYear: 2026,
    dueDateLogic: {
      kind: 'source_defined_calendar',
      description: 'Source-defined California filing date.',
      holidayRollover: 'source_adjusted',
    },
    extensionPolicy: {
      available: false,
      paymentExtended: false,
      notes: 'No extension policy in the test fixture.',
    },
    coverageStatus: 'manual',
    riskLevel: 'med',
    requiresApplicabilityReview: true,
    quality: {
      filingPaymentDistinguished: false,
      extensionHandled: false,
      calendarFiscalSpecified: false,
      holidayRolloverHandled: false,
      crossVerified: false,
      exceptionChannel: false,
    },
    defaultTip: 'Review source.',
    sourceIds: ['ca.ftb_due_dates'],
    evidence: [
      {
        sourceId: 'ca.ftb_due_dates',
        authorityRole: 'basis',
        summary: 'California return due date source.',
        sourceExcerpt: SOURCE_TEXT,
        retrievedAt: '2026-05-25',
        locator: { kind: 'html', heading: 'Due dates' },
      },
    ],
    nextReviewOn: '2027-05-01',
    lastReviewedOn: '2026-05-25',
    verifiedBy: 'DueDateHQ',
    verifiedAt: '2026-05-25',
  } as const
}

function fakeSource() {
  return {
    id: 'ca.ftb_due_dates',
    jurisdiction: 'CA',
    title: 'California FTB due dates',
    url: 'https://example.test/ca',
    sourceType: 'due_dates',
    acquisitionMethod: 'html_watch',
    cadence: 'weekly',
    priority: 'high',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    domains: ['individual_income_return'],
    entityApplicability: ['individual'],
    authorityRole: 'basis',
    alertPurpose: 'rule_source_watch',
    notificationChannels: ['practice_rule_review'],
    lastReviewedOn: '2026-05-25',
  } as const
}

describe('rule concrete draft generation cache', () => {
  beforeEach(() => {
    aiMocks.runPrompt.mockReset()
  })

  it('mirrors successful real AI concrete drafts into the cache table repo', async () => {
    const aiRepo = fakeAiRepo()
    const upsert = vi.fn(async () => undefined)
    const concreteDraftRepo = fakeConcreteDraftRepo(upsert)
    aiMocks.runPrompt.mockResolvedValue({
      result: {
        dueDateLogic: {
          kind: 'fixed_date',
          date: '2026-04-15',
        },
        extensionPolicy: {
          available: false,
          paymentExtended: false,
          notes: 'No extension policy in source.',
        },
        coverageStatus: 'full',
        requiresApplicabilityReview: true,
        quality: {
          filingPaymentDistinguished: true,
        },
        sourceHeading: 'Due dates',
        sourceExcerpt: SOURCE_TEXT,
        confidence: 0.9,
        reasoning: 'The source states the due date.',
      },
      trace: {
        promptVersion: 'rule-concrete-draft@v2',
        model: 'test-model',
        latencyMs: 10,
        guardResult: 'ok',
        inputHash: 'hash-1',
      },
      model: 'test-model',
      refusal: null,
    })

    const draft = await generateConcreteDraft({
      env: {} as Env,
      aiRepo,
      concreteDraftRepo,
      scope: 'global',
      userId: null,
      base: fakeRule(),
      source: fakeSource(),
    })

    expect(draft.aiOutputId).toBe('00000000-0000-4000-8000-000000000001')
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        aiOutputId: '00000000-0000-4000-8000-000000000001',
        firmId: null,
        userId: null,
        inputContextRef: 'rule:ca.individual_income_return.candidate.2026:v1:ca.ftb_due_dates',
        promptVersion: 'rule-concrete-draft@v2',
        model: 'test-model',
        ruleId: 'ca.individual_income_return.candidate.2026',
        sourceId: 'ca.ftb_due_dates',
        sourceExcerpt: SOURCE_TEXT,
      }),
    )
  })

  it('does not mirror rejected concrete draft runs', async () => {
    const aiRepo = fakeAiRepo()
    const upsert = vi.fn(async () => undefined)
    const concreteDraftRepo = fakeConcreteDraftRepo(upsert)
    aiMocks.runPrompt.mockResolvedValue({
      result: {
        dueDateLogic: {
          kind: 'fixed_date',
          date: '2026-04-15',
        },
        extensionPolicy: {
          available: false,
          paymentExtended: false,
          notes: 'No extension policy in source.',
        },
        coverageStatus: 'manual',
        requiresApplicabilityReview: true,
        quality: {},
        sourceHeading: 'Due dates',
        sourceExcerpt: 'This excerpt does not exist in the source text.',
        confidence: 0.4,
        reasoning: 'Invalid concrete output.',
      },
      trace: {
        promptVersion: 'rule-concrete-draft@v2',
        model: 'test-model',
        latencyMs: 10,
        guardResult: 'ok',
        inputHash: 'hash-1',
      },
      model: 'test-model',
      refusal: null,
    })

    await expect(
      generateConcreteDraft({
        env: {} as Env,
        aiRepo,
        concreteDraftRepo,
        scope: 'global',
        userId: null,
        base: fakeRule(),
        source: fakeSource(),
      }),
    ).rejects.toThrow()

    expect(upsert).not.toHaveBeenCalled()
  })
})

describe('rule concrete draft normalization', () => {
  it('extracts text from PDF source responses', async () => {
    const pdf = await PDFDocument.create()
    const page = pdf.addPage([420, 180])
    const font = await pdf.embedFont(StandardFonts.Helvetica)
    page.drawText('Connecticut estimated tax payments are due April 15, 2026.', {
      x: 32,
      y: 110,
      size: 12,
      font,
    })

    const bytes = await pdf.save()
    const buffer = new ArrayBuffer(bytes.byteLength)
    new Uint8Array(buffer).set(bytes)
    const text = await extractPdfSourceText(buffer)

    expect(text).toContain('Connecticut estimated tax payments are due April 15, 2026.')
  })

  it('keys cached drafts by current rule semantic version', () => {
    expect(
      ruleConcreteDraftContextRef({
        ruleId: 'ca.business_income_return.candidate.2026',
        ruleVersion: 2,
        sourceId: 'ca.ftb_business_due_dates',
      }),
    ).toBe('rule:ca.business_income_return.candidate.2026:v2:ca.ftb_business_due_dates')
  })

  it('does not reject official source text that contains tax code section numbers', () => {
    expect(
      isUsableConcreteDraftOfficialSourceText(
        [
          'Idaho unemployment insurance tax handbook.',
          'Reports and payments are due the last day of the month following the end of each calendar quarter.',
          'Amounts excluded from wages may reference IRS Code Sections 401(a), 403(a), and 501(a).',
        ].join(' '),
      ),
    ).toBe(true)
    expect(
      isUsableConcreteDraftOfficialSourceText(
        '404 page not found. The page you requested could not be located.',
      ),
    ).toBe(false)
  })

  it('normalizes Alabama-style month/day installment drafts into the strict contract shape', () => {
    const parsed = RuleConcreteDraftAiOutputSchema.parse({
      dueDateLogic: {
        kind: 'period_table',
        frequency: 'estimated tax installments',
        periods: [
          { period: 'Payment 1 - April 15' },
          { period: 'Payment 2 - June 15' },
          { period: 'Payment 3 - September 15' },
          { period: 'Payment 4 - December 15' },
        ],
        holidayRollover: 'next_business_day',
      },
      extensionPolicy: {
        available: null,
        formName: null,
        durationMonths: null,
        paymentExtended: null,
        notes: null,
      },
      coverageStatus: 'full',
      requiresApplicabilityReview: false,
      quality: {
        calendarFiscalSpecified: null,
        extensionHandled: null,
      },
      sourceHeading: null,
      sourceExcerpt:
        'Estimate tax due dates for calendar year filers: Payment 1 - April 15 Payment 2 - June 15 Payment 3 - September 15 Payment 4 - December 15',
      confidence: '0.86',
      reasoning:
        'Calendar-year installment month/day values are year-filled from the applicable year; fiscal-year timing remains a review note.',
    })

    const result = normalizeRuleConcreteDraftAiOutput({
      output: parsed,
      applicableYear: 2026,
      sourceTitle: 'Alabama DOR Estimated Tax Payment Due Dates',
      sourceText: ALABAMA_ESTIMATED_SOURCE_TEXT,
    })

    expect(result.error).toBeNull()
    expect(result.draft).toMatchObject({
      dueDateLogic: {
        kind: 'period_table',
        frequency: 'quarterly',
        holidayRollover: 'source_adjusted',
        periods: [
          { period: 'Payment 1 - April 15', dueDate: '2026-04-15' },
          { period: 'Payment 2 - June 15', dueDate: '2026-06-15' },
          { period: 'Payment 3 - September 15', dueDate: '2026-09-15' },
          { period: 'Payment 4 - December 15', dueDate: '2026-12-15' },
        ],
      },
      extensionPolicy: {
        available: false,
        paymentExtended: false,
        notes: 'No extension policy is stated in the selected official source text.',
      },
      sourceHeading: 'Alabama DOR Estimated Tax Payment Due Dates',
      confidence: 0.86,
    })
  })

  it('fills missing period row due dates from source text when the model only labels payments', () => {
    const parsed = RuleConcreteDraftAiOutputSchema.parse({
      dueDateLogic: {
        kind: 'period_table',
        frequency: 'quarterly',
        periods: [
          { period: 'Payment 1', dueDate: null },
          { period: 'Payment 2', dueDate: null },
          { period: 'Payment 3', dueDate: null },
          { period: 'Payment 4', dueDate: null },
        ],
      },
      extensionPolicy: {
        available: false,
        paymentExtended: false,
        notes: 'The source does not state an extension policy for estimated payments.',
      },
      coverageStatus: 'full',
      requiresApplicabilityReview: false,
      quality: {
        filingPaymentDistinguished: true,
        extensionHandled: false,
        calendarFiscalSpecified: true,
        holidayRolloverHandled: false,
        crossVerified: false,
        exceptionChannel: false,
      },
      sourceHeading: 'When are estimated tax payments due?',
      sourceExcerpt:
        'Estimate tax due dates for calendar year filers: Payment 1 - April 15 Payment 2 - June 15 Payment 3 - September 15 Payment 4 - December 15',
      confidence: 0.88,
      reasoning: 'The source excerpt states the four calendar-year payment dates.',
    })

    const result = normalizeRuleConcreteDraftAiOutput({
      output: parsed,
      applicableYear: 2026,
      sourceTitle: 'Alabama DOR Estimated Tax Payment Due Dates',
      sourceText: ALABAMA_ESTIMATED_SOURCE_TEXT,
    })

    expect(result.error).toBeNull()
    expect(result.draft?.dueDateLogic).toMatchObject({
      kind: 'period_table',
      periods: [
        { period: 'Payment 1', dueDate: '2026-04-15' },
        { period: 'Payment 2', dueDate: '2026-06-15' },
        { period: 'Payment 3', dueDate: '2026-09-15' },
        { period: 'Payment 4', dueDate: '2026-12-15' },
      ],
    })
  })

  it('normalizes common model aliases without weakening the final draft contract', () => {
    const parsed = RuleConcreteDraftAiOutputSchema.parse({
      dueDateLogic: {
        kind: 'installment_schedule',
        frequency: 'estimated payments',
        dueDates: ['Payment 1 - April 15', 'Payment 2 - June 15', 'Payment 3 - September 15'],
      },
      extensionPolicy: {
        available: true,
        formName: 'Extension request',
        durationMonths: '0',
        paymentExtended: false,
        notes: 'The source does not extend estimated tax payments.',
      },
      coverageStatus: 'full',
      requiresApplicabilityReview: false,
      quality: {
        filingPaymentDistinguished: true,
      },
      sourceHeading: 'Estimated payments',
      sourceExcerpt:
        'Estimate tax due dates for calendar year filers: Payment 1 - April 15 Payment 2 - June 15 Payment 3 - September 15 Payment 4 - December 15',
      confidence: 0.81,
      reasoning: 'The source lists calendar-year estimated payment due dates.',
    })

    const result = normalizeRuleConcreteDraftAiOutput({
      output: parsed,
      applicableYear: 2026,
      sourceTitle: 'Alabama DOR Estimated Tax Payment Due Dates',
      sourceText: ALABAMA_ESTIMATED_SOURCE_TEXT,
    })

    expect(result.error).toBeNull()
    expect(result.draft?.dueDateLogic).toMatchObject({
      kind: 'period_table',
      frequency: 'quarterly',
      periods: [
        { period: 'Payment 1 - April 15', dueDate: '2026-04-15' },
        { period: 'Payment 2 - June 15', dueDate: '2026-06-15' },
        { period: 'Payment 3 - September 15', dueDate: '2026-09-15' },
      ],
    })
    expect(result.draft?.extensionPolicy).toEqual({
      available: true,
      formName: 'Extension request',
      paymentExtended: false,
      notes: 'The source does not extend estimated tax payments.',
    })
  })

  it('fills a missing source excerpt from official source text', () => {
    const parsed = RuleConcreteDraftAiOutputSchema.parse({
      dueDateLogic: {
        kind: 'period_table',
        frequency: 'quarterly',
        periods: [
          { period: 'Payment 1', dueDate: null },
          { period: 'Payment 2', dueDate: null },
          { period: 'Payment 3', dueDate: null },
          { period: 'Payment 4', dueDate: null },
        ],
      },
      extensionPolicy: {
        available: false,
        paymentExtended: false,
        notes: 'The source does not state an extension policy for estimated payments.',
      },
      coverageStatus: 'full',
      requiresApplicabilityReview: false,
      quality: {
        filingPaymentDistinguished: true,
        extensionHandled: false,
        calendarFiscalSpecified: true,
        holidayRolloverHandled: false,
        crossVerified: false,
        exceptionChannel: false,
      },
      sourceHeading: 'When are estimated tax payments due?',
      sourceExcerpt: null,
      confidence: 0.88,
      reasoning: 'The source text states the four calendar-year payment dates.',
    })

    const result = normalizeRuleConcreteDraftAiOutput({
      output: parsed,
      applicableYear: 2026,
      sourceTitle: 'Alabama DOR Estimated Tax Payment Due Dates',
      sourceText: ALABAMA_ESTIMATED_SOURCE_TEXT,
    })

    expect(result.error).toBeNull()
    expect(result.draft?.sourceExcerpt).toBe(
      [
        'Estimate tax due dates for calendar year filers:',
        'Payment 1 - April 15',
        'Payment 2 - June 15',
        'Payment 3 - September 15',
        'Payment 4 - December 15',
      ].join('\n'),
    )
  })

  it('normalizes Alabama business privilege tax due dates from tax-year-begin logic', () => {
    const parsed = RuleConcreteDraftAiOutputSchema.parse({
      dueDateLogic: {
        kind: 'nth_day_after_tax_year_begin',
        monthOffset: '3',
        day: '15',
        holidayRollover: 'next_business_day',
      },
      extensionPolicy: {
        available: false,
        paymentExtended: false,
        notes: 'The source excerpt gives the original business privilege tax due date.',
      },
      coverageStatus: 'manual',
      requiresApplicabilityReview: true,
      quality: {
        filingPaymentDistinguished: true,
        extensionHandled: false,
        calendarFiscalSpecified: false,
        holidayRolloverHandled: false,
        crossVerified: false,
        exceptionChannel: true,
      },
      sourceHeading: 'Business Privilege Tax',
      sourceExcerpt:
        "S-Corporation Due no later than 15th day of the 3rd month after the beginning of a taxpayer's taxable year.",
      confidence: 0.82,
      reasoning:
        'The S corporation row supports a March 15-style rule, while entity-specific applicability still needs review.',
    })

    const result = normalizeRuleConcreteDraftAiOutput({
      output: parsed,
      applicableYear: 2026,
      sourceTitle: 'Alabama DOR Income Tax Due Dates',
      sourceText: ALABAMA_BPT_SOURCE_TEXT,
    })

    expect(result.error).toBeNull()
    expect(result.draft).toMatchObject({
      dueDateLogic: {
        kind: 'nth_day_after_tax_year_begin',
        monthOffset: 3,
        day: 15,
        holidayRollover: 'next_business_day',
      },
      coverageStatus: 'manual',
      requiresApplicabilityReview: true,
      sourceHeading: 'Business Privilege Tax',
    })
  })

  it('converts tax-year-relative source excerpts when the model picked a fixed-date alias', () => {
    const parsed = RuleConcreteDraftAiOutputSchema.parse({
      dueDateLogic: {
        kind: 'annual_due_date',
        dueDate: null,
        holidayRollover: 'next_business_day',
      },
      extensionPolicy: {
        available: false,
        paymentExtended: false,
        notes: 'The source excerpt gives a tax-year-relative due date.',
      },
      coverageStatus: 'manual',
      requiresApplicabilityReview: true,
      quality: {
        filingPaymentDistinguished: true,
      },
      sourceHeading: 'Business Privilege Tax',
      sourceExcerpt:
        "Limited Liability Entities Due no later than 15th day of the 3rd month after the beginning of a taxpayer's taxable year.",
      confidence: 0.78,
      reasoning: 'The LLC row gives a due date relative to the taxable year beginning.',
    })

    const result = normalizeRuleConcreteDraftAiOutput({
      output: parsed,
      applicableYear: 2026,
      sourceTitle: 'Alabama DOR Income Tax Due Dates',
      sourceText: ALABAMA_BPT_SOURCE_TEXT,
    })

    expect(result.error).toBeNull()
    expect(result.draft?.dueDateLogic).toEqual({
      kind: 'nth_day_after_tax_year_begin',
      monthOffset: 3,
      day: 15,
      holidayRollover: 'next_business_day',
    })
  })

  it('accepts common wrapped AI payloads before strict draft normalization', () => {
    const parsed = RuleConcreteDraftAiOutputSchema.parse({
      result: {
        dueDate: 'April 15, 2026',
        extensionPolicy: {
          available: false,
          paymentExtended: false,
          notes: 'No extension policy is stated.',
        },
        coverageStatus: 'manual',
        requiresApplicabilityReview: true,
        quality: {
          filingPaymentDistinguished: true,
        },
        sourceExcerpt: 'Generally, your Alabama Individual Income Tax Return is due on April 15th.',
        confidence: 0.76,
        reasoning: 'The wrapped result states the due date.',
      },
    })

    const result = normalizeRuleConcreteDraftAiOutput({
      output: parsed,
      applicableYear: 2026,
      sourceTitle: 'Alabama DOR Individual Income Tax Due Dates',
      sourceText: 'Generally, your Alabama Individual Income Tax Return is due on April 15th.',
    })

    expect(result.error).toBeNull()
    expect(result.draft?.dueDateLogic).toEqual({
      kind: 'fixed_date',
      date: '2026-04-15',
      holidayRollover: 'next_business_day',
    })
  })

  it('falls back from missing fixed-date fields to source-backed date candidates', () => {
    const parsed = RuleConcreteDraftAiOutputSchema.parse({
      dueDateLogic: {
        kind: 'fixed_date',
        date: null,
      },
      extensionPolicy: {
        available: false,
        paymentExtended: false,
        notes: 'No extension policy is stated.',
      },
      coverageStatus: 'manual',
      requiresApplicabilityReview: true,
      quality: {},
      sourceExcerpt: 'Generally, your Alabama Individual Income Tax Return is due on April 15th.',
      confidence: 0.71,
      reasoning: 'The source excerpt states the due date.',
    })

    const result = normalizeRuleConcreteDraftAiOutput({
      output: parsed,
      applicableYear: 2026,
      sourceTitle: 'Alabama DOR Individual Income Tax Due Dates',
      sourceText: 'Generally, your Alabama Individual Income Tax Return is due on April 15th.',
    })

    expect(result.error).toBeNull()
    expect(result.draft?.dueDateLogic).toMatchObject({
      kind: 'fixed_date',
      date: '2026-04-15',
    })
  })

  it('keeps tax-year-relative logic valid when day/month fields are worded in source text', () => {
    const parsed = RuleConcreteDraftAiOutputSchema.parse({
      dueDateLogic: {
        kind: 'nth_day_after_tax_year_end',
        monthOffset: null,
        day: null,
        description:
          'The return is due on or before the fifteenth day of the fourth month after the close of the taxable year.',
      },
      extensionPolicy: {
        available: false,
        paymentExtended: false,
        notes: 'No extension policy is stated.',
      },
      coverageStatus: 'manual',
      requiresApplicabilityReview: true,
      quality: {},
      sourceExcerpt:
        'The return is due on or before the fifteenth day of the fourth month after the close of the taxable year.',
      confidence: 0.73,
      reasoning: 'The source excerpt states the relative due date.',
    })

    const result = normalizeRuleConcreteDraftAiOutput({
      output: parsed,
      applicableYear: 2026,
      sourceTitle: 'Business Return Instructions',
      sourceText:
        'The return is due on or before the fifteenth day of the fourth month after the close of the taxable year.',
    })

    expect(result.error).toBeNull()
    expect(result.draft?.dueDateLogic).toEqual({
      kind: 'nth_day_after_tax_year_end',
      monthOffset: 4,
      day: 15,
      holidayRollover: 'next_business_day',
    })
  })

  it('matches short excerpts when date wording differs (April 15 vs 4/15)', () => {
    expect(
      sourceTextContainsExcerpt(
        'Your estimated tax payment is due on 4/15/26 for the first quarter.',
        'Payment is due on April 15',
      ),
    ).toBe(true)
  })

  it('does not match short excerpts with no date or due/filing anchors', () => {
    expect(
      sourceTextContainsExcerpt(
        'This state tracks many unrelated compliance topics and forms.',
        'the source says this',
      ),
    ).toBe(false)
  })

  it('keeps strict matching for long, unrelated excerpts', () => {
    expect(
      sourceTextContainsExcerpt(
        'Individual returns are filed by April 15.',
        'The office opened on a different date at a different address',
      ),
    ).toBe(false)
  })
})

describe('classifyExcerptMatch / dueDateLogicDateCodes (guard foundation)', () => {
  it('returns "exact" for a verbatim (whitespace/case-normalized) substring', () => {
    expect(
      classifyExcerptMatch(
        'Individual returns are filed by April 15, 2026 per the instructions.',
        'returns are filed by APRIL 15, 2026',
      ),
    ).toBe('exact')
  })

  it('returns "fuzzy" when only the date matches via differing wording (April 15 vs 4/15)', () => {
    expect(
      classifyExcerptMatch(
        'Your estimated tax payment is due on 4/15/26 for the first quarter.',
        'Payment is due on April 15',
      ),
    ).toBe('fuzzy')
  })

  it('returns "none" for an unrelated excerpt', () => {
    expect(
      classifyExcerptMatch(
        'Individual returns are filed by April 15.',
        'The office opened on a different date at a different address',
      ),
    ).toBe('none')
  })

  it('keeps sourceTextContainsExcerpt as a backward-compatible (!== "none") wrapper', () => {
    const source = 'Your estimated tax payment is due on 4/15/26 for the first quarter.'
    const fuzzy = 'Payment is due on April 15'
    const unrelated = 'the source says this'
    expect(classifyExcerptMatch(source, fuzzy)).toBe('fuzzy')
    expect(sourceTextContainsExcerpt(source, fuzzy)).toBe(true)
    expect(classifyExcerptMatch(source, unrelated)).toBe('none')
    expect(sourceTextContainsExcerpt(source, unrelated)).toBe(false)
  })

  it('extracts the MM-DD code from absolute fixed_date logic', () => {
    expect(
      dueDateLogicDateCodes({
        kind: 'fixed_date',
        date: '2026-04-15',
        holidayRollover: 'next_business_day',
      }),
    ).toEqual(['04-15'])
  })

  it('extracts every period MM-DD from period_table logic', () => {
    expect(
      dueDateLogicDateCodes({
        kind: 'period_table',
        frequency: 'quarterly',
        periods: [
          { period: 'Q1', dueDate: '2026-04-30' },
          { period: 'Q2', dueDate: '2026-07-31' },
        ],
        holidayRollover: 'source_adjusted',
      }),
    ).toEqual(['04-30', '07-31'])
  })

  it('returns no codes for relative or source-defined logic (exempt from the date check)', () => {
    expect(
      dueDateLogicDateCodes({
        kind: 'nth_day_after_tax_year_end',
        monthOffset: 4,
        day: 15,
        holidayRollover: 'next_business_day',
      }),
    ).toEqual([])
    expect(
      dueDateLogicDateCodes({
        kind: 'source_defined_calendar',
        description: 'see source',
        holidayRollover: 'source_adjusted',
      }),
    ).toEqual([])
  })
})

describe('validateConcreteRuleDraft — due date must be supported by the cited excerpt (gap #1)', () => {
  const base = {
    rule: { taxYear: 2025 },
    coverageStatus: 'full' as const,
    requiresApplicabilityReview: false,
  }

  it('rejects a draft whose concrete date contradicts the date it cited', () => {
    const error = validateConcreteRuleDraft({
      ...base,
      dueDateLogic: {
        kind: 'fixed_date',
        date: '2026-03-15',
        holidayRollover: 'next_business_day',
      },
      sourceText: 'Individual income tax returns are due April 15, 2026.',
      sourceExcerpt: 'Individual income tax returns are due April 15, 2026.',
    })
    expect(error).toMatch(/not supported by any date in the cited source excerpt/i)
  })

  it('accepts a draft whose concrete date matches the cited excerpt', () => {
    expect(
      validateConcreteRuleDraft({
        ...base,
        dueDateLogic: {
          kind: 'fixed_date',
          date: '2026-04-15',
          holidayRollover: 'next_business_day',
        },
        sourceText: 'Individual income tax returns are due April 15, 2026.',
        sourceExcerpt: 'Individual income tax returns are due April 15, 2026.',
      }),
    ).toBeNull()
  })

  it('abstains when the cited excerpt carries no machine-readable date (word-form phrasing)', () => {
    expect(
      validateConcreteRuleDraft({
        ...base,
        dueDateLogic: {
          kind: 'fixed_date',
          date: '2026-04-15',
          holidayRollover: 'next_business_day',
        },
        sourceText:
          'The return is due on the fifteenth day of the fourth month following year end.',
        sourceExcerpt: 'due on the fifteenth day of the fourth month',
      }),
    ).toBeNull()
  })

  it('accepts a partial period_table excerpt that supports only one of its rows', () => {
    expect(
      validateConcreteRuleDraft({
        ...base,
        dueDateLogic: {
          kind: 'period_table',
          frequency: 'quarterly',
          periods: [
            { period: 'Q1', dueDate: '2026-04-30' },
            { period: 'Q2', dueDate: '2026-07-31' },
          ],
          holidayRollover: 'source_adjusted',
        },
        sourceText: 'Form 941 for the first quarter (Q1) is due April 30, 2026.',
        sourceExcerpt: 'first quarter (Q1) is due April 30, 2026',
      }),
    ).toBeNull()
  })

  it('rejects a period_table draft whose cited dates are entirely disjoint from its rows', () => {
    const error = validateConcreteRuleDraft({
      ...base,
      dueDateLogic: {
        kind: 'period_table',
        frequency: 'quarterly',
        periods: [{ period: 'Q1', dueDate: '2026-04-30' }],
        holidayRollover: 'source_adjusted',
      },
      sourceText: 'An unrelated estimated payment is due September 15, 2026.',
      sourceExcerpt: 'estimated payment is due September 15, 2026',
    })
    expect(error).toMatch(/not supported by any date/i)
  })
})

describe('concreteDraftBulkTrustIssue (bulk trust gate, gaps #2/#3)', () => {
  const SOURCE = 'California personal income tax returns are due April 15, 2026.'
  const EXACT_EXCERPT = 'returns are due April 15, 2026'
  const FUZZY_EXCERPT = 'Payment is due on April 15' // same date, not a verbatim substring

  it('flags low confidence even when the excerpt is a verbatim match', () => {
    expect(
      concreteDraftBulkTrustIssue({
        confidence: 0.4,
        sourceExcerpt: EXACT_EXCERPT,
        citations: { sourceText: SOURCE },
      }),
    ).toBe('low_confidence')
  })

  it('passes a high-confidence draft with a verbatim excerpt', () => {
    expect(
      concreteDraftBulkTrustIssue({
        confidence: 0.9,
        sourceExcerpt: EXACT_EXCERPT,
        citations: { sourceText: SOURCE },
      }),
    ).toBeNull()
  })

  it('treats the confidence threshold as inclusive (exactly 0.5 passes)', () => {
    expect(
      concreteDraftBulkTrustIssue({
        confidence: CONCRETE_DRAFT_MIN_BULK_CONFIDENCE,
        sourceExcerpt: EXACT_EXCERPT,
        citations: { sourceText: SOURCE },
      }),
    ).toBeNull()
  })

  it('flags a non-verbatim (fuzzy) excerpt when source text is available', () => {
    expect(
      concreteDraftBulkTrustIssue({
        confidence: 0.9,
        sourceExcerpt: FUZZY_EXCERPT,
        citations: { sourceText: SOURCE },
      }),
    ).toBe('fuzzy_excerpt')
  })

  it('falls back to confidence only when no source text was stored (legacy rows)', () => {
    expect(
      concreteDraftBulkTrustIssue({
        confidence: 0.9,
        sourceExcerpt: FUZZY_EXCERPT,
        citations: { sourceText: null },
      }),
    ).toBeNull()
    expect(
      concreteDraftBulkTrustIssue({
        confidence: 0.9,
        sourceExcerpt: FUZZY_EXCERPT,
        citations: null,
      }),
    ).toBeNull()
  })
})

describe('concreteDraftSourceIsStale (gap #4 snapshot freshness)', () => {
  it('is stale when the draft snapshot differs from the latest', () => {
    expect(
      concreteDraftSourceIsStale({
        citations: { sourceSnapshotId: 'snap_old' },
        latestSnapshotId: 'snap_new',
      }),
    ).toBe(true)
  })

  it('is fresh when the draft snapshot equals the latest', () => {
    expect(
      concreteDraftSourceIsStale({
        citations: { sourceSnapshotId: 'snap_1' },
        latestSnapshotId: 'snap_1',
      }),
    ).toBe(false)
  })

  it('cannot prove staleness when the draft recorded no snapshot id (legacy rows)', () => {
    expect(
      concreteDraftSourceIsStale({
        citations: { sourceSnapshotId: null },
        latestSnapshotId: 'snap_new',
      }),
    ).toBe(false)
    expect(concreteDraftSourceIsStale({ citations: null, latestSnapshotId: 'snap_new' })).toBe(
      false,
    )
  })

  it('cannot prove staleness when the source has no current snapshot', () => {
    expect(
      concreteDraftSourceIsStale({
        citations: { sourceSnapshotId: 'snap_1' },
        latestSnapshotId: null,
      }),
    ).toBe(false)
  })
})
