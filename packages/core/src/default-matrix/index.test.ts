import { describe, expect, it } from 'vitest'
import { inferTaxTypes, isCoveredCell, MATRIX_VERSION } from './index'

describe('inferTaxTypes', () => {
  it('LLC × CA returns 3 tax_types and is not needs_review', () => {
    const result = inferTaxTypes('llc', 'CA')
    expect(result.taxTypes).toEqual([
      'federal_1065_or_1040',
      'ca_llc_franchise_min_800',
      'ca_llc_fee_gross_receipts',
    ])
    expect(result.needsReview).toBe(false)
    expect(result.matrixVersion).toBe(MATRIX_VERSION)
    expect(result.confidence).toBe(1.0)
    expect(result.sourceUrls.length).toBeGreaterThan(0)
  })

  it('S-Corp × NY returns federal_1120s + ny_ct3s + ny_ptet_optional', () => {
    const result = inferTaxTypes('s_corp', 'NY')
    expect(result.taxTypes).toEqual(['federal_1120s', 'ny_ct3s', 'ny_ptet_optional'])
    expect(result.needsReview).toBe(false)
  })

  it('expanded states add review-only state tax types with needs_review', () => {
    const result = inferTaxTypes('llc', 'MA')
    expect(result.taxTypes).toEqual([
      'federal_1065_or_1040',
      'ma_state_business_income_tax',
      'ma_state_business_estimated_tax',
      'ma_state_franchise_or_entity_tax',
      'ma_state_sales_use_tax',
      'ma_state_withholding_tax',
      'ma_state_ui_wage_report',
      'ma_state_pte_composite_ptet',
    ])
    expect(result.needsReview).toBe(true)
    expect(result.reason).toBe('state_rules_require_review')
    expect(result.sourceUrls).toEqual([])
  })

  it('entity_type=other × CA returns federal-only + needs_review', () => {
    const result = inferTaxTypes('other', 'CA')
    expect(result.taxTypes).toEqual(['federal'])
    expect(result.needsReview).toBe(true)
    expect(result.confidence).toBe(0.5)
    expect(result.reason).toBe('entity_type_other')
  })

  it('entity_type=other × uncovered state still falls through to federal + needs_review', () => {
    const result = inferTaxTypes('other', 'TX')
    expect(result.taxTypes).toEqual(['federal'])
    expect(result.needsReview).toBe(true)
    expect(result.reason).toBe('entity_type_other')
  })

  it('de-dups federal overlay items already present in the cell', () => {
    // partnership × CA cell already lists federal_1065 plus federal_overlay
    // adds federal_1065 → result should keep one copy.
    const result = inferTaxTypes('partnership', 'CA')
    const occurrences = result.taxTypes.filter((t) => t === 'federal_1065')
    expect(occurrences).toHaveLength(1)
  })

  it('uses tax classification to split LLC federal filing paths', () => {
    const disregarded = inferTaxTypes('llc', 'CA', { taxClassification: 'disregarded_entity' })
    expect(disregarded.taxTypes).toEqual([
      'ca_llc_franchise_min_800',
      'ca_llc_fee_gross_receipts',
      'federal_1040_sch_c',
      'federal_1040_estimated_tax',
    ])

    const sCorp = inferTaxTypes('llc', 'CA', { taxClassification: 's_corp' })
    expect(sCorp.taxTypes).toEqual([
      'ca_llc_franchise_min_800',
      'ca_llc_fee_gross_receipts',
      'federal_1120s',
    ])
  })

  it('individual × NY hits the new entity_type added in v1.0', () => {
    const result = inferTaxTypes('individual', 'NY')
    expect(result.taxTypes).toEqual(['federal_1040', 'ny_it201', 'federal_1040_estimated_tax'])
    expect(result.needsReview).toBe(false)
  })

  it('every covered entity has both CA and NY filled (16 explicit cells)', () => {
    const entities = [
      'llc',
      's_corp',
      'partnership',
      'c_corp',
      'sole_prop',
      'trust',
      'individual',
      'other',
    ] as const
    let cells = 0
    for (const e of entities) {
      for (const s of ['CA', 'NY'] as const) {
        const r = inferTaxTypes(e, s)
        // every cell must produce at least one tax_type (federal overlay
        // floor) and a stable matrix version
        expect(r.taxTypes.length).toBeGreaterThan(0)
        expect(r.matrixVersion).toBe(MATRIX_VERSION)
        cells += 1
      }
    }
    expect(cells).toBe(16)
  })
})

describe('isCoveredCell', () => {
  it('returns true for verified Demo Sprint cells', () => {
    expect(isCoveredCell('llc', 'CA')).toBe(true)
    expect(isCoveredCell('individual', 'NY')).toBe(true)
  })

  it('returns false for needs_review cells', () => {
    expect(isCoveredCell('other', 'CA')).toBe(false)
  })

  it('returns false for uncovered states', () => {
    expect(isCoveredCell('llc', 'MA')).toBe(false)
    expect(isCoveredCell('llc', 'XX')).toBe(false)
  })
})
