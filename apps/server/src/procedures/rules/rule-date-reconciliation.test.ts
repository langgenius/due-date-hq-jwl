import { describe, expect, it } from 'vitest'
import { findRuleDateReconciliationIssues, type ReconcilableRule } from './rule-date-reconciliation'

function rule(overrides: Partial<ReconcilableRule> = {}): ReconcilableRule {
  return {
    id: 'fed.test.2026',
    status: 'verified',
    applicableYear: 2026,
    dueDateLogic: { kind: 'fixed_date', date: '2026-04-15', holidayRollover: 'next_business_day' },
    evidence: [{ authorityRole: 'basis', sourceExcerpt: 'Returns are due April 15, 2026.' }],
    ...overrides,
  }
}

describe('findRuleDateReconciliationIssues (gap #5)', () => {
  it('passes a current verified rule whose date matches its cited excerpt', () => {
    expect(findRuleDateReconciliationIssues({ rules: [rule()], currentYear: 2026 })).toEqual([])
  })

  it('flags a verified rule whose filing year is already in the past', () => {
    const issues = findRuleDateReconciliationIssues({
      rules: [rule({ id: 'fed.1040.2025', applicableYear: 2025 })],
      currentYear: 2026,
    })
    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatchObject({ ruleId: 'fed.1040.2025', kind: 'stale_applicable_year' })
  })

  it('flags a fixed_date that contradicts its cited excerpt', () => {
    const issues = findRuleDateReconciliationIssues({
      rules: [
        rule({
          dueDateLogic: {
            kind: 'fixed_date',
            date: '2026-03-15',
            holidayRollover: 'next_business_day',
          },
          evidence: [{ authorityRole: 'basis', sourceExcerpt: 'Returns are due April 15, 2026.' }],
        }),
      ],
      currentYear: 2026,
    })
    expect(issues).toHaveLength(1)
    expect(issues[0]?.kind).toBe('date_excerpt_mismatch')
  })

  it('does NOT flag a source-adjusted date that is the excerpt date shifted over a weekend (Jan 31 -> Feb 2, 2026)', () => {
    // Mirrors the real fed.1099_nec rule: the IRS source itself publishes the observed Feb 2 date
    // (holidayRollover 'source_adjusted'), while the cited excerpt quotes the statutory "January 31".
    const issues = findRuleDateReconciliationIssues({
      rules: [
        rule({
          id: 'fed.1099_nec.2025',
          dueDateLogic: {
            kind: 'fixed_date',
            date: '2026-02-02',
            holidayRollover: 'source_adjusted',
          },
          evidence: [
            { authorityRole: 'basis', sourceExcerpt: 'File Form 1099-NEC by January 31, 2026.' },
          ],
        }),
      ],
      currentYear: 2026,
    })
    expect(issues).toEqual([])
  })

  it('abstains when the basis excerpt carries no machine-readable date', () => {
    const issues = findRuleDateReconciliationIssues({
      rules: [
        rule({
          evidence: [
            {
              authorityRole: 'basis',
              sourceExcerpt: 'Due on the fifteenth day of the fourth month.',
            },
          ],
        }),
      ],
      currentYear: 2026,
    })
    expect(issues).toEqual([])
  })

  it('skips relative / source_defined logic (no literal date to reconcile)', () => {
    const issues = findRuleDateReconciliationIssues({
      rules: [
        rule({
          applicableYear: 2025,
          dueDateLogic: {
            kind: 'nth_day_after_tax_year_end',
            monthOffset: 4,
            day: 15,
            holidayRollover: 'next_business_day',
          },
        }),
      ],
      currentYear: 2026,
    })
    expect(issues).toEqual([])
  })

  it('skips non-verified rules', () => {
    const issues = findRuleDateReconciliationIssues({
      rules: [rule({ status: 'candidate', applicableYear: 2025 })],
      currentYear: 2026,
    })
    expect(issues).toEqual([])
  })
})
