export type ReadinessDocumentChecklistSource = 'template'

export interface ReadinessDocumentChecklistInput {
  taxType: string
  formName?: string | null
  obligationType?: string | null
  entityType?: string | null
  jurisdiction?: string | null
}

export interface ReadinessDocumentChecklistTemplateItem {
  id: string
  label: string
  description: string | null
  source: ReadinessDocumentChecklistSource
}

interface TemplateItem {
  id: string
  label: string
  description?: string
}

function item(input: TemplateItem): ReadinessDocumentChecklistTemplateItem {
  return {
    id: input.id,
    label: input.label,
    description: input.description ?? null,
    source: 'template',
  }
}

function normalize(value: string | null | undefined): string {
  return (value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '_')
}

function searchable(input: ReadinessDocumentChecklistInput): string {
  return [input.taxType, input.formName, input.obligationType, input.entityType, input.jurisdiction]
    .map(normalize)
    .filter(Boolean)
    .join('_')
}

function matchesAny(value: string, fragments: readonly string[]): boolean {
  return fragments.some((fragment) => value.includes(fragment))
}

function copyTemplate(
  template: readonly ReadinessDocumentChecklistTemplateItem[],
): ReadinessDocumentChecklistTemplateItem[] {
  return template.map((entry) => ({
    id: entry.id,
    label: entry.label,
    description: entry.description,
    source: entry.source,
  }))
}

const INDIVIDUAL_1040 = [
  item({
    id: 'income-forms',
    label: 'W-2, 1099, and income forms',
    description: 'W-2s plus all 1099-NEC, 1099-MISC, 1099-K, interest, dividend, and SSA forms.',
  }),
  item({
    id: 'brokerage-statements',
    label: 'Brokerage and crypto statements',
    description: 'Year-end brokerage statements, sale details, cost basis, and crypto tax reports.',
  }),
  item({
    id: 'deduction-support',
    label: 'Deduction and credit support',
    description:
      'Mortgage interest, property tax, charitable gifts, childcare, education, and energy credit records.',
  }),
  item({
    id: 'schedule-c-records',
    label: 'Schedule C business records',
    description:
      'Business income, expenses, mileage, home office, asset purchases, and bookkeeping exports.',
  }),
  item({
    id: 'k1-packages',
    label: 'K-1 packages',
    description:
      'Partnership, S corporation, trust, and estate K-1 packages received for the tax year.',
  }),
] as const

const PARTNERSHIP_1065 = [
  item({
    id: 'trial-balance-gl',
    label: 'Trial balance and general ledger',
    description:
      'Year-end trial balance, general ledger detail, and book-to-tax adjustment support.',
  }),
  item({
    id: 'bank-credit-card-reconciliations',
    label: 'Bank and card reconciliations',
    description: 'Bank, credit card, loan, and payment account reconciliations through year end.',
  }),
  item({
    id: 'fixed-assets',
    label: 'Fixed asset additions and disposals',
    description: 'Asset purchases, disposals, depreciation reports, and supporting invoices.',
  }),
  item({
    id: 'partner-capital-ownership',
    label: 'Partner capital and ownership changes',
    description:
      'Capital accounts, ownership percentages, address changes, and partner contribution/distribution details.',
  }),
  item({
    id: 'k1-delivery-list',
    label: 'K-1 recipient delivery list',
    description:
      'Partner names, addresses, tax IDs, and delivery preferences for final K-1 packages.',
  }),
] as const

const S_CORP_1120S = [
  item({
    id: 'trial-balance-gl',
    label: 'Trial balance and general ledger',
    description:
      'Year-end trial balance, general ledger detail, and book-to-tax adjustment support.',
  }),
  item({
    id: 'payroll-and-officer-wages',
    label: 'Payroll and officer wages',
    description:
      'Payroll reports, officer compensation, W-2 support, and shareholder health insurance details.',
  }),
  item({
    id: 'fixed-assets',
    label: 'Fixed asset additions and disposals',
    description: 'Asset purchases, disposals, depreciation reports, and supporting invoices.',
  }),
  item({
    id: 'shareholder-basis-ownership',
    label: 'Shareholder basis and ownership changes',
    description:
      'Shareholder loans, distributions, stock changes, addresses, and ownership percentages.',
  }),
  item({
    id: 'k1-delivery-list',
    label: 'K-1 recipient delivery list',
    description:
      'Shareholder names, addresses, tax IDs, and delivery preferences for final K-1 packages.',
  }),
] as const

const C_CORP_1120 = [
  item({
    id: 'trial-balance-gl',
    label: 'Trial balance and general ledger',
    description:
      'Year-end trial balance, general ledger detail, and book-to-tax adjustment support.',
  }),
  item({
    id: 'balance-sheet-support',
    label: 'Balance sheet support',
    description:
      'Cash, receivable, inventory, loan, equity, and retained earnings support schedules.',
  }),
  item({
    id: 'fixed-assets',
    label: 'Fixed asset additions and disposals',
    description: 'Asset purchases, disposals, depreciation reports, and supporting invoices.',
  }),
  item({
    id: 'state-apportionment',
    label: 'State apportionment support',
    description: 'Revenue, payroll, and property by state when multi-state filing applies.',
  }),
  item({
    id: 'efile-authorization-signer',
    label: 'E-file authorization signer',
    description: 'Officer signer name, title, email, and Form 8879-CORP delivery details.',
  }),
] as const

const FIDUCIARY_1041 = [
  item({
    id: 'fiduciary-income-forms',
    label: '1099s and fiduciary income forms',
    description:
      '1099s, brokerage statements, sale transaction support, and income allocation details.',
  }),
  item({
    id: 'trust-estate-accounting',
    label: 'Trust or estate accounting records',
    description:
      'Accounting statements, administration expenses, professional fees, and asset activity.',
  }),
  item({
    id: 'beneficiary-information',
    label: 'Beneficiary information',
    description:
      'Beneficiary names, addresses, tax IDs, distribution amounts, and final-year status.',
  }),
  item({
    id: 'k1-packages',
    label: 'K-1 packages received',
    description:
      'Any K-1s received by the trust or estate from partnerships, S corporations, or other trusts.',
  }),
] as const

const PAYROLL_941 = [
  item({
    id: 'payroll-register',
    label: 'Payroll register',
    description:
      'Quarter or year-to-date payroll register with wages, taxes, benefits, and adjustments.',
  }),
  item({
    id: 'tax-liability-report',
    label: 'Payroll tax liability report',
    description: 'Payroll provider tax liability report by deposit period.',
  }),
  item({
    id: 'deposit-confirmations',
    label: 'Deposit confirmations',
    description: 'EFTPS or payroll provider confirmations for deposits applied to the period.',
  }),
  item({
    id: 'payroll-adjustments',
    label: 'Payroll adjustments',
    description:
      'Voids, corrections, fringe benefits, owner payroll, and prior-period adjustment details.',
  }),
] as const

const INFORMATION_1099 = [
  item({
    id: 'payee-list',
    label: 'Payee list and payment totals',
    description: 'Recipient names, addresses, payment totals, and reportable payment categories.',
  }),
  item({
    id: 'w9-tin-support',
    label: 'W-9 and TIN support',
    description: 'W-9 forms, TIN/name match support, and missing TIN follow-up notes.',
  }),
  item({
    id: 'vendor-ledger',
    label: 'Vendor ledger detail',
    description:
      'Accounting export or vendor ledger supporting reportable nonemployee compensation.',
  }),
  item({
    id: 'recipient-delivery',
    label: 'Recipient delivery evidence',
    description: 'Recipient copy delivery method, delivery date, and filing provider confirmation.',
  }),
] as const

const FOREIGN_REPORTING = [
  item({
    id: 'foreign-account-list',
    label: 'Foreign account list',
    description: 'Institution names, countries, account numbers, owners, and maximum values.',
  }),
  item({
    id: 'foreign-income-statements',
    label: 'Foreign income statements',
    description:
      'Foreign interest, dividends, pensions, rental, entity, and exchange-rate support.',
  }),
  item({
    id: 'foreign-ownership-facts',
    label: 'Foreign ownership facts',
    description:
      'Ownership percentages, related parties, entity activity, and filing classification details.',
  }),
  item({
    id: 'prior-year-foreign-forms',
    label: 'Prior-year foreign forms',
    description: 'Prior FBAR, Form 8938, 5471, 5472, 8865, 8858, or 3520 filings when available.',
  }),
] as const

const NONPROFIT_990 = [
  item({
    id: 'financial-statements',
    label: 'Financial statements',
    description:
      'Year-end financial statements, revenue detail, expense classifications, and balance sheet support.',
  }),
  item({
    id: 'governance-roster',
    label: 'Governance roster',
    description:
      'Officers, directors, trustees, key employees, compensation, and related-party changes.',
  }),
  item({
    id: 'program-service-activity',
    label: 'Program service activity',
    description:
      'Program descriptions, grants, fundraising, donor restrictions, and public support records.',
  }),
  item({
    id: 'public-disclosure-copy',
    label: 'Public disclosure copy details',
    description:
      'Recipient, delivery method, and approval path for the final public disclosure copy.',
  }),
] as const

const SALES_TAX = [
  item({
    id: 'sales-tax-report',
    label: 'Sales tax report',
    description:
      'Taxable sales, exempt sales, marketplace, and jurisdiction-level sales tax reports.',
  }),
  item({
    id: 'exemption-certificates',
    label: 'Exemption certificates',
    description: 'Customer resale or exemption certificates supporting exempt sales.',
  }),
  item({
    id: 'marketplace-facilitator-support',
    label: 'Marketplace facilitator support',
    description: 'Marketplace sales reports and tax collected by facilitator by jurisdiction.',
  }),
  item({
    id: 'prior-filing-confirmation',
    label: 'Prior filing confirmation',
    description: 'Prior return, payment confirmation, account ID, and filing frequency details.',
  }),
] as const

const GENERIC = [
  item({
    id: 'source-documents',
    label: 'Source documents',
    description: 'Client records needed to prepare or review this filing.',
  }),
  item({
    id: 'bookkeeping-export',
    label: 'Bookkeeping export',
    description:
      'Accounting system export, supporting schedules, or organizer package for the filing period.',
  }),
  item({
    id: 'client-confirmations',
    label: 'Client confirmations',
    description:
      'Ownership, address, signer, payment, or filing facts the preparer needs confirmed.',
  }),
] as const

export function generateReadinessDocumentChecklist(
  input: ReadinessDocumentChecklistInput,
): ReadinessDocumentChecklistTemplateItem[] {
  const value = searchable(input)

  if (matchesAny(value, ['1040_estimated_tax', '1120_estimated_tax', 'estimated_tax'])) {
    return copyTemplate(GENERIC)
  }
  if (matchesAny(value, ['1040', 'individual', 'schedule_c', 'sch_c'])) {
    return copyTemplate(INDIVIDUAL_1040)
  }
  if (matchesAny(value, ['1120_s', '1120s', '100s', 's_corp', 's_corporation'])) {
    return copyTemplate(S_CORP_1120S)
  }
  if (matchesAny(value, ['1065', '565', 'partnership'])) {
    return copyTemplate(PARTNERSHIP_1065)
  }
  if (matchesAny(value, ['1120', '100_franchise', '100_', 'ct3', 'f1120', 'c_corp'])) {
    return copyTemplate(C_CORP_1120)
  }
  if (matchesAny(value, ['1041', '541', 'it205', 'trust', 'estate'])) {
    return copyTemplate(FIDUCIARY_1041)
  }
  if (matchesAny(value, ['941', '940', 'payroll', 'withholding', 'wage_report'])) {
    return copyTemplate(PAYROLL_941)
  }
  if (matchesAny(value, ['1099', 'w_2', 'w2', 'information_return'])) {
    return copyTemplate(INFORMATION_1099)
  }
  if (
    matchesAny(value, ['fbar', '8938', '5471', '5472', '8865', '8858', '3520', 'foreign', 'fincen'])
  ) {
    return copyTemplate(FOREIGN_REPORTING)
  }
  if (matchesAny(value, ['990', '8868', 'nonprofit', 'exempt_organization'])) {
    return copyTemplate(NONPROFIT_990)
  }
  if (matchesAny(value, ['sales_tax', 'sales_use_tax', 'combined_excise', 'excise'])) {
    return copyTemplate(SALES_TAX)
  }

  return copyTemplate(GENERIC)
}
