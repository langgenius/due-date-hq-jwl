import { execFileSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { SOURCE_WATCH_PLACEHOLDER_RE } from '../apps/server/src/procedures/rules/source-text'
import { findRuleById, listRuleSources } from '../packages/core/src/rules/index'

type SqlRow = Record<string, unknown>

interface MissingSourceTextRow {
  id: string
  firmId: string | null
  inputContextRef: string
  outputText: string
  citations: Record<string, unknown>
}

interface RuleEvidenceText {
  sourceExcerpt: string
  sourceText: string
}

const DRY_RUN = process.argv.includes('--dry-run')
const FORCE_UPDATE = process.argv.includes('--force')
const SQLITE3_MAX_BUFFER_BYTES = 200 * 1024 * 1024

function localD1Path(): string {
  const dir = 'apps/server/.wrangler/state/v3/d1/miniflare-D1DatabaseObject'
  const file = readdirSync(dir).find(
    (item) =>
      item.endsWith('.sqlite') &&
      item !== 'metadata.sqlite' &&
      !item.endsWith('-shm') &&
      !item.endsWith('-wal'),
  )
  if (!file) throw new Error(`Local D1 sqlite file not found under ${dir}.`)
  return join(dir, file)
}

function sqlString(value: string | null | undefined): string {
  if (value === null || value === undefined) return 'null'
  return `'${value.replaceAll("'", "''")}'`
}

function sqliteQueryJson(dbPath: string, sql: string): SqlRow[] {
  const output = execFileSync('sqlite3', ['-json', dbPath, sql], {
    encoding: 'utf8',
    maxBuffer: SQLITE3_MAX_BUFFER_BYTES,
  }).trim()
  if (!output) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(output)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []
  return parsed.filter(isRecord)
}

function isRecord(value: unknown): value is SqlRow {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function sqliteExec(dbPath: string, sql: string): void {
  execFileSync('sqlite3', [dbPath], {
    input: ['.timeout 10000', sql].join('\n'),
    encoding: 'utf8',
    maxBuffer: SQLITE3_MAX_BUFFER_BYTES,
  })
}

function parseRowValue(row: SqlRow, key: string): string | null {
  const value = row[key]
  return typeof value === 'string' ? value : null
}

function parseContext(inputContextRef: string): {
  ruleId: string
  sourceId: string
} | null {
  const match = /^rule:([^:]+):v\d+:([^:]+)(?::(.+))?$/.exec(inputContextRef)
  if (match) {
    const [, ruleId, sourceId] = match
    if (!ruleId || !sourceId) return null
    return {
      ruleId,
      sourceId,
    }
  }
  const legacyMatch = /^rule:([^:]+):([^:]+)$/.exec(inputContextRef)
  if (!legacyMatch) return null
  const [, ruleId, sourceId] = legacyMatch
  if (!ruleId || !sourceId) return null
  return {
    ruleId,
    sourceId,
  }
}

function parseJsonObject(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'string' || value.trim().length === 0) return null
  try {
    const parsed = JSON.parse(value)
    return isRecord(parsed) ? parsed : null
  } catch {
    return null
  }
}

function parseDraftSourceExcerpt(value: string | null): string | null {
  const parsed = parseJsonObject(value)
  if (!parsed) return null
  const sourceExcerpt = parsed.sourceExcerpt
  return sanitizeSourceWatchExcerpt(
    typeof sourceExcerpt === 'string' && sourceExcerpt.length > 0 ? sourceExcerpt : null,
  )
}

function sanitizeSourceWatchExcerpt(value: string | null): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return SOURCE_WATCH_PLACEHOLDER_RE.test(trimmed) ? null : trimmed
}

function parseRuleEvidenceText(input: {
  rule: ReturnType<typeof findRuleById> | undefined
  sourceId: string
  fallbackExcerpt: string | null
}): RuleEvidenceText {
  const rule = input.rule
  const baseExcerpt = (rule?.evidence ?? [])
    .filter((evidence) => evidence.sourceId === input.sourceId)
    .map((evidence) => {
      const sourceExcerpt = sanitizeSourceWatchExcerpt(evidence.sourceExcerpt)
      if (!sourceExcerpt) return null
      return [
        evidence.locator?.heading ?? null,
        evidence.sourceUpdatedOn ? `Updated ${evidence.sourceUpdatedOn}` : null,
        sourceExcerpt,
      ]
        .filter((value): value is string => Boolean(value))
        .join('\n')
    })
    .filter((value): value is string => Boolean(value))

  const sourceExcerpt = baseExcerpt.at(0) ?? input.fallbackExcerpt ?? ''

  const sourceText = [rule?.title, ...(baseExcerpt.length > 0 ? baseExcerpt : [])]
    .filter((value): value is string => Boolean(value))
    .join('\n')
    .trim()

  return {
    sourceExcerpt,
    sourceText: sourceText || input.fallbackExcerpt || '',
  }
}

function toMissingSourceTextRow(row: SqlRow): MissingSourceTextRow | null {
  const firmId = parseRowValue(row, 'firm_id')
  const id = parseRowValue(row, 'id')
  const inputContextRef = parseRowValue(row, 'input_context_ref')
  const outputText = parseRowValue(row, 'output_text')
  const citationsJson = parseRowValue(row, 'citations_json')
  if (!id || !inputContextRef || !outputText) return null
  const citations = parseJsonObject(citationsJson) ?? {}
  const sourceText = citations.sourceText
  if (
    !FORCE_UPDATE &&
    typeof sourceText === 'string' &&
    sourceText.length > 0 &&
    !isLikelyTemplateSourceText(sourceText)
  ) {
    return null
  }
  return {
    id,
    firmId: firmId ?? null,
    inputContextRef,
    outputText,
    citations,
  }
}

function buildSourceText(input: {
  row: MissingSourceTextRow
  source: ReturnType<typeof listRuleSources>[number]
  rule: ReturnType<typeof findRuleById>
}) {
  const outputExcerpt = parseDraftSourceExcerpt(input.row.outputText)
  const fallback = parseRuleEvidenceText({
    rule: input.rule,
    sourceId: input.source.id,
    fallbackExcerpt: outputExcerpt,
  })
  const sourceTextParts = [
    fallback.sourceText,
    ...(fallback.sourceExcerpt ? [fallback.sourceExcerpt] : []),
  ]
    .join('\n')
    .trim()

  return sourceTextParts || `${input.source.title}\n${input.source.url}`
}

const dbPath = localD1Path()
const sourceById = new Map(listRuleSources().map((source) => [source.id, source]))
const rows = sqliteQueryJson(
  dbPath,
  [
    'select id, firm_id, input_context_ref, output_text, citations_json',
    'from ai_output',
    "where kind = 'rule_concrete_draft'",
    'and guard_result = "ok"',
    'and output_text is not null',
    ...(FORCE_UPDATE
      ? []
      : [
          "and (citations_json is null or json_extract(citations_json, '$.sourceText') is null or trim(json_extract(citations_json, '$.sourceText')) = '' or lower(json_extract(citations_json, '$.sourceText')) like '%official source registered%' or lower(json_extract(citations_json, '$.sourceText')) like '%templates require practice owner or manager acceptance%')",
        ]),
    'order by generated_at desc',
  ].join(' '),
)

function isLikelyTemplateSourceText(value: string | null | undefined): boolean {
  if (!value) return false
  const trimmed = value.trim()
  if (!trimmed) return false
  if (!SOURCE_WATCH_PLACEHOLDER_RE.test(trimmed)) return false
  const withoutTemplate = trimmed
    .toLowerCase()
    .replace(/official source registered/gi, ' ')
    .replace(/templates require practice owner or manager acceptance/gi, ' ')
    .replace(/[^a-z0-9]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return withoutTemplate.length < 5
}

const targets = rows
  .map(toMissingSourceTextRow)
  .filter((row): row is MissingSourceTextRow => row !== null)
let updated = 0
let skipped = 0

for (const target of targets) {
  const parsed = parseContext(target.inputContextRef)
  if (!parsed) {
    skipped += 1
    console.log(`[skip] ${target.id}: unparsable contextRef`)
    continue
  }
  const { ruleId, sourceId } = parsed
  const rule = findRuleById(ruleId)
  if (!rule) {
    skipped += 1
    console.log(`[skip] ${target.id}: rule not found ${ruleId}`)
    continue
  }
  const source = sourceById.get(sourceId)
  if (!source) {
    skipped += 1
    console.log(`[skip] ${target.id}: source not found ${sourceId}`)
    continue
  }

  const sourceText = buildSourceText({
    row: target,
    source,
    rule,
  })
  const citations = {
    ...target.citations,
    sourceText,
  }
  const sql = `update ai_output set citations_json = ${sqlString(JSON.stringify(citations))} where id = ${sqlString(target.id)};`
  if (DRY_RUN) {
    console.log(`[dry-run] would update ${target.id} (${target.firmId ?? 'global'})`)
    updated += 1
    continue
  }
  sqliteExec(dbPath, sql)
  updated += 1
  console.log(`[update] ${target.id}`)
}

console.log(
  JSON.stringify(
    {
      total: rows.length,
      targets: targets.length,
      force: FORCE_UPDATE,
      updated,
      skipped,
      mode: DRY_RUN ? 'dry_run' : 'write',
      dbPath,
    },
    null,
    2,
  ),
)
