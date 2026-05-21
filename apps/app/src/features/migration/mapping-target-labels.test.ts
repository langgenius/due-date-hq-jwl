import { describe, expect, it } from 'vitest'

import type { MappingTargetLabels } from './mapping-target-labels'
import { getAlphabetizedMappingTargets } from './mapping-target-labels'

const labels: MappingTargetLabels = {
  'client.name': 'Client name',
  'client.ein': 'EIN',
  'client.state': 'State',
  'client.filing_states': 'Filing states',
  'client.county': 'County',
  'client.entity_type': 'Entity type',
  'client.tax_types': 'Tax types',
  'client.tax_year_type': 'Tax year type',
  'client.fiscal_year_end': 'Fiscal year end',
  'client.email': 'Email',
  'client.primary_contact_name': 'Primary contact name',
  'client.primary_contact_email': 'Primary contact email',
  'client.assignee_name': 'Assignee',
  'client.estimated_tax_liability': 'Estimated tax liability',
  'client.equity_owner_count': 'Owner count',
  'penalty.tax_due': 'Penalty tax due',
  'penalty.payments_and_credits': 'Payments and credits',
  'penalty.filing_frequency': 'Filing frequency',
  'penalty.period_start': 'Period start',
  'penalty.period_end': 'Period end',
  'penalty.installments': 'Installments',
  'penalty.member_count': 'Member count',
  'penalty.partner_count': 'Partner count',
  'penalty.shareholder_count': 'Shareholder count',
  'penalty.gross_receipts': 'Gross receipts',
  'penalty.receipts_band': 'Receipts band',
  'penalty.annual_report_no_tax_due': 'Annual report no-tax-due flag',
  'penalty.wa_subtotal_minus_credits': 'WA subtotal minus credits',
  'penalty.tx_prior_year_franchise_tax': 'TX prior-year franchise tax',
  'penalty.tx_current_year_franchise_tax': 'TX current-year franchise tax',
  'penalty.fl_tentative_tax': 'FL tentative tax',
  'penalty.ny_ptet_election_made': 'NY PTET election made',
  'penalty.ny_ptet_payments': 'NY PTET payments',
  'penalty.withholding_report_count': 'Withholding report count',
  'penalty.ui_wage_report_count': 'UI wage report count',
  'client.notes': 'Notes',
  IGNORE: 'Ignore this column',
}

describe('getAlphabetizedMappingTargets', () => {
  it('orders edit-menu mapping targets by the visible label', () => {
    const sortedLabels = getAlphabetizedMappingTargets(labels).map((target) => labels[target])

    expect(sortedLabels).toEqual(
      sortedLabels.toSorted((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true }),
      ),
    )
    expect(sortedLabels[0]).toBe('Annual report no-tax-due flag')
    expect(sortedLabels).not.toContain('Ignore this column')
  })
})
