import { describe, expect, it } from 'vitest'

import {
  buildDeadlineCategorySuggestions,
  DEADLINE_CATEGORY_SUGGESTIONS,
  type DeadlineCategoryClientContext,
} from './deadline-category-suggestions'

const RAW_TECHNICAL_COPY_RE = /\b(?:federal|ca|ny|tx|wa)_[a-z0-9_]+\b|\btaxType\b|\bformName\b/i

function client(
  overrides: Partial<DeadlineCategoryClientContext> = {},
): DeadlineCategoryClientContext {
  return {
    entityType: 'llc',
    state: 'CA',
    taxClassification: 'unknown',
    hasPayroll: false,
    has1099Vendors: false,
    hasForeignAccounts: false,
    hasK1Activity: false,
    filingProfiles: [],
    ...overrides,
  }
}

describe('deadline category suggestions', () => {
  it('keeps every visible category label free of raw technical codes', () => {
    for (const option of DEADLINE_CATEGORY_SUGGESTIONS) {
      expect(option.label).not.toMatch(RAW_TECHNICAL_COPY_RE)
      expect(option.description).not.toMatch(RAW_TECHNICAL_COPY_RE)
    }
  })

  it('recommends trust-friendly deadlines before generic business categories', () => {
    const groups = buildDeadlineCategorySuggestions(
      client({ entityType: 'trust', state: 'CA', hasK1Activity: true }),
    )

    expect(groups.recommended.slice(0, 3).map((option) => option.label)).toEqual([
      'Trust and estate income tax return',
      'Business return extension',
      'Schedule K-1 dependency',
    ])
  })

  it('recommends S corporation income tax return for S corp clients', () => {
    const groups = buildDeadlineCategorySuggestions(client({ entityType: 's_corp', state: 'NY' }))

    expect(groups.recommended[0]?.label).toBe('S corporation income tax return')
    expect(groups.recommended.map((option) => option.label)).toContain(
      'New York S corporation franchise tax return',
    )
  })

  it('recommends California LLC annual tax and return for California LLCs', () => {
    const groups = buildDeadlineCategorySuggestions(client({ entityType: 'llc', state: 'CA' }))
    const labels = groups.recommended.map((option) => option.label)

    expect(labels).toContain('California LLC annual tax')
    expect(labels).toContain('California LLC return')
  })
})
