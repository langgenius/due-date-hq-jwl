/* eslint-disable no-await-in-loop, typescript-eslint/no-unsafe-type-assertion --
 * Operational backfill script bridges local sqlite rows and worker-only types.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { generateText } from '../packages/ai/node_modules/ai/dist/index.mjs'
import { createAiGateway } from '../packages/ai/node_modules/ai-gateway-provider/dist/index.mjs'
import { createOpenRouter } from '../packages/ai/node_modules/ai-gateway-provider/dist/providers/openrouter.mjs'
import { createUnified } from '../packages/ai/node_modules/ai-gateway-provider/dist/providers/unified.mjs'
import {
  extractOfficialSourceText,
  SOURCE_WATCH_PLACEHOLDER_RE,
} from '../apps/server/src/procedures/rules/source-text'
import {
  findRuleById,
  listObligationRules,
  listRuleSources,
} from '../packages/core/src/rules/index'
import type { AiOutputRow } from '../packages/ports/src/ai'
import type { RuleConcreteDraftRepo } from '../packages/ports/src/rule-concrete-drafts'
import {
  concreteDraftAiInput,
  cachedConcreteDraftKey,
  extractPdfSourceText,
  generateConcreteDraft,
  hashAiInput,
  normalizeRuleConcreteDraftAiOutput,
  ruleConcreteDraftContextRef,
  RuleConcreteDraftAiOutputSchema,
  RULE_CONCRETE_DRAFT_PROMPT,
  validateConcreteRuleDraft,
} from '../apps/server/src/procedures/rules/concrete-draft'
import type { Env } from '../apps/server/src/env'

type GenerateAiRepo = Parameters<typeof generateConcreteDraft>[0]['aiRepo']
type RecordRunInput = Parameters<GenerateAiRepo['recordGlobalRun']>[0]
type GenerateTextResult = Awaited<ReturnType<typeof generateText>>

const LOCAL_DRAFT_TARGETS = [
  ['md.local_individual_income.candidate.2026', 'md.local_income_tax'],
  ['in.local_individual_income.candidate.2026', 'in.local_county_income_tax'],
  ['ny.local_individual_income.candidate.2026', 'ny.nyc_yonkers_income_tax'],
  ['pa.local_individual_income.candidate.2026', 'pa.local_eit_lit_psd'],
  ['pa.local_employer_withholding.candidate.2026', 'pa.local_eit_act32_employer_withholding'],
  ['pa.local_services_tax.candidate.2026', 'pa.local_services_tax'],
  ['oh.local_individual_income.candidate.2026', 'oh.municipal_income_tax_annual_return'],
  ['oh.local_business_income.candidate.2026', 'oh.municipal_net_profit_filing'],
] as const
const SCRIPT_SOURCE_TEXT_MAX_CHARS = 24_000
const SCRIPT_SOURCE_FETCH_TIMEOUT_MS = 20_000
const SCRIPT_SOURCE_FETCH_HEADERS = {
  accept: 'text/html,application/pdf,application/json,text/plain;q=0.9,*/*;q=0.1',
  'accept-language': 'en-US,en;q=0.9',
  'cache-control': 'no-cache',
  'user-agent': 'Mozilla/5.0 (compatible; DueDateHQConcreteDraftBackfill/1.0)',
}

type DraftTarget = { ruleId: string; sourceId: string; ruleVersion: number }
type DraftResult = { ruleId: string; sourceId: string; aiOutputId?: string; error?: string }

function isSourceDefinedRule(rule: { dueDateLogic: { kind: string } }): boolean {
  return rule.dueDateLogic.kind === 'source_defined_calendar'
}

function primarySourceIdForRule(rule: {
  sourceIds: readonly string[]
  evidence: readonly { sourceId?: string | null }[]
}): string | null {
  return rule.sourceIds[0] ?? rule.evidence[0]?.sourceId ?? null
}

function listLocalConfiguredTargets(sourceFilter: string | null): DraftTarget[] {
  const rawTargets: readonly (readonly [string, string])[] =
    sourceFilter === null
      ? LOCAL_DRAFT_TARGETS
      : LOCAL_DRAFT_TARGETS.filter(([, sourceId]) => sourceId === sourceFilter)

  return rawTargets
    .map(([ruleId, sourceId]) => {
      const base = findRuleById(ruleId)
      return base ? ({ ruleId, sourceId, ruleVersion: base.version } satisfies DraftTarget) : null
    })
    .filter((target): target is DraftTarget => target !== null)
}

function listSourceDefinedTargets(sourceFilter: string | null): DraftTarget[] {
  const sourceById = new Map(listRuleSources().map((source) => [source.id, source]))
  return listObligationRules({ includeCandidates: true })
    .filter((rule) => rule.status !== 'deprecated')
    .filter(isSourceDefinedRule)
    .flatMap((rule) => {
      const sourceId = primarySourceIdForRule(rule)
      if (!sourceId || !sourceById.has(sourceId)) return []
      if (sourceFilter !== null && sourceFilter !== sourceId) return []
      return [{ ruleId: rule.id, sourceId, ruleVersion: rule.version }]
    })
}

function chunked<T>(values: readonly T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < values.length; i += size) {
    result.push(values.slice(i, i + size))
  }
  return result
}

function cachedContextRefs(dbPath: string, targets: readonly DraftTarget[]): Set<string> {
  const promptVersion = RULE_CONCRETE_DRAFT_PROMPT
  const contextRefs = Array.from(
    new Set(
      targets.map((target) =>
        cachedConcreteDraftKey({
          ruleId: target.ruleId,
          ruleVersion: target.ruleVersion,
          sourceId: target.sourceId,
        }),
      ),
    ),
  )
  if (contextRefs.length === 0) return new Set()

  const cached = new Set<string>()
  for (const chunk of chunked(contextRefs, 220)) {
    const rows = sqliteQueryJson(
      dbPath,
      [
        'select distinct input_context_ref',
        'from ai_output',
        `where kind = ${sqlString('rule_concrete_draft')}`,
        `and prompt_version = ${sqlString(promptVersion)}`,
        "and guard_result = 'ok'",
        'and output_text is not null',
        "and model is not null and model <> 'deterministic-source-text'",
        `and input_context_ref in (${chunk.map(sqlString).join(', ')})`,
      ].join(' '),
    ) as { input_context_ref?: unknown }[]

    for (const row of rows) {
      if (typeof row.input_context_ref === 'string') cached.add(row.input_context_ref)
    }
  }

  return cached
}

function parseDevVars(path: string): Record<string, string> {
  if (!existsSync(path)) return {}
  const env: Record<string, string> = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separator = trimmed.indexOf('=')
    if (separator < 0) continue
    const key = trimmed.slice(0, separator).trim()
    const value = trimmed.slice(separator + 1).trim()
    env[key] = value.replace(/^"(.*)"$/, '$1')
  }
  return env
}

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

function sqlNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'null'
  return String(value)
}

function sqliteQueryJson(dbPath: string, sql: string): unknown[] {
  const output = execFileSync('sqlite3', ['-json', dbPath, sql], { encoding: 'utf8' }).trim()
  return output ? (JSON.parse(output) as unknown[]) : []
}

function sqliteExec(dbPath: string, sql: string): void {
  execFileSync('sqlite3', [dbPath], {
    input: ['.timeout 10000', sql].join('\n'),
    encoding: 'utf8',
  })
}

function aiOutputModel(dbPath: string, aiOutputId: string): string | null {
  const rows = sqliteQueryJson(
    dbPath,
    `select model from ai_output where id = ${sqlString(aiOutputId)} limit 1`,
  ) as Record<string, unknown>[]
  const model = rows[0]?.model
  return typeof model === 'string' ? model : null
}

function deterministicLatestTargets(dbPath: string): DraftTarget[] {
  const rows = sqliteQueryJson(
    dbPath,
    [
      'with latest as (',
      'select input_context_ref, model, guard_result, output_text,',
      'row_number() over (partition by input_context_ref order by generated_at desc) rn',
      'from ai_output',
      "where kind = 'rule_concrete_draft'",
      'and guard_result = "ok"',
      'and output_text is not null',
      ')',
      'select input_context_ref from latest',
      'where rn = 1',
      "and model = 'deterministic-source-text'",
      'order by input_context_ref',
    ].join(' '),
  ) as Record<string, unknown>[]

  return rows.flatMap((row): DraftTarget[] => {
    const contextRef = row.input_context_ref
    if (typeof contextRef !== 'string') return []
    const match = /^rule:(.+):v\d+:(.+)$/.exec(contextRef)
    if (!match?.[1] || !match[2]) return []
    const base = findRuleById(match[1])
    if (!base) return []
    return [{ ruleId: match[1], sourceId: match[2], ruleVersion: base.version }]
  })
}

function toAiOutputRow(row: Record<string, unknown>): AiOutputRow {
  return {
    id: String(row.id),
    firmId: typeof row.firm_id === 'string' ? row.firm_id : null,
    userId: typeof row.user_id === 'string' ? row.user_id : null,
    kind: 'rule_concrete_draft',
    promptVersion: String(row.prompt_version),
    model: typeof row.model === 'string' ? row.model : null,
    inputContextRef: typeof row.input_context_ref === 'string' ? row.input_context_ref : null,
    inputHash: String(row.input_hash),
    outputText: typeof row.output_text === 'string' ? row.output_text : null,
    citations:
      typeof row.citations_json === 'string' && row.citations_json
        ? JSON.parse(row.citations_json)
        : null,
    guardResult: String(row.guard_result),
    refusalCode: typeof row.refusal_code === 'string' ? row.refusal_code : null,
    generatedAt: new Date(Number(row.generated_at)),
  }
}

function makeSqliteAiRepo(
  dbPath: string,
  opts: { ignoreSuccessfulCache?: boolean } = {},
): GenerateAiRepo {
  async function findSuccessfulGlobalRun(input: {
    kind: 'rule_concrete_draft'
    inputContextRef: string
    inputHash: string
    promptVersion: string
  }): Promise<AiOutputRow | null> {
    if (opts.ignoreSuccessfulCache) return null
    const rows = sqliteQueryJson(
      dbPath,
      [
        'select * from ai_output',
        'where firm_id is null',
        `and kind = ${sqlString(input.kind)}`,
        `and input_context_ref = ${sqlString(input.inputContextRef)}`,
        `and input_hash = ${sqlString(input.inputHash)}`,
        `and prompt_version = ${sqlString(input.promptVersion)}`,
        "and guard_result = 'ok'",
        'and output_text is not null',
        "and model is not null and model <> 'deterministic-source-text'",
        'order by generated_at desc limit 1',
      ].join(' '),
    ) as Record<string, unknown>[]
    return rows[0] ? toAiOutputRow(rows[0]) : null
  }

  async function recordGlobalRun(input: RecordRunInput): Promise<{
    aiOutputId: string
    llmLogId: string
  }> {
    const aiOutputId = crypto.randomUUID()
    const llmLogId = crypto.randomUUID()
    const tokensIn = input.trace.tokens?.input ?? null
    const tokensOut = input.trace.tokens?.output ?? null
    const costUsd = input.trace.costUsd ?? null
    const refusalCode = input.trace.refusalCode ?? null
    const success = input.trace.guardResult === 'ok' ? 1 : 0
    const now = Date.now()

    sqliteExec(
      dbPath,
      [
        'begin;',
        `insert into ai_output (id, firm_id, user_id, kind, prompt_version, model, input_context_ref, input_hash, output_text, citations_json, guard_result, refusal_code, tokens_in, tokens_out, latency_ms, cost_usd, generated_at) values (${[
          sqlString(aiOutputId),
          'null',
          'null',
          sqlString(input.kind),
          sqlString(input.trace.promptVersion),
          sqlString(input.trace.model),
          sqlString(input.inputContextRef),
          sqlString(input.trace.inputHash),
          sqlString(input.outputText ?? null),
          sqlString(input.citations === undefined ? null : JSON.stringify(input.citations)),
          sqlString(input.trace.guardResult),
          sqlString(refusalCode),
          sqlNumber(tokensIn),
          sqlNumber(tokensOut),
          sqlNumber(input.trace.latencyMs),
          sqlNumber(costUsd),
          sqlNumber(now),
        ].join(', ')});`,
        `insert into llm_log (id, firm_id, user_id, prompt_version, model, input_hash, input_tokens, output_tokens, latency_ms, cost_usd, guard_result, refusal_code, success, error_msg, created_at) values (${[
          sqlString(llmLogId),
          'null',
          'null',
          sqlString(input.trace.promptVersion),
          sqlString(input.trace.model),
          sqlString(input.trace.inputHash),
          sqlNumber(tokensIn),
          sqlNumber(tokensOut),
          sqlNumber(input.trace.latencyMs),
          sqlNumber(costUsd),
          sqlString(input.trace.guardResult),
          sqlString(refusalCode),
          String(success),
          sqlString(input.errorMsg ?? null),
          sqlNumber(now),
        ].join(', ')});`,
        'commit;',
      ].join('\n'),
    )

    return { aiOutputId, llmLogId }
  }

  return {
    firmId: 'global',
    findSuccessfulGlobalRun,
    findSuccessfulRun: async () => null,
    findSuccessfulGlobalRunsByContextRefs: async () => [],
    findSuccessfulRunsByContextRefs: async () => [],
    recordGlobalRun,
    recordRun: async (input) => recordGlobalRun(input),
  } satisfies GenerateAiRepo
}

function dateSql(value: Date | null): string {
  return value ? sqlNumber(value.getTime()) : 'null'
}

function makeSqliteRuleConcreteDraftRepo(dbPath: string): RuleConcreteDraftRepo {
  return {
    async upsert(input) {
      const now = Date.now()
      sqliteExec(
        dbPath,
        [
          `insert into rule_concrete_draft (ai_output_id, firm_id, user_id, input_context_ref, input_hash, prompt_version, model, rule_id, rule_version, source_id, source_snapshot_id, source_url, source_fetched_at, source_published_at, source_excerpt, source_text, output_text, citations_json, generated_at, updated_at) values (${[
            sqlString(input.aiOutputId),
            sqlString(input.firmId),
            sqlString(input.userId),
            sqlString(input.inputContextRef),
            sqlString(input.inputHash),
            sqlString(input.promptVersion),
            sqlString(input.model),
            sqlString(input.ruleId),
            sqlNumber(input.ruleVersion),
            sqlString(input.sourceId),
            sqlString(input.sourceSnapshotId),
            sqlString(input.sourceUrl),
            dateSql(input.sourceFetchedAt),
            dateSql(input.sourcePublishedAt),
            sqlString(input.sourceExcerpt),
            sqlString(input.sourceText),
            sqlString(input.outputText),
            sqlString(input.citations === undefined ? null : JSON.stringify(input.citations)),
            dateSql(input.generatedAt),
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
    },
    async listReadyContextRefs() {
      return []
    },
    async health() {
      return { readyContextRefs: [], missingContextRefs: [] }
    },
  }
}

function extractJsonObject(text: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text)
  const raw = fenced?.[1] ?? text
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start < 0 || end < start) throw new Error('AI response did not contain a JSON object.')
  return JSON.parse(raw.slice(start, end + 1))
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown_error'
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchSourceTextForScript(url: string): Promise<string | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), SCRIPT_SOURCE_FETCH_TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      headers: SCRIPT_SOURCE_FETCH_HEADERS,
      signal: controller.signal,
    })
    if (!response.ok) return null

    const contentType = response.headers.get('content-type') ?? ''
    if (contentType.includes('application/pdf') || url.toLowerCase().includes('.pdf')) {
      return extractPdfSourceText(await response.arrayBuffer())
    }

    const raw = await response.text()
    const text =
      contentType.includes('text/html') || /<[a-z][\s\S]*>/i.test(raw)
        ? extractOfficialSourceText(raw)
        : raw.replace(/\s+/g, ' ').trim()
    const trimmed = text.slice(0, SCRIPT_SOURCE_TEXT_MAX_CHARS).trim()
    return trimmed.length > 0 ? trimmed : null
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

async function generateStructuredLocalDraftWithText(input: {
  env: Env
  aiRepo: GenerateAiRepo
  dbPath: string
  base: NonNullable<ReturnType<typeof findRuleById>>
  source: ReturnType<typeof listRuleSources>[number]
}): Promise<string> {
  const officialSourceText = await fetchSourceTextForScript(input.source.url)
  const evidenceSourceText = input.base.evidence
    .filter((evidence) => evidence.sourceId === input.source.id)
    .filter((evidence) => !SOURCE_WATCH_PLACEHOLDER_RE.test(evidence.sourceExcerpt))
    .map((evidence) =>
      [
        evidence.locator.heading ?? input.source.title,
        evidence.sourceUpdatedOn ? `Updated ${evidence.sourceUpdatedOn}` : null,
        evidence.sourceExcerpt,
      ]
        .filter((value): value is string => Boolean(value))
        .join('\n'),
    )
  const sourceText = [
    input.source.title,
    input.source.url,
    ...evidenceSourceText,
    officialSourceText,
  ]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join('\n')
    .slice(0, SCRIPT_SOURCE_TEXT_MAX_CHARS)
  const aiInput = concreteDraftAiInput({
    base: input.base,
    source: input.source,
    sourceText,
  })
  const basePrompt = [
    'Return only valid JSON for a DueDateHQ RuleConcreteDraftPayload.',
    'Use only concrete due-date logic kinds allowed by the schema: fixed_date, nth_day_after_tax_year_end, nth_day_after_tax_year_begin, or period_table.',
    'Do not return source_defined_calendar or prose aliases.',
    'Do not use null for dueDateLogic.date, monthOffset, day, periods, dueDate, or frequency.',
    'If a required dueDateLogic field is unknown, infer it from exact dates in sourceText or return a period_table with exact YYYY-MM-DD dates.',
    'Copy sourceExcerpt exactly from sourceText.',
    'If the source text gives an exact calendar-year due date, use fixed_date.',
    'If the source text gives a due date relative to tax-year end or beginning, use the matching relative due-date kind.',
    'If the source text gives quarterly or periodic dates, use period_table with concrete dates.',
    'Use confidence as a number between 0 and 1.',
    'Use coverageStatus as full, skeleton, or manual.',
    'Use frequency as semiweekly, monthly, quarterly, or annual.',
    'The JSON object must include dueDateLogic, extensionPolicy, coverageStatus, requiresApplicabilityReview, quality, sourceHeading, sourceExcerpt, confidence, and reasoning.',
  ]
  const gateway = createAiGateway({
    accountId: input.env.AI_GATEWAY_ACCOUNT_ID,
    gateway: input.env.AI_GATEWAY_SLUG,
    ...(input.env.AI_GATEWAY_API_KEY ? { apiKey: input.env.AI_GATEWAY_API_KEY } : {}),
  })
  const modelName = input.env.AI_GATEWAY_MODEL_QUALITY_JSON
  const model =
    input.env.AI_GATEWAY_PROVIDER === 'openrouter'
      ? createOpenRouter({ apiKey: input.env.AI_GATEWAY_PROVIDER_API_KEY }).chat(modelName)
      : createUnified()(modelName)
  let lastError: unknown = null

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const startedAt = Date.now()
    const prompt = [
      ...basePrompt,
      lastError
        ? `Previous attempt failed validation: ${errorMessage(lastError)}. Return corrected JSON only.`
        : null,
      JSON.stringify(aiInput),
    ]
      .filter((value): value is string => typeof value === 'string' && value.length > 0)
      .join('\n\n')

    try {
      const result: GenerateTextResult = await generateText({
        model: gateway(model),
        prompt,
        temperature: 0,
      })
      const aiOutput = RuleConcreteDraftAiOutputSchema.parse(extractJsonObject(result.text))
      const normalized = normalizeRuleConcreteDraftAiOutput({
        output: aiOutput,
        applicableYear: input.base.applicableYear,
        sourceTitle: input.source.title,
        sourceText,
      })
      const parsed = normalized.draft
      if (!parsed) {
        throw new Error(normalized.error ?? 'AI concrete draft output could not be normalized.')
      }
      const validationError = validateConcreteRuleDraft({
        rule: input.base,
        dueDateLogic: parsed.dueDateLogic,
        sourceText,
        sourceExcerpt: parsed.sourceExcerpt,
        coverageStatus: parsed.coverageStatus,
        requiresApplicabilityReview: parsed.requiresApplicabilityReview,
      })
      if (validationError) throw new Error(validationError)
      const aiPayload = concreteDraftAiInput({
        base: input.base,
        source: input.source,
        sourceText,
      })
      const inputHash = await hashAiInput(aiPayload)
      const tokens: { input?: number; output?: number } = {}
      if (result.usage.inputTokens !== undefined) tokens.input = result.usage.inputTokens
      if (result.usage.outputTokens !== undefined) tokens.output = result.usage.outputTokens
      const contextRef = ruleConcreteDraftContextRef({
        ruleId: input.base.id,
        ruleVersion: input.base.version,
        sourceId: input.source.id,
      })
      const recorded = await input.aiRepo.recordGlobalRun({
        userId: null,
        kind: 'rule_concrete_draft',
        inputContextRef: contextRef,
        trace: {
          promptVersion: RULE_CONCRETE_DRAFT_PROMPT,
          model: modelName,
          latencyMs: Date.now() - startedAt,
          guardResult: 'ok',
          inputHash,
          ...(Object.keys(tokens).length > 0 ? { tokens } : {}),
        },
        outputText: JSON.stringify(parsed),
        citations: {
          sourceId: input.source.id,
          sourceUrl: input.source.url,
          sourceExcerpt: parsed.sourceExcerpt,
          sourceText,
        },
      })
      return recorded.aiOutputId
    } catch (error) {
      lastError = error
      if (attempt < 3) await delay(750 * attempt)
    }
  }

  throw new Error(errorMessage(lastError))
}

const devVars = parseDevVars('apps/server/.dev.vars')

function envValue(key: string, fallback?: string): string | undefined {
  return process.env[key] ?? devVars[key] ?? fallback
}

const env = {
  ENV: envValue('ENV', 'development'),
  AI_GATEWAY_ACCOUNT_ID: envValue('AI_GATEWAY_ACCOUNT_ID'),
  AI_GATEWAY_SLUG: envValue('AI_GATEWAY_SLUG', 'duedatehq'),
  AI_GATEWAY_PROVIDER: envValue('AI_GATEWAY_PROVIDER', 'openrouter'),
  AI_GATEWAY_PROVIDER_API_KEY: envValue('AI_GATEWAY_PROVIDER_API_KEY'),
  AI_GATEWAY_API_KEY: envValue('AI_GATEWAY_API_KEY'),
  AI_GATEWAY_MODEL_FAST_JSON: envValue(
    'AI_GATEWAY_MODEL_FAST_JSON',
    'google/gemini-2.5-flash-lite',
  ),
  AI_GATEWAY_MODEL_FAST_JSON_SOLO_ONBOARDING: envValue(
    'AI_GATEWAY_MODEL_FAST_JSON_SOLO_ONBOARDING',
    'google/gemini-3.1-flash-lite-preview',
  ),
  AI_GATEWAY_MODEL_FAST_JSON_SOLO: envValue(
    'AI_GATEWAY_MODEL_FAST_JSON_SOLO',
    'google/gemini-2.5-flash-lite',
  ),
  AI_GATEWAY_MODEL_FAST_JSON_PAID: envValue(
    'AI_GATEWAY_MODEL_FAST_JSON_PAID',
    'google/gemini-3.1-flash-lite-preview',
  ),
  AI_GATEWAY_MODEL_QUALITY_JSON:
    envValue('AI_GATEWAY_MODEL_QUALITY_JSON') ??
    envValue('AI_GATEWAY_MODEL') ??
    'google/gemini-3-flash-preview',
  AI_GATEWAY_MODEL_REASONING: envValue('AI_GATEWAY_MODEL_REASONING', 'openai/gpt-5-mini'),
  PULSE_BROWSERLESS_URL: envValue('PULSE_BROWSERLESS_URL'),
  PULSE_BROWSERLESS_TOKEN: envValue('PULSE_BROWSERLESS_TOKEN'),
  PULSE_BROWSERLESS_SOURCE_IDS: envValue('PULSE_BROWSERLESS_SOURCE_IDS'),
} as Env

if (!env.AI_GATEWAY_ACCOUNT_ID || !env.AI_GATEWAY_PROVIDER_API_KEY) {
  throw new Error('AI Gateway credentials are missing from apps/server/.dev.vars.')
}

const dbPath = localD1Path()
const sourceFilterArg = process.argv.find((arg) => arg.startsWith('--source='))
const sourceFilter = sourceFilterArg ? sourceFilterArg.slice('--source='.length) : null
const replaceAllDeterministic = process.argv.includes('--all-deterministic')
const includeExisting = process.argv.includes('--include-existing')
const runAllTargets = process.argv.includes('--all') || process.argv.includes('--all-rules')
const concurrencyArg = process.argv
  .find((arg) => arg.startsWith('--concurrency='))
  ?.slice('--concurrency='.length)
const concurrency = Math.max(1, Number(concurrencyArg ?? (replaceAllDeterministic ? '4' : '1')))
const aiRepo = makeSqliteAiRepo(dbPath, {
  ignoreSuccessfulCache: replaceAllDeterministic,
})
const concreteDraftRepo = makeSqliteRuleConcreteDraftRepo(dbPath)
const sourcesById = new Map(listRuleSources().map((source) => [source.id, source]))
const targetSets: DraftTarget[] = replaceAllDeterministic
  ? deterministicLatestTargets(dbPath)
  : runAllTargets
    ? listSourceDefinedTargets(sourceFilter)
    : listLocalConfiguredTargets(sourceFilter)
const cachedRefs = replaceAllDeterministic
  ? new Set<string>()
  : cachedContextRefs(dbPath, targetSets)
const targets =
  !replaceAllDeterministic && !includeExisting
    ? targetSets.filter((target) => {
        const contextRef = cachedConcreteDraftKey({
          ruleId: target.ruleId,
          ruleVersion: target.ruleVersion,
          sourceId: target.sourceId,
        })
        return !cachedRefs.has(contextRef)
      })
    : targetSets
const results: DraftResult[] = []

async function processTarget(target: DraftTarget): Promise<DraftResult> {
  const { ruleId, sourceId } = target
  const base = findRuleById(ruleId)
  const source = sourcesById.get(sourceId)
  if (!base || !source) {
    return { ruleId, sourceId, error: 'rule_or_source_not_found' }
  }
  try {
    let aiOutputId: string
    try {
      const draft = await generateConcreteDraft({
        env,
        aiRepo,
        concreteDraftRepo,
        scope: 'global',
        userId: null,
        base,
        source,
      })
      aiOutputId = draft.aiOutputId
    } catch {
      aiOutputId = await generateStructuredLocalDraftWithText({
        env,
        aiRepo,
        dbPath,
        base,
        source,
      })
    }
    const model = aiOutputModel(dbPath, aiOutputId)
    if (model === 'deterministic-source-text') throw new Error('still_deterministic_source_text')
    return { ruleId, sourceId, aiOutputId }
  } catch (error) {
    return {
      ruleId,
      sourceId,
      error: error instanceof Error ? error.message : 'unknown_error',
    }
  }
}

let nextTargetIndex = 0
async function worker() {
  while (nextTargetIndex < targets.length) {
    const target = targets[nextTargetIndex]
    nextTargetIndex += 1
    if (!target) continue
    const result = await processTarget(target)
    results.push(result)
    const status = result.aiOutputId ? `ok ${result.aiOutputId}` : `error ${result.error}`
    console.log(
      `[${results.length}/${targets.length}] ${result.ruleId}:${result.sourceId} ${status}`,
    )
  }
}

await Promise.all(Array.from({ length: Math.min(concurrency, targets.length) }, () => worker()))

console.log(
  JSON.stringify(
    { promptVersion: RULE_CONCRETE_DRAFT_PROMPT, dbPath, concurrency, results },
    null,
    2,
  ),
)
