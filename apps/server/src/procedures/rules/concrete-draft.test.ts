import { describe, expect, it } from 'vitest'
import { findRuleById, RULE_SOURCES } from '@duedatehq/core/rules'
import {
  inferDeterministicConcreteDraft,
  isUsableConcreteDraftOfficialSourceText,
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

const FLORIDA_ESTIMATED_SOURCE_TEXT = [
  'Florida Corporate Income Tax Due Dates',
  'https://floridarevenue.com/taxes/Documents/flCitDueDates.pdf',
  'Reviewed 2026-04-27',
  'Estimated tax due dates table',
  'Updated 2026-04-27',
  'Florida Corporate Income Tax Due Dates for Declaration of Estimated Tax',
  'Taxable Year End Installment #1 Installment #2 Installment #3 Installment #4',
  '12/31/26 06/01/26 06/30/26 09/30/26 12/31/26',
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

  it('deterministically extracts Florida estimated tax installment tables', () => {
    const base = findRuleById('fl.cit.estimated_tax.2026')
    const source = RULE_SOURCES.find((item) => item.id === 'fl.cit_due_dates_2026')

    expect(base).toBeDefined()
    expect(source).toBeDefined()
    if (!base || !source) return

    const draft = inferDeterministicConcreteDraft({
      base,
      source,
      sourceText: FLORIDA_ESTIMATED_SOURCE_TEXT,
    })

    expect(draft?.sourceExcerpt).toBe(
      [
        'Taxable Year End Installment #1 Installment #2 Installment #3 Installment #4',
        '12/31/26 06/01/26 06/30/26 09/30/26 12/31/26',
      ].join('\n'),
    )
    expect(draft?.dueDateLogic).toEqual({
      kind: 'period_table',
      frequency: 'quarterly',
      periods: [
        { period: 'Period 1', dueDate: '2026-06-01' },
        { period: 'Period 2', dueDate: '2026-06-30' },
        { period: 'Period 3', dueDate: '2026-09-30' },
        { period: 'Period 4', dueDate: '2026-12-31' },
      ],
      holidayRollover: 'source_adjusted',
    })
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
})
