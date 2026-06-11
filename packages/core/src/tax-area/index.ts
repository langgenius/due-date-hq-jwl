// @duedatehq/core/tax-area — derive an alert's coarse practice / service-line
// "tax area" bucket(s) from the tax rules it cites (and, as a fallback, the
// forms an extractor parsed off the source).
//
// WHY: the alerts list lets firms slice regulatory changes by the service line
// that owns them (individual tax, business tax, sales/use, payroll, franchise,
// compliance). That axis isn't stored on a pulse row — it's derived here, at
// read time, from deterministic rule citations.
//
// SIGNAL ORDER (see taxAreasForAlert):
//   1. `reverifyRuleIds` — rules that deterministically cite the alert's source.
//      Each rule's `taxType` maps to one bucket. This is the primary, precise
//      signal and the only one that covers the "no form number" areas
//      (sales/use, franchise, withholding) cleanly, because those rules are
//      themselves domain-tagged.
//   2. `parsedForms` — fuzzy, extractor-provided form text. Only consulted when
//      (1) yields nothing (e.g. a brand-new source not wired to any rule yet,
//      or 1099/FBAR/BOI compliance notices). Lower confidence by design.
//
// The TaxArea union mirrors `TaxAreaSchema` in @duedatehq/contracts — keep the
// two value lists in sync (contracts is contracts-free of core, and core is
// contracts-free, so the enum is intentionally duplicated like RuleSourceDomain).

import { findRuleById, sourceDomainsForRule, type RuleSourceDomain } from '../rules'

export const TAX_AREAS = [
  'income_individual',
  'income_business',
  'sales_use',
  'payroll_withholding',
  'franchise',
  'info_compliance',
] as const

export type TaxArea = (typeof TAX_AREAS)[number]

// The 14 rule-source domains collapse into 5 of the 6 buckets. The sixth,
// `info_compliance` (1099 / FBAR / BOI), has no rule-source domain and is only
// reachable through the keyword table below.
const DOMAIN_TO_TAX_AREA: Record<RuleSourceDomain, TaxArea> = {
  individual_income_return: 'income_individual',
  individual_estimated_tax: 'income_individual',
  fiduciary_income_return: 'income_individual',
  local_individual_income: 'income_individual',
  business_income_return: 'income_business',
  business_estimated_tax: 'income_business',
  pass_through_entity_return: 'income_business',
  local_business_income: 'income_business',
  franchise_or_entity_tax: 'franchise',
  sales_use_tax: 'sales_use',
  withholding: 'payroll_withholding',
  ui_wage_report: 'payroll_withholding',
  local_employer_withholding: 'payroll_withholding',
  local_services_tax: 'payroll_withholding',
}

// Normalize a taxType id or free-text form to `lower_snake` for keyword tests.
// Same idiom as isLegacyTaxYearProfileTaxType in ../rules.
function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

// Ordered keyword table — FIRST match wins. Used for named federal/state form
// ids (federal_1040, ca_100, ny_it204ll, …) that carry no rule-source domain,
// and for fuzzy `parsedForms` text. Order encodes precedence: a `null` mapping
// means "matched but deliberately uncategorized" (e.g. cross-cutting disaster
// relief). Franchise runs before business so LLC fees / IT-204-LL win over the
// partnership/corp return patterns.
const KEYWORD_RULES: ReadonlyArray<readonly [RegExp, TaxArea | null]> = [
  // Cross-cutting relief is not a service line.
  [/disaster_relief/, null],

  // Information & compliance.
  [/fbar/, 'info_compliance'],
  [/1099/, 'info_compliance'],
  [/fincen/, 'info_compliance'],
  [/(^|_)boi(_|$)/, 'info_compliance'],
  [/beneficial_ownership/, 'info_compliance'],
  [/5500/, 'info_compliance'],

  // Payroll & withholding.
  [/(^|_)941(_|$)/, 'payroll_withholding'],
  [/(^|_)940(_|$)/, 'payroll_withholding'],
  // W-2/W-3: matches both taxType ids (federal_w2_w3) and normalized
  // parsedForms text ("Form W-2" → form_w_2).
  [/(^|_)w_?[23](_|$)/, 'payroll_withholding'],
  [/payroll/, 'payroll_withholding'],
  [/withholding/, 'payroll_withholding'],
  [/ui_wage/, 'payroll_withholding'],
  [/unemployment/, 'payroll_withholding'],

  // Sales & use (incl. WA combined excise, a sales/use + B&O hybrid — v1 lumps
  // it here; revisit if B&O-only alerts need their own treatment).
  [/sales/, 'sales_use'],
  [/use_tax/, 'sales_use'],
  [/(^|_)sut(_|$)/, 'sales_use'],
  [/excise/, 'sales_use'],

  // Franchise & state entity fees (before business so fees/IT-204-LL win).
  [/franchise/, 'franchise'],
  [/it204ll/, 'franchise'],
  [/llc_annual_tax/, 'franchise'],
  [/llc_estimated_fee/, 'franchise'],
  [/llc_filing_fee/, 'franchise'],
  [/llc_fee/, 'franchise'],
  [/annual_report/, 'franchise'],
  [/no_tax_due/, 'franchise'],
  [/(^|_)pir(_|$)/, 'franchise'],
  [/(^|_)oir(_|$)/, 'franchise'],
  [/(^|_)800(_|$)/, 'franchise'],

  // Business / entity income (corp, partnership, S-corp, PTE, exempt-org).
  [/ptet/, 'income_business'],
  [/pte_composite/, 'income_business'],
  [/(^|_)pte(_|$)/, 'income_business'],
  [/1065/, 'income_business'],
  [/1120/, 'income_business'],
  [/(^|_)990/, 'income_business'],
  [/7004/, 'income_business'],
  [/(^|_)ct3s?(_|$)/, 'income_business'],
  [/it204/, 'income_business'],
  [/f1120/, 'income_business'],
  [/(^|_)565(_|$)/, 'income_business'],
  [/(^|_)568(_|$)/, 'income_business'],
  [/(^|_)100s?(_|$)/, 'income_business'],
  [/(^|_)cit(_|$)/, 'income_business'],
  [/partnership/, 'income_business'],
  [/corporation/, 'income_business'],
  [/(^|_)corp(_|$)/, 'income_business'],
  [/net_profits/, 'income_business'],
  [/business/, 'income_business'],

  // Individual & fiduciary income.
  [/1040/, 'income_individual'],
  [/1041/, 'income_individual'],
  [/(^|_)709(_|$)/, 'income_individual'],
  [/gift/, 'income_individual'],
  [/(^|_)540(_|$)/, 'income_individual'],
  [/(^|_)541(_|$)/, 'income_individual'],
  [/it201/, 'income_individual'],
  [/it205/, 'income_individual'],
  [/individual/, 'income_individual'],
  [/fiduciary/, 'income_individual'],
  [/(^|_)estate(_|$)/, 'income_individual'],
  [/(^|_)trust(_|$)/, 'income_individual'],
  [/personal_income/, 'income_individual'],
]

function keywordTaxArea(text: string): TaxArea | null {
  const normalized = normalize(text)
  for (const [pattern, area] of KEYWORD_RULES) {
    if (pattern.test(normalized)) return area
  }
  return null
}

/**
 * Map a single normalized tax type (e.g. `federal_1040`, `ca_state_sales_use_tax`)
 * to its tax-area bucket. Tries the deterministic rule-source domain first
 * (covers the generic `*_state_*` / `*_local_*` types), then the keyword table
 * (covers named federal/state forms). Returns null when intentionally
 * uncategorized (e.g. disaster relief) or unknown.
 */
export function taxAreaForTaxType(taxType: string): TaxArea | null {
  const [domain] = sourceDomainsForRule({ taxType })
  if (domain) return DOMAIN_TO_TAX_AREA[domain]
  return keywordTaxArea(taxType)
}

/**
 * Map fuzzy extractor form text (e.g. `"Form 1040"`, `"941"`, `"Sales Tax
 * Return"`, `"FBAR"`) to a tax-area bucket. Used only as a fallback for alerts
 * that cite no rule. Returns null when nothing matches.
 */
export function taxAreaForFormText(form: string): TaxArea | null {
  return keywordTaxArea(form)
}

/**
 * Derive the set of tax-area buckets an alert touches, in canonical order.
 * Primary signal: deterministic `reverifyRuleIds` → each rule's taxType.
 * Fallback (only when no rule contributes): `parsedForms` text. Empty array
 * means uncategorized.
 */
export function taxAreasForAlert(row: {
  // Both come from nullable JSON columns — tolerate null/undefined even though
  // the populated shape is string[] (legacy rows + test fixtures may omit them).
  reverifyRuleIds?: readonly string[] | null
  parsedForms?: readonly string[] | null
}): TaxArea[] {
  const areas = new Set<TaxArea>()

  for (const ruleId of row.reverifyRuleIds ?? []) {
    const rule = findRuleById(ruleId)
    if (!rule) continue
    const area = taxAreaForTaxType(rule.taxType)
    if (area) areas.add(area)
  }

  if (areas.size === 0) {
    for (const form of row.parsedForms ?? []) {
      const area = taxAreaForFormText(form)
      if (area) areas.add(area)
    }
  }

  return TAX_AREAS.filter((area) => areas.has(area))
}
