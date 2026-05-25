import { describe, expect, it } from 'vitest'
import { listObligationRules } from '@duedatehq/core/rules'

import {
  DEADLINE_CATEGORY_SUGGESTIONS,
  listDeadlineCategorySuggestions,
  resolveDeadlineCategoryForInput,
  type DeadlineCategoryGenerationStatus,
} from './deadline-category-suggestions'

const RAW_TECHNICAL_COPY_RE = /\b(?:federal|ca|ny|tx|wa)_[a-z0-9_]+\b|\btaxType\b|\bformName\b/i
const STATE_SPECIFIC_COPY_RE = /\b(?:California|New York|Texas|Washington)\b/i

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
    expect(labels).not.toContain('LLC annual/minimum tax payment')
    expect(labels).not.toContain('LLC income/franchise return')
    expect(labels).not.toContain('Schedule K-1 dependency')
  })

  it('resolves broad categories to canonical tax types from jurisdiction at submit time', () => {
    expect(
      resolveDeadlineCategoryForInput({
        value: 's_corporation_income_tax_return',
        jurisdiction: 'CA',
        formName: 'Form 1120-S',
      }),
    ).toEqual({ taxType: 'ca_100s', formName: 'Form 100S' })
    expect(
      resolveDeadlineCategoryForInput({
        value: 'trust_estate_income_tax_return',
        jurisdiction: 'NY',
        formName: 'Form 1041',
      }),
    ).toEqual({ taxType: 'ny_it205', formName: 'Form IT-205' })
  })
})
