import { describe, expect, it } from 'vitest'

import type { ClassificationRecomputeRow } from '@duedatehq/contracts/clients'

import {
  currentTaxYearForDate,
  hasUnconfirmedCurrentTaxYearConfirmations,
} from './classification-impact-dialog-model'

function confirmationRow(overrides: Partial<ClassificationRecomputeRow> = {}) {
  return {
    disposition: 'orphan_needs_confirmation',
    obligationId: 'obligation_1',
    taxType: 'ny_ct3',
    formName: 'Form CT-3',
    jurisdiction: 'NY',
    taxYear: 2025,
    dueDate: '2025-03-15T00:00:00.000Z',
    workflowFlags: ['efile_in_progress'],
    ...overrides,
  } satisfies ClassificationRecomputeRow
}

describe('classification impact dialog model', () => {
  it('uses the prior calendar year as the current tax year', () => {
    expect(currentTaxYearForDate(new Date('2026-06-07T00:00:00.000Z'))).toBe(2025)
  })

  it('requires current-tax-year confirmation before applying', () => {
    const rows = [confirmationRow()]
    expect(
      hasUnconfirmedCurrentTaxYearConfirmations({
        rows,
        confirmedOrphanIds: new Set(),
        currentTaxYear: 2025,
      }),
    ).toBe(true)

    expect(
      hasUnconfirmedCurrentTaxYearConfirmations({
        rows,
        confirmedOrphanIds: new Set(['obligation_1']),
        currentTaxYear: 2025,
      }),
    ).toBe(false)
  })

  it('does not block apply for projected-only confirmations', () => {
    expect(
      hasUnconfirmedCurrentTaxYearConfirmations({
        rows: [confirmationRow({ taxYear: 2026 })],
        confirmedOrphanIds: new Set(),
        currentTaxYear: 2025,
      }),
    ).toBe(false)
  })

  it('does not let a projected confirmation satisfy an unconfirmed current-year row', () => {
    expect(
      hasUnconfirmedCurrentTaxYearConfirmations({
        rows: [
          confirmationRow({ obligationId: 'current_year', taxYear: 2025 }),
          confirmationRow({ obligationId: 'projected', taxYear: 2026 }),
        ],
        confirmedOrphanIds: new Set(['projected']),
        currentTaxYear: 2025,
      }),
    ).toBe(true)
  })
})
