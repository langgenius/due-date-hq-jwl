import { describe, expect, it } from 'vitest'
import type { RuleCoverageRow } from '@duedatehq/contracts'

import { aggregateRuleLibraryPendingCount } from './app-shell-nav-model'

function coverageRow(input: {
  jurisdiction: RuleCoverageRow['jurisdiction']
  candidateCount: number
  pendingReviewCount?: number
}): RuleCoverageRow {
  return {
    jurisdiction: input.jurisdiction,
    sourceCount: 1,
    verifiedRuleCount: 0,
    candidateCount: input.candidateCount,
    highPrioritySourceCount: 0,
    missingSourceCount: 0,
    requiredSourceCount: 0,
    sourceCoverageStatus: 'rule_pending_review',
    ...(input.pendingReviewCount === undefined
      ? {}
      : { pendingReviewCount: input.pendingReviewCount }),
    entityCoverage: {
      llc: 'none',
      partnership: 'none',
      s_corp: 'none',
      c_corp: 'none',
      sole_prop: 'none',
      individual: 'none',
      trust: 'none',
    },
    entitySourceCoverage: {
      llc: 'not_applicable',
      partnership: 'not_applicable',
      s_corp: 'not_applicable',
      c_corp: 'not_applicable',
      sole_prop: 'not_applicable',
      individual: 'not_applicable',
      trust: 'not_applicable',
    },
  }
}

describe('aggregateRuleLibraryPendingCount', () => {
  it('uses pendingReviewCount without adding the legacy candidateCount alias', () => {
    expect(
      aggregateRuleLibraryPendingCount([
        coverageRow({ jurisdiction: 'CA', candidateCount: 12, pendingReviewCount: 12 }),
        coverageRow({ jurisdiction: 'NY', candidateCount: 4, pendingReviewCount: 4 }),
      ]),
    ).toBe(16)
  })

  it('falls back to candidateCount for older coverage payloads', () => {
    expect(
      aggregateRuleLibraryPendingCount([coverageRow({ jurisdiction: 'TX', candidateCount: 7 })]),
    ).toBe(7)
  })
})
