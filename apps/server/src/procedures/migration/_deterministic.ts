import { detectSsnColumns, validateEin } from '@duedatehq/core/pii'
import type { MappingRow, MappingTarget } from '@duedatehq/contracts'
import type { DeterministicError } from './_types'

/**
 * Reverse deterministic checks — Step 2 / Step 3 layer.
 *
 * Authority:
 *   - docs/dev-file/10-Demo-Sprint-7Day-Rhythm.md §3 Day 3 (反向确定性校验)
 *   - PRD §0.3 铁律 2 (bad rows do not block good rows)
 *   - docs/product-design/migration-copilot/02-ux-4step-wizard.md §4.1 + §5
 *
 * Three jobs:
 *   1. Force SSN-flagged columns to IGNORE (defense in depth — the AI prompt
 *      gateway already redacts, but the mapping must reflect the block too).
 *   2. Validate EIN cell shape (`^\d{2}-\d{7}$`) per-row; bad cells emit a
 *      `migration_error` with errorCode='EIN_INVALID' but the row stays in
 *      the import set unless `EMPTY_NAME` also fires.
 *   3. Validate state shape (2-letter code) and entity_type enum membership
 *      AFTER normalization runs (so we accept "California" before normalize).
 *
 * Returns a tuple { sanitizedMappings, errors } so the service can persist
 * both pieces atomically.
 */

const ENTITY_ENUM = new Set([
  'llc',
  's_corp',
  'partnership',
  'c_corp',
  'sole_prop',
  'trust',
  'individual',
  'other',
])

export interface MappingSanitizeResult {
  sanitizedMappings: MappingRow[]
  ssnBlockedHeaders: string[]
}

interface MappingSanitizeOptions {
  batchId: string
}

/**
 * Step 2 sanitizer: applied AFTER the mapper returns. Forces every SSN-
 * flagged column to IGNORE regardless of what the AI suggested. We never
 * just trust the AI on PII boundaries — same column index has to be IGNORE.
 */
export function sanitizeMapperOutput(
  mappings: MappingRow[],
  headers: readonly string[],
  sampleRows: readonly (readonly string[])[],
  options: MappingSanitizeOptions,
): MappingSanitizeResult {
  const ssn = detectSsnColumns(headers, sampleRows)
  const blockedSet = new Set(ssn.blockedColumnIndexes)
  const headerToIndex = new Map<string, number>()
  headers.forEach((h, i) => headerToIndex.set(h, i))

  const now = new Date().toISOString()
  const sanitized = mappings.map((m) => {
    const idx = headerToIndex.get(m.sourceHeader)
    if (idx !== undefined && blockedSet.has(idx)) {
      if (m.userOverridden && m.targetField === 'client.ein') {
        return {
          ...m,
          confidence: null,
          reasoning: 'User-selected EIN mapping for SSN/ITIN-like column.',
          model: null,
          promptVersion: 'pii_guard@v1',
        } satisfies MappingRow
      }
      return {
        ...m,
        targetField: 'IGNORE' as MappingTarget,
        confidence: null,
        reasoning: 'Forced IGNORE — column matched SSN/ITIN pattern.',
        userOverridden: false,
        model: null,
        promptVersion: 'pii_guard@v1',
      } satisfies MappingRow
    }
    return m
  })

  const mappedHeaders = new Set(sanitized.map((m) => m.sourceHeader))
  for (const idx of ssn.blockedColumnIndexes) {
    const sourceHeader = headers[idx]
    if (!sourceHeader || mappedHeaders.has(sourceHeader)) continue
    sanitized.push({
      id: crypto.randomUUID(),
      batchId: options.batchId,
      sourceHeader,
      targetField: 'IGNORE',
      confidence: null,
      reasoning: 'Forced IGNORE — column matched SSN/ITIN pattern.',
      userOverridden: false,
      model: null,
      promptVersion: 'pii_guard@v1',
      createdAt: now,
    })
  }

  sanitized.sort(
    (a, b) =>
      (headerToIndex.get(a.sourceHeader) ?? Number.MAX_SAFE_INTEGER) -
      (headerToIndex.get(b.sourceHeader) ?? Number.MAX_SAFE_INTEGER),
  )

  return { sanitizedMappings: sanitized, ssnBlockedHeaders: ssn.blockedHeaders }
}

/**
 * Per-row validator. Runs against the mapping result so we know which
 * column index belongs to which target field.
 *
 * Returns `migration_error` candidates; service persists via
 * `scoped.migration.createErrors` so the Step 1 / Step 2 banner can show
 * them. Bad rows are never silently dropped — Step 4 commit excludes them
 * but they appear under "skippedRows" in DryRunSummary.
 */
export function validateRows(
  headers: readonly string[],
  rows: readonly (readonly string[])[],
  mappings: readonly MappingRow[],
): DeterministicError[] {
  const targetByIndex = new Map<number, MappingTarget>()
  const headerToIndex = new Map<string, number>()
  headers.forEach((h, i) => headerToIndex.set(h, i))
  for (const m of mappings) {
    const idx = headerToIndex.get(m.sourceHeader)
    if (idx !== undefined) targetByIndex.set(idx, m.targetField)
  }

  const errors: DeterministicError[] = []
  rows.forEach((row, rowIndex) => {
    const rawRow = toRawRow(headers, row)
    const nameValue = readByTarget(row, targetByIndex, 'client.name')
    if (!nameValue) {
      errors.push({
        rowIndex,
        rawRow,
        errorCode: 'EMPTY_NAME',
        errorMessage: 'Row is missing a client name value.',
      })
    }
    const einValue = readByTarget(row, targetByIndex, 'client.ein')
    if (einValue && !validateEin(einValue)) {
      errors.push({
        rowIndex,
        rawRow,
        errorCode: 'EIN_INVALID',
        errorMessage: 'The EIN does not match the expected ##-####### format.',
      })
    }
  })

  return errors
}

/**
 * Post-normalize validator: after Step 3, state must be a 2-letter code and
 * entity_type must be one of the supported import values. Anything else gets
 * recorded but does not abort Step 4 commit (the row is excluded with
 * errorCode).
 */
export interface NormalizedRowCheckInput {
  rowIndex: number
  rawRow: Record<string, string>
  state: string | null
  entityType: string | null
}

export function validateNormalizedRows(
  rows: readonly NormalizedRowCheckInput[],
): DeterministicError[] {
  const errors: DeterministicError[] = []
  for (const r of rows) {
    if (r.state !== null && !/^[A-Z]{2}$/.test(r.state)) {
      errors.push({
        rowIndex: r.rowIndex,
        rawRow: r.rawRow,
        errorCode: 'STATE_FORMAT',
        errorMessage: 'The state should be a two-letter US state code.',
      })
    }
    if (r.entityType !== null && !ENTITY_ENUM.has(r.entityType)) {
      errors.push({
        rowIndex: r.rowIndex,
        rawRow: r.rawRow,
        errorCode: 'ENTITY_ENUM',
        errorMessage:
          'We could not recognize the entity type. Review the mapped entity type before import.',
      })
    }
  }
  return errors
}

function readByTarget(
  row: readonly string[],
  targetByIndex: ReadonlyMap<number, MappingTarget>,
  target: MappingTarget,
): string | null {
  for (const [idx, t] of targetByIndex.entries()) {
    if (t === target) {
      const value = row[idx]
      if (typeof value === 'string') {
        const trimmed = value.trim()
        return trimmed.length > 0 ? trimmed : null
      }
      return null
    }
  }
  return null
}

function toRawRow(headers: readonly string[], row: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {}
  headers.forEach((h, i) => {
    out[h] = row[i] ?? ''
  })
  return out
}
