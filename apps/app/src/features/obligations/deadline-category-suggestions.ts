import type { ClientPublic, ObligationCreateInput } from '@duedatehq/contracts'

type ObligationTypeValue = NonNullable<ObligationCreateInput['obligationType']>
type ClientEntityType = ClientPublic['entityType']

type ClientFlag = 'hasPayroll' | 'hasSalesTax' | 'has1099Vendors' | 'hasForeignAccounts'
export type DeadlineCategoryGenerationStatus = 'rule_backed' | 'rule_review_required'

type StateGenericRuleMapping = {
  taxTypeSuffix: string
  formName: string
}

export type DeadlineCategorySuggestion = {
  value: string
  label: string
  description: string
  generationStatus: DeadlineCategoryGenerationStatus
  formName?: string
  formNamesByJurisdiction?: Readonly<Record<string, string>>
  jurisdiction?: string
  taxTypesByJurisdiction?: Readonly<Record<string, string>>
  stateGenericMappings?: readonly StateGenericRuleMapping[]
  obligationType?: ObligationTypeValue
  entityTypes?: readonly ClientEntityType[]
  states?: readonly string[]
  flags?: readonly ClientFlag[]
  priority: number
  isSpecialty?: boolean
}

type FormVoucherSuggestion = {
  value: string
  label: string
  description?: string
}

export type ResolvedDeadlineRuleCandidate = {
  taxType: string
  formName: string | null
  matchFormName: string | null
  source: 'custom' | 'explicit' | 'state_generic'
}

type ResolvedDeadlineCategory = {
  candidates: readonly ResolvedDeadlineRuleCandidate[]
  normalizedJurisdiction: string
  customFormName: string | null
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
    stateGenericMappings: [
      {
        taxTypeSuffix: 'state_individual_income_tax',
        formName: 'State individual income tax return',
      },
    ],
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
    stateGenericMappings: [
      {
        taxTypeSuffix: 'state_individual_estimated_tax',
        formName: 'State individual estimated tax',
      },
    ],
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
    stateGenericMappings: [
      {
        taxTypeSuffix: 'state_fiduciary_income_tax',
        formName: 'State fiduciary income tax return',
      },
    ],
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
    stateGenericMappings: [
      {
        taxTypeSuffix: 'state_pte_composite_ptet',
        formName: 'State pass-through entity return',
      },
      {
        taxTypeSuffix: 'state_business_income_tax',
        formName: 'State business income return',
      },
    ],
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
    stateGenericMappings: [
      {
        taxTypeSuffix: 'state_business_income_tax',
        formName: 'State business income return',
      },
      {
        taxTypeSuffix: 'state_pte_composite_ptet',
        formName: 'State pass-through entity return',
      },
    ],
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
    stateGenericMappings: [
      {
        taxTypeSuffix: 'state_business_income_tax',
        formName: 'State business income return',
      },
    ],
    entityTypes: ['c_corp'],
    priority: 10,
  },
  {
    value: 'nonprofit_annual_return',
    label: 'Nonprofit annual return',
    description: 'Annual information return for exempt organizations (990 series)',
    generationStatus: 'rule_backed',
    formName: 'Form 990 / 990-EZ / 990-N / 990-PF',
    jurisdiction: 'FED',
    taxTypesByJurisdiction: { FED: 'federal_990' },
    formNamesByJurisdiction: { FED: 'Form 990 / 990-EZ / 990-N / 990-PF' },
    entityTypes: ['c_corp', 'other'],
    priority: 12,
  },
  {
    value: 'business_estimated_tax_payment',
    label: 'Business estimated tax payment',
    description:
      'Quarterly estimated income tax payments for corporations; rule review required for the installment schedule',
    generationStatus: 'rule_review_required',
    formName: 'Estimated tax payments',
    taxTypesByJurisdiction: { FED: 'federal_1120_estimated_tax' },
    formNamesByJurisdiction: { FED: 'Estimated tax payments' },
    stateGenericMappings: [
      {
        taxTypeSuffix: 'state_business_estimated_tax',
        formName: 'State business estimated tax',
      },
    ],
    obligationType: 'payment',
    entityTypes: ['c_corp', 's_corp'],
    priority: 22,
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
    value: 'employer_annual_payroll_return',
    label: 'Employer annual FUTA return',
    description: 'Annual federal unemployment tax return for employers',
    generationStatus: 'rule_backed',
    formName: 'Form 940',
    jurisdiction: 'FED',
    taxTypesByJurisdiction: { FED: 'federal_940' },
    formNamesByJurisdiction: { FED: 'Form 940' },
    flags: ['hasPayroll'],
    priority: 41,
  },
  {
    value: 'wage_statement_filing',
    label: 'Wage statements',
    description: 'Annual W-2 wage statement filing with the SSA plus employee copies',
    generationStatus: 'rule_backed',
    formName: 'Form W-2 / W-3',
    jurisdiction: 'FED',
    taxTypesByJurisdiction: { FED: 'federal_w2_w3' },
    formNamesByJurisdiction: { FED: 'Form W-2 / W-3' },
    obligationType: 'information',
    flags: ['hasPayroll'],
    priority: 42,
  },
  {
    value: 'state_payroll_withholding_return',
    label: 'State payroll withholding return',
    description:
      'State income tax withholding returns and reconciliations for employers; use Jurisdiction for the state',
    generationStatus: 'rule_review_required',
    formName: 'State withholding tax return',
    stateGenericMappings: [
      {
        taxTypeSuffix: 'state_withholding_tax',
        formName: 'State withholding tax return',
      },
    ],
    entityTypes: ['llc', 's_corp', 'partnership', 'c_corp', 'sole_prop'],
    flags: ['hasPayroll'],
    priority: 43,
  },
  {
    value: 'state_unemployment_wage_report',
    label: 'State unemployment wage report',
    description:
      'Quarterly state unemployment contribution and wage reports for employers; use Jurisdiction for the state',
    generationStatus: 'rule_review_required',
    formName: 'State unemployment contribution and wage report',
    stateGenericMappings: [
      {
        taxTypeSuffix: 'state_ui_wage_report',
        formName: 'State unemployment contribution and wage report',
      },
    ],
    obligationType: 'information',
    entityTypes: ['llc', 's_corp', 'partnership', 'c_corp', 'sole_prop'],
    flags: ['hasPayroll'],
    priority: 44,
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
    value: 'information_returns_misc',
    label: 'Miscellaneous information returns',
    description: 'Annual 1099-MISC reporting for rents, royalties, and other payments',
    generationStatus: 'rule_backed',
    formName: 'Form 1099-MISC',
    jurisdiction: 'FED',
    taxTypesByJurisdiction: { FED: 'federal_1099_misc' },
    formNamesByJurisdiction: { FED: 'Form 1099-MISC' },
    obligationType: 'information',
    flags: ['has1099Vendors'],
    priority: 51,
  },
  {
    value: 'franchise_annual_tax_payment',
    label: 'Franchise or annual tax payment',
    description: 'State business franchise, annual report, or filing-fee payment',
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
    stateGenericMappings: [
      {
        taxTypeSuffix: 'state_franchise_or_entity_tax',
        formName: 'State franchise or entity tax',
      },
    ],
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
    stateGenericMappings: [
      {
        taxTypeSuffix: 'state_sales_use_tax',
        formName: 'State sales and use tax return',
      },
    ],
    entityTypes: ['llc', 's_corp', 'partnership', 'c_corp', 'sole_prop'],
    flags: ['hasSalesTax'],
    priority: 70,
  },
  {
    value: 'gift_tax_return',
    label: 'Gift tax return',
    description: 'Gift tax return for individuals who made reportable gifts',
    generationStatus: 'rule_backed',
    formName: 'Form 709',
    jurisdiction: 'FED',
    taxTypesByJurisdiction: { FED: 'federal_709' },
    formNamesByJurisdiction: { FED: 'Form 709' },
    entityTypes: ['individual'],
    priority: 85,
    isSpecialty: true,
  },
  {
    value: 'employee_benefit_plan_return',
    label: 'Employee benefit plan return',
    description: 'Annual retirement and benefit plan return for plan sponsors',
    generationStatus: 'rule_backed',
    formName: 'Form 5500',
    jurisdiction: 'FED',
    taxTypesByJurisdiction: { FED: 'federal_5500' },
    formNamesByJurisdiction: { FED: 'Form 5500' },
    obligationType: 'information',
    entityTypes: ['sole_prop', 'llc', 's_corp', 'partnership', 'c_corp'],
    priority: 88,
    isSpecialty: true,
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
        ...(option.stateGenericMappings?.map((mapping) => mapping.formName) ?? []),
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

function formVoucherSuggestion(
  formName: string,
  option: DeadlineCategorySuggestion,
): FormVoucherSuggestion {
  return {
    value: formName,
    label: formName,
    description: option.label,
  }
}

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

function isStateJurisdiction(value: string): boolean {
  return /^[A-Z]{2}$/.test(value) && value !== 'US'
}

function stateTaxType(jurisdiction: string, suffix: string): string {
  return `${jurisdiction.toLowerCase()}_${suffix}`
}

function deadlineCategoryOption(value: string): DeadlineCategorySuggestion | null {
  return DEADLINE_CATEGORY_SUGGESTIONS.find((candidate) => candidate.value === value) ?? null
}

function addUniqueFormName(target: string[], formName: string | null | undefined) {
  const trimmed = formName?.trim()
  if (!trimmed) return
  if (target.some((candidate) => candidate.toLowerCase() === trimmed.toLowerCase())) return
  target.push(trimmed)
}

export function listFormVoucherSuggestionsForInput(input: {
  value: string
  jurisdiction: string
}): readonly FormVoucherSuggestion[] {
  const option = deadlineCategoryOption(input.value)
  if (!option) return []

  const jurisdiction = normalizeJurisdictionForMapping(input.jurisdiction)
  const formNames: string[] = []
  addUniqueFormName(formNames, option.formNamesByJurisdiction?.[jurisdiction])

  if (isStateJurisdiction(jurisdiction)) {
    for (const mapping of option.stateGenericMappings ?? []) {
      addUniqueFormName(formNames, mapping.formName)
    }
  }

  addUniqueFormName(formNames, option.formNamesByJurisdiction?.FED ?? option.formName)
  return formNames.map((formName) => formVoucherSuggestion(formName, option))
}

function defaultFormNamesForOption(option: DeadlineCategorySuggestion): ReadonlySet<string> {
  return new Set(
    [
      option.formName,
      ...Object.values(option.formNamesByJurisdiction ?? {}),
      ...(option.stateGenericMappings?.map((mapping) => mapping.formName) ?? []),
    ].flatMap((formName) => {
      const trimmed = formName?.trim()
      return trimmed ? [trimmed.toLowerCase()] : []
    }),
  )
}

export function isDeadlineCategoryDefaultFormName(input: {
  value: string
  formName: string
}): boolean {
  const option = deadlineCategoryOption(input.value)
  if (!option) return false
  const normalized = input.formName.trim().toLowerCase()
  return normalized.length > 0 && defaultFormNamesForOption(option).has(normalized)
}

export function preferredDeadlineCategoryFormName(input: {
  value: string
  jurisdiction: string
}): string | null {
  return (
    resolveDeadlineCategoryForInput({ ...input, formName: '' }).candidates[0]?.formName ??
    deadlineCategoryOption(input.value)?.formName ??
    null
  )
}

const STATE_GENERIC_TAX_TYPE_RE = /^[a-z]{2}_(state_[a-z0-9_]+)$/

/**
 * Whether some dropdown category already resolves to this rule taxType
 * (explicitly or through a state-generic suffix). The create dialog uses the
 * complement to surface accepted or custom rules the static catalog doesn't
 * reach as their own selectable categories.
 */
export function isTaxTypeCoveredByDeadlineCategories(taxType: string): boolean {
  const normalized = taxType.trim().toLowerCase()
  if (normalized.length === 0) return true
  const suffix = STATE_GENERIC_TAX_TYPE_RE.exec(normalized)?.[1] ?? null
  return DEADLINE_CATEGORY_SUGGESTIONS.some(
    (option) =>
      Object.values(option.taxTypesByJurisdiction ?? {}).includes(normalized) ||
      (suffix !== null &&
        (option.stateGenericMappings?.some((mapping) => mapping.taxTypeSuffix === suffix) ??
          false)),
  )
}

export function resolveDeadlineCategoryForInput(input: {
  value: string
  jurisdiction: string
  formName: string
}): ResolvedDeadlineCategory {
  const option = deadlineCategoryOption(input.value)
  const customFormName = input.formName.trim() || null
  if (!option) {
    return {
      normalizedJurisdiction: normalizeJurisdictionForMapping(input.jurisdiction),
      customFormName,
      candidates: [
        {
          taxType: input.value.trim(),
          formName: customFormName,
          matchFormName: customFormName,
          source: 'custom',
        },
      ],
    }
  }

  const jurisdiction = normalizeJurisdictionForMapping(input.jurisdiction)
  const isKnownDefaultForm =
    customFormName !== null &&
    isDeadlineCategoryDefaultFormName({ value: input.value, formName: customFormName })
  const matchFormName = customFormName !== null && !isKnownDefaultForm ? customFormName : null
  const candidates: ResolvedDeadlineRuleCandidate[] = []
  const explicitTaxType = option.taxTypesByJurisdiction?.[jurisdiction]
  const explicitFormName = option.formNamesByJurisdiction?.[jurisdiction] ?? option.formName ?? null

  if (explicitTaxType) {
    candidates.push({
      taxType: explicitTaxType,
      formName: matchFormName ? customFormName : explicitFormName,
      matchFormName,
      source: 'explicit',
    })
  }

  if (isStateJurisdiction(jurisdiction)) {
    for (const mapping of option.stateGenericMappings ?? []) {
      const taxType = stateTaxType(jurisdiction, mapping.taxTypeSuffix)
      if (candidates.some((candidate) => candidate.taxType === taxType)) continue
      candidates.push({
        taxType,
        formName: matchFormName ? customFormName : mapping.formName,
        matchFormName,
        source: 'state_generic',
      })
    }
  }

  return {
    normalizedJurisdiction: jurisdiction,
    customFormName: matchFormName,
    candidates,
  }
}
