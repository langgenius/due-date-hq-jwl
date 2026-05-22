import { describe, expect, it } from 'vitest'
import {
  normalizeRuleConcreteDraftAiOutput,
  ruleConcreteDraftContextRef,
  RuleConcreteDraftAiOutputSchema,
} from './concrete-draft'

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

describe('rule concrete draft normalization', () => {
  it('keys cached drafts by current rule semantic version', () => {
    expect(
      ruleConcreteDraftContextRef({
        ruleId: 'ca.business_income_return.candidate.2026',
        ruleVersion: 2,
        sourceId: 'ca.ftb_business_due_dates',
      }),
    ).toBe('rule:ca.business_income_return.candidate.2026:v2:ca.ftb_business_due_dates')
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
})
