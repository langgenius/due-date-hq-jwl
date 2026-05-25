import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { listObligationRules } from '../packages/core/src/rules/index'

const PROMPT_VERSION = 'rule-concrete-draft@v2'
const RETIRED_MODEL = 'deterministic-source-text'
const DB_DIR = 'apps/server/.wrangler/state/v3/d1/miniflare-D1DatabaseObject'
const CONTEXT_BATCH_SIZE = 180

interface DraftTarget {
  ruleId: string
  ruleVersion: number
  sourceId: string
  contextRef: string
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

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`
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

function inputContextRefsFromRows(rows: readonly unknown[]): string[] {
  return rows.flatMap((row) =>
    isRecord(row) && typeof row.input_context_ref === 'string' ? [row.input_context_ref] : [],
  )
}

function currentReadyAiContexts(dbPath: string, contextRefs: readonly string[]): Set<string> {
  const ready = new Set<string>()
  for (const chunk of chunked(contextRefs, CONTEXT_BATCH_SIZE)) {
    const rows = sqliteQueryJson(
      dbPath,
      [
        'select distinct input_context_ref',
        'from ai_output',
        "where kind = 'rule_concrete_draft'",
        `and prompt_version = ${sqlString(PROMPT_VERSION)}`,
        "and guard_result = 'ok'",
        'and output_text is not null',
        'and model is not null',
        `and model <> ${sqlString(RETIRED_MODEL)}`,
        `and input_context_ref in (${chunk.map(sqlString).join(', ')})`,
      ].join(' '),
    )
    for (const contextRef of inputContextRefsFromRows(rows)) {
      ready.add(contextRef)
    }
  }
  return ready
}

function currentReadyMirrorContexts(dbPath: string, contextRefs: readonly string[]): Set<string> {
  const ready = new Set<string>()
  for (const chunk of chunked(contextRefs, CONTEXT_BATCH_SIZE)) {
    const rows = sqliteQueryJson(
      dbPath,
      [
        'select distinct input_context_ref',
        'from rule_concrete_draft',
        `where prompt_version = ${sqlString(PROMPT_VERSION)}`,
        'and output_text is not null',
        'and model is not null',
        `and model <> ${sqlString(RETIRED_MODEL)}`,
        `and input_context_ref in (${chunk.map(sqlString).join(', ')})`,
      ].join(' '),
    )
    for (const contextRef of inputContextRefsFromRows(rows)) {
      ready.add(contextRef)
    }
  }
  return ready
}

function currentRetiredDeterministicContexts(
  dbPath: string,
  contextRefs: readonly string[],
): Set<string> {
  const retired = new Set<string>()
  for (const chunk of chunked(contextRefs, CONTEXT_BATCH_SIZE)) {
    const rows = sqliteQueryJson(
      dbPath,
      [
        'select distinct input_context_ref',
        'from ai_output',
        "where kind = 'rule_concrete_draft'",
        `and prompt_version = ${sqlString(PROMPT_VERSION)}`,
        "and guard_result = 'ok'",
        `and model = ${sqlString(RETIRED_MODEL)}`,
        `and input_context_ref in (${chunk.map(sqlString).join(', ')})`,
      ].join(' '),
    )
    for (const contextRef of inputContextRefsFromRows(rows)) {
      retired.add(contextRef)
    }
  }
  return retired
}

function availableStaleTemplates(dbPath: string, currentRuleIds: readonly string[]): string[] {
  return sqliteQueryJson(
    dbPath,
    [
      'select id',
      'from rule_template',
      "where status = 'available'",
      `and id not in (${currentRuleIds.map(sqlString).join(', ')})`,
      'order by id',
    ].join(' '),
  ).flatMap((row) => (isRecord(row) && typeof row.id === 'string' ? [row.id] : []))
}

const dbPath = localD1Path()
const targets = listTargets()
const contextRefs = targets.map((target) => target.contextRef)
const aiReady = currentReadyAiContexts(dbPath, contextRefs)
const mirrorReady = currentReadyMirrorContexts(dbPath, contextRefs)
const retiredContexts = currentRetiredDeterministicContexts(dbPath, contextRefs)
const staleTemplates = availableStaleTemplates(
  dbPath,
  listObligationRules({ includeCandidates: true }).map((rule) => rule.id),
)

const missingAi = targets.filter((target) => !aiReady.has(target.contextRef))
const missingMirror = targets.filter((target) => !mirrorReady.has(target.contextRef))
const output = {
  dbPath,
  promptVersion: PROMPT_VERSION,
  sourceDefinedRules: targets.length,
  readyAiDrafts: aiReady.size,
  missingAiDrafts: missingAi.length,
  readyMirrorDrafts: mirrorReady.size,
  missingMirrorDrafts: missingMirror.length,
  retiredDeterministicDrafts: retiredContexts.size,
  availableStaleTemplates: staleTemplates.length,
  missingAiSample: missingAi.slice(0, 20),
  missingMirrorSample: missingMirror.slice(0, 20),
  staleTemplateSample: staleTemplates.slice(0, 20),
}

console.log(JSON.stringify(output, null, 2))

if (missingAi.length > 0 || missingMirror.length > 0 || staleTemplates.length > 0) {
  process.exitCode = 1
}
