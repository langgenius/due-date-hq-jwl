import { parseTabular } from '@duedatehq/core/csv-parser'
import {
  normalizeEntityType,
  normalizeState,
  normalizeTaxTypes,
} from '@duedatehq/core/normalize-dict'
import type { MappingRow, MigrationError, NormalizationRow } from '@duedatehq/contracts'

import type { MatrixApplicationView } from './matrix-view'

const LOW_MAPPING_CONFIDENCE = 0.8
const LOW_NORMALIZATION_CONFIDENCE = 0.5

export interface MappingSummary {
  totalColumns: number
  mappedColumns: number
  ignoredColumns: number
  lowConfidenceColumns: number
  averageConfidence: number | null
  einDetected: boolean
  badRows: number
  hasOnlyIgnoredColumns: boolean
}

export function buildMappingSummary(
  rows: readonly MappingRow[],
  errors: readonly MigrationError[] = [],
): MappingSummary {
  const mappedRows = rows.filter((row) => row.targetField !== 'IGNORE')
  const confidenceRows = mappedRows.filter((row) => typeof row.confidence === 'number')
  const averageConfidence =
    confidenceRows.length === 0
      ? null
      : Math.round(
          (confidenceRows.reduce((sum, row) => sum + (row.confidence ?? 0), 0) /
            confidenceRows.length) *
            100,
        )

  return {
    totalColumns: rows.length,
    mappedColumns: mappedRows.length,
    ignoredColumns: rows.length - mappedRows.length,
    lowConfidenceColumns: mappedRows.filter(
      (row) => typeof row.confidence === 'number' && row.confidence < LOW_MAPPING_CONFIDENCE,
    ).length,
    averageConfidence,
    einDetected: mappedRows.some(
      (row) =>
        row.targetField === 'client.ein' &&
        typeof row.confidence === 'number' &&
        row.confidence >= LOW_MAPPING_CONFIDENCE,
    ),
    badRows: errors.length,
    hasOnlyIgnoredColumns: rows.length > 0 && mappedRows.length === 0,
  }
}

export function repairMappingRows(rows: readonly MappingRow[], rawText?: string): MappingRow[] {
  if (!rawText) return [...rows]

  let parsed
  try {
    parsed = parseTabular(rawText, { kind: 'paste' })
  } catch {
    return [...rows]
  }

  const headerToIndex = new Map<string, number>()
  parsed.headers.forEach((header, index) => headerToIndex.set(header, index))
  const sampleRows = parsed.rows.slice(0, 5)

  return rows.map((row) => {
    if (row.userOverridden || row.targetField !== 'client.entity_type') return row
    const index = headerToIndex.get(row.sourceHeader)
    if (index === undefined) return row
    const values = sampleRows
      .map((sample) => sample[index]?.trim() ?? '')
      .filter((value) => value.length > 0)
    if (values.length === 0) return row
    const entityHits = values.filter((value) => normalizeEntityType(value)).length
    const taxTypeHits = values.filter((value) => normalizeTaxTypes(value)).length
    if (taxTypeHits === 0 || entityHits >= taxTypeHits) return row
    return {
      ...row,
      targetField: 'client.tax_types',
      confidence: Math.max(row.confidence ?? 0, 0.85),
      reasoning:
        'Corrected to tax types because sample values match return/form tax type identifiers.',
      model: null,
      promptVersion: 'deterministic-mapper@v1',
    }
  })
}

export interface NormalizationValueGroup {
  field: string
  rawValues: string[]
  normalizedValue: string | null
  affectedClientCount: number
  valueCount: number
  confidence: number | null
  model: string | null
  promptVersion: string | null
  usesFallback: boolean
}

export interface NormalizationSummary {
  totalGroups: number
  readyGroups: number
  exceptionGroups: number
  affectedExceptionClients: number
  groups: NormalizationValueGroup[]
}

export function buildNormalizationSummary(input: {
  normalizations: readonly NormalizationRow[]
  rawText?: string | undefined
  mappings?: readonly MappingRow[] | undefined
}): NormalizationSummary {
  const valueCounts = buildNormalizationValueCounts(input.rawText, input.mappings)
  const groupMap = new Map<string, NormalizationValueGroup>()

  for (const row of repairNormalizationRows(input.normalizations)) {
    const normalizedKey = row.normalizedValue ?? '__null__'
    const key = `${row.field}::${normalizedKey}`
    const affectedClientCount = countNormalizationValue(valueCounts, row)
    const existing = groupMap.get(key)
    const confidence = row.confidence ?? null
    const usesFallback =
      row.normalizedValue === null ||
      (typeof row.confidence === 'number' && row.confidence < LOW_NORMALIZATION_CONFIDENCE)

    if (existing) {
      existing.rawValues.push(row.rawValue)
      existing.affectedClientCount += affectedClientCount
      existing.valueCount += 1
      existing.usesFallback = existing.usesFallback || usesFallback
      existing.confidence =
        existing.confidence === null || confidence === null
          ? (existing.confidence ?? confidence)
          : Math.min(existing.confidence, confidence)
      if (!existing.model && row.model) existing.model = row.model
      if (!existing.promptVersion && row.promptVersion) existing.promptVersion = row.promptVersion
    } else {
      groupMap.set(key, {
        field: row.field,
        rawValues: [row.rawValue],
        normalizedValue: row.normalizedValue,
        affectedClientCount,
        valueCount: 1,
        confidence,
        model: row.model,
        promptVersion: row.promptVersion,
        usesFallback,
      })
    }
  }

  const groups = Array.from(groupMap.values()).toSorted((a, b) => {
    if (a.usesFallback !== b.usesFallback) return a.usesFallback ? -1 : 1
    return b.affectedClientCount - a.affectedClientCount || a.field.localeCompare(b.field)
  })
  const exceptionGroups = groups.filter((group) => group.usesFallback)

  return {
    totalGroups: groups.length,
    readyGroups: groups.length - exceptionGroups.length,
    exceptionGroups: exceptionGroups.length,
    affectedExceptionClients: exceptionGroups.reduce(
      (sum, group) => sum + group.affectedClientCount,
      0,
    ),
    groups,
  }
}

export function repairNormalizationRows(rows: readonly NormalizationRow[]): NormalizationRow[] {
  return rows.map((row) => {
    if (row.userOverridden) return row
    if (row.field === 'state' && row.normalizedValue === null) {
      const hit = normalizeState(row.rawValue)
      if (!hit) return row
      return {
        ...row,
        normalizedValue: hit.normalized,
        confidence: Math.max(row.confidence ?? 0, hit.confidence),
        model: null,
        promptVersion: hit.promptVersion,
        reasoning: 'Deterministic state code lookup.',
      }
    }
    if (row.field === 'tax_types' && taxTypesNeedRepair(row.normalizedValue)) {
      const hit = normalizeTaxTypes(row.rawValue)
      if (!hit) {
        return row.normalizedValue === '[]' ? { ...row, normalizedValue: null } : row
      }
      return {
        ...row,
        normalizedValue: JSON.stringify(hit.normalized),
        confidence: Math.max(row.confidence ?? 0, hit.confidence),
        model: null,
        promptVersion: hit.promptVersion,
        reasoning: 'Deterministic tax-type lookup.',
      }
    }
    return row
  })
}

export interface MatrixSummary {
  totalCells: number
  enabledCells: number
  disabledCells: number
  clientsCovered: number
  reviewCells: number
  reviewClients: number
}

export function buildMatrixSummary(matrix: readonly MatrixApplicationView[]): MatrixSummary {
  const enabled = matrix.filter((cell) => cell.enabled)
  const review = enabled.filter((cell) => cell.needsReview)
  return {
    totalCells: matrix.length,
    enabledCells: enabled.length,
    disabledCells: matrix.length - enabled.length,
    clientsCovered: enabled.reduce((sum, cell) => sum + cell.appliedClientCount, 0),
    reviewCells: review.length,
    reviewClients: review.reduce((sum, cell) => sum + cell.appliedClientCount, 0),
  }
}

function buildNormalizationValueCounts(
  rawText: string | undefined,
  mappings: readonly MappingRow[] | undefined,
): Map<string, Map<string, number>> {
  const counts = new Map<string, Map<string, number>>()
  if (!rawText || !mappings || mappings.length === 0) return counts

  let parsed
  try {
    parsed = parseTabular(rawText, { kind: 'paste' })
  } catch {
    return counts
  }

  const headerToIndex = new Map<string, number>()
  parsed.headers.forEach((header, index) => headerToIndex.set(header, index))
  const fieldToTargetHeaders: Record<string, string[]> = {
    entity_type: targetHeaders(mappings, ['client.entity_type']),
    state: targetHeaders(mappings, ['client.state', 'client.filing_states']),
    tax_types: targetHeaders(mappings, ['client.tax_types']),
  }

  for (const [field, headers] of Object.entries(fieldToTargetHeaders)) {
    const fieldCounts = new Map<string, number>()
    for (const header of headers) {
      const index = headerToIndex.get(header)
      if (index === undefined) continue
      for (const row of parsed.rows) {
        const raw = row[index]?.trim()
        if (!raw) continue
        fieldCounts.set(raw, (fieldCounts.get(raw) ?? 0) + 1)
      }
    }
    if (fieldCounts.size > 0) counts.set(field, fieldCounts)
  }

  return counts
}

function targetHeaders(rows: readonly MappingRow[], targets: readonly string[]): string[] {
  return rows.filter((row) => targets.includes(row.targetField)).map((row) => row.sourceHeader)
}

function countNormalizationValue(
  counts: ReadonlyMap<string, ReadonlyMap<string, number>>,
  row: NormalizationRow,
): number {
  return counts.get(row.field)?.get(row.rawValue) ?? 1
}

function taxTypesNeedRepair(value: string | null): boolean {
  if (value === null) return true
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) && !parsed.some((item) => typeof item === 'string' && item.trim())
  } catch {
    return false
  }
}
