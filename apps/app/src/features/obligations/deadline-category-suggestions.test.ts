import { describe, expect, it } from 'vitest'
import { listObligationRules } from '@duedatehq/core/rules'

import {
  DEADLINE_CATEGORY_SUGGESTIONS,
  isDeadlineCategoryDefaultFormName,
  isTaxTypeCoveredByDeadlineCategories,
  listDeadlineCategorySuggestions,
  listFormVoucherSuggestionsForInput,
  preferredDeadlineCategoryFormName,
  resolveDeadlineCategoryForInput,
  type DeadlineCategoryGenerationStatus,
} from './deadline-category-suggestions'

const RAW_TECHNICAL_COPY_RE = /\b(?:federal|ca|ny|tx|wa)_[a-z0-9_]+\b|\btaxType\b|\bformName\b/i
const STATE_SPECIFIC_COPY_RE = /\b(?:California|New York|Texas|Washington)\b/i

function candidateTaxTypes(input: {
  value: string
  jurisdiction: string
  formName?: string
}): readonly string[] {
  return resolveDeadlineCategoryForInput({
    value: input.value,
    jurisdiction: input.jurisdiction,
    formName: input.formName ?? '',
  }).candidates.map((candidate) => candidate.taxType)
}

function formSuggestionValues(input: { value: string; jurisdiction: string }): readonly string[] {
  return listFormVoucherSuggestionsForInput(input).map((option) => option.value)
}

describe('deadline category suggestions', () => {
  it('keeps every visible category label free of raw technical codes', () => {
    for (const option of DEADLINE_CATEGORY_SUGGESTIONS) {
      expect(option.label).not.toMatch(RAW_TECHNICAL_COPY_RE)
      expect(option.description).not.toMatch(RAW_TECHNICAL_COPY_RE)
      expect(option.label).not.toMatch(STATE_SPECIFIC_COPY_RE)
      expect(option.description).not.toMatch(STATE_SPECIFIC_COPY_RE)
    }
  })

  it('keeps category labels unique and broad', () => {
    const labels = DEADLINE_CATEGORY_SUGGESTIONS.map((option) => option.label)
    expect(new Set(labels).size).toBe(labels.length)
    expect(labels).not.toContain('LLC annual/minimum tax payment')
    expect(labels).not.toContain('LLC income/franchise return')
    expect(labels).not.toContain('LLC/partnership annual filing fee')
    expect(labels).not.toContain('Schedule K-1 dependency')
  })

  it('classifies every dropdown category with an explicit generation status', () => {
    const statuses = new Set<DeadlineCategoryGenerationStatus>([
      'rule_backed',
      'rule_review_required',
    ])

    for (const option of DEADLINE_CATEGORY_SUGGESTIONS) {
      expect(statuses.has(option.generationStatus)).toBe(true)
    }
  })

  it('marks rule-backed categories only when a concrete verified rule exists', () => {
    const concreteTaxTypes = new Set(
      listObligationRules({ includeCandidates: true })
        .filter((rule) => rule.status === 'verified')
        .filter((rule) => rule.dueDateLogic.kind !== 'source_defined_calendar')
        .map((rule) => rule.taxType),
    )

    for (const option of DEADLINE_CATEGORY_SUGGESTIONS) {
      if (option.generationStatus !== 'rule_backed') continue
      const mappedTaxTypes = Object.values(
        option.taxTypesByJurisdiction ?? { default: option.value },
      )
      expect(
        mappedTaxTypes.some((taxType) => concreteTaxTypes.has(taxType)),
        option.label,
      ).toBe(true)
    }
  })

  it('returns one flat sorted list of broad tax workflow categories', () => {
    const labels = listDeadlineCategorySuggestions().map((option) => option.label)

    expect(labels).toContain('Partnership income tax return')
    expect(labels).toContain('S corporation income tax return')
    expect(labels).toContain('Trust and estate income tax return')
    expect(labels).toContain('Business return extension')
    expect(labels).toContain('Franchise or annual tax payment')
    expect(labels).toContain('Nonprofit annual return')
    expect(labels).toContain('Business estimated tax payment')
    expect(labels).toContain('Employer annual FUTA return')
    expect(labels).toContain('Wage statements')
    expect(labels).toContain('Miscellaneous information returns')
    expect(labels).toContain('State payroll withholding return')
    expect(labels).toContain('State unemployment wage report')
    expect(labels).toContain('Gift tax return')
    expect(labels).toContain('Employee benefit plan return')
    expect(labels).not.toContain('LLC annual/minimum tax payment')
    expect(labels).not.toContain('LLC income/franchise return')
    expect(labels).not.toContain('Schedule K-1 dependency')
  })

  it('resolves the payroll and business-payment categories to rule tax types', () => {
    expect(
      candidateTaxTypes({ value: 'employer_annual_payroll_return', jurisdiction: 'FED' }),
    ).toEqual(['federal_940'])
    expect(candidateTaxTypes({ value: 'wage_statement_filing', jurisdiction: 'FED' })).toEqual([
      'federal_w2_w3',
    ])
    expect(candidateTaxTypes({ value: 'information_returns_misc', jurisdiction: 'FED' })).toEqual([
      'federal_1099_misc',
    ])
    expect(candidateTaxTypes({ value: 'gift_tax_return', jurisdiction: 'FED' })).toEqual([
      'federal_709',
    ])
    expect(
      candidateTaxTypes({ value: 'employee_benefit_plan_return', jurisdiction: 'FED' }),
    ).toEqual(['federal_5500'])
    expect(candidateTaxTypes({ value: 'nonprofit_annual_return', jurisdiction: 'FED' })).toEqual([
      'federal_990',
    ])
    expect(
      candidateTaxTypes({ value: 'business_estimated_tax_payment', jurisdiction: 'FED' }),
    ).toEqual(['federal_1120_estimated_tax'])
    expect(
      candidateTaxTypes({ value: 'business_estimated_tax_payment', jurisdiction: 'CA' }),
    ).toEqual(['ca_state_business_estimated_tax'])
    expect(
      candidateTaxTypes({ value: 'state_payroll_withholding_return', jurisdiction: 'CA' }),
    ).toEqual(['ca_state_withholding_tax'])
    expect(
      candidateTaxTypes({ value: 'state_unemployment_wage_report', jurisdiction: 'NY' }),
    ).toEqual(['ny_state_ui_wage_report'])
  })

  it('reports which rule tax types the static categories already reach', () => {
    expect(isTaxTypeCoveredByDeadlineCategories('federal_1040')).toBe(true)
    expect(isTaxTypeCoveredByDeadlineCategories('federal_940')).toBe(true)
    expect(isTaxTypeCoveredByDeadlineCategories('ca_state_individual_income_tax')).toBe(true)
    expect(isTaxTypeCoveredByDeadlineCategories('az_state_withholding_tax')).toBe(true)
    expect(isTaxTypeCoveredByDeadlineCategories('ca_100')).toBe(true)
    expect(isTaxTypeCoveredByDeadlineCategories('ny_ptet_election')).toBe(false)
    expect(isTaxTypeCoveredByDeadlineCategories('ca_llc_568')).toBe(false)
    expect(isTaxTypeCoveredByDeadlineCategories('federal_disaster_relief')).toBe(false)
  })

  it('resolves broad categories to jurisdiction-first rule candidates at submit time', () => {
    expect(
      resolveDeadlineCategoryForInput({
        value: 'individual_income_tax_return',
        jurisdiction: 'FED',
        formName: 'Form 1040',
      }),
    ).toMatchObject({
      normalizedJurisdiction: 'FED',
      customFormName: null,
      candidates: [
        {
          taxType: 'federal_1040',
          formName: 'Form 1040',
          matchFormName: null,
          source: 'explicit',
        },
      ],
    })
    expect(
      resolveDeadlineCategoryForInput({
        value: 'individual_income_tax_return',
        jurisdiction: 'CA',
        formName: 'Form 1040',
      }),
    ).toMatchObject({
      normalizedJurisdiction: 'CA',
      customFormName: null,
      candidates: [
        {
          taxType: 'ca_state_individual_income_tax',
          formName: 'State individual income tax return',
          matchFormName: null,
          source: 'state_generic',
        },
      ],
    })
    expect(
      candidateTaxTypes({
        value: 'individual_income_tax_return',
        jurisdiction: 'AZ',
        formName: 'Form 1040',
      }),
    ).toEqual(['az_state_individual_income_tax'])
  })

  it('keeps explicit state mappings before generic state fallbacks', () => {
    expect(
      candidateTaxTypes({
        value: 'trust_estate_income_tax_return',
        jurisdiction: 'CA',
        formName: 'Form 1041',
      }),
    ).toEqual(['ca_541', 'ca_state_fiduciary_income_tax'])
    expect(
      candidateTaxTypes({
        value: 'partnership_income_tax_return',
        jurisdiction: 'NY',
        formName: 'Form 1065',
      }),
    ).toEqual(['ny_it204', 'ny_state_pte_composite_ptet', 'ny_state_business_income_tax'])
    expect(
      candidateTaxTypes({
        value: 's_corporation_income_tax_return',
        jurisdiction: 'CO',
        formName: 'Form 1120-S',
      }),
    ).toEqual(['co_state_business_income_tax', 'co_state_pte_composite_ptet'])
  })

  it('does not fallback to federal rules when the user selects a state jurisdiction', () => {
    expect(
      resolveDeadlineCategoryForInput({
        value: 'individual_return_extension',
        jurisdiction: 'CA',
        formName: 'Form 4868',
      }).candidates,
    ).toEqual([])
  })

  it('uses default form names as hints and custom form names as filters', () => {
    expect(
      preferredDeadlineCategoryFormName({
        value: 'individual_income_tax_return',
        jurisdiction: 'CA',
      }),
    ).toBe('State individual income tax return')
    expect(
      isDeadlineCategoryDefaultFormName({
        value: 'individual_income_tax_return',
        formName: 'Form 1040',
      }),
    ).toBe(true)
    expect(
      isDeadlineCategoryDefaultFormName({
        value: 'individual_income_tax_return',
        formName: 'State individual income tax return',
      }),
    ).toBe(true)
    expect(
      resolveDeadlineCategoryForInput({
        value: 'individual_income_tax_return',
        jurisdiction: 'CA',
        formName: 'Form 540',
      }).candidates,
    ).toMatchObject([
      {
        taxType: 'ca_state_individual_income_tax',
        formName: 'Form 540',
        matchFormName: 'Form 540',
      },
    ])
  })

  it('keeps federal anchor forms in the category form suggestions for state work', () => {
    expect(
      formSuggestionValues({
        value: 'individual_income_tax_return',
        jurisdiction: 'AK',
      }),
    ).toEqual(['State individual income tax return', 'Form 1040'])
    expect(
      formSuggestionValues({
        value: 's_corporation_income_tax_return',
        jurisdiction: 'CA',
      }),
    ).toEqual([
      'Form 100S',
      'State business income return',
      'State pass-through entity return',
      'Form 1120-S',
    ])
  })
})
