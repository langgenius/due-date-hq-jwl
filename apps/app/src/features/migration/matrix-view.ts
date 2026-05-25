/**
 * View-only mirror of MatrixApplicationEntry for the Step 3 UI. The server
 * sends this back as part of `dryRun` (Day 4) — for Day 3 the wizard
 * computes its own preview from the confirmed normalizations using the
 * shared @duedatehq/core/default-matrix function.
 */
export interface MatrixApplicationView {
  entityType: string
  state: string
  taxTypes: string[]
  needsReview: boolean
  confidence: number
  matrixVersion: string
  enabled: boolean
  appliedClientCount: number
  applicationMode: 'missing_tax_types' | 'federal_return_type_plus_state'
}
