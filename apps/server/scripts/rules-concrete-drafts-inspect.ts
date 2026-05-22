#!/usr/bin/env node
import { fileURLToPath } from 'node:url'
import { createDb, makePulseOpsRepo } from '@duedatehq/db'
import { listObligationRules, listRuleSources } from '@duedatehq/core/rules'
import type { Env } from '../src/env'
import {
  buildConcreteDraftSourceText,
  cachedConcreteDraftKey,
  RULE_CONCRETE_DRAFT_PROMPT,
} from '../src/procedures/rules/concrete-draft'
import { getPlatformProxy } from 'wrangler'

const args = process.argv.slice(2)
const remote = args.includes('--remote')
const showSource = args.includes('--show-source-excerpt')
const ruleId = args.find((arg) => arg.startsWith('--rule='))?.slice('--rule='.length)
const sourceId = args.find((arg) => arg.startsWith('--source='))?.slice('--source='.length)
const category = args.find((arg) => arg.startsWith('--category='))?.slice('--category='.length)
const limitArg = args.find((arg) => arg.startsWith('--limit='))?.slice('--limit='.length)
const limit = Math.min(Math.max(Number(limitArg ?? 10) || 10, 1), 50)
const promptVersion =
  args.find((arg) => arg.startsWith('--prompt='))?.slice('--prompt='.length) ??
  RULE_CONCRETE_DRAFT_PROMPT

if (args.includes('--help') || args.includes('-h')) {
  console.log(`Usage:
  pnpm rules:concrete-drafts:inspect -- --rule=ca.business_income_return.candidate.2026
  pnpm rules:concrete-drafts:inspect -- --source=ca.ftb_business_due_dates
  pnpm rules:concrete-drafts:inspect -- --category=SOURCE_TEXT_UNAVAILABLE --limit=10
  pnpm rules:concrete-drafts:inspect -- --rule=... --show-source-excerpt`)
  process.exit(0)
}

type Target = {
  rule: ReturnType<typeof listObligationRules>[number]
  source: ReturnType<typeof listRuleSources>[number]
  contextRef: string
}

type AttemptRow = {
  id: string
  inputContextRef: string | null
  inputHash: string
  guardResult: string
  refusalCode: string | null
  outputText: string | null
  citationsJson: unknown
  latencyMs: number
  generatedAtUtc: string
}

type LlmLogRow = {
  inputHash: string
  errorMsg: string | null
  createdAtUtc: string
}

function sourceDefinedTargets(): Target[] {
  const sourcesById = new Map(listRuleSources().map((source) => [source.id, source]))
  return listObligationRules({ includeCandidates: true }).flatMap((rule) => {
    if (rule.dueDateLogic.kind !== 'source_defined_calendar') return []
    if (ruleId && rule.id !== ruleId) return []
    const primarySourceId = rule.sourceIds[0] ?? rule.evidence[0]?.sourceId ?? null
    if (!primarySourceId) return []
    if (sourceId && primarySourceId !== sourceId) return []
    const source = sourcesById.get(primarySourceId)
    if (!source) return []
    return [
      {
        rule,
        source,
        contextRef: cachedConcreteDraftKey({
          ruleId: rule.id,
          ruleVersion: rule.version,
          sourceId: source.id,
        }),
      },
    ]
  })
}

function chunks<T>(items: readonly T[], size: number): T[][] {
  const result: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size))
  }
  return result
}

async function queryAttempts(
  db: Env['DB'],
  input: { contextRefs: readonly string[]; promptVersion: string },
) {
  const results: { results?: AttemptRow[] }[] = await Promise.all(
    chunks(input.contextRefs, 80).map((batch) => {
      const placeholders = batch.map(() => '?').join(',')
      return db
        .prepare(
          `
          select
            id,
            input_context_ref as inputContextRef,
            input_hash as inputHash,
            guard_result as guardResult,
            refusal_code as refusalCode,
            output_text as outputText,
            citations_json as citationsJson,
            latency_ms as latencyMs,
            datetime(generated_at / 1000, 'unixepoch') as generatedAtUtc
          from ai_output
          where firm_id is null
            and kind = 'rule_concrete_draft'
            and prompt_version = ?
            and input_context_ref in (${placeholders})
          order by generated_at desc
        `,
        )
        .bind(input.promptVersion, ...batch)
        .all<AttemptRow>()
    }),
  )
  return results.flatMap((result) => result.results ?? [])
}

async function queryLogs(db: Env['DB'], input: { inputHashes: readonly string[] }) {
  const inputHashes = Array.from(new Set(input.inputHashes)).filter(Boolean)
  const results: { results?: LlmLogRow[] }[] = await Promise.all(
    chunks(inputHashes, 80).map((batch) => {
      const placeholders = batch.map(() => '?').join(',')
      return db
        .prepare(
          `
          select
            input_hash as inputHash,
            error_msg as errorMsg,
            datetime(created_at / 1000, 'unixepoch') as createdAtUtc
          from llm_log
          where input_hash in (${placeholders})
          order by created_at desc
        `,
        )
        .bind(...batch)
        .all<LlmLogRow>()
    }),
  )
  return results.flatMap((result) => result.results ?? [])
}

function latestByHash(rows: readonly LlmLogRow[]) {
  const result = new Map<string, LlmLogRow>()
  for (const row of rows) {
    if (!result.has(row.inputHash)) result.set(row.inputHash, row)
  }
  return result
}

function categoryFor(row: AttemptRow | null) {
  return row?.refusalCode ?? row?.guardResult ?? 'NO_ATTEMPT'
}

async function main() {
  if (!ruleId && !sourceId && !category) {
    throw new Error('Pass --rule, --source, or --category so inspect output stays bounded.')
  }

  const configPath = fileURLToPath(new URL('../wrangler.toml', import.meta.url))
  const platform = await getPlatformProxy<Env>({
    configPath,
    envFiles: ['.dev.vars'],
    remoteBindings: remote,
  })
  try {
    const targets = sourceDefinedTargets()
    const attempts = await queryAttempts(platform.env.DB, {
      contextRefs: targets.map((target) => target.contextRef),
      promptVersion,
    })
    const latestAttemptByContext = new Map<string, AttemptRow>()
    for (const attempt of attempts) {
      if (!attempt.inputContextRef || latestAttemptByContext.has(attempt.inputContextRef)) {
        continue
      }
      latestAttemptByContext.set(attempt.inputContextRef, attempt)
    }

    const logs = latestByHash(
      await queryLogs(platform.env.DB, { inputHashes: attempts.map((a) => a.inputHash) }),
    )
    const db = createDb(platform.env.DB)
    const pulseRepo = makePulseOpsRepo(db)
    const selectedTargets = targets
      .filter((target) => {
        const attempt = latestAttemptByContext.get(target.contextRef) ?? null
        return !category || categoryFor(attempt) === category
      })
      .slice(0, limit)
    const sourceContexts = await Promise.all(
      selectedTargets.map(async (target) => {
        const snapshot = await pulseRepo.getLatestSourceSnapshotBySourceId(target.source.id)
        const sourceContext = await buildConcreteDraftSourceText({
          env: platform.env,
          base: target.rule,
          source: target.source,
          sourceSignal: null,
          latestSourceSnapshot: snapshot,
        }).catch((error) => ({
          sourceText: `source text build failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
          hasSourceBackedText: false,
        }))
        return { target, snapshot, sourceContext }
      }),
    )

    for (const { target, snapshot, sourceContext } of sourceContexts) {
      const attempt = latestAttemptByContext.get(target.contextRef) ?? null
      const log = attempt ? (logs.get(attempt.inputHash) ?? null) : null

      console.log(`\n${target.rule.id} v${target.rule.version}`)
      console.log(`  source: ${target.source.id}`)
      console.log(`  sourceTitle: ${target.source.title}`)
      console.log(`  sourceUrl: ${target.source.url}`)
      console.log(
        `  sourceMeta: ${target.source.acquisitionMethod}/${target.source.sourceType}/${target.source.healthStatus}`,
      )
      console.log(`  category: ${categoryFor(attempt)}`)
      console.log(`  attempt: ${attempt?.id ?? 'none'} ${attempt?.generatedAtUtc ?? ''}`)
      console.log(`  latencyMs: ${attempt?.latencyMs ?? ''}`)
      console.log(`  errorMsg: ${log?.errorMsg ?? 'none'}`)
      console.log(`  citations: ${JSON.stringify(attempt?.citationsJson ?? null)}`)
      console.log(`  latestSnapshot: ${snapshot?.rawR2Key ?? 'none'}`)
      console.log(
        `  sourceText: backed=${sourceContext.hasSourceBackedText} chars=${sourceContext.sourceText.length}`,
      )
      if (showSource) {
        console.log(sourceContext.sourceText.slice(0, 2000))
      }
    }
  } finally {
    await platform.dispose()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
