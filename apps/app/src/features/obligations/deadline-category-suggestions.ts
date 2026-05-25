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

export type FormVoucherSuggestion = {
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

export type ResolvedDeadlineCategory = {
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
