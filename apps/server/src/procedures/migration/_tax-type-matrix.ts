import { matrixApplicationModeForTaxTypes } from '@duedatehq/core/default-matrix'
import { normalizeTaxTypes } from '@duedatehq/core/normalize-dict'
import type { NormalizationRow } from '@duedatehq/contracts'

export function normalizeTaxTypesFromRows(
  normalizations: readonly NormalizationRow[],
  raw: string | null,
): string[] {
  if (!raw) return []
  const hit = normalizations.find((item) => item.field === 'tax_types' && item.rawValue === raw)
  const normalized = hit?.normalizedValue
  if (normalized) {
    try {
      const parsed = JSON.parse(normalized)
      if (Array.isArray(parsed)) {
        const normalizedValues = parsed.filter((item): item is string => typeof item === 'string')
        if (normalizedValues.length > 0) return normalizedValues
        const dictionaryHit = normalizeTaxTypes(raw)
        return dictionaryHit?.normalized ?? []
      }
    } catch {
      return [normalized]
    }
    return [normalized]
  }
  const dictionaryHit = normalizeTaxTypes(raw)
  if (dictionaryHit) return dictionaryHit.normalized
  return raw
    .split(/[;,|]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export { matrixApplicationModeForTaxTypes }
