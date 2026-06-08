import { describe, expect, it } from 'vitest'
import type { TaxArea } from '@duedatehq/contracts'
import {
  isTaxAreaFilter,
  matchesChangeKindFilter,
  matchesTaxAreaFilter,
  TAX_AREA_FILTER_OPTIONS,
} from './alert-filters'

describe('matchesChangeKindFilter', () => {
  it('groups protective claim windows with timing filters', () => {
    expect(matchesChangeKindFilter('protective_claim_window', 'deadlines')).toBe(true)
    expect(matchesChangeKindFilter('protective_claim_window', 'rules')).toBe(false)
  })
})

describe('matchesTaxAreaFilter', () => {
  it('keeps everything under "all", including uncategorized alerts', () => {
    expect(matchesTaxAreaFilter([], 'all')).toBe(true)
    expect(matchesTaxAreaFilter(['income_individual'], 'all')).toBe(true)
  })

  it('keeps an alert only when its taxAreas include the selected bucket', () => {
    expect(matchesTaxAreaFilter(['income_individual'], 'income_individual')).toBe(true)
    expect(matchesTaxAreaFilter(['income_business'], 'income_individual')).toBe(false)
  })

  it('matches a multi-area alert under any of its buckets', () => {
    const areas: TaxArea[] = ['income_individual', 'income_business']
    expect(matchesTaxAreaFilter(areas, 'income_individual')).toBe(true)
    expect(matchesTaxAreaFilter(areas, 'income_business')).toBe(true)
    expect(matchesTaxAreaFilter(areas, 'sales_use')).toBe(false)
  })

  it('hides uncategorized (empty) alerts under a specific bucket', () => {
    expect(matchesTaxAreaFilter([], 'franchise')).toBe(false)
  })
})

describe('isTaxAreaFilter', () => {
  it('accepts every filter option', () => {
    for (const option of TAX_AREA_FILTER_OPTIONS) {
      expect(isTaxAreaFilter(option)).toBe(true)
    }
  })

  it('rejects values outside the option set', () => {
    expect(isTaxAreaFilter('nonsense')).toBe(false)
    expect(isTaxAreaFilter('income')).toBe(false)
    expect(isTaxAreaFilter('')).toBe(false)
  })
})
