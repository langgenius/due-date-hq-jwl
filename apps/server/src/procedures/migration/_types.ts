import type {
  MapperFallback,
  MappingRow,
  MatrixSelection,
  MigrationSourceManifest,
  MigrationError,
  NormalizationRow,
} from '@duedatehq/contracts'

/**
 * Internal payload persisted to `migration_batch.mapping_json`.
 *
 * The DB column is typed `unknown`; this interface is the runtime contract
 * the MigrationService writes and reads against. Step 4 commit (Day 4) will
 * consume `confirmedMappings` + `confirmedNormalizations` + `matrixApplied`
 * to build the client / obligation rows.
 */
export interface MappingJsonPayload {
  /** Raw paste / parsed CSV stash. uploadRaw → service stores here for paste. */
  rawInput?: {
    kind: 'csv' | 'tsv' | 'paste' | 'xlsx'
    headers: string[]
    /** All parsed rows (already truncated to MAX_ROWS upstream). */
    rows: string[][]
    rowCount: number
    truncated: boolean
  }
  /** Source/product/file detection from Step 1 upload intake. */
  sourceManifest?: MigrationSourceManifest
  /** Pre-AI redaction record (column indexes flagged as SSN/ITIN-like). */
  ssnBlockedColumns?: number[]
  /** Last AI Mapper output, kept verbatim for the Re-run flow. */
  aiMappings?: MappingRow[]
  /** User-confirmed mapping array — Step 4 reads this. */
  confirmedMappings?: MappingRow[]
  /** Last AI Normalizer output (entity + tax_types merged). */
  aiNormalizations?: NormalizationRow[]
  /** User-confirmed normalization array — Step 4 reads this. */
  confirmedNormalizations?: NormalizationRow[]
  /** Default Matrix application result keyed by hashed (entity, state). */
  matrixApplied?: MatrixApplicationEntry[]
  /** User selections for matrix cells; default is enabled. */
  matrixSelections?: MatrixSelection[]
  /** Fallback channel marker for runMapper / confirmMapping outputs. */
  mapperFallback?: MapperFallback
}

export interface MatrixApplicationEntry {
  entityType: string
  state: string
  taxTypes: string[]
  needsReview: boolean
  confidence: number
  matrixVersion: string
  /** False means the user opted this matrix cell out for rows missing tax_types. */
  enabled: boolean
  /** Demo client count this entry applies to (post-normalize). */
  appliedClientCount: number
}

/**
 * `migration_error` row shape with raw_row_json typed as JSON-friendly.
 * Used by the deterministic-checks layer to non-blockingly flag bad rows.
 */
export interface DeterministicError {
  rowIndex: number
  rawRow: Record<string, string>
  errorCode: 'STATE_FORMAT' | 'ENTITY_ENUM' | 'EIN_INVALID' | 'SSN_DETECTED' | 'EMPTY_NAME'
  errorMessage: string
}

export type { MappingRow, NormalizationRow, MigrationError }
