import { describe, expect, it } from 'vitest'

import {
  CATALOG_RELEASE_MONTH_INDEX,
  detectNewCohort,
  expectedCatalogReleaseDate,
  MIN_NEW_COHORT_SIZE,
  substantialCohortYears,
} from './catalog-release'

function cohort(filingYear: number, count: number): Array<{ id: string; applicableYear: number }> {
  return Array.from({ length: count }, (_, index) => ({
    id: `r.${filingYear}.${index}`,
    applicableYear: filingYear,
  }))
}

describe('substantialCohortYears', () => {
  it('keeps years at or above the threshold, ascending', () => {
    const rules = [...cohort(2026, MIN_NEW_COHORT_SIZE), ...cohort(2025, MIN_NEW_COHORT_SIZE + 5)]
    expect(substantialCohortYears(rules)).toEqual([2025, 2026])
  })

  it('drops off-cycle years below the threshold', () => {
    const rules = [...cohort(2026, 40), ...cohort(2027, 1)]
    expect(substantialCohortYears(rules)).toEqual([2026])
  })
})

describe('detectNewCohort', () => {
  it('returns the newest substantial unreleased cohort', () => {
    const result = detectNewCohort({ rules: cohort(2026, 40), existingReleaseFilingYears: [] })
    expect(result?.filingYear).toBe(2026)
    expect(result?.newCohortRuleIds).toHaveLength(40)
  })

  it('ignores a lone off-cycle rule until its cohort is substantial', () => {
    const rules = [...cohort(2026, 40), ...cohort(2027, 1)]
    expect(detectNewCohort({ rules, existingReleaseFilingYears: [2026] })).toBeNull()
  })

  it('fires once the off-cycle year grows into a real cohort', () => {
    const rules = [...cohort(2026, 40), ...cohort(2027, 30)]
    const result = detectNewCohort({ rules, existingReleaseFilingYears: [2026] })
    expect(result?.filingYear).toBe(2027)
    expect(result?.newCohortRuleIds).toHaveLength(30)
  })

  it('returns null when every substantial cohort is already released', () => {
    const rules = [...cohort(2026, 40), ...cohort(2027, 30)]
    expect(detectNewCohort({ rules, existingReleaseFilingYears: [2026, 2027] })).toBeNull()
  })

  it('returns the newest when several substantial cohorts are unreleased', () => {
    const rules = [...cohort(2026, 40), ...cohort(2027, 30)]
    expect(detectNewCohort({ rules, existingReleaseFilingYears: [] })?.filingYear).toBe(2027)
  })
})

describe('expectedCatalogReleaseDate', () => {
  it('predicts the start of the prior year rollover season (UTC)', () => {
    const date = expectedCatalogReleaseDate(2027)
    expect(date.getUTCFullYear()).toBe(2026)
    expect(date.getUTCMonth()).toBe(CATALOG_RELEASE_MONTH_INDEX)
    expect(date.getUTCDate()).toBe(1)
    expect(date.toISOString()).toBe('2026-09-01T00:00:00.000Z')
  })
})
