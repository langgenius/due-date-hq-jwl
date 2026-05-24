import type { ClientPublic, ObligationCreateInput } from '@duedatehq/contracts'

type ObligationTypeValue = NonNullable<ObligationCreateInput['obligationType']>
type ClientEntityType = ClientPublic['entityType']

type FilingProfileContext = Pick<ClientPublic['filingProfiles'][number], 'state' | 'taxTypes'>

export type DeadlineCategoryClientContext = Pick<
  ClientPublic,
  | 'entityType'
  | 'state'
  | 'taxClassification'
  | 'hasPayroll'
  | 'has1099Vendors'
  | 'hasForeignAccounts'
  | 'hasK1Activity'
> & {
  filingProfiles: readonly FilingProfileContext[]
}

type ClientFlag = 'hasPayroll' | 'has1099Vendors' | 'hasForeignAccounts' | 'hasK1Activity'

export type DeadlineCategorySuggestion = {
  value: string
  label: string
  description: string
  formName?: string
  jurisdiction?: string
  obligationType?: ObligationTypeValue
  entityTypes?: readonly ClientEntityType[]
  states?: readonly string[]
  flags?: readonly ClientFlag[]
  priority: number
  isSpecialty?: boolean
}

export type DeadlineCategorySuggestionGroups = {
  recommended: readonly DeadlineCategorySuggestion[]
  other: readonly DeadlineCategorySuggestion[]
}

export type FormVoucherSuggestion = {
  value: string
  label: string
  description?: string
}

export const DEADLINE_CATEGORY_SUGGESTIONS: readonly DeadlineCategorySuggestion[] = [
  {
    value: 'federal_1040',
    label: 'Individual income tax return',
    description: 'Federal return for individual clients',
    formName: 'Form 1040',
    jurisdiction: 'FED',
    entityTypes: ['individual', 'sole_prop'],
    priority: 10,
  },
  {
    value: 'federal_1040_estimated_tax',
    label: 'Individual estimated tax payment',
    description: 'Federal estimated tax payment for individuals',
    formName: 'Form 1040-ES',
    jurisdiction: 'FED',
    obligationType: 'payment',
    entityTypes: ['individual', 'sole_prop'],
    priority: 20,
  },
  {
    value: 'federal_1041',
    label: 'Trust and estate income tax return',
    description: 'Federal return for trusts and estates',
    formName: 'Form 1041',
    jurisdiction: 'FED',
    entityTypes: ['trust'],
    priority: 10,
  },
  {
    value: 'federal_1065',
    label: 'Partnership income tax return',
    description: 'Federal return for partnerships and multi-member LLCs',
    formName: 'Form 1065',
    jurisdiction: 'FED',
    entityTypes: ['partnership', 'llc'],
    priority: 10,
  },
  {
    value: 'federal_1120s',
    label: 'S corporation income tax return',
    description: 'Federal return for S corporations',
    formName: 'Form 1120-S',
    jurisdiction: 'FED',
    entityTypes: ['s_corp'],
    priority: 10,
  },
  {
    value: 'federal_1120',
    label: 'C corporation income tax return',
    description: 'Federal return for C corporations',
    formName: 'Form 1120',
    jurisdiction: 'FED',
    entityTypes: ['c_corp'],
    priority: 10,
  },
  {
    value: 'federal_7004',
    label: 'Business return extension',
    description: 'Extension request for business, trust, and estate returns',
    formName: 'Form 7004',
    jurisdiction: 'FED',
    entityTypes: ['llc', 's_corp', 'partnership', 'c_corp', 'trust'],
    priority: 20,
  },
  {
    value: 'schedule_k1_dependency',
    label: 'Schedule K-1 dependency',
    description: 'Track a partner, shareholder, or beneficiary K-1 dependency',
    formName: 'Schedule K-1',
    jurisdiction: 'FED',
    obligationType: 'client_action',
    entityTypes: ['llc', 's_corp', 'partnership', 'trust'],
    flags: ['hasK1Activity'],
    priority: 21,
  },
  {
    value: 'federal_4868',
    label: 'Individual return extension',
    description: 'Extension request for individual returns',
    formName: 'Form 4868',
    jurisdiction: 'FED',
    entityTypes: ['individual', 'sole_prop'],
    priority: 30,
  },
  {
    value: 'federal_941',
    label: 'Employer quarterly payroll return',
    description: 'Federal quarterly payroll tax return for employers',
    formName: 'Form 941',
    jurisdiction: 'FED',
    flags: ['hasPayroll'],
    priority: 40,
  },
  {
    value: 'federal_payroll_deposit_monthly',
    label: 'Payroll tax deposit',
    description: 'Federal payroll tax deposit schedule',
    formName: 'Payroll deposit',
    jurisdiction: 'FED',
    obligationType: 'deposit',
    flags: ['hasPayroll'],
    priority: 45,
  },
  {
    value: 'federal_1099_nec',
    label: 'Nonemployee compensation forms',
    description: 'Annual contractor reporting for nonemployee compensation',
    formName: 'Form 1099-NEC',
    jurisdiction: 'FED',
    obligationType: 'information',
    flags: ['has1099Vendors'],
    priority: 50,
  },
  {
    value: 'ca_llc_annual_tax',
    label: 'California LLC annual tax',
    description: 'California LLC annual tax voucher',
    formName: 'FTB 3522',
    jurisdiction: 'CA',
    obligationType: 'payment',
    entityTypes: ['llc'],
    states: ['CA'],
    priority: 10,
  },
  {
    value: 'ca_llc_568',
    label: 'California LLC return',
    description: 'California LLC return of income',
    formName: 'Form 568',
    jurisdiction: 'CA',
    entityTypes: ['llc'],
    states: ['CA'],
    priority: 20,
  },
  {
    value: 'ca_541',
    label: 'California fiduciary income tax return',
    description: 'California return for trusts and estates',
    formName: 'Form 541',
    jurisdiction: 'CA',
    entityTypes: ['trust'],
    states: ['CA'],
    priority: 25,
  },
  {
    value: 'ca_100s',
    label: 'California S corporation franchise tax return',
    description: 'California return for S corporations',
    formName: 'Form 100S',
    jurisdiction: 'CA',
    entityTypes: ['s_corp'],
    states: ['CA'],
    priority: 20,
  },
  {
    value: 'ca_100',
    label: 'California corporation franchise tax return',
    description: 'California return for C corporations',
    formName: 'Form 100',
    jurisdiction: 'CA',
    entityTypes: ['c_corp'],
    states: ['CA'],
    priority: 20,
  },
  {
    value: 'ny_it204',
    label: 'New York partnership return',
    description: 'New York income return for partnerships',
    formName: 'Form IT-204',
    jurisdiction: 'NY',
    entityTypes: ['partnership', 'llc'],
    states: ['NY'],
    priority: 20,
  },
  {
    value: 'ny_it204ll',
    label: 'New York LLC filing fee',
    description: 'New York annual filing fee for LLCs and partnerships',
    formName: 'Form IT-204-LL',
    jurisdiction: 'NY',
    obligationType: 'payment',
    entityTypes: ['llc', 'partnership'],
    states: ['NY'],
    priority: 10,
  },
  {
    value: 'ny_it205',
    label: 'New York fiduciary income tax return',
    description: 'New York return for estates and trusts',
    formName: 'Form IT-205',
    jurisdiction: 'NY',
    entityTypes: ['trust'],
    states: ['NY'],
    priority: 20,
  },
  {
    value: 'ny_ct3',
    label: 'New York corporation franchise tax return',
    description: 'New York return for C corporations',
    formName: 'Form CT-3',
    jurisdiction: 'NY',
    entityTypes: ['c_corp'],
    states: ['NY'],
    priority: 20,
  },
  {
    value: 'ny_ct3s',
    label: 'New York S corporation franchise tax return',
    description: 'New York return for S corporations',
    formName: 'Form CT-3-S',
    jurisdiction: 'NY',
    entityTypes: ['s_corp'],
    states: ['NY'],
    priority: 20,
  },
  {
    value: 'tx_franchise_report',
    label: 'Texas franchise tax report',
    description: 'Texas annual franchise tax report',
    formName: 'Texas franchise tax report',
    jurisdiction: 'TX',
    entityTypes: ['llc', 's_corp', 'partnership', 'c_corp'],
    states: ['TX'],
    priority: 20,
  },
  {
    value: 'wa_combined_excise_quarterly',
    label: 'Washington excise tax return',
    description: 'Washington combined excise tax return',
    formName: 'Combined Excise Tax Return',
    jurisdiction: 'WA',
    entityTypes: ['llc', 's_corp', 'partnership', 'c_corp', 'sole_prop'],
    states: ['WA'],
    priority: 20,
  },
  {
    value: 'federal_fbar',
    label: 'Foreign bank account report',
    description: 'Specialty FBAR filing through FinCEN',
    formName: 'FinCEN Form 114',
    jurisdiction: 'FED',
    obligationType: 'information',
    flags: ['hasForeignAccounts'],
    priority: 90,
    isSpecialty: true,
  },
] as const

export const COMMON_FORM_VOUCHER_SUGGESTIONS: readonly FormVoucherSuggestion[] = Array.from(
  new Map(
    DEADLINE_CATEGORY_SUGGESTIONS.flatMap((option) => {
      if (!option.formName) return []
      const suggestion: FormVoucherSuggestion = {
        value: option.formName,
        label: option.formName,
        description: option.description,
      }
      return [[option.formName, suggestion] as const]
    }),
  ).values(),
)

function clientStates(client: DeadlineCategoryClientContext): Set<string> {
  return new Set(
    [client.state, ...client.filingProfiles.map((profile) => profile.state)]
      .filter((state): state is string => Boolean(state))
      .map((state) => state.toUpperCase()),
  )
}

function clientTaxTypes(client: DeadlineCategoryClientContext): Set<string> {
  return new Set(client.filingProfiles.flatMap((profile) => profile.taxTypes))
}

function matchesClientFlag(
  option: DeadlineCategorySuggestion,
  client: DeadlineCategoryClientContext,
) {
  return Boolean(option.flags?.some((flag) => client[flag]))
}

function matchesClient(option: DeadlineCategorySuggestion, client: DeadlineCategoryClientContext) {
  if (option.isSpecialty) return false

  const states = clientStates(client)
  if (option.states && !option.states.some((state) => states.has(state))) return false

  const taxTypes = clientTaxTypes(client)
  if (taxTypes.has(option.value)) return true

  if (matchesClientFlag(option, client)) return true

  return Boolean(option.entityTypes?.includes(client.entityType))
}

function compareSuggestions(a: DeadlineCategorySuggestion, b: DeadlineCategorySuggestion) {
  return a.priority - b.priority || a.label.localeCompare(b.label)
}

export function buildDeadlineCategorySuggestions(
  client: DeadlineCategoryClientContext | null,
): DeadlineCategorySuggestionGroups {
  if (!client) {
    const common = DEADLINE_CATEGORY_SUGGESTIONS.filter((option) => !option.isSpecialty)
      .toSorted(compareSuggestions)
      .slice(0, 12)
    const commonValues = new Set(common.map((option) => option.value))
    return {
      recommended: common,
      other: DEADLINE_CATEGORY_SUGGESTIONS.filter(
        (option) => !commonValues.has(option.value),
      ).toSorted(compareSuggestions),
    }
  }

  const recommended = DEADLINE_CATEGORY_SUGGESTIONS.filter((option) =>
    matchesClient(option, client),
  ).toSorted(compareSuggestions)
  const recommendedValues = new Set(recommended.map((option) => option.value))
  return {
    recommended,
    other: DEADLINE_CATEGORY_SUGGESTIONS.filter(
      (option) => !recommendedValues.has(option.value),
    ).toSorted(compareSuggestions),
  }
}
