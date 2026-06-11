import { describe, expect, it } from 'vitest'
import { listObligationRules } from '../rules'
import { TAX_AREAS, type TaxArea, taxAreaForFormText, taxAreaForTaxType, taxAreasForAlert } from '.'

const rules = listObligationRules({ includeCandidates: true })
const ruleIdForTaxType = (taxType: string): string => {
  const rule = rules.find((r) => r.taxType === taxType)
  if (!rule) throw new Error(`fixture rule not found for taxType ${taxType}`)
  return rule.id
}

describe('taxAreaForTaxType', () => {
  it('maps generic state/local domain tax types via the rule-source domain', () => {
    const cases: Record<string, TaxArea> = {
      state_individual_income_tax: 'income_individual',
      state_individual_estimated_tax: 'income_individual',
      state_fiduciary_income_tax: 'income_individual',
      state_business_income_tax: 'income_business',
      state_business_estimated_tax: 'income_business',
      state_pte_composite_ptet: 'income_business',
      state_franchise_or_entity_tax: 'franchise',
      state_sales_use_tax: 'sales_use',
      state_withholding_tax: 'payroll_withholding',
      state_ui_wage_report: 'payroll_withholding',
      local_individual_income_tax: 'income_individual',
      local_business_income_tax: 'income_business',
      local_employer_withholding_tax: 'payroll_withholding',
      local_services_tax: 'payroll_withholding',
      // jurisdiction-prefixed variants resolve through the same suffix match
      ca_state_business_income_tax: 'income_business',
      ca_state_franchise_or_entity_tax: 'franchise',
      ny_state_franchise_or_entity_tax: 'franchise',
    }
    for (const [taxType, area] of Object.entries(cases)) {
      expect(taxAreaForTaxType(taxType), taxType).toBe(area)
    }
  })

  it('maps named federal/state form tax types via the keyword table', () => {
    const cases: Record<string, TaxArea> = {
      federal_1040: 'income_individual',
      federal_1040_estimated_tax: 'income_individual',
      federal_1040_extension: 'income_individual',
      federal_1041: 'income_individual',
      ca_541: 'income_individual',
      ny_it205: 'income_individual',
      federal_1065: 'income_business',
      federal_1120: 'income_business',
      federal_1120s: 'income_business',
      federal_1120_estimated_tax: 'income_business',
      federal_7004: 'income_business',
      federal_990: 'income_business',
      ca_100: 'income_business',
      ca_100s: 'income_business',
      ca_llc_568: 'income_business',
      ny_ct3: 'income_business',
      ny_ct3s: 'income_business',
      ny_it204: 'income_business',
      ny_ptet: 'income_business',
      ny_ptet_estimated_tax: 'income_business',
      fl_f1120: 'income_business',
      fl_cit_estimated_tax: 'income_business',
      federal_941: 'payroll_withholding',
      federal_940: 'payroll_withholding',
      federal_w2_w3: 'payroll_withholding',
      federal_payroll_deposit_monthly: 'payroll_withholding',
      federal_709: 'income_individual',
      federal_1099_nec: 'info_compliance',
      federal_1099_misc: 'info_compliance',
      federal_5500: 'info_compliance',
      federal_fbar: 'info_compliance',
      ca_llc_annual_tax: 'franchise',
      ca_llc_estimated_fee: 'franchise',
      tx_franchise_report: 'franchise',
      tx_franchise_extension: 'franchise',
      tx_no_tax_due_threshold: 'franchise',
      tx_pir_oir: 'franchise',
      // IT-204-LL is an LLC/LLP fee, not the IT-204 partnership return —
      // franchise must win over the it204 business pattern.
      ny_it204ll: 'franchise',
      wa_combined_excise_annual: 'sales_use',
      wa_combined_excise_quarterly: 'sales_use',
      wa_combined_excise_monthly: 'sales_use',
    }
    for (const [taxType, area] of Object.entries(cases)) {
      expect(taxAreaForTaxType(taxType), taxType).toBe(area)
    }
  })

  it('leaves cross-cutting disaster relief uncategorized', () => {
    expect(taxAreaForTaxType('federal_disaster_relief')).toBeNull()
  })

  it('classifies every tax type the rule registry uses (guards new tax types)', () => {
    const taxTypes = new Set(rules.map((r) => r.taxType))
    expect(taxTypes.size).toBeGreaterThan(0)
    for (const taxType of taxTypes) {
      const area = taxAreaForTaxType(taxType)
      if (/disaster_relief/.test(taxType)) {
        expect(area, taxType).toBeNull()
      } else {
        expect(TAX_AREAS, taxType).toContain(area)
      }
    }
  })
})

describe('taxAreaForFormText (fuzzy fallback)', () => {
  it('maps free-text form labels', () => {
    expect(taxAreaForFormText('Form 1040')).toBe('income_individual')
    expect(taxAreaForFormText('Schedule C (Form 1040)')).toBe('income_individual')
    expect(taxAreaForFormText('Form 1065 — Partnership Return')).toBe('income_business')
    expect(taxAreaForFormText('941')).toBe('payroll_withholding')
    expect(taxAreaForFormText('Sales Tax Return')).toBe('sales_use')
    expect(taxAreaForFormText('CA Franchise Tax')).toBe('franchise')
    expect(taxAreaForFormText('FBAR (FinCEN Form 114)')).toBe('info_compliance')
    expect(taxAreaForFormText('1099-NEC')).toBe('info_compliance')
    expect(taxAreaForFormText('Form 940')).toBe('payroll_withholding')
    expect(taxAreaForFormText('Form W-2')).toBe('payroll_withholding')
    expect(taxAreaForFormText('Form 709 Gift Tax Return')).toBe('income_individual')
    expect(taxAreaForFormText('Form 5500-SF')).toBe('info_compliance')
  })

  it('returns null for unrecognized text', () => {
    expect(taxAreaForFormText('quarterly newsletter')).toBeNull()
    expect(taxAreaForFormText('')).toBeNull()
  })
})

describe('taxAreasForAlert', () => {
  it('derives areas from deterministic reverify-rule citations', () => {
    expect(taxAreasForAlert({ reverifyRuleIds: [ruleIdForTaxType('federal_1040')] })).toEqual([
      'income_individual',
    ])
  })

  it('returns areas in canonical order and de-duplicates across rules', () => {
    expect(
      taxAreasForAlert({
        reverifyRuleIds: [
          ruleIdForTaxType('federal_1065'),
          ruleIdForTaxType('federal_1040'),
          ruleIdForTaxType('federal_1065'),
        ],
      }),
    ).toEqual(['income_individual', 'income_business'])
  })

  it('falls back to parsedForms only when no rule contributes', () => {
    expect(taxAreasForAlert({ reverifyRuleIds: [], parsedForms: ['FBAR'] })).toEqual([
      'info_compliance',
    ])
    // unknown rule id contributes nothing, so the fallback still runs
    expect(
      taxAreasForAlert({ reverifyRuleIds: ['does.not.exist'], parsedForms: ['Form 1040'] }),
    ).toEqual(['income_individual'])
  })

  it('ignores parsedForms once a rule has classified the alert', () => {
    expect(
      taxAreasForAlert({
        reverifyRuleIds: [ruleIdForTaxType('federal_1040')],
        parsedForms: ['Sales Tax Return'],
      }),
    ).toEqual(['income_individual'])
  })

  it('returns an empty array when nothing classifies', () => {
    expect(taxAreasForAlert({ reverifyRuleIds: [], parsedForms: [] })).toEqual([])
    expect(taxAreasForAlert({ reverifyRuleIds: [] })).toEqual([])
  })

  it('tolerates null / undefined rule and form lists (nullable JSON columns)', () => {
    expect(taxAreasForAlert({ reverifyRuleIds: null, parsedForms: null })).toEqual([])
    expect(taxAreasForAlert({})).toEqual([])
    expect(taxAreasForAlert({ reverifyRuleIds: null, parsedForms: ['FBAR'] })).toEqual([
      'info_compliance',
    ])
  })
})
