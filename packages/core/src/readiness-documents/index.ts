export type ReadinessDocumentChecklistSource = 'template'

export interface ReadinessDocumentChecklistInput {
  taxType: string
  formName?: string | null
  obligationType?: string | null
  entityType?: string | null
  taxClassification?: string | null
  jurisdiction?: string | null
}

export interface ReadinessDocumentChecklistTemplateItem {
  templateKey: string
  templateVersion: number
  label: string
  description: string | null
  source: ReadinessDocumentChecklistSource
}

export interface ReadinessDocumentChecklistTemplate {
  key: string
  version: number
  items: readonly ReadinessDocumentChecklistTemplateItem[]
}

interface TemplateItemInput {
  key: string
  label: string
  description: string
}

function item(
  templateKeyPrefix: string,
  templateVersion: number,
  input: TemplateItemInput,
): ReadinessDocumentChecklistTemplateItem {
  return {
    templateKey: `${templateKeyPrefix}.${input.key}`,
    templateVersion,
    label: input.label,
    description: input.description,
    source: 'template',
  }
}

function defineTemplate(
  key: string,
  version: number,
  items: readonly TemplateItemInput[],
): ReadinessDocumentChecklistTemplate {
  return {
    key,
    version,
    items: items.map((entry) => item(key, version, entry)),
  }
}

function normalize(value: string | null | undefined): string {
  return (value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '_')
}

// Obligation-level signals (what the deadline IS) and client-level signals
// (what the client IS) are matched in separate passes. Mixing them in one
// string let entity words hijack obligation-specific checklists — e.g. an
// S corp's Form 941 deadline matched 's_corp' before '941' and produced the
// S corporation income-return checklist for a payroll filing.
function searchableObligation(input: ReadinessDocumentChecklistInput): string {
  return [input.taxType, input.formName, input.obligationType, input.jurisdiction]
    .map(normalize)
    .filter(Boolean)
    .join('_')
}

function searchableClient(input: ReadinessDocumentChecklistInput): string {
  return [input.entityType, input.taxClassification].map(normalize).filter(Boolean).join('_')
}

function matchesAny(value: string, fragments: readonly string[]): boolean {
  return fragments.some((fragment) => value.includes(fragment))
}

function copyTemplate(
  template: ReadinessDocumentChecklistTemplate,
): ReadinessDocumentChecklistTemplateItem[] {
  return template.items.map((entry) => ({
    templateKey: entry.templateKey,
    templateVersion: entry.templateVersion,
    label: entry.label,
    description: entry.description,
    source: entry.source,
  }))
}

const INDIVIDUAL_1040 = defineTemplate('1040.individual_return', 1, [
  {
    key: 'identity_and_prior_year',
    label: 'Identity details and prior-year return',
    description:
      'Taxpayer, spouse, dependent, address, bank, IP PIN, and prior-year return details.',
  },
  {
    key: 'w2_forms',
    label: 'W-2 forms',
    description: 'All employer W-2s, corrected W-2s, and state wage statements for the tax year.',
  },
  {
    key: '1099_income',
    label: '1099 income forms',
    description: '1099-NEC, 1099-MISC, 1099-K, INT, DIV, R, SSA, and other income forms.',
  },
  {
    key: 'schedule_k1',
    label: 'K-1 packages',
    description:
      'Partnership, S corporation, trust, and estate K-1 packages received by the taxpayer.',
  },
  {
    key: 'schedule_c',
    label: 'Schedule C business records',
    description:
      'Business income, expenses, mileage, home office, assets, and bookkeeping exports.',
  },
  {
    key: 'schedule_e',
    label: 'Schedule E rental and royalty records',
    description:
      'Rental income, expenses, mortgage interest, taxes, repairs, and depreciation support.',
  },
  {
    key: 'brokerage_crypto',
    label: 'Brokerage and crypto statements',
    description:
      'Year-end statements, sale details, cost basis, crypto reports, and wash sale support.',
  },
  {
    key: 'foreign_reporting',
    label: 'Foreign income, account, and asset facts',
    description:
      'Foreign accounts, income, entity interests, Form 8938, FBAR, and exchange-rate support.',
  },
  {
    key: 'estimated_payments',
    label: 'Estimated tax payment confirmations',
    description:
      'Federal and state estimated payments, extensions paid, overpayments, and dates paid.',
  },
  {
    key: 'deductions_credits',
    label: 'Deduction and credit support',
    description:
      'Mortgage interest, property tax, charitable gifts, childcare, education, and energy credits.',
  },
  {
    key: 'health_insurance',
    label: 'Health insurance and marketplace forms',
    description:
      'Forms 1095-A/B/C, HSA forms, long-term care premiums, and self-employed health details.',
  },
  {
    key: 'dependent_education_childcare',
    label: 'Dependent, education, and childcare details',
    description:
      'Dependent changes, tuition forms, student loan interest, provider EINs, and care amounts.',
  },
  {
    key: 'state_local_facts',
    label: 'State and local filing facts',
    description:
      'Residency dates, local wages, city/county facts, and other state-specific source records.',
  },
  {
    key: 'signature_payment_authorization',
    label: 'E-file signature and payment authorization',
    description:
      'Signer consent, bank account, payment preference, and Form 8879 delivery details.',
  },
])

const PARTNERSHIP_1065 = defineTemplate('1065.partnership_return', 1, [
  {
    key: 'partnership_agreement',
    label: 'Partnership agreement and amendments',
    description:
      'Current agreement, amendments, special allocation terms, and buy-sell provisions.',
  },
  {
    key: 'partner_list',
    label: 'Partner list and tax IDs',
    description:
      'Partner names, addresses, tax IDs, entity types, residency, and delivery preferences.',
  },
  {
    key: 'ownership_changes',
    label: 'Ownership changes and transfers',
    description:
      'Admission, withdrawal, sale, redemption, and percentage changes during the tax year.',
  },
  {
    key: 'capital_accounts',
    label: 'Partner capital accounts',
    description:
      'Beginning capital, contributions, distributions, book income, tax capital, and ending capital.',
  },
  {
    key: 'books_trial_balance',
    label: 'Books, trial balance, and financial statements',
    description: 'Year-end books, trial balance, financial statements, and book-to-tax support.',
  },
  {
    key: 'general_ledger',
    label: 'General ledger detail',
    description: 'Full general ledger, adjusting entries, and unusual transaction support.',
  },
  {
    key: 'bank_loan_reconciliations',
    label: 'Bank, card, and loan reconciliations',
    description:
      'Bank, credit card, loan, payment processor, and cash reconciliations through year end.',
  },
  {
    key: 'fixed_assets',
    label: 'Fixed assets and depreciation',
    description: 'Additions, disposals, depreciation reports, financing, and supporting invoices.',
  },
  {
    key: 'income_expense_detail',
    label: 'Income and expense detail',
    description:
      'Revenue, COGS when applicable, deductible expenses, meals, travel, and owner reimbursements.',
  },
  {
    key: 'guaranteed_payments',
    label: 'Guaranteed payments and partner compensation',
    description:
      'Guaranteed payments, draws, reimbursements, health insurance, and retirement contributions.',
  },
  {
    key: 'allocations',
    label: 'Allocation and special allocation support',
    description:
      'Profit/loss allocations, section 704 details, special allocations, and waterfall support.',
  },
  {
    key: 'state_apportionment',
    label: 'State apportionment and composite facts',
    description:
      'Revenue, payroll, property by state, withholding, composite elections, and nexus facts.',
  },
  {
    key: 'k1_delivery',
    label: 'K-1 delivery list',
    description:
      'Final K-1 recipients, delivery method, email or portal preference, and mailing addresses.',
  },
])

const S_CORP_1120S = defineTemplate('1120s.s_corporation_return', 1, [
  {
    key: 's_election',
    label: 'S election and eligibility support',
    description:
      'Form 2553, acceptance, effective date, shareholder eligibility, and late-election support.',
  },
  {
    key: 'shareholder_list',
    label: 'Shareholder list and ownership changes',
    description:
      'Shareholder names, addresses, tax IDs, ownership percentages, stock changes, and dates.',
  },
  {
    key: 'shareholder_basis',
    label: 'Shareholder basis schedules',
    description:
      'Stock basis, debt basis, loans, contributions, distributions, and suspended losses.',
  },
  {
    key: 'reasonable_compensation',
    label: 'Reasonable compensation support',
    description:
      'Officer wages, payroll reports, W-2s, health insurance, and compensation rationale.',
  },
  {
    key: 'books_trial_balance',
    label: 'Books, trial balance, and financial statements',
    description:
      'Year-end books, trial balance, income statement, balance sheet, and book-to-tax support.',
  },
  {
    key: 'general_ledger',
    label: 'General ledger detail',
    description:
      'Full ledger, adjusting entries, shareholder transactions, and unusual transaction support.',
  },
  {
    key: 'bank_loan_reconciliations',
    label: 'Bank, card, and loan reconciliations',
    description:
      'Bank, credit card, loan, payment processor, and cash reconciliations through year end.',
  },
  {
    key: 'fixed_assets',
    label: 'Fixed assets and depreciation',
    description:
      'Asset additions, disposals, depreciation reports, financing, and supporting invoices.',
  },
  {
    key: 'income_expense_detail',
    label: 'Income, expense, and COGS detail',
    description:
      'Revenue, cost of goods sold, deductible expenses, meals, travel, and reimbursements.',
  },
  {
    key: 'estimated_payments',
    label: 'Estimated tax payment confirmations',
    description:
      'Federal and state estimates, extensions paid, overpayments applied, and dates paid.',
  },
  {
    key: 'state_apportionment',
    label: 'State apportionment and withholding facts',
    description:
      'Revenue, payroll, property by state, PTE elections, withholding, and composite facts.',
  },
  {
    key: 'loan_debt_support',
    label: 'Loans and debt support',
    description: 'Shareholder loans, third-party debt, interest, covenants, and year-end balances.',
  },
  {
    key: 'k1_delivery',
    label: 'K-1 delivery list',
    description:
      'Final K-1 recipients, delivery method, email or portal preference, and mailing addresses.',
  },
])

const C_CORP_1120 = defineTemplate('1120.c_corporation_return', 1, [
  {
    key: 'corporate_books',
    label: 'Corporate books and trial balance',
    description:
      'Year-end books, trial balance, financial statements, and book-to-tax adjustment support.',
  },
  {
    key: 'general_ledger',
    label: 'General ledger detail',
    description:
      'Full ledger, adjusting entries, intercompany activity, and unusual transaction support.',
  },
  {
    key: 'balance_sheet_support',
    label: 'Balance sheet support',
    description:
      'Cash, receivables, inventory, payables, loans, equity, and retained earnings schedules.',
  },
  {
    key: 'cogs_inventory',
    label: 'COGS and inventory records',
    description:
      'Inventory, purchases, production costs, capitalization, and cost of goods sold schedules.',
  },
  {
    key: 'officer_compensation',
    label: 'Officer compensation support',
    description:
      'Officer wages, payroll reports, bonuses, benefits, and related-party compensation support.',
  },
  {
    key: 'fixed_assets',
    label: 'Fixed assets and depreciation',
    description:
      'Asset additions, disposals, depreciation reports, financing, and supporting invoices.',
  },
  {
    key: 'income_expense_detail',
    label: 'Income and expense detail',
    description:
      'Revenue, deductions, meals, travel, charitable gifts, bad debts, and accrual support.',
  },
  {
    key: 'estimated_payments',
    label: 'Estimated tax payment confirmations',
    description:
      'Federal and state estimates, extensions paid, overpayments applied, and dates paid.',
  },
  {
    key: 'state_apportionment',
    label: 'State apportionment support',
    description:
      'Revenue, payroll, property by state, nexus facts, and state return filing obligations.',
  },
  {
    key: 'ownership_equity',
    label: 'Ownership, equity, and dividends',
    description:
      'Shareholder changes, stock transactions, dividends, capital contributions, and minutes.',
  },
  {
    key: 'tax_credits_nols',
    label: 'Tax credits, NOLs, and carryforwards',
    description:
      'Credit support, net operating losses, capital losses, and carryforward schedules.',
  },
  {
    key: 'related_party_intercompany',
    label: 'Related-party and intercompany support',
    description:
      'Related-party transactions, transfer pricing facts, management fees, and eliminations.',
  },
  {
    key: 'signature_payment_authorization',
    label: 'E-file signer and payment authorization',
    description:
      'Officer signer name, title, email, bank account, payment preference, and Form 8879-C.',
  },
])

const FIDUCIARY_1041 = defineTemplate('1041.fiduciary_return', 1, [
  {
    key: 'governing_documents',
    label: 'Trust or estate governing documents',
    description:
      'Trust agreement, will, court documents, EIN letter, fiduciary appointments, and amendments.',
  },
  {
    key: 'prior_year_return',
    label: 'Prior-year Form 1041 and K-1s',
    description:
      'Prior-year return, prior beneficiary K-1s, carryforwards, and final-year indicators.',
  },
  {
    key: 'income_forms',
    label: '1099s and fiduciary income forms',
    description:
      '1099s, brokerage statements, sale support, interest, dividends, pensions, and rents.',
  },
  {
    key: 'brokerage_assets',
    label: 'Brokerage, asset, and sale detail',
    description:
      'Year-end statements, basis records, sale confirmations, valuations, and crypto reports.',
  },
  {
    key: 'accounting_records',
    label: 'Trust or estate accounting records',
    description:
      'Accounting statements, receipts, disbursements, administration expenses, and fees.',
  },
  {
    key: 'beneficiary_information',
    label: 'Beneficiary information',
    description:
      'Beneficiary names, addresses, tax IDs, residency, distribution amounts, and final status.',
  },
  {
    key: 'distributions',
    label: 'Distribution and DNI support',
    description:
      'Distribution dates, amounts, tiers, separate shares, income allocation, and DNI support.',
  },
  {
    key: 'k1_received',
    label: 'K-1 packages received',
    description: 'K-1s received from partnerships, S corporations, trusts, and estates.',
  },
  {
    key: 'deductions_expenses',
    label: 'Deductions and administration expenses',
    description:
      'Professional fees, fiduciary fees, charitable gifts, taxes, and other deductions.',
  },
  {
    key: 'estimated_payments',
    label: 'Estimated tax payment confirmations',
    description:
      'Federal and state estimates, extension payments, overpayments applied, and dates paid.',
  },
  {
    key: 'state_residency',
    label: 'State residency and situs facts',
    description:
      'Fiduciary, beneficiary, asset, and administration location facts for state filings.',
  },
  {
    key: 'signature_authorization',
    label: 'Fiduciary signature and payment authorization',
    description:
      'Fiduciary signer details, bank account, payment preference, and e-file authorization.',
  },
])

const PAYROLL_941 = defineTemplate('941.payroll_return', 1, [
  {
    key: 'payroll_register',
    label: 'Payroll register',
    description: 'Quarter and year-to-date wages, taxes, benefits, deductions, and adjustments.',
  },
  {
    key: 'tax_liability_report',
    label: 'Payroll tax liability report',
    description: 'Federal, state, and local tax liabilities by deposit period and payroll date.',
  },
  {
    key: 'deposit_confirmations',
    label: 'Deposit confirmations',
    description: 'EFTPS or provider confirmations for deposits applied to the filing period.',
  },
  {
    key: 'employee_counts',
    label: 'Employee counts and wage base support',
    description:
      'Employee counts, taxable wage bases, capped wages, and state unemployment support.',
  },
  {
    key: 'voids_corrections',
    label: 'Voids, corrections, and prior-period adjustments',
    description:
      'Voided checks, corrections, retro payroll, prior-period adjustments, and amendment notes.',
  },
  {
    key: 'benefits_fringe',
    label: 'Benefits and fringe adjustments',
    description:
      'Group-term life, personal use auto, health insurance, retirement, and other fringe benefits.',
  },
  {
    key: 'owner_payroll',
    label: 'Owner and officer payroll details',
    description:
      'Owner wages, officer compensation, shareholder health, and reasonable compensation facts.',
  },
  {
    key: 'third_party_sick_pay',
    label: 'Third-party sick pay and credits',
    description:
      'Third-party sick pay, refundable credits, retention credits, and provider statements.',
  },
  {
    key: 'state_local_withholding',
    label: 'State and local withholding reports',
    description: 'State withholding, unemployment, local tax, and wage report support.',
  },
  {
    key: 'contractor_reclassification',
    label: 'Worker classification changes',
    description:
      'New employee, contractor, reclassification, and termination details affecting payroll.',
  },
  {
    key: 'provider_reports',
    label: 'Payroll provider reports',
    description: 'Provider quarterly tax package, filing confirmations, and payment schedules.',
  },
  {
    key: 'signer_authorization',
    label: 'Signer and payment authorization',
    description:
      'Authorized signer, PIN or e-file authorization, bank account, and payment preference.',
  },
])

const INFORMATION_1099 = defineTemplate('1099.information_return', 1, [
  {
    key: 'payee_list',
    label: 'Payee list and payment totals',
    description:
      'Recipient names, addresses, tax IDs, payment totals, and reportable payment categories.',
  },
  {
    key: 'w9_tin_support',
    label: 'W-9 and TIN support',
    description:
      'W-9 forms, TIN/name match results, missing TIN follow-up, and backup withholding notes.',
  },
  {
    key: 'vendor_ledger',
    label: 'Vendor ledger detail',
    description:
      'Accounting export or vendor ledger supporting reportable nonemployee compensation.',
  },
  {
    key: 'payment_method_review',
    label: 'Payment method review',
    description:
      'Checks, ACH, card, marketplace, third-party network, and excluded payment method support.',
  },
  {
    key: 'entity_type_exemptions',
    label: 'Entity type and exemption support',
    description:
      'Corporation, attorney, rent, medical, interest, dividend, royalty, and exemption facts.',
  },
  {
    key: 'rent_royalty_detail',
    label: 'Rent, royalty, and attorney payment detail',
    description: 'Lease, royalty, settlement, and attorney payment support by recipient.',
  },
  {
    key: 'backup_withholding',
    label: 'Backup withholding detail',
    description: 'Backup withholding amounts, deposit confirmations, and payee notices.',
  },
  {
    key: 'state_filing_requirements',
    label: 'State filing and withholding facts',
    description:
      'State account IDs, state tax withheld, combined filing rules, and direct filing needs.',
  },
  {
    key: 'prior_year_filings',
    label: 'Prior-year 1099 filings',
    description: 'Prior-year recipient list, filed forms, corrections, and recurring payees.',
  },
  {
    key: 'corrections_voids',
    label: 'Corrections and voids',
    description: 'Corrected recipient details, incorrect amounts, duplicates, and voided forms.',
  },
  {
    key: 'recipient_delivery',
    label: 'Recipient delivery evidence',
    description: 'Recipient copy delivery method, date, postal or portal evidence, and consent.',
  },
  {
    key: 'filing_provider_confirmation',
    label: 'Filing provider confirmation',
    description:
      'Transmitter details, e-file confirmation, payer TCC when applicable, and filing date.',
  },
])

const FOREIGN_REPORTING = defineTemplate('foreign.fbar_and_international', 1, [
  {
    key: 'foreign_account_list',
    label: 'Foreign account list',
    description: 'Institution names, countries, account numbers, owners, and maximum values.',
  },
  {
    key: 'account_statements',
    label: 'Foreign account statements',
    description:
      'Year-end and peak-value statements for bank, securities, pension, and digital accounts.',
  },
  {
    key: 'foreign_income',
    label: 'Foreign income statements',
    description:
      'Foreign interest, dividends, pensions, rental, business, and exchange-rate support.',
  },
  {
    key: 'ownership_facts',
    label: 'Foreign ownership facts',
    description:
      'Entity ownership percentages, related parties, activity, and filing classification details.',
  },
  {
    key: 'entity_financials',
    label: 'Foreign entity financial statements',
    description:
      'Foreign corporation, partnership, trust, or disregarded entity financial statements.',
  },
  {
    key: 'prior_year_forms',
    label: 'Prior-year foreign forms',
    description: 'Prior FBAR, Form 8938, 5471, 5472, 8865, 8858, 3520, or 3520-A filings.',
  },
  {
    key: 'tax_residency',
    label: 'Tax residency and travel facts',
    description:
      'Residency dates, travel days, visa status, treaty facts, and bona fide residence support.',
  },
  {
    key: 'foreign_taxes_paid',
    label: 'Foreign taxes paid',
    description:
      'Foreign tax assessments, withholding, payment dates, and credit or deduction support.',
  },
  {
    key: 'gifts_inheritances',
    label: 'Foreign gifts, inheritances, and trusts',
    description:
      'Foreign gifts, bequests, trust distributions, ownership, and beneficiary statements.',
  },
  {
    key: 'currency_exchange',
    label: 'Currency exchange-rate support',
    description: 'Exchange-rate source, transaction dates, average rates, and conversion support.',
  },
  {
    key: 'signing_authority',
    label: 'Signature authority and ownership access',
    description:
      'Accounts with signature authority, nominee access, beneficial ownership, and control facts.',
  },
  {
    key: 'filing_authorization',
    label: 'Filing authorization',
    description:
      'FinCEN, IRS, or client authorization, signer details, and final filing confirmation path.',
  },
])

const NONPROFIT_990 = defineTemplate('990.exempt_organization_return', 1, [
  {
    key: 'financial_statements',
    label: 'Financial statements',
    description:
      'Year-end statements, revenue detail, expense classifications, and balance sheet support.',
  },
  {
    key: 'general_ledger',
    label: 'General ledger and trial balance',
    description: 'Trial balance, general ledger, adjusting entries, and book-to-tax support.',
  },
  {
    key: 'governance_roster',
    label: 'Governance roster',
    description:
      'Officers, directors, trustees, key employees, compensation, and related-party changes.',
  },
  {
    key: 'program_service_activity',
    label: 'Program service activity',
    description:
      'Program descriptions, grants, fundraising, donor restrictions, and public support records.',
  },
  {
    key: 'contribution_support',
    label: 'Contribution and grant support',
    description:
      'Donor restrictions, grant agreements, in-kind gifts, pledges, and public support details.',
  },
  {
    key: 'fundraising_events',
    label: 'Fundraising events and gaming',
    description: 'Event revenue, direct benefits, raffles, gaming, and sponsorship support.',
  },
  {
    key: 'compensation_benefits',
    label: 'Compensation and benefits',
    description:
      'W-2s, 1099s, benefits, independent contractors, and key employee compensation support.',
  },
  {
    key: 'related_party_transactions',
    label: 'Related-party transactions',
    description:
      'Loans, grants, business transactions, family relationships, and conflict disclosures.',
  },
  {
    key: 'foreign_grants_activity',
    label: 'Foreign grants and activity',
    description:
      'Foreign grants, offices, fundraising, accounts, and program activity outside the U.S.',
  },
  {
    key: 'state_registration',
    label: 'State registration and solicitation facts',
    description: 'Charitable registration, solicitation states, state extensions, and filing IDs.',
  },
  {
    key: 'public_disclosure',
    label: 'Public disclosure copy details',
    description: 'Recipient, delivery method, approval path, and public inspection copy handling.',
  },
  {
    key: 'signature_authorization',
    label: 'Officer signature and filing authorization',
    description:
      'Officer signer, review approval, payment preference, and e-file authorization details.',
  },
])

const SALES_TAX = defineTemplate('sales_use.sales_tax_return', 1, [
  {
    key: 'sales_tax_report',
    label: 'Sales tax report',
    description:
      'Taxable sales, exempt sales, marketplace, and jurisdiction-level sales tax reports.',
  },
  {
    key: 'gross_sales_reconciliation',
    label: 'Gross sales reconciliation',
    description:
      'Sales per books, POS, marketplace, payment processor, and bank deposit reconciliation.',
  },
  {
    key: 'jurisdiction_breakout',
    label: 'Jurisdiction breakout',
    description:
      'State, county, city, district, local rate, destination, and origin sourcing support.',
  },
  {
    key: 'exemption_certificates',
    label: 'Exemption certificates',
    description: 'Customer resale, exemption, direct-pay, government, and nonprofit certificates.',
  },
  {
    key: 'marketplace_facilitator',
    label: 'Marketplace facilitator support',
    description: 'Marketplace reports and tax collected by facilitator by jurisdiction.',
  },
  {
    key: 'returns_allowances',
    label: 'Returns, discounts, and allowances',
    description: 'Refunds, returns, bad debts, discounts, credits, and exempt adjustment support.',
  },
  {
    key: 'use_tax_purchases',
    label: 'Use tax purchase detail',
    description:
      'Untaxed purchases, fixed assets, inventory withdrawals, and self-assessed use tax.',
  },
  {
    key: 'prior_filing_confirmation',
    label: 'Prior filing confirmation',
    description:
      'Prior return, payment confirmation, account ID, filing frequency, and login facts.',
  },
  {
    key: 'nexus_changes',
    label: 'Nexus and registration changes',
    description:
      'New locations, remote sales thresholds, trade shows, employees, and registration changes.',
  },
  {
    key: 'credits_prepayments',
    label: 'Credits, prepayments, and notices',
    description: 'Credits, prepayments, penalty notices, assessments, and correspondence.',
  },
  {
    key: 'filing_access',
    label: 'Filing access and account credentials',
    description:
      'Portal access, account numbers, location IDs, filing PINs, and payment authorization.',
  },
  {
    key: 'payment_authorization',
    label: 'Payment authorization',
    description: 'Bank account, payment date, debit authorization, and approval to submit.',
  },
])

const ESTIMATED_TAX = defineTemplate('estimated_tax.payment_voucher', 1, [
  {
    key: 'prior_year_return',
    label: 'Prior-year return and safe-harbor facts',
    description:
      'Prior-year tax, AGI, safe-harbor threshold, filing status, and carryforward facts.',
  },
  {
    key: 'current_year_income',
    label: 'Current-year income estimate',
    description:
      'Wages, business income, investment income, pass-through income, and expected changes.',
  },
  {
    key: 'withholding',
    label: 'Current-year withholding',
    description:
      'Payroll withholding, pension withholding, backup withholding, and expected year-end totals.',
  },
  {
    key: 'estimated_payments_made',
    label: 'Estimated payments already made',
    description:
      'Federal and state payment confirmations, dates paid, amounts, and payment method.',
  },
  {
    key: 'overpayment_applied',
    label: 'Overpayment applied from prior year',
    description:
      'Prior-year overpayment amount, jurisdiction, application election, and confirmation.',
  },
  {
    key: 'income_timing',
    label: 'Income timing and annualization facts',
    description:
      'Uneven income, seasonal business, capital gains timing, and annualized income support.',
  },
  {
    key: 'deductions_credits',
    label: 'Projected deductions and credits',
    description:
      'Itemized deductions, retirement, credits, QBI, depreciation, and other projected offsets.',
  },
  {
    key: 'entity_profit_projection',
    label: 'Business or entity profit projection',
    description:
      'P&L projection, owner draws, payroll, pass-through estimates, and state addbacks.',
  },
  {
    key: 'state_local_estimates',
    label: 'State and local estimate facts',
    description:
      'Resident/nonresident states, local estimates, PTE elections, and composite payments.',
  },
  {
    key: 'tax_rate_assumptions',
    label: 'Tax rate and penalty assumptions',
    description:
      'Marginal rates, NIIT, AMT, self-employment tax, underpayment penalty, and safe harbor.',
  },
  {
    key: 'voucher_delivery',
    label: 'Voucher delivery preference',
    description:
      'Electronic payment, paper voucher, portal delivery, mailing address, and client instructions.',
  },
  {
    key: 'payment_authorization',
    label: 'Payment authorization',
    description:
      'Bank account, debit date, direct pay access, and approval to schedule or file voucher.',
  },
])

const WAGE_STATEMENTS_W2 = defineTemplate('w2.wage_statement_filing', 1, [
  {
    key: 'final_payroll_register',
    label: 'Final year-end payroll register',
    description:
      'Year-to-date wages, taxes withheld, and payroll summaries through the final payroll.',
  },
  {
    key: 'w3_941_reconciliation',
    label: 'W-3 to 941 reconciliation',
    description:
      'Four quarterly 941 totals reconciled to W-3 wages, withholding, and Social Security figures.',
  },
  {
    key: 'employee_roster',
    label: 'Employee roster and SSN verification',
    description:
      'Employee names, SSNs, current addresses, and SSN verification or mismatch follow-up.',
  },
  {
    key: 'fringe_benefits',
    label: 'Taxable fringe benefit adjustments',
    description:
      'Group-term life, personal use of auto, awards, and other taxable fringe items to add to wages.',
  },
  {
    key: 'owner_adjustments',
    label: 'Owner and shareholder W-2 adjustments',
    description: 'S corporation 2% shareholder health premiums and other owner-specific W-2 items.',
  },
  {
    key: 'retirement_benefit_codes',
    label: 'Retirement and benefit code support',
    description:
      'Retirement deferrals, Roth amounts, HSA contributions, and other Box 12 code support.',
  },
  {
    key: 'third_party_sick_pay',
    label: 'Third-party sick pay statements',
    description: 'Provider statements and tax responsibility splits for sick pay wage reporting.',
  },
  {
    key: 'state_local_wage_detail',
    label: 'State and local wage detail',
    description: 'State account IDs plus state and local wages and withholding by jurisdiction.',
  },
  {
    key: 'corrections_w2c',
    label: 'Corrections and W-2c follow-up',
    description: 'Outstanding corrections, reissued copies, and prior-year W-2c needs.',
  },
  {
    key: 'delivery_consent',
    label: 'Employee delivery and consent evidence',
    description:
      'Electronic delivery consents, mailing addresses, and employee copy distribution evidence.',
  },
  {
    key: 'provider_confirmation',
    label: 'Provider filing confirmation',
    description: 'Payroll provider W-2 package, SSA submission confirmation, and filing dates.',
  },
  {
    key: 'signer_authorization',
    label: 'Signer and transmission authorization',
    description:
      'Authorized signer, Business Services Online access, and approval to transmit to the SSA.',
  },
])

const GIFT_709 = defineTemplate('709.gift_tax_return', 1, [
  {
    key: 'donor_identity_prior_returns',
    label: 'Donor identity and prior gift tax returns',
    description:
      'Donor details, citizenship, prior Forms 709, and remaining lifetime exclusion support.',
  },
  {
    key: 'gift_details',
    label: 'Gift details and recipients',
    description: 'Gift dates, descriptions, recipients, relationships, and transfer documents.',
  },
  {
    key: 'valuations_appraisals',
    label: 'Valuations and appraisals',
    description:
      'Qualified appraisals, broker statements, and valuation reports as of each gift date.',
  },
  {
    key: 'business_interest_support',
    label: 'Business interest and discount support',
    description:
      'Entity agreements, ownership percentages, valuation reports, and discount analyses.',
  },
  {
    key: 'trust_documents',
    label: 'Trust documents and withdrawal notices',
    description:
      'Trust agreements, beneficiary withdrawal (Crummey) notices, and trustee details for gifts in trust.',
  },
  {
    key: 'gift_splitting',
    label: 'Gift-splitting consent facts',
    description:
      'Spouse consent, marital status dates, and both spouses’ gift detail when splitting gifts.',
  },
  {
    key: 'education_medical_529',
    label: '529 plans and excluded transfers',
    description:
      '529 contributions, five-year election facts, and direct tuition or medical payments.',
  },
  {
    key: 'charitable_gifts',
    label: 'Charitable gift support',
    description: 'Charity names, amounts, appraisals, and split-interest trust documents.',
  },
  {
    key: 'gst_allocation',
    label: 'GST exemption allocation facts',
    description:
      'Skip persons, trust GST status, prior allocations, and elections in or out of automatic allocation.',
  },
  {
    key: 'adequate_disclosure',
    label: 'Adequate disclosure support',
    description:
      'Descriptions, valuation methods, and statements needed to start the statute of limitations.',
  },
  {
    key: 'extension_status',
    label: 'Extension status',
    description: 'Form 4868 or Form 8892 filings that extend the gift tax return due date.',
  },
  {
    key: 'signature_payment_authorization',
    label: 'Signature and payment authorization',
    description:
      'Donor signer details, payment preference, and approval to file the gift tax return.',
  },
])

const BENEFIT_PLAN_5500 = defineTemplate('5500.benefit_plan_return', 1, [
  {
    key: 'plan_documents',
    label: 'Plan document and amendments',
    description:
      'Plan document, adoption agreement, amendments, and IRS determination or opinion letters.',
  },
  {
    key: 'plan_identifiers',
    label: 'Plan identifiers and filing history',
    description: 'Sponsor EIN, plan number, plan year, prior Form 5500 filings, and EFAST2 access.',
  },
  {
    key: 'participant_counts',
    label: 'Participant counts',
    description:
      'Eligible, active, and terminated participant counts at year start and end for the filing variant and audit threshold.',
  },
  {
    key: 'trust_statements',
    label: 'Trust and custodial statements',
    description:
      'Trust, custodial, brokerage, and insurance contract statements with year-end asset values.',
  },
  {
    key: 'contribution_records',
    label: 'Contribution records and deposit timeliness',
    description:
      'Employer and employee contributions, payroll deposit dates, and late-deposit analysis.',
  },
  {
    key: 'distributions_loans',
    label: 'Distributions, loans, and rollovers',
    description:
      'Distribution detail, participant loans, defaults, rollovers, and Form 1099-R support.',
  },
  {
    key: 'fidelity_bond',
    label: 'Fidelity bond coverage',
    description: 'Bond carrier, coverage amount, and policy period for ERISA bonding.',
  },
  {
    key: 'service_provider_fees',
    label: 'Service provider and fee disclosures',
    description:
      'TPA, advisor, and custodian fees plus Schedule C compensation detail when required.',
  },
  {
    key: 'audit_report',
    label: 'Independent audit report',
    description:
      'Audited plan financial statements when participant counts require a large-plan audit.',
  },
  {
    key: 'compliance_testing',
    label: 'Compliance testing results',
    description:
      'Nondiscrimination testing, top-heavy results, and corrective distribution support.',
  },
  {
    key: 'extension_status',
    label: 'Extension status',
    description:
      'Form 5558 filing, corporate extension reliance, and delinquent-filer program facts if late.',
  },
  {
    key: 'signer_authorization',
    label: 'Signer and filing authorization',
    description:
      'Plan sponsor or administrator signer, EFAST2 signing credentials, and approval to file.',
  },
])

const FRANCHISE_ANNUAL = defineTemplate('franchise.annual_entity_filing', 1, [
  {
    key: 'prior_filing',
    label: 'Prior report and account standing',
    description: 'Prior franchise or annual report, account status, and authority correspondence.',
  },
  {
    key: 'registration_ids',
    label: 'Registration and file numbers',
    description:
      'State file numbers, taxpayer IDs, Secretary of State registration, and portal access.',
  },
  {
    key: 'revenue_support',
    label: 'Revenue and receipts support',
    description: 'Gross receipts, total revenue, and accounting records tied to the report basis.',
  },
  {
    key: 'base_deductions',
    label: 'Margin or tax-base deduction support',
    description:
      'Cost of goods sold, compensation, or other base deductions where the state allows them.',
  },
  {
    key: 'apportionment',
    label: 'Apportionment detail',
    description: 'In-state versus everywhere receipts and apportionment factor support.',
  },
  {
    key: 'threshold_facts',
    label: 'Threshold and no-tax-due facts',
    description:
      'Revenue thresholds, minimum or flat fee tiers, and small-entity exemption support.',
  },
  {
    key: 'entity_facts',
    label: 'Entity facts and ownership changes',
    description: 'Legal name, formation date, ownership, and management or member changes.',
  },
  {
    key: 'officers_agents',
    label: 'Officers, directors, and registered agent',
    description:
      'Officer and director roster, registered agent, and office addresses for public reports.',
  },
  {
    key: 'payment_confirmations',
    label: 'Payments and credits',
    description: 'Prepayments, extensions paid, credits, and payment confirmations.',
  },
  {
    key: 'extension_status',
    label: 'Extension status',
    description: 'Franchise extension filings and payment-with-extension requirements.',
  },
  {
    key: 'notices',
    label: 'Notices and assessments',
    description: 'Penalty notices, forfeiture warnings, and authority correspondence to resolve.',
  },
  {
    key: 'signer_authorization',
    label: 'Signer and submission authorization',
    description: 'Authorized signer, portal credentials, and approval to file and pay.',
  },
])

const GENERIC = defineTemplate('generic.fallback_readiness', 1, [
  {
    key: 'prior_filing',
    label: 'Prior filing or notice',
    description:
      'Prior return, notice, filing confirmation, or authority correspondence for this obligation.',
  },
  {
    key: 'source_documents',
    label: 'Source documents',
    description: 'Client records needed to prepare, review, or confirm this filing.',
  },
  {
    key: 'bookkeeping_export',
    label: 'Bookkeeping export',
    description:
      'Accounting system export, supporting schedules, or organizer package for the period.',
  },
  {
    key: 'income_activity',
    label: 'Income and activity records',
    description:
      'Revenue, receipts, activity reports, statements, and other taxable activity support.',
  },
  {
    key: 'expense_deduction',
    label: 'Expense and deduction records',
    description:
      'Expense detail, deductions, credits, reimbursement support, and adjustment schedules.',
  },
  {
    key: 'ownership_signer',
    label: 'Ownership and signer facts',
    description:
      'Current owners, responsible party, signer name, title, email, and authorization details.',
  },
  {
    key: 'jurisdiction_account',
    label: 'Jurisdiction account details',
    description: 'Account IDs, registration status, filing frequency, portal access, and notices.',
  },
  {
    key: 'payments_credits',
    label: 'Payments, credits, and overpayments',
    description:
      'Payments made, credits, extensions paid, overpayments applied, and payment confirmations.',
  },
  {
    key: 'state_local_facts',
    label: 'State and local facts',
    description:
      'Jurisdiction-specific facts, apportionment, residency, locations, and local obligations.',
  },
  {
    key: 'open_questions',
    label: 'Open client confirmations',
    description:
      'Ownership, address, signer, payment, filing, or activity facts the preparer needs confirmed.',
  },
  {
    key: 'review_notes',
    label: 'Review notes and exceptions',
    description:
      'Known exceptions, unusual transactions, CPA review notes, and unresolved follow-up items.',
  },
  {
    key: 'signature_payment',
    label: 'Signature and payment authorization',
    description:
      'Signer approval, bank account, payment preference, and final submission authorization.',
  },
])

export const READINESS_DOCUMENT_TEMPLATE_CATALOG = [
  ESTIMATED_TAX,
  INDIVIDUAL_1040,
  S_CORP_1120S,
  PARTNERSHIP_1065,
  C_CORP_1120,
  FIDUCIARY_1041,
  PAYROLL_941,
  WAGE_STATEMENTS_W2,
  INFORMATION_1099,
  FOREIGN_REPORTING,
  NONPROFIT_990,
  GIFT_709,
  BENEFIT_PLAN_5500,
  SALES_TAX,
  FRANCHISE_ANNUAL,
  GENERIC,
] as const

export function selectReadinessDocumentTemplate(
  input: ReadinessDocumentChecklistInput,
): ReadinessDocumentChecklistTemplate {
  const obligation = searchableObligation(input)
  const client = searchableClient(input)

  // Pass 1 — the obligation's own signals (tax type, form, obligation type)
  // pick the checklist. Ordering encodes precedence: specialty filings and
  // operational filings (payroll, information, sales) before the entity
  // return families; franchise before partnership so IT-204-LL wins over the
  // it204 return pattern; S corp forms before the broader 1120/CT-3 patterns.
  if (matchesAny(obligation, ['1040_estimated_tax', '1120_estimated_tax', 'estimated_tax'])) {
    return ESTIMATED_TAX
  }
  if (matchesAny(obligation, ['709', 'gift'])) {
    return GIFT_709
  }
  if (matchesAny(obligation, ['5500', 'benefit_plan'])) {
    return BENEFIT_PLAN_5500
  }
  if (
    matchesAny(obligation, [
      'fbar',
      '8938',
      '5471',
      '5472',
      '8865',
      '8858',
      '3520',
      'foreign',
      'fincen',
    ])
  ) {
    return FOREIGN_REPORTING
  }
  if (matchesAny(obligation, ['990', '8868', 'nonprofit', 'exempt_organization'])) {
    return NONPROFIT_990
  }
  if (
    matchesAny(obligation, [
      '941',
      '940',
      'payroll',
      'withholding',
      'ui_wage',
      'wage_report',
      'services_tax',
    ])
  ) {
    return PAYROLL_941
  }
  if (matchesAny(obligation, ['w_2', 'w2', 'w_3', 'w3', 'wage_statement'])) {
    return WAGE_STATEMENTS_W2
  }
  if (matchesAny(obligation, ['1099', 'information_return'])) {
    return INFORMATION_1099
  }
  if (matchesAny(obligation, ['sales_tax', 'sales_use', 'combined_excise', 'excise'])) {
    return SALES_TAX
  }
  if (matchesAny(obligation, ['1040', 'individual', 'schedule_c', 'sch_c'])) {
    return INDIVIDUAL_1040
  }
  if (matchesAny(obligation, ['1120_s', '1120s', '100s', 'ct3s', 'ct_3_s', 's_corporation'])) {
    return S_CORP_1120S
  }
  if (matchesAny(obligation, ['1120', '100_franchise', '100_', 'ct3', 'ct_3', 'f1120'])) {
    return C_CORP_1120
  }
  if (
    matchesAny(obligation, [
      'franchise',
      'annual_report',
      'it204ll',
      'llc_annual_tax',
      'llc_estimated_fee',
      'llc_filing_fee',
      'llc_fee',
      'no_tax_due',
      'pir_oir',
    ])
  ) {
    return FRANCHISE_ANNUAL
  }
  if (matchesAny(obligation, ['1065', '565', '568', 'it204', 'partnership'])) {
    return PARTNERSHIP_1065
  }
  if (matchesAny(obligation, ['1041', '541', 'it205', 'fiduciary', 'trust', 'estate'])) {
    return FIDUCIARY_1041
  }

  // Pass 2 — entity / tax-classification fallback for return-shaped
  // obligations the obligation signals could not classify (extensions,
  // PTET filings, generic state business returns).
  if (matchesAny(client, ['individual', 'sole_prop'])) {
    return INDIVIDUAL_1040
  }
  if (matchesAny(client, ['s_corp', 's_corporation'])) {
    return S_CORP_1120S
  }
  if (matchesAny(client, ['partnership'])) {
    return PARTNERSHIP_1065
  }
  if (matchesAny(client, ['c_corp'])) {
    return C_CORP_1120
  }
  if (matchesAny(client, ['trust', 'estate'])) {
    return FIDUCIARY_1041
  }
  if (matchesAny(client, ['nonprofit'])) {
    return NONPROFIT_990
  }

  return GENERIC
}

export function generateReadinessDocumentChecklist(
  input: ReadinessDocumentChecklistInput,
): ReadinessDocumentChecklistTemplateItem[] {
  return copyTemplate(selectReadinessDocumentTemplate(input))
}
