/**
 * PII guard helpers — used by Migration Copilot Step 1 Intake and the
 * Step 2 deterministic-checks layer (apps/server MigrationService).
 *
 * Authority:
 *   - docs/product-design/migration-copilot/02-ux-4step-wizard.md §4.3 (SSN regex)
 *   - docs/product-design/migration-copilot/04-ai-prompts.md §1 (PII gate #1)
 *   - PRD Part1B §6A.9 (SSN block before sending to AI)
 *
 * Pure helpers — no IO. Detection runs on header strings AND sample values
 * because some exporters skip a SSN header label and just dump SSN-shaped
 * digits in an unnamed column.
 */

const SSN_VALUE = /^\s*\d{3}-\d{2}-\d{4}\s*$/
const SSN_HEADER =
  /\b(ssn|social[\s_-]*security|itin|individual[\s_-]*taxpayer|taxpayer[\s_-]*identification|taxpayer[\s_-]*#)\b/i
const EIN_VALUE = /^\d{2}-\d{7}$/
const EMAIL_ADDRESS = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu
const SENSITIVE_IDENTIFIER = /\b(?:\d[ -]?){9}\b/u

export interface SsnDetection {
  /** Column indices that should be force-mapped to IGNORE before AI runs. */
  blockedColumnIndexes: number[]
  /** Header labels that triggered the block — used for the user-facing banner. */
  blockedHeaders: string[]
}

/**
 * Detect SSN-flavored columns by header label OR by value pattern in any of
 * the sample rows. Column index N is flagged if either:
 *   - headers[N] matches the SSN-label regex, or
 *   - any non-empty cell at sampleRows[i][N] matches the SSN value regex.
 */
export function detectSsnColumns(
  headers: readonly string[],
  sampleRows: readonly (readonly string[])[],
): SsnDetection {
  const blocked = new Set<number>()
  for (let i = 0; i < headers.length; i += 1) {
    if (SSN_HEADER.test(headers[i] ?? '')) blocked.add(i)
  }
  for (const row of sampleRows) {
    for (let i = 0; i < headers.length; i += 1) {
      const cell = row[i] ?? ''
      if (cell.length > 0 && SSN_VALUE.test(cell)) blocked.add(i)
    }
  }
  const indexes = Array.from(blocked).toSorted((a, b) => a - b)
  return {
    blockedColumnIndexes: indexes,
    blockedHeaders: indexes.map((i) => headers[i] ?? '').filter((h) => h.length > 0),
  }
}

/** Strict EIN check — `##-#######`. Returns false for null / empty / wrong shape. */
export function validateEin(value: string | null | undefined): boolean {
  if (value === null || value === undefined) return false
  return EIN_VALUE.test(value)
}

/** Quick membership check for the SSN value regex (used in tests + service). */
export function looksLikeSsn(value: string | null | undefined): boolean {
  if (value === null || value === undefined) return false
  return SSN_VALUE.test(value)
}

/** Conservative public-copy guard shared by Social selection and content generation. */
export function containsPossibleEmailAddress(values: readonly string[]): boolean {
  return EMAIL_ADDRESS.test(values.join(' '))
}

/** Detect nine-digit identifiers before any source-derived field is exposed publicly. */
export function containsPossibleSensitiveIdentifier(values: readonly string[]): boolean {
  return SENSITIVE_IDENTIFIER.test(values.join(' '))
}
