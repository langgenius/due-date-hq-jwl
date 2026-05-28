import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import {
  findRuleById,
  listObligationRules,
  listRuleSources,
} from '../packages/core/src/rules/index'

const PROMPT_VERSION = 'rule-concrete-draft@v2'
const RETIRED_MODEL = 'deterministic-source-text'
const DB_DIR = 'apps/server/.wrangler/state/v3/d1/miniflare-D1DatabaseObject'
const CONTEXT_BATCH_SIZE = 180
const DEPRECATE_STALE_TEMPLATES = process.argv.includes('--deprecate-stale-templates')

interface DraftTarget {
  ruleId: string
  ruleVersion: number
  sourceId: string
  contextRef: string
}

interface AiOutputRow {
  id: string
  firm_id: string | null
  user_id: string | null
  input_context_ref: string
  input_hash: string
  prompt_version: string
  model: string
  output_text: string
  citations_json: string | null
  generated_at: number
}

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

function sqlString(value: string | null | undefined): string {
  if (value === null || value === undefined) return 'null'
  return `'${value.replaceAll("'", "''")}'`
}

function sqlNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'null'
  return String(value)
}

function sqlDate(value: unknown): string {
  if (typeof value !== 'string') return 'null'
  const ms = Date.parse(value)
  return Number.isFinite(ms) ? sqlNumber(ms) : 'null'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function sqliteQueryJson(dbPath: string, sql: string): unknown[] {
  const output = execFileSync('sqlite3', ['-json', dbPath, sql], { encoding: 'utf8' }).trim()
  if (!output) return []
  const parsed: unknown = JSON.parse(output)
  return Array.isArray(parsed) ? parsed : []
}

function sqliteExec(dbPath: string, sql: string): void {
  execFileSync('sqlite3', [dbPath], {
    input: ['.timeout 10000', sql].join('\n'),
    encoding: 'utf8',
  })
}

function chunked<T>(values: readonly T[], size: number): T[][] {
  const result: T[][] = []
  for (let start = 0; start < values.length; start += size) {
    result.push(values.slice(start, start + size))
  }
  return result
}

function primarySourceIdForRule(rule: {
  sourceIds: readonly string[]
  evidence: readonly { sourceId?: string | null }[]
}): string | null {
  return rule.sourceIds[0] ?? rule.evidence[0]?.sourceId ?? null
}

function listTargets(): DraftTarget[] {
  return listObligationRules({ includeCandidates: true })
    .filter((rule) => rule.dueDateLogic.kind === 'source_defined_calendar')
    .flatMap((rule) => {
      const sourceId = primarySourceIdForRule(rule)
      if (!sourceId) return []
      return [
        {
          ruleId: rule.id,
          ruleVersion: rule.version,
          sourceId,
          contextRef: ['rule', rule.id, `v${rule.version}`, sourceId].join(':'),
        },
      ]
    })
}

function readJsonRecord(value: string | null): Record<string, unknown> {
  if (!value) return {}
  try {
    const parsed: unknown = JSON.parse(value)
    return isRecord(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function isAiOutputRow(value: unknown): value is AiOutputRow {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    isNullableString(value.firm_id) &&
    isNullableString(value.user_id) &&
    typeof value.input_context_ref === 'string' &&
    typeof value.input_hash === 'string' &&
    typeof value.prompt_version === 'string' &&
    typeof value.model === 'string' &&
    typeof value.output_text === 'string' &&
    isNullableString(value.citations_json) &&
    typeof value.generated_at === 'number'
  )
}

function latestMissingAiRows(dbPath: string, contextRefs: readonly string[]): AiOutputRow[] {
  const rows: AiOutputRow[] = []
  for (const chunk of chunked(contextRefs, CONTEXT_BATCH_SIZE)) {
    const chunkRows = sqliteQueryJson(
      dbPath,
      [
        'with latest as (',
        'select id, firm_id, user_id, input_context_ref, input_hash, prompt_version, model,',
        'output_text, citations_json, generated_at,',
        'row_number() over (partition by input_context_ref order by generated_at desc) rn',
        'from ai_output',
        "where kind = 'rule_concrete_draft'",
        `and prompt_version = ${sqlString(PROMPT_VERSION)}`,
        "and guard_result = 'ok'",
        'and output_text is not null',
        'and model is not null',
        `and model <> ${sqlString(RETIRED_MODEL)}`,
        `and input_context_ref in (${chunk.map(sqlString).join(', ')})`,
        ')',
        'select latest.*',
        'from latest',
        'left join rule_concrete_draft mirror',
        'on mirror.input_context_ref = latest.input_context_ref',
        `and mirror.prompt_version = ${sqlString(PROMPT_VERSION)}`,
        'and mirror.output_text is not null',
        'and mirror.model is not null',
        `and mirror.model <> ${sqlString(RETIRED_MODEL)}`,
        'where latest.rn = 1',
        'and mirror.ai_output_id is null',
        'order by latest.input_context_ref',
      ].join(' '),
    ).filter(isAiOutputRow)
    rows.push(...chunkRows)
  }
  return rows
}

function upsertMirrorRow(dbPath: string, row: AiOutputRow): 'updated' | 'skipped' {
  const contextMatch = /^rule:(.+):v(\d+):(.+)$/.exec(row.input_context_ref)
  if (!contextMatch?.[1] || !contextMatch[2] || !contextMatch[3]) return 'skipped'
  const rule = findRuleById(contextMatch[1])
  const source = listRuleSources().find((item) => item.id === contextMatch[3])
  if (!rule || !source) return 'skipped'

  const output = readJsonRecord(row.output_text)
  const citations = readJsonRecord(row.citations_json)
  const sourceExcerpt =
    stringValue(output.sourceExcerpt) ??
    stringValue(output.source_excerpt) ??
    stringValue(citations.sourceExcerpt)
  if (!sourceExcerpt) return 'skipped'

  const sourceUrl = stringValue(citations.sourceUrl) ?? source.url
  const now = Date.now()
  sqliteExec(
    dbPath,
    [
      `insert into rule_concrete_draft (ai_output_id, firm_id, user_id, input_context_ref, input_hash, prompt_version, model, rule_id, rule_version, source_id, source_snapshot_id, source_url, source_fetched_at, source_published_at, source_excerpt, source_text, output_text, citations_json, generated_at, updated_at) values (${[
        sqlString(row.id),
        sqlString(row.firm_id),
        sqlString(row.user_id),
        sqlString(row.input_context_ref),
        sqlString(row.input_hash),
        sqlString(row.prompt_version),
        sqlString(row.model),
        sqlString(rule.id),
        sqlNumber(rule.version),
        sqlString(source.id),
        sqlString(stringValue(citations.sourceSnapshotId)),
        sqlString(sourceUrl),
        sqlDate(citations.sourceFetchedAt),
        sqlDate(citations.sourcePublishedAt),
        sqlString(sourceExcerpt),
        sqlString(stringValue(citations.sourceText)),
        sqlString(row.output_text),
        sqlString(row.citations_json),
        sqlNumber(row.generated_at),
        sqlNumber(now),
      ].join(', ')})
      on conflict(ai_output_id) do update set
        firm_id = excluded.firm_id,
        user_id = excluded.user_id,
        input_context_ref = excluded.input_context_ref,
        input_hash = excluded.input_hash,
        prompt_version = excluded.prompt_version,
        model = excluded.model,
        rule_id = excluded.rule_id,
        rule_version = excluded.rule_version,
        source_id = excluded.source_id,
        source_snapshot_id = excluded.source_snapshot_id,
        source_url = excluded.source_url,
        source_fetched_at = excluded.source_fetched_at,
        source_published_at = excluded.source_published_at,
        source_excerpt = excluded.source_excerpt,
        source_text = excluded.source_text,
        output_text = excluded.output_text,
        citations_json = excluded.citations_json,
        generated_at = excluded.generated_at,
        updated_at = excluded.updated_at;`,
    ].join('\n'),
  )
  return 'updated'
}

function deprecateStaleTemplates(dbPath: string): number {
  const currentRuleIds = listObligationRules({ includeCandidates: true }).map((rule) => rule.id)
  const staleIds = sqliteQueryJson(
    dbPath,
    [
      'select id',
      'from rule_template',
      "where status = 'available'",
      `and id not in (${currentRuleIds.map(sqlString).join(', ')})`,
      'order by id',
    ].join(' '),
  ).flatMap((row) => (isRecord(row) && typeof row.id === 'string' ? [row.id] : []))
  if (staleIds.length === 0) return 0
  sqliteExec(
    dbPath,
    [
      'update rule_template',
      "set status = 'deprecated', updated_at = cast(unixepoch('subsecond') * 1000 as integer)",
      `where id in (${staleIds.map(sqlString).join(', ')});`,
    ].join(' '),
  )
  return staleIds.length
}

const dbPath = localD1Path()
const targets = listTargets()
const rows = latestMissingAiRows(
  dbPath,
  targets.map((target) => target.contextRef),
)
let updated = 0
let skipped = 0
for (const row of rows) {
  if (upsertMirrorRow(dbPath, row) === 'updated') updated += 1
  else skipped += 1
}
const deprecatedTemplates = DEPRECATE_STALE_TEMPLATES ? deprecateStaleTemplates(dbPath) : 0

console.log(
  JSON.stringify(
    {
      dbPath,
      inspectedTargets: targets.length,
      missingMirrorRows: rows.length,
      updated,
      skipped,
      deprecatedTemplates,
    },
    null,
    2,
  ),
)
