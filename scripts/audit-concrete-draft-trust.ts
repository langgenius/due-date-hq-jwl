/*
 * Audit the trust profile of cached rule-concrete-draft runs (read-only).
 *
 * Buckets every guard_result='ok' rule-concrete-draft@v2 ai_output row by:
 *   - excerpt match quality (exact | fuzzy | none | unknown) — classifyExcerptMatch over the
 *     sourceText persisted in citations_json vs the draft's cited sourceExcerpt
 *   - a confidence histogram
 *   - whether the new gap-#1 guard would now reject it (date <-> excerpt contradiction)
 *
 * Purpose: choose the confidence threshold for the bulk trust gate (gap #3) and measure how many
 * drafts the fuzzy-excerpt soft gate (gap #2) would route to single review — from real data,
 * before the gate ships. Run against a prod-like D1 for meaningful numbers.
 *
 * Usage:
 *   pnpm tsx scripts/audit-concrete-draft-trust.ts
 *   AUDIT_D1_DIR=/path/to/another/miniflare-D1DatabaseObject pnpm tsx scripts/audit-concrete-draft-trust.ts
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import {
  classifyExcerptMatch,
  dueDateLogicDateCodes,
  extractComparableDateCodes,
  type ExcerptMatch,
} from '../apps/server/src/procedures/rules/concrete-draft'
// Root scripts import package types via relative src paths (the workspace alias resolves to an
// unbuilt .d.ts here and degrades to an error/any type), matching scripts/check-rule-concrete-drafts.ts.
import type { DueDateLogic } from '../packages/contracts/src/rules'

const PROMPT_VERSION = 'rule-concrete-draft@v2'
const RETIRED_MODEL = 'deterministic-source-text'
const DB_DIR =
  process.env.AUDIT_D1_DIR ?? 'apps/server/.wrangler/state/v3/d1/miniflare-D1DatabaseObject'
const CONFIDENCE_THRESHOLDS = [0.5, 0.6, 0.7, 0.8] as const

function localD1Path(): string {
  if (!existsSync(DB_DIR)) throw new Error(`Local D1 directory not found: ${DB_DIR}`)
  const file = readdirSync(DB_DIR).find(
    (item) =>
      item.endsWith('.sqlite') &&
      item !== 'metadata.sqlite' &&
      !item.endsWith('-shm') &&
      !item.endsWith('-wal'),
  )
  if (!file) throw new Error(`Local D1 sqlite file not found under ${DB_DIR}.`)
  return join(DB_DIR, file)
}

function sqliteQueryJson(dbPath: string, sql: string): unknown[] {
  const output = execFileSync('sqlite3', ['-json', dbPath, sql], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 512,
  }).trim()
  if (!output) return []
  const parsed: unknown = JSON.parse(output)
  return Array.isArray(parsed) ? parsed : []
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseJson(value: unknown): unknown {
  if (typeof value !== 'string' || value.length === 0) return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function pct(part: number, whole: number): string {
  if (whole === 0) return '0.0%'
  return `${((part / whole) * 100).toFixed(1)}%`
}

interface DraftAudit {
  confidence: number | null
  excerptMatch: ExcerptMatch | 'unknown'
  gap1WouldReject: boolean
  retired: boolean
}

function auditRow(row: Record<string, unknown>): DraftAudit | null {
  const draft = parseJson(row.output_text)
  if (!isRecord(draft)) return null
  const citations = parseJson(row.citations_json)
  const retired = row.model === RETIRED_MODEL

  const confidence = typeof draft.confidence === 'number' ? draft.confidence : null
  const sourceExcerpt = typeof draft.sourceExcerpt === 'string' ? draft.sourceExcerpt : ''
  const sourceText =
    isRecord(citations) && typeof citations.sourceText === 'string' ? citations.sourceText : null

  const excerptMatch: ExcerptMatch | 'unknown' =
    sourceText && sourceExcerpt ? classifyExcerptMatch(sourceText, sourceExcerpt) : 'unknown'

  // Replays the gap-#1 contradiction check: the excerpt cites concrete date(s) but none match any
  // date the logic claims. Only meaningful for absolute kinds with a date-bearing excerpt.
  let gap1WouldReject = false
  // eslint-disable-next-line typescript-eslint/no-unsafe-type-assertion -- JSON-parsed draft; dueDateLogicDateCodes re-checks .kind before reading any field.
  const dueDateLogic = draft.dueDateLogic as DueDateLogic | undefined
  if (dueDateLogic && isRecord(dueDateLogic)) {
    const claimed = dueDateLogicDateCodes(dueDateLogic)
    if (claimed.length > 0 && sourceExcerpt) {
      const excerptCodes = new Set(extractComparableDateCodes(sourceExcerpt))
      gap1WouldReject = excerptCodes.size > 0 && !claimed.some((code) => excerptCodes.has(code))
    }
  }

  return { confidence, excerptMatch, gap1WouldReject, retired }
}

function main(): void {
  const dbPath = localD1Path()
  const rows = sqliteQueryJson(
    dbPath,
    `SELECT output_text, citations_json, model FROM ai_output ` +
      `WHERE prompt_version = '${PROMPT_VERSION}' AND guard_result = 'ok'`,
  ).filter(isRecord)

  const audits = rows.map(auditRow).filter((value): value is DraftAudit => value !== null)
  const total = audits.length

  console.log(`\nConcrete-draft trust audit  (db: ${dbPath})`)
  console.log(`guard_result='ok' ${PROMPT_VERSION} drafts: ${total}`)
  if (total === 0) {
    console.log('No drafts to audit. Run against a populated D1 (AUDIT_D1_DIR=...).')
    return
  }
  const retired = audits.filter((a) => a.retired).length
  console.log(`  of which retired deterministic model: ${retired} (${pct(retired, total)})\n`)

  // --- Gap #2: excerpt match distribution ---
  const matchBuckets: Record<ExcerptMatch | 'unknown', number> = {
    exact: 0,
    fuzzy: 0,
    none: 0,
    unknown: 0,
  }
  for (const a of audits) matchBuckets[a.excerptMatch]++
  console.log('Excerpt match (gap #2):')
  for (const key of ['exact', 'fuzzy', 'none', 'unknown'] as const) {
    console.log(
      `  ${key.padEnd(8)} ${String(matchBuckets[key]).padStart(5)}  ${pct(matchBuckets[key], total)}`,
    )
  }
  console.log(
    `  -> 'fuzzy' drafts would be routed to single review (not destroyed) by the soft gate.`,
  )
  console.log(
    `  -> 'none' would have already failed the existing excerpt-in-source guard; investigate any.\n`,
  )

  // --- Gap #3: confidence histogram ---
  const withConfidence = audits.filter(
    (a): a is DraftAudit & { confidence: number } => a.confidence !== null,
  )
  const missingConfidence = total - withConfidence.length
  const histo = [
    { label: '[0.00, 0.50)', lo: 0, hi: 0.5 },
    { label: '[0.50, 0.70)', lo: 0.5, hi: 0.7 },
    { label: '[0.70, 0.90)', lo: 0.7, hi: 0.9 },
    { label: '[0.90, 1.00]', lo: 0.9, hi: 1.0001 },
  ]
  console.log('Confidence histogram (gap #3):')
  for (const bucket of histo) {
    const n = withConfidence.filter(
      (a) => a.confidence >= bucket.lo && a.confidence < bucket.hi,
    ).length
    console.log(`  ${bucket.label}  ${String(n).padStart(5)}  ${pct(n, total)}`)
  }
  if (missingConfidence > 0) {
    console.log(
      `  (no confidence field: ${missingConfidence} — normalizeConfidence defaults these to 0.5)`,
    )
  }
  console.log('')

  // --- Gap #3 threshold simulation: bulk-ineligibility under the soft gate ---
  console.log('Bulk-ineligible under soft gate (confidence < t OR fuzzy excerpt):')
  const fuzzy = audits.filter((a) => a.excerptMatch === 'fuzzy')
  for (const t of CONFIDENCE_THRESHOLDS) {
    const lowConf = audits.filter((a) => a.confidence !== null && a.confidence < t)
    const union = new Set<DraftAudit>([...lowConf, ...fuzzy])
    console.log(
      `  t=${t.toFixed(2)}: lowConf ${String(lowConf.length).padStart(5)}  ` +
        `union(+fuzzy) ${String(union.size).padStart(5)}  ${pct(union.size, total)} of all drafts`,
    )
  }
  console.log('')

  // --- Gap #1: would-reject contradictions among already-ok drafts ---
  const gap1 = audits.filter((a) => a.gap1WouldReject).length
  console.log(
    `Gap #1 date<->excerpt contradictions among already-'ok' drafts: ${gap1} (${pct(gap1, total)})`,
  )
  console.log(
    gap1 === 0
      ? "  -> none; the new guard's blast radius on existing drafts is nil."
      : '  -> these would now be guard_rejected on re-draft; review before backfilling the cache.',
  )
  console.log('')
}

main()
