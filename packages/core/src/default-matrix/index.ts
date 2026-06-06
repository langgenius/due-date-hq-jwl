/**
 * Default Tax Types Inference Matrix v1.0 — Demo Sprint subset.
 *
 * Authority:
 *   - docs/product-design/migration-copilot/05-default-matrix.md §2 (24 cells)
 *   - docs/product-design/migration-copilot/05-default-matrix.v1.0.yaml (data)
 *   - PRD Part1B §6A.5 (trigger rule + evidence_link contract)
 *
 * Pure lookup table; no LLM; zero hallucination.
 * Triggered when the AI Mapper does NOT identify a `client.tax_types` column.
 * Every applied rule writes evidence_link with
 *   source_type='default_inference_by_entity_state' + matrix_version='v1.0'.
 */

import { STATE_RULE_JURISDICTIONS } from '../rules'

export type EntityType =
  | 'llc'
  | 's_corp'
  | 'partnership'
  | 'c_corp'
  | 'sole_prop'
  | 'trust'
  | 'individual'
  | 'other'

export type TaxClassification =
  | 'individual'
  | 'disregarded_entity'
  | 'partnership'
  | 's_corp'
  | 'c_corp'
  | 'trust'
  | 'estate'
  | 'nonprofit'
  | 'foreign_reporting_company'
  | 'unknown'

export const MATRIX_VERSION = 'v1.0' as const
export type MatrixVersion = typeof MATRIX_VERSION
export type MatrixApplicationMode = 'missing_tax_types' | 'federal_return_type_plus_state'

export interface InferTaxTypesResult {
  taxTypes: string[]
  needsReview: boolean
  /** Reason code when needsReview = true; absent on happy path. */
  reason?: 'state_not_in_demo_sprint_seed' | 'state_rules_require_review' | 'entity_type_other'
  matrixVersion: MatrixVersion
  /** Source URLs from practice review; empty for fallback cells. */
  sourceUrls: readonly string[]
  /** Per-cell static confidence (0..1). Fallback cells fall to 0.5. */
  confidence: number
}

interface MatrixCell {
  taxTypes: readonly string[]
  needsReview: boolean
  sourceUrls: readonly string[]
  confidence: number
}

/**
 * 16 explicit (entity_type, state) cells. Federal items appear in the cell
 * tax_types AND in `FEDERAL_OVERLAY` so we de-dupe at lookup time. Keeping
 * both shapes here matches the YAML literal so a tax tech reviewer can diff
 * the table 1:1 with 05-default-matrix.v1.0.yaml.
 */
const RULES: Record<string, Record<string, MatrixCell>> = {
  llc: {
    CA: {
      taxTypes: ['federal_1065_or_1040', 'ca_llc_franchise_min_800', 'ca_llc_fee_gross_receipts'],
      needsReview: false,
      sourceUrls: [
        'https://www.ftb.ca.gov/file/business/types/limited-liability-company/index.html',
        'https://www.irs.gov/businesses/small-businesses-self-employed/limited-liability-company-llc',
      ],
      confidence: 1.0,
    },
    NY: {
      taxTypes: ['federal_1065_or_1040', 'ny_llc_filing_fee', 'ny_ptet_optional'],
      needsReview: false,
      sourceUrls: [
        'https://www.tax.ny.gov/bus/ptet/',
        'https://www.tax.ny.gov/pdf/current_forms/it/it204lli.pdf',
      ],
      confidence: 1.0,
    },
  },
  s_corp: {
    CA: {
      taxTypes: ['federal_1120s', 'ca_100s_franchise', 'ca_ptet_optional'],
      needsReview: false,
      sourceUrls: [
        'https://www.ftb.ca.gov/file/business/types/corporations/s-corporations.html',
        'https://www.irs.gov/forms-pubs/about-form-1120-s',
      ],
      confidence: 1.0,
    },
    NY: {
      taxTypes: ['federal_1120s', 'ny_ct3s', 'ny_ptet_optional'],
      needsReview: false,
      sourceUrls: [
        'https://www.tax.ny.gov/bus/ct/s_corporation.htm',
        'https://www.irs.gov/forms-pubs/about-form-1120-s',
      ],
      confidence: 1.0,
    },
  },
  partnership: {
    CA: {
      taxTypes: ['federal_1065', 'ca_565_partnership', 'ca_ptet_optional'],
      needsReview: false,
      sourceUrls: [
        'https://www.ftb.ca.gov/file/business/types/partnership.html',
        'https://www.irs.gov/forms-pubs/about-form-1065',
      ],
      confidence: 1.0,
    },
    NY: {
      taxTypes: ['federal_1065', 'ny_it204', 'ny_ptet_optional'],
      needsReview: false,
      sourceUrls: [
        'https://www.tax.ny.gov/forms/current_forms/it/it204i.htm',
        'https://www.irs.gov/forms-pubs/about-form-1065',
      ],
      confidence: 1.0,
    },
  },
  c_corp: {
    CA: {
      taxTypes: ['federal_1120', 'ca_100_franchise'],
      needsReview: false,
      sourceUrls: [
        'https://www.ftb.ca.gov/file/business/types/corporations/index.html',
        'https://www.irs.gov/forms-pubs/about-form-1120',
      ],
      confidence: 1.0,
    },
    NY: {
      taxTypes: ['federal_1120', 'ny_ct3'],
      needsReview: false,
      sourceUrls: [
        'https://www.tax.ny.gov/bus/ct/article9a.htm',
        'https://www.irs.gov/forms-pubs/about-form-1120',
      ],
      confidence: 1.0,
    },
  },
  sole_prop: {
    CA: {
      taxTypes: ['federal_1040_sch_c', 'ca_540'],
      needsReview: false,
      sourceUrls: [
        'https://www.ftb.ca.gov/file/personal/filing-situations/sole-proprietor.html',
        'https://www.irs.gov/forms-pubs/about-schedule-c-form-1040',
      ],
      confidence: 1.0,
    },
    NY: {
      taxTypes: ['federal_1040_sch_c', 'ny_it201'],
      needsReview: false,
      sourceUrls: [
        'https://www.tax.ny.gov/pit/file/it201.htm',
        'https://www.irs.gov/forms-pubs/about-schedule-c-form-1040',
      ],
      confidence: 1.0,
    },
  },
  trust: {
    CA: {
      taxTypes: ['federal_1041', 'ca_541'],
      needsReview: false,
      sourceUrls: [
        'https://www.ftb.ca.gov/forms/2023/2023-541.pdf',
        'https://www.irs.gov/forms-pubs/about-form-1041',
      ],
      confidence: 1.0,
    },
    NY: {
      taxTypes: ['federal_1041', 'ny_it205'],
      needsReview: false,
      sourceUrls: [
        'https://www.tax.ny.gov/forms/current_forms/it/it205i.htm',
        'https://www.irs.gov/forms-pubs/about-form-1041',
      ],
      confidence: 1.0,
    },
  },
  individual: {
    CA: {
      taxTypes: ['federal_1040', 'ca_540'],
      needsReview: false,
      sourceUrls: [
        'https://www.ftb.ca.gov/forms/2023/2023-540.pdf',
        'https://www.irs.gov/forms-pubs/about-form-1040',
      ],
      confidence: 1.0,
    },
    NY: {
      taxTypes: ['federal_1040', 'ny_it201'],
      needsReview: false,
      sourceUrls: [
        'https://www.tax.ny.gov/pit/file/it201.htm',
        'https://www.irs.gov/forms-pubs/about-form-1040',
      ],
      confidence: 1.0,
    },
  },
  other: {
    CA: {
      taxTypes: ['federal'],
      needsReview: true,
      sourceUrls: [],
      confidence: 0.5,
    },
    NY: {
      taxTypes: ['federal'],
      needsReview: true,
      sourceUrls: [],
      confidence: 0.5,
    },
  },
}

const FEDERAL_OVERLAY: Record<EntityType, readonly string[]> = {
  llc: ['federal_1065_or_1040'],
  s_corp: ['federal_1120s'],
  partnership: ['federal_1065'],
  c_corp: ['federal_1120', 'federal_1120_estimated_tax'],
  sole_prop: ['federal_1040_sch_c', 'federal_1040_estimated_tax'],
  trust: ['federal_1041'],
  individual: ['federal_1040', 'federal_1040_estimated_tax'],
  other: ['federal'],
}

function federalOverlayForTaxClassification(
  entityType: EntityType,
  taxClassification?: TaxClassification | null,
): readonly string[] {
  if (entityType === 'llc') {
    if (taxClassification === 'disregarded_entity') {
      return ['federal_1040_sch_c', 'federal_1040_estimated_tax']
    }
    if (taxClassification === 'partnership') return ['federal_1065']
    if (taxClassification === 's_corp') return ['federal_1120s']
    if (taxClassification === 'c_corp') return ['federal_1120', 'federal_1120_estimated_tax']
  }

  if (taxClassification === 's_corp') return ['federal_1120s']
  if (taxClassification === 'c_corp') return ['federal_1120', 'federal_1120_estimated_tax']
  if (taxClassification === 'partnership') return ['federal_1065']
  if (taxClassification === 'disregarded_entity') return ['federal_1040_sch_c']
  if (taxClassification === 'nonprofit') return ['federal_990']

  return FEDERAL_OVERLAY[entityType]
}

const STATE_CODES = new Set<string>(STATE_RULE_JURISDICTIONS)

function dedup(items: readonly string[]): string[] {
  return Array.from(new Set(items))
}

export function isFederalTaxType(taxType: string): boolean {
  return taxType.trim().toLowerCase().startsWith('federal')
}

export function isStateTaxTypeForState(taxType: string, state: string): boolean {
  const normalizedState = state.trim().toLowerCase()
  if (!/^[a-z]{2}$/.test(normalizedState)) return false
  return taxType.trim().toLowerCase().startsWith(`${normalizedState}_`)
}

export function matrixApplicationModeForTaxTypes(
  taxTypes: readonly string[],
  state: string,
): MatrixApplicationMode | null {
  const normalized = taxTypes.map((taxType) => taxType.trim()).filter(Boolean)
  if (normalized.length === 0) return 'missing_tax_types'
  if (normalized.some((taxType) => isStateTaxTypeForState(taxType, state))) return null
  if (normalized.every(isFederalTaxType)) return 'federal_return_type_plus_state'
  return null
}

function genericStateTaxTypes(entityType: EntityType, state: string): string[] {
  if (!STATE_CODES.has(state) || entityType === 'other') return []

  const prefix = state.toLowerCase()
  const individual = [
    `${prefix}_state_individual_income_tax`,
    `${prefix}_state_individual_estimated_tax`,
  ]
  const recurring = [
    `${prefix}_state_sales_use_tax`,
    `${prefix}_state_withholding_tax`,
    `${prefix}_state_ui_wage_report`,
  ]
  const business = [
    `${prefix}_state_business_income_tax`,
    `${prefix}_state_business_estimated_tax`,
    `${prefix}_state_franchise_or_entity_tax`,
    ...recurring,
  ]
  const passThrough = [`${prefix}_state_pte_composite_ptet`]

  if (entityType === 'individual') return individual
  if (entityType === 'sole_prop') return [...individual, ...recurring]
  if (entityType === 'trust') return [`${prefix}_state_fiduciary_income_tax`]
  if (entityType === 'c_corp') return business
  if (entityType === 'llc' || entityType === 'partnership' || entityType === 's_corp') {
    return [...business, ...passThrough]
  }

  return []
}

/**
 * Look up the tax_types for a (entity_type, state) pair.
 *
 * Behavior:
 *   - Hit cell → return cell.taxTypes ∪ federal_overlay (de-duped).
 *   - State outside Demo Sprint seed (anything other than CA/NY) →
 *     federal_overlay + generated state review tax types + needsReview = true.
 *   - entity_type='other' (with or without state) → federal + needsReview.
 */
export function inferTaxTypes(
  entityType: EntityType,
  state: string,
  opts: { taxClassification?: TaxClassification | null } = {},
): InferTaxTypesResult {
  const fed = federalOverlayForTaxClassification(entityType, opts.taxClassification)
  const stateCell = RULES[entityType]?.[state]

  if (!stateCell) {
    const stateTaxTypes = genericStateTaxTypes(entityType, state)
    return {
      taxTypes: dedup([...fed, ...stateTaxTypes]),
      needsReview: true,
      reason: entityType === 'other' ? 'entity_type_other' : 'state_rules_require_review',
      matrixVersion: MATRIX_VERSION,
      sourceUrls: [],
      confidence: entityType === 'other' ? 0.5 : 0.7,
    }
  }

  const stateTaxTypes =
    opts.taxClassification && opts.taxClassification !== 'unknown'
      ? stateCell.taxTypes.filter((taxType) => !taxType.startsWith('federal'))
      : stateCell.taxTypes
  const result: InferTaxTypesResult = {
    taxTypes: dedup([...stateTaxTypes, ...fed]),
    needsReview: stateCell.needsReview,
    matrixVersion: MATRIX_VERSION,
    sourceUrls: stateCell.sourceUrls,
    confidence: stateCell.confidence,
  }
  if (stateCell.needsReview && entityType === 'other') {
    result.reason = 'entity_type_other'
  }
  return result
}

/** Whether (entity_type, state) is a verified Demo Sprint cell. */
export function isCoveredCell(entityType: EntityType, state: string): boolean {
  const cell = RULES[entityType]?.[state]
  return Boolean(cell) && !cell!.needsReview
}
