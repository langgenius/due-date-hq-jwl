import { describe, expect, it } from 'vitest'

import {
  COVERAGE_ENTITY_GROUPS,
  ENTITY_COLUMN_GROUPS,
  countSourcesByHealth,
  DEFAULT_PREVIEW_TAX_YEAR,
  filterSources,
  groupPreviewRows,
  humanizeDueDateLogic,
  previewTaxYearFromObligations,
  previewTaxYearFromFormDates,
  previewTaxYearToFormDates,
  previewFormValuesForClient,
  previewFormToInput,
  previewTaxTypesFromObligations,
} from './rules-console-model'

describe('rules console model', () => {
  it('defines coverage entity groups without exposing the manual other fallback', () => {
    expect(COVERAGE_ENTITY_GROUPS).toEqual(['business', 'personal', 'all'])
    expect(ENTITY_COLUMN_GROUPS.business).toEqual([
      'llc',
      'partnership',
      's_corp',
      'c_corp',
      'sole_prop',
    ])
    expect(ENTITY_COLUMN_GROUPS.personal).toEqual(['individual', 'trust'])
    expect(ENTITY_COLUMN_GROUPS.all).toEqual([
      'individual',
      'trust',
      'llc',
      'partnership',
      's_corp',
      'c_corp',
      'sole_prop',
    ])
    expect(ENTITY_COLUMN_GROUPS.all).not.toContain('other')
  })

  it('converts preview form values into contract input', () => {
    const values = previewFormValuesForClient({
      client: {
        id: 'cli_real_acme',
        entityType: 'llc',
        taxClassification: 'partnership',
        state: 'CA',
      },
      taxTypes: ['federal_1065_or_1040', 'ca_llc_franchise_min_800', 'ca_llc_fee_gross_receipts'],
      taxYear: 2025,
    })

    expect(previewFormToInput(values)).toEqual({
      client: {
        id: 'cli_real_acme',
        entityType: 'llc',
        taxClassification: 'partnership',
        state: 'CA',
        taxTypes: ['federal_1065_or_1040', 'ca_llc_franchise_min_800', 'ca_llc_fee_gross_receipts'],
        taxYearStart: '2025-01-01',
        taxYearEnd: '2025-12-31',
      },
    })
  })

  it('derives preview tax types and tax year from existing obligations', () => {
    const obligations = [
      { taxType: 'federal_1120s', taxYear: 2025 },
      { taxType: 'ny_ct3s', taxYear: 2026 },
      { taxType: 'federal_1120s', taxYear: 2026 },
      { taxType: 'ny_ptet_optional', taxYear: null },
    ]

    expect(previewTaxTypesFromObligations(obligations)).toEqual([
      'federal_1120s',
      'ny_ct3s',
      'ny_ptet_optional',
    ])
    expect(previewTaxYearFromObligations(obligations)).toBe(2026)
    expect(previewTaxYearFromObligations([])).toBe(DEFAULT_PREVIEW_TAX_YEAR)
  })

  it('maps the preview tax year to rule-engine date inputs', () => {
    expect(
      previewTaxYearFromFormDates({
        taxYearStart: '2025-01-01',
        taxYearEnd: '2025-12-31',
      }),
    ).toBe(2025)
    expect(previewTaxYearFromFormDates({ taxYearStart: '', taxYearEnd: '2025-12-31' })).toBe(2025)
    expect(previewTaxYearToFormDates(2027)).toEqual({
      taxYearStart: '2027-01-01',
      taxYearEnd: '2027-12-31',
    })
  })

  it('derives source health counts without state drift', () => {
    const sources = [
      { id: 's1', healthStatus: 'healthy' },
      { id: 's2', healthStatus: 'degraded' },
      { id: 's3', healthStatus: 'paused' },
    ] as const

    expect(countSourcesByHealth(sources)).toMatchObject({
      all: 3,
      healthy: 2,
      paused: 1,
    })
    expect(filterSources(sources, 'healthy')).toHaveLength(2)
  })

  it('humanizes the five DueDateLogic kinds for the rule detail drawer', () => {
    expect(
      humanizeDueDateLogic({
        kind: 'fixed_date',
        date: '2026-05-15',
        holidayRollover: 'next_business_day',
      }),
    ).toBe('Fixed: 2026-05-15 · next business day rollover')

    expect(
      humanizeDueDateLogic({
        kind: 'nth_day_after_tax_year_end',
        monthOffset: 3,
        day: 15,
        holidayRollover: 'next_business_day',
      }),
    ).toBe('15th day of the 3rd month after tax year end · next business day rollover')

    expect(
      humanizeDueDateLogic({
        kind: 'nth_day_after_tax_year_begin',
        monthOffset: 4,
        day: 15,
        holidayRollover: 'next_business_day',
      }),
    ).toBe('15th day of the 4th month after tax year begin · next business day rollover')

    expect(
      humanizeDueDateLogic({
        kind: 'period_table',
        frequency: 'quarterly',
        periods: [
          { period: '2026-Q1', dueDate: '2026-04-30' },
          { period: '2026-Q2', dueDate: '2026-07-31' },
        ],
        holidayRollover: 'source_adjusted',
      }),
    ).toBe('quarterly schedule · 2 periods · source-adjusted rollover')

    expect(
      humanizeDueDateLogic({
        kind: 'source_defined_calendar',
        description: 'Notice-specific localities and postponed due dates.',
        holidayRollover: 'source_adjusted',
      }),
    ).toBe('Notice-specific localities and postponed due dates.')
  })

  it('groups preview rows by reminder readiness', () => {
    const rows = [
      { ruleId: 'ready', reminderReady: true, missingClientFacts: [] },
      { ruleId: 'review', reminderReady: false, missingClientFacts: [] },
      { ruleId: 'facts', reminderReady: false, missingClientFacts: ['fiscalYearEnd'] },
    ] as const

    expect(groupPreviewRows(rows).reminderReady.map((row) => row.ruleId)).toEqual(['ready'])
    expect(groupPreviewRows(rows).requiresReview.map((row) => row.ruleId)).toEqual(['review'])
    expect(groupPreviewRows(rows).needsClientFacts.map((row) => row.ruleId)).toEqual(['facts'])
  })
})
