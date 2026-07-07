import { describe, expect, it } from 'vitest'

import type { DueDateLogic, ObligationRule } from './index'
import {
  derivePredecessorRuleIdFromToken,
  diffObligationRules,
  isDateOnlyDueDateLogicChange,
  resolvePredecessorRuleId,
} from './rule-diff'

const BASE: ObligationRule = {
  id: 'fed.1040.return.2025',
  title: 'Form 1040',
  jurisdiction: 'FED',
  entityApplicability: ['individual'],
  taxType: 'fed_1040',
  formName: '1040',
  eventType: 'filing',
  isFiling: true,
  isPayment: false,
  taxYear: 2025,
  applicableYear: 2026,
  ruleTier: 'basic',
  status: 'verified',
  coverageStatus: 'full',
  riskLevel: 'low',
  requiresApplicabilityReview: false,
  dueDateLogic: { kind: 'fixed_date', date: '2026-04-15', holidayRollover: 'next_business_day' },
  extensionPolicy: { available: true, formName: '4868', paymentExtended: false, notes: '' },
  sourceIds: ['fed.irs_pub_509_2025'],
  evidence: [],
  defaultTip: '',
  quality: {
    filingPaymentDistinguished: true,
    extensionHandled: true,
    calendarFiscalSpecified: true,
    holidayRolloverHandled: true,
    crossVerified: true,
    exceptionChannel: true,
  },
  verifiedBy: 'system',
  verifiedAt: '2025-01-01',
  nextReviewOn: '2026-01-01',
  version: 1,
}

const makeRule = (overrides: Partial<ObligationRule> = {}): ObligationRule => ({
  ...BASE,
  ...overrides,
})

describe('diffObligationRules', () => {
  it('classifies a missing predecessor as new (review cold)', () => {
    const diff = diffObligationRules(null, makeRule())
    expect(diff.hasPredecessor).toBe(false)
    expect(diff.classification).toBe('new')
    expect(diff.fields).toHaveLength(0)
  })

  it('classifies an identical rule as date_only with no field changes', () => {
    const diff = diffObligationRules(makeRule(), makeRule())
    expect(diff.classification).toBe('date_only')
    expect(diff.fields).toHaveLength(0)
  })

  it('classifies a pure year/version/date refresh as date_only', () => {
    const next = makeRule({
      id: 'fed.1040.return.2026',
      taxYear: 2026,
      applicableYear: 2027,
      version: 2,
      verifiedAt: '2026-01-01',
      nextReviewOn: '2027-01-01',
      dueDateLogic: {
        kind: 'fixed_date',
        date: '2027-04-15',
        holidayRollover: 'next_business_day',
      },
    })
    const diff = diffObligationRules(makeRule(), next)
    expect(diff.classification).toBe('date_only')
    expect(diff.fields.every((field) => field.kind === 'date')).toBe(true)
    // dueDateLogic date move is classified date, not substantive
    expect(diff.fields.find((field) => field.field === 'dueDateLogic')?.kind).toBe('date')
  })

  it('flags a holiday-rollover policy change as substantive', () => {
    const next = makeRule({
      dueDateLogic: { kind: 'fixed_date', date: '2026-04-15', holidayRollover: 'source_adjusted' },
    })
    const diff = diffObligationRules(makeRule(), next)
    expect(diff.classification).toBe('substantive')
    expect(diff.fields.find((field) => field.field === 'dueDateLogic')?.kind).toBe('substantive')
  })

  it('flags a substantive logic field (formName) as substantive', () => {
    const diff = diffObligationRules(makeRule(), makeRule({ formName: '1040-SR' }))
    expect(diff.classification).toBe('substantive')
    expect(diff.fields).toHaveLength(1)
    expect(diff.fields[0]).toMatchObject({ field: 'formName', kind: 'substantive' })
  })

  it('flags an extension-policy change as substantive', () => {
    const diff = diffObligationRules(
      makeRule(),
      makeRule({
        extensionPolicy: { available: true, formName: '4868', paymentExtended: true, notes: '' },
      }),
    )
    expect(diff.classification).toBe('substantive')
  })

  it('treats entityApplicability reordering as no change, but a set change as substantive', () => {
    expect(
      diffObligationRules(
        makeRule({ entityApplicability: ['individual', 'trust'] }),
        makeRule({ entityApplicability: ['trust', 'individual'] }),
      ).fields,
    ).toHaveLength(0)

    const setChange = diffObligationRules(
      makeRule({ entityApplicability: ['individual'] }),
      makeRule({ entityApplicability: ['individual', 'trust'] }),
    )
    expect(setChange.classification).toBe('substantive')
  })
})

describe('isDateOnlyDueDateLogicChange', () => {
  const fixed = (
    date: string,
    rollover: 'source_adjusted' | 'next_business_day' = 'next_business_day',
  ): DueDateLogic => ({
    kind: 'fixed_date',
    date,
    holidayRollover: rollover,
  })

  it('fixed_date: date move is date-only, rollover change is substantive', () => {
    expect(isDateOnlyDueDateLogicChange(fixed('2026-04-15'), fixed('2027-04-15'))).toBe(true)
    expect(
      isDateOnlyDueDateLogicChange(fixed('2026-04-15'), fixed('2026-04-15', 'source_adjusted')),
    ).toBe(false)
  })

  it('different kind is always substantive', () => {
    expect(
      isDateOnlyDueDateLogicChange(fixed('2026-04-15'), {
        kind: 'nth_day_after_tax_year_end',
        monthOffset: 3,
        day: 15,
        holidayRollover: 'next_business_day',
      }),
    ).toBe(false)
  })

  it('nth_day offset/day change is substantive', () => {
    const a: DueDateLogic = {
      kind: 'nth_day_after_tax_year_end',
      monthOffset: 3,
      day: 15,
      holidayRollover: 'next_business_day',
    }
    const b: DueDateLogic = {
      kind: 'nth_day_after_tax_year_end',
      monthOffset: 4,
      day: 15,
      holidayRollover: 'next_business_day',
    }
    expect(isDateOnlyDueDateLogicChange(a, b)).toBe(false)
  })

  it('period_table: dueDate-only is date, added period / frequency change is substantive', () => {
    const base: DueDateLogic = {
      kind: 'period_table',
      frequency: 'quarterly',
      periods: [
        { period: 'Q1', dueDate: '2026-04-15' },
        { period: 'Q2', dueDate: '2026-06-15' },
      ],
      holidayRollover: 'source_adjusted',
    }
    const dateOnly: DueDateLogic = {
      kind: 'period_table',
      frequency: 'quarterly',
      periods: [
        { period: 'Q1', dueDate: '2027-04-15' },
        { period: 'Q2', dueDate: '2027-06-15' },
      ],
      holidayRollover: 'source_adjusted',
    }
    const added: DueDateLogic = {
      kind: 'period_table',
      frequency: 'quarterly',
      periods: [
        { period: 'Q1', dueDate: '2027-04-15' },
        { period: 'Q2', dueDate: '2027-06-15' },
        { period: 'Q3', dueDate: '2027-09-15' },
      ],
      holidayRollover: 'source_adjusted',
    }
    expect(isDateOnlyDueDateLogicChange(base, dateOnly)).toBe(true)
    expect(isDateOnlyDueDateLogicChange(base, added)).toBe(false)
    expect(isDateOnlyDueDateLogicChange(base, { ...base, frequency: 'monthly' })).toBe(false)
  })

  it('source_defined_calendar description change is substantive', () => {
    const a: DueDateLogic = {
      kind: 'source_defined_calendar',
      description: 'old',
      holidayRollover: 'source_adjusted',
    }
    const b: DueDateLogic = {
      kind: 'source_defined_calendar',
      description: 'new',
      holidayRollover: 'source_adjusted',
    }
    expect(isDateOnlyDueDateLogicChange(a, b)).toBe(false)
  })
})

describe('resolvePredecessorRuleId / derivePredecessorRuleIdFromToken', () => {
  it('returns the authored predecessor or null', () => {
    expect(resolvePredecessorRuleId({ predecessorRuleId: 'fed.1040.return.2024' })).toBe(
      'fed.1040.return.2024',
    )
    expect(resolvePredecessorRuleId({})).toBeNull()
  })

  it('derives the prior-year id by decrementing a single year token', () => {
    expect(derivePredecessorRuleIdFromToken('fed.1040.return.2025')).toBe('fed.1040.return.2024')
    expect(derivePredecessorRuleIdFromToken('nj.tax_calendar_2026')).toBe('nj.tax_calendar_2025')
    expect(derivePredecessorRuleIdFromToken('al.due_dates')).toBeNull()
  })
})
