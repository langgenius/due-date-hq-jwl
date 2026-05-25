import { describe, expect, it } from 'vitest'
import {
  generateReadinessDocumentChecklist,
  READINESS_DOCUMENT_TEMPLATE_CATALOG,
  selectReadinessDocumentTemplate,
} from './index'

function keysFor(taxType: string): string[] {
  return generateReadinessDocumentChecklist({ taxType }).map((item) => item.templateKey)
}

describe('readiness document checklist templates', () => {
  it('keeps every catalog template within the portal-size target', () => {
    expect(
      READINESS_DOCUMENT_TEMPLATE_CATALOG.map((template) => ({
        key: template.key,
        version: template.version,
        count: template.items.length,
      })),
    ).toEqual([
      { key: 'estimated_tax.payment_voucher', version: 1, count: 12 },
      { key: '1040.individual_return', version: 1, count: 14 },
      { key: '1120s.s_corporation_return', version: 1, count: 13 },
      { key: '1065.partnership_return', version: 1, count: 13 },
      { key: '1120.c_corporation_return', version: 1, count: 13 },
      { key: '1041.fiduciary_return', version: 1, count: 12 },
      { key: '941.payroll_return', version: 1, count: 12 },
      { key: '1099.information_return', version: 1, count: 12 },
      { key: 'foreign.fbar_and_international', version: 1, count: 12 },
      { key: '990.exempt_organization_return', version: 1, count: 12 },
      { key: 'sales_use.sales_tax_return', version: 1, count: 12 },
      { key: 'generic.fallback_readiness', version: 1, count: 12 },
    ])
  })

  it('freezes exact 1040 item keys and required organizer gaps', () => {
    expect(keysFor('federal_1040')).toEqual([
      '1040.individual_return.identity_and_prior_year',
      '1040.individual_return.w2_forms',
      '1040.individual_return.1099_income',
      '1040.individual_return.schedule_k1',
      '1040.individual_return.schedule_c',
      '1040.individual_return.schedule_e',
      '1040.individual_return.brokerage_crypto',
      '1040.individual_return.foreign_reporting',
      '1040.individual_return.estimated_payments',
      '1040.individual_return.deductions_credits',
      '1040.individual_return.health_insurance',
      '1040.individual_return.dependent_education_childcare',
      '1040.individual_return.state_local_facts',
      '1040.individual_return.signature_payment_authorization',
    ])
  })

  it('freezes exact 1065 item keys and required organizer gaps', () => {
    expect(keysFor('federal_1065')).toEqual([
      '1065.partnership_return.partnership_agreement',
      '1065.partnership_return.partner_list',
      '1065.partnership_return.ownership_changes',
      '1065.partnership_return.capital_accounts',
      '1065.partnership_return.books_trial_balance',
      '1065.partnership_return.general_ledger',
      '1065.partnership_return.bank_loan_reconciliations',
      '1065.partnership_return.fixed_assets',
      '1065.partnership_return.income_expense_detail',
      '1065.partnership_return.guaranteed_payments',
      '1065.partnership_return.allocations',
      '1065.partnership_return.state_apportionment',
      '1065.partnership_return.k1_delivery',
    ])
  })

  it('freezes exact 1120 item keys and required organizer gaps', () => {
    expect(keysFor('federal_1120')).toEqual([
      '1120.c_corporation_return.corporate_books',
      '1120.c_corporation_return.general_ledger',
      '1120.c_corporation_return.balance_sheet_support',
      '1120.c_corporation_return.cogs_inventory',
      '1120.c_corporation_return.officer_compensation',
      '1120.c_corporation_return.fixed_assets',
      '1120.c_corporation_return.income_expense_detail',
      '1120.c_corporation_return.estimated_payments',
      '1120.c_corporation_return.state_apportionment',
      '1120.c_corporation_return.ownership_equity',
      '1120.c_corporation_return.tax_credits_nols',
      '1120.c_corporation_return.related_party_intercompany',
      '1120.c_corporation_return.signature_payment_authorization',
    ])
  })

  it('freezes exact 1120-S item keys and required organizer gaps', () => {
    expect(keysFor('federal_1120s')).toEqual([
      '1120s.s_corporation_return.s_election',
      '1120s.s_corporation_return.shareholder_list',
      '1120s.s_corporation_return.shareholder_basis',
      '1120s.s_corporation_return.reasonable_compensation',
      '1120s.s_corporation_return.books_trial_balance',
      '1120s.s_corporation_return.general_ledger',
      '1120s.s_corporation_return.bank_loan_reconciliations',
      '1120s.s_corporation_return.fixed_assets',
      '1120s.s_corporation_return.income_expense_detail',
      '1120s.s_corporation_return.estimated_payments',
      '1120s.s_corporation_return.state_apportionment',
      '1120s.s_corporation_return.loan_debt_support',
      '1120s.s_corporation_return.k1_delivery',
    ])
  })

  it('freezes exact support template keys', () => {
    expect(keysFor('federal_1041')).toEqual([
      '1041.fiduciary_return.governing_documents',
      '1041.fiduciary_return.prior_year_return',
      '1041.fiduciary_return.income_forms',
      '1041.fiduciary_return.brokerage_assets',
      '1041.fiduciary_return.accounting_records',
      '1041.fiduciary_return.beneficiary_information',
      '1041.fiduciary_return.distributions',
      '1041.fiduciary_return.k1_received',
      '1041.fiduciary_return.deductions_expenses',
      '1041.fiduciary_return.estimated_payments',
      '1041.fiduciary_return.state_residency',
      '1041.fiduciary_return.signature_authorization',
    ])
    expect(keysFor('federal_941')).toEqual([
      '941.payroll_return.payroll_register',
      '941.payroll_return.tax_liability_report',
      '941.payroll_return.deposit_confirmations',
      '941.payroll_return.employee_counts',
      '941.payroll_return.voids_corrections',
      '941.payroll_return.benefits_fringe',
      '941.payroll_return.owner_payroll',
      '941.payroll_return.third_party_sick_pay',
      '941.payroll_return.state_local_withholding',
      '941.payroll_return.contractor_reclassification',
      '941.payroll_return.provider_reports',
      '941.payroll_return.signer_authorization',
    ])
    expect(keysFor('federal_1099_nec')).toEqual([
      '1099.information_return.payee_list',
      '1099.information_return.w9_tin_support',
      '1099.information_return.vendor_ledger',
      '1099.information_return.payment_method_review',
      '1099.information_return.entity_type_exemptions',
      '1099.information_return.rent_royalty_detail',
      '1099.information_return.backup_withholding',
      '1099.information_return.state_filing_requirements',
      '1099.information_return.prior_year_filings',
      '1099.information_return.corrections_voids',
      '1099.information_return.recipient_delivery',
      '1099.information_return.filing_provider_confirmation',
    ])
  })

  it('freezes exact foreign, nonprofit, sales tax, estimated tax, and fallback keys', () => {
    expect(keysFor('federal_fbar')).toEqual([
      'foreign.fbar_and_international.foreign_account_list',
      'foreign.fbar_and_international.account_statements',
      'foreign.fbar_and_international.foreign_income',
      'foreign.fbar_and_international.ownership_facts',
      'foreign.fbar_and_international.entity_financials',
      'foreign.fbar_and_international.prior_year_forms',
      'foreign.fbar_and_international.tax_residency',
      'foreign.fbar_and_international.foreign_taxes_paid',
      'foreign.fbar_and_international.gifts_inheritances',
      'foreign.fbar_and_international.currency_exchange',
      'foreign.fbar_and_international.signing_authority',
      'foreign.fbar_and_international.filing_authorization',
    ])
    expect(keysFor('federal_990')).toEqual([
      '990.exempt_organization_return.financial_statements',
      '990.exempt_organization_return.general_ledger',
      '990.exempt_organization_return.governance_roster',
      '990.exempt_organization_return.program_service_activity',
      '990.exempt_organization_return.contribution_support',
      '990.exempt_organization_return.fundraising_events',
      '990.exempt_organization_return.compensation_benefits',
      '990.exempt_organization_return.related_party_transactions',
      '990.exempt_organization_return.foreign_grants_activity',
      '990.exempt_organization_return.state_registration',
      '990.exempt_organization_return.public_disclosure',
      '990.exempt_organization_return.signature_authorization',
    ])
    expect(keysFor('sales_use_tax')).toEqual([
      'sales_use.sales_tax_return.sales_tax_report',
      'sales_use.sales_tax_return.gross_sales_reconciliation',
      'sales_use.sales_tax_return.jurisdiction_breakout',
      'sales_use.sales_tax_return.exemption_certificates',
      'sales_use.sales_tax_return.marketplace_facilitator',
      'sales_use.sales_tax_return.returns_allowances',
      'sales_use.sales_tax_return.use_tax_purchases',
      'sales_use.sales_tax_return.prior_filing_confirmation',
      'sales_use.sales_tax_return.nexus_changes',
      'sales_use.sales_tax_return.credits_prepayments',
      'sales_use.sales_tax_return.filing_access',
      'sales_use.sales_tax_return.payment_authorization',
    ])
    expect(keysFor('1040_estimated_tax')).toEqual([
      'estimated_tax.payment_voucher.prior_year_return',
      'estimated_tax.payment_voucher.current_year_income',
      'estimated_tax.payment_voucher.withholding',
      'estimated_tax.payment_voucher.estimated_payments_made',
      'estimated_tax.payment_voucher.overpayment_applied',
      'estimated_tax.payment_voucher.income_timing',
      'estimated_tax.payment_voucher.deductions_credits',
      'estimated_tax.payment_voucher.entity_profit_projection',
      'estimated_tax.payment_voucher.state_local_estimates',
      'estimated_tax.payment_voucher.tax_rate_assumptions',
      'estimated_tax.payment_voucher.voucher_delivery',
      'estimated_tax.payment_voucher.payment_authorization',
    ])
    expect(keysFor('custom_local_return')).toEqual([
      'generic.fallback_readiness.prior_filing',
      'generic.fallback_readiness.source_documents',
      'generic.fallback_readiness.bookkeeping_export',
      'generic.fallback_readiness.income_activity',
      'generic.fallback_readiness.expense_deduction',
      'generic.fallback_readiness.ownership_signer',
      'generic.fallback_readiness.jurisdiction_account',
      'generic.fallback_readiness.payments_credits',
      'generic.fallback_readiness.state_local_facts',
      'generic.fallback_readiness.open_questions',
      'generic.fallback_readiness.review_notes',
      'generic.fallback_readiness.signature_payment',
    ])
  })

  it('keeps matching priority stable', () => {
    expect(selectReadinessDocumentTemplate({ taxType: 'federal_1040_estimated_tax' }).key).toBe(
      'estimated_tax.payment_voucher',
    )
    expect(selectReadinessDocumentTemplate({ taxType: 'federal_1120s' }).key).toBe(
      '1120s.s_corporation_return',
    )
    expect(selectReadinessDocumentTemplate({ taxType: 'federal_1120' }).key).toBe(
      '1120.c_corporation_return',
    )
    expect(selectReadinessDocumentTemplate({ taxType: 'unknown_tax_type' }).key).toBe(
      'generic.fallback_readiness',
    )
  })
})
