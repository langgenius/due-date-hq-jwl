import { describe, expect, it } from 'vitest'
import { resolveClientReturnTaxPeriod, rollTaxPeriodForward } from './index'

describe('@duedatehq/core/tax-periods', () => {
  it('resolves calendar return periods from the return tax year', () => {
    expect(resolveClientReturnTaxPeriod({ taxYear: 2025 })).toEqual({
      taxPeriodStart: '2025-01-01',
      taxPeriodEnd: '2025-12-31',
      taxPeriodKind: 'calendar',
      taxPeriodSource: 'client_default',
      taxPeriodReviewReason: null,
    })
  })

  it('resolves fiscal return periods using the tax year beginning year', () => {
    expect(
      resolveClientReturnTaxPeriod({
        taxYear: 2025,
        client: {
          taxYearType: 'fiscal',
          fiscalYearEndMonth: 6,
          fiscalYearEndDay: 30,
        },
      }),
    ).toMatchObject({
      taxPeriodStart: '2025-07-01',
      taxPeriodEnd: '2026-06-30',
      taxPeriodKind: 'fiscal',
      taxPeriodSource: 'client_default',
    })
  })

  it('returns a review-only fiscal period when the fiscal year end is missing', () => {
    expect(
      resolveClientReturnTaxPeriod({
        taxYear: 2025,
        client: { taxYearType: 'fiscal', fiscalYearEndMonth: null, fiscalYearEndDay: null },
      }),
    ).toMatchObject({
      taxPeriodStart: null,
      taxPeriodEnd: null,
      taxPeriodKind: 'fiscal',
      taxPeriodReviewReason:
        'Fiscal-year client is missing a confirmed tax year end month and day.',
    })
  })

  it('rolls prior return periods forward without collapsing them to calendar years', () => {
    expect(
      rollTaxPeriodForward({
        taxPeriodStart: '2024-07-01',
        taxPeriodEnd: '2025-06-30',
      }),
    ).toEqual({
      taxPeriodStart: '2025-07-01',
      taxPeriodEnd: '2026-06-30',
      taxPeriodKind: 'fiscal',
    })
  })
})
