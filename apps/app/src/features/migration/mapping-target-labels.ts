import { useLingui } from '@lingui/react/macro'

import type { MappingTarget, MigrationError } from '@duedatehq/contracts'

export const SELECTABLE_MAPPING_TARGETS = [
  'client.name',
  'client.ein',
  'client.external_client_id',
  'client.state',
  'client.filing_states',
  'client.county',
  'client.address_line_1',
  'client.city',
  'client.postal_code',
  'client.entity_type',
  'client.tax_types',
  'client.tax_year_type',
  'client.fiscal_year_end',
  'client.email',
  'client.primary_contact_name',
  'client.primary_contact_email',
  'client.assignee_name',
  'client.primary_phone',
  'client.source_status',
  'client.estimated_tax_liability',
  'client.equity_owner_count',
  'penalty.tax_due',
  'penalty.payments_and_credits',
  'penalty.filing_frequency',
  'penalty.period_start',
  'penalty.period_end',
  'penalty.installments',
  'penalty.member_count',
  'penalty.partner_count',
  'penalty.shareholder_count',
  'penalty.gross_receipts',
  'penalty.receipts_band',
  'penalty.annual_report_no_tax_due',
  'penalty.wa_subtotal_minus_credits',
  'penalty.tx_prior_year_franchise_tax',
  'penalty.tx_current_year_franchise_tax',
  'penalty.fl_tentative_tax',
  'penalty.ny_ptet_election_made',
  'penalty.ny_ptet_payments',
  'penalty.withholding_report_count',
  'penalty.ui_wage_report_count',
  'client.notes',
] satisfies ReadonlyArray<MappingTarget>
export type SelectableMappingTarget = (typeof SELECTABLE_MAPPING_TARGETS)[number]

export type MappingTargetLabels = Record<MappingTarget, string>

export function useMappingTargetLabels(): MappingTargetLabels {
  const { t } = useLingui()

  return {
    'client.name': t`Client name`,
    'client.ein': t`EIN`,
    'client.external_client_id': t`External client ID`,
    'client.state': t`State`,
    'client.filing_states': t`Filing states`,
    'client.county': t`County`,
    'client.address_line_1': t`Address line 1`,
    'client.city': t`City`,
    'client.postal_code': t`ZIP / postal code`,
    'client.entity_type': t`Entity type`,
    'client.tax_types': t`Tax types`,
    'client.tax_year_type': t`Tax year type`,
    'client.fiscal_year_end': t`Fiscal year end`,
    'client.email': t`Email`,
    'client.primary_contact_name': t`Primary contact name`,
    'client.primary_contact_email': t`Primary contact email`,
    'client.assignee_name': t`Assignee`,
    'client.primary_phone': t`Primary phone`,
    'client.source_status': t`Source status`,
    'client.estimated_tax_liability': t`Estimated tax liability`,
    'client.equity_owner_count': t`Owner count`,
    'penalty.tax_due': t`Penalty tax due`,
    'penalty.payments_and_credits': t`Payments and credits`,
    'penalty.filing_frequency': t`Filing frequency`,
    'penalty.period_start': t`Period start`,
    'penalty.period_end': t`Period end`,
    'penalty.installments': t`Installments`,
    'penalty.member_count': t`Member count`,
    'penalty.partner_count': t`Partner count`,
    'penalty.shareholder_count': t`Shareholder count`,
    'penalty.gross_receipts': t`Gross receipts`,
    'penalty.receipts_band': t`Receipts band`,
    'penalty.annual_report_no_tax_due': t`Annual report no-tax-due flag`,
    'penalty.wa_subtotal_minus_credits': t`WA subtotal minus credits`,
    'penalty.tx_prior_year_franchise_tax': t`TX prior-year franchise tax`,
    'penalty.tx_current_year_franchise_tax': t`TX current-year franchise tax`,
    'penalty.fl_tentative_tax': t`FL tentative tax`,
    'penalty.ny_ptet_election_made': t`NY PTET election made`,
    'penalty.ny_ptet_payments': t`NY PTET payments`,
    'penalty.withholding_report_count': t`Withholding report count`,
    'penalty.ui_wage_report_count': t`UI wage report count`,
    'client.notes': t`Notes`,
    IGNORE: t`Ignore this column`,
  }
}

export function formatMigrationErrorMessage(
  error: Pick<MigrationError, 'errorCode' | 'errorMessage'>,
  labels: MappingTargetLabels,
) {
  if (error.errorCode === 'EMPTY_NAME') {
    return 'Row is missing a client name value.'
  }
  if (error.errorCode === 'EIN_INVALID') {
    return 'The EIN does not match the expected ##-####### format.'
  }
  if (error.errorCode === 'STATE_FORMAT') {
    return 'The state should be a two-letter US state code.'
  }
  if (error.errorCode === 'ENTITY_ENUM') {
    return "We couldn't recognize the entity type. Review the mapped entity type before import."
  }

  return replaceInternalTargetNames(error.errorMessage, labels)
}

export function getAlphabetizedMappingTargets(
  labels: MappingTargetLabels,
): SelectableMappingTarget[] {
  return SELECTABLE_MAPPING_TARGETS.toSorted((a, b) => {
    const byLabel = labels[a].localeCompare(labels[b], undefined, {
      sensitivity: 'base',
      numeric: true,
    })
    return byLabel === 0 ? a.localeCompare(b) : byLabel
  })
}

function replaceInternalTargetNames(message: string, labels: MappingTargetLabels) {
  let next = message
  for (const target of SELECTABLE_MAPPING_TARGETS) {
    next = next.replaceAll(target, labels[target])
  }
  return next
}
