import type { ClientPublic, ObligationCreateInput } from '@duedatehq/contracts'

type ObligationTypeValue = NonNullable<ObligationCreateInput['obligationType']>
type ClientEntityType = ClientPublic['entityType']

type ClientFlag = 'hasPayroll' | 'hasSalesTax' | 'has1099Vendors' | 'hasForeignAccounts'
export type DeadlineCategoryGenerationStatus = 'rule_backed' | 'rule_review_required'

export type DeadlineCategorySuggestion = {
  value: string
  label: string
  description: string
  generationStatus: DeadlineCategoryGenerationStatus
  formName?: string
  formNamesByJurisdiction?: Readonly<Record<string, string>>
  jurisdiction?: string
  taxTypesByJurisdiction?: Readonly<Record<string, string>>
  obligationType?: ObligationTypeValue
  entityTypes?: readonly ClientEntityType[]
  states?: readonly string[]
  flags?: readonly ClientFlag[]
  priority: number
  isSpecialty?: boolean
}

export type FormVoucherSuggestion = {
  value: string
  label: string
  description?: string
}

export const DEADLINE_CATEGORY_SUGGESTIONS: readonly DeadlineCategorySuggestion[] = [
  {
    value: 'individual_income_tax_return',
    label: 'Individual income tax return',
    description: 'Income return for individual clients; use Jurisdiction for the tax agency',
    generationStatus: 'rule_backed',
    formName: 'Form 1040',
    taxTypesByJurisdiction: { FED: 'federal_1040' },
    formNamesByJurisdiction: { FED: 'Form 1040' },
    entityTypes: ['individual', 'sole_prop'],
    priority: 10,
  },
  {
    value: 'individual_estimated_tax_payment',
    label: 'Individual estimated tax payment',
    description: 'Estimated income tax payment for individuals',
    generationStatus: 'rule_backed',
    formName: 'Form 1040-ES',
    taxTypesByJurisdiction: { FED: 'federal_1040_estimated_tax' },
    formNamesByJurisdiction: { FED: 'Form 1040-ES' },
    obligationType: 'payment',
    entityTypes: ['individual', 'sole_prop'],
    priority: 20,
  },
  {
    value: 'trust_estate_income_tax_return',
    label: 'Trust and estate income tax return',
    description: 'Income return for trusts and estates; use Jurisdiction for the tax agency',
    generationStatus: 'rule_backed',
    formName: 'Form 1041',
    taxTypesByJurisdiction: { FED: 'federal_1041', CA: 'ca_541', NY: 'ny_it205' },
    formNamesByJurisdiction: { FED: 'Form 1041', CA: 'Form 541', NY: 'Form IT-205' },
    entityTypes: ['trust'],
    priority: 10,
  },
  {
    value: 'partnership_income_tax_return',
    label: 'Partnership income tax return',
    description: 'Income return for partnerships and multi-member LLCs',
    generationStatus: 'rule_backed',
    formName: 'Form 1065',
    taxTypesByJurisdiction: { FED: 'federal_1065', NY: 'ny_it204' },
    formNamesByJurisdiction: { FED: 'Form 1065', NY: 'Form IT-204' },
    entityTypes: ['partnership', 'llc'],
    priority: 10,
  },
  {
    value: 's_corporation_income_tax_return',
    label: 'S corporation income tax return',
    description: 'Income return for S corporations; use Jurisdiction for the tax agency',
    generationStatus: 'rule_backed',
    formName: 'Form 1120-S',
    taxTypesByJurisdiction: { FED: 'federal_1120s', CA: 'ca_100s', NY: 'ny_ct3s' },
    formNamesByJurisdiction: { FED: 'Form 1120-S', CA: 'Form 100S', NY: 'Form CT-3-S' },
    entityTypes: ['s_corp'],
    priority: 10,
  },
  {
    value: 'c_corporation_income_tax_return',
    label: 'C corporation income tax return',
    description: 'Income return for C corporations; use Jurisdiction for the tax agency',
    generationStatus: 'rule_backed',
    formName: 'Form 1120',
    taxTypesByJurisdiction: { FED: 'federal_1120', CA: 'ca_100', NY: 'ny_ct3' },
    formNamesByJurisdiction: { FED: 'Form 1120', CA: 'Form 100', NY: 'Form CT-3' },
    entityTypes: ['c_corp'],
    priority: 10,
  },
  {
    value: 'business_return_extension',
    label: 'Business return extension',
    description: 'Extension request for business, trust, or estate income returns',
    generationStatus: 'rule_backed',
    formName: 'Form 7004',
    jurisdiction: 'FED',
    taxTypesByJurisdiction: { FED: 'federal_7004' },
    formNamesByJurisdiction: { FED: 'Form 7004' },
    entityTypes: ['llc', 's_corp', 'partnership', 'c_corp', 'trust'],
    priority: 20,
  },
  {
    value: 'individual_return_extension',
    label: 'Individual return extension',
    description: 'Extension request for individual income tax returns',
    generationStatus: 'rule_backed',
    formName: 'Form 4868',
    jurisdiction: 'FED',
    taxTypesByJurisdiction: { FED: 'federal_1040_extension' },
    formNamesByJurisdiction: { FED: 'Form 4868' },
    entityTypes: ['individual', 'sole_prop'],
    priority: 30,
  },
  {
    value: 'employer_payroll_tax_return',
    label: 'Employer quarterly payroll return',
    description: 'Quarterly payroll tax return for employers',
    generationStatus: 'rule_backed',
    formName: 'Form 941',
    jurisdiction: 'FED',
    taxTypesByJurisdiction: { FED: 'federal_941' },
    formNamesByJurisdiction: { FED: 'Form 941' },
    flags: ['hasPayroll'],
    priority: 40,
  },
  {
    value: 'payroll_tax_deposit',
    label: 'Payroll tax deposit',
    description: 'Employer payroll tax deposit; rule review required for deposit schedule',
    generationStatus: 'rule_review_required',
    formName: 'Payroll deposit',
    taxTypesByJurisdiction: { FED: 'federal_payroll_deposit_monthly' },
    formNamesByJurisdiction: { FED: 'Payroll deposit' },
    obligationType: 'deposit',
    flags: ['hasPayroll'],
    priority: 45,
  },
  {
    value: 'information_returns',
    label: 'Information returns',
    description: 'Annual contractor, vendor, and other information reporting',
    generationStatus: 'rule_backed',
    formName: 'Form 1099-NEC',
    jurisdiction: 'FED',
    taxTypesByJurisdiction: { FED: 'federal_1099_nec' },
    formNamesByJurisdiction: { FED: 'Form 1099-NEC' },
    obligationType: 'information',
    flags: ['has1099Vendors'],
    priority: 50,
  },
  {
    value: 'franchise_annual_tax_payment',
    label: 'Franchise or annual tax payment',
    description: 'State business franchise, annual, or filing-fee payment',
    generationStatus: 'rule_backed',
    formName: 'Annual tax voucher',
    taxTypesByJurisdiction: {
      CA: 'ca_llc_annual_tax',
      NY: 'ny_it204ll',
      TX: 'tx_franchise_report',
    },
    formNamesByJurisdiction: {
      CA: 'FTB 3522',
      NY: 'Form IT-204-LL',
      TX: 'Texas franchise tax report',
    },
    obligationType: 'payment',
    entityTypes: ['llc', 's_corp', 'partnership', 'c_corp'],
    priority: 60,
  },
  {
    value: 'sales_excise_tax_return',
    label: 'Sales or excise tax return',
    description: 'Sales, use, gross receipts, or excise tax return',
    generationStatus: 'rule_backed',
    formName: 'Combined Excise Tax Return',
    taxTypesByJurisdiction: { WA: 'wa_combined_excise_quarterly' },
    formNamesByJurisdiction: { WA: 'Combined Excise Tax Return' },
    entityTypes: ['llc', 's_corp', 'partnership', 'c_corp', 'sole_prop'],
    flags: ['hasSalesTax'],
    priority: 70,
  },
  {
    value: 'foreign_bank_account_report',
    label: 'Foreign bank account report',
    description: 'Specialty foreign account reporting',
    generationStatus: 'rule_backed',
    formName: 'FinCEN Form 114',
    jurisdiction: 'FED',
    taxTypesByJurisdiction: { FED: 'federal_fbar' },
    formNamesByJurisdiction: { FED: 'FinCEN Form 114' },
    obligationType: 'information',
    flags: ['hasForeignAccounts'],
    priority: 90,
    isSpecialty: true,
  },
] as const

export const COMMON_FORM_VOUCHER_SUGGESTIONS: readonly FormVoucherSuggestion[] = Array.from(
  new Map(
    DEADLINE_CATEGORY_SUGGESTIONS.flatMap((option) => {
      const names = new Set([
        ...(option.formName ? [option.formName] : []),
        ...Object.values(option.formNamesByJurisdiction ?? {}),
      ])
      return Array.from(names).map(
        (formName) =>
          [
            formName,
            {
              value: formName,
              label: formName,
              description: option.label,
            } satisfies FormVoucherSuggestion,
          ] as const,
      )
    }),
  ).values(),
)

function compareSuggestions(a: DeadlineCategorySuggestion, b: DeadlineCategorySuggestion) {
  return a.priority - b.priority || a.label.localeCompare(b.label)
}

export function listDeadlineCategorySuggestions(): readonly DeadlineCategorySuggestion[] {
  return DEADLINE_CATEGORY_SUGGESTIONS.toSorted(compareSuggestions)
}

function normalizeJurisdictionForMapping(value: string): string {
  const normalized = value.trim().toUpperCase()
  if (
    normalized === 'FEDERAL' ||
    normalized === 'IRS' ||
    normalized === 'US' ||
    normalized === 'USA'
  ) {
    return 'FED'
  }
  return normalized
}

export function resolveDeadlineCategoryForInput(input: {
  value: string
  jurisdiction: string
  formName: string
}): { taxType: string; formName: string | null } {
  const option = DEADLINE_CATEGORY_SUGGESTIONS.find((candidate) => candidate.value === input.value)
  if (!option) {
    return {
      taxType: input.value.trim(),
      formName: input.formName.trim() || null,
    }
  }

  const jurisdiction = normalizeJurisdictionForMapping(input.jurisdiction)
  const taxType =
    option.taxTypesByJurisdiction?.[jurisdiction] ??
    option.taxTypesByJurisdiction?.FED ??
    option.value
  const mappedFormName =
    option.formNamesByJurisdiction?.[jurisdiction] ?? option.formNamesByJurisdiction?.FED
  const trimmedFormName = input.formName.trim()
  const shouldUseMappedForm = trimmedFormName.length === 0 || trimmedFormName === option.formName
  if (!shouldUseMappedForm) {
    return { taxType, formName: trimmedFormName }
  }

  const formName = mappedFormName ?? trimmedFormName
  return { taxType, formName: formName.length > 0 ? formName : null }
}
