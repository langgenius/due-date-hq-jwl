#!/usr/bin/env node
import { fileURLToPath } from 'node:url'
import { createDb, makeAiRepo, makePulseOpsRepo } from '@duedatehq/db'
import { listObligationRules, listRuleSources } from '@duedatehq/core/rules'
import type { Env } from '../src/env'
import {
  cachedConcreteDraftKey,
  generateConcreteDraft,
  parseCachedConcreteDraft,
  RULE_CONCRETE_DRAFT_PROMPT,
} from '../src/procedures/rules/concrete-draft'
import { getPlatformProxy } from 'wrangler'

type DraftTarget = {
  rule: ReturnType<typeof listObligationRules>[number]
  source: ReturnType<typeof listRuleSources>[number]
  contextRef: string
}

type AiRunRow = {
  inputContextRef: string | null
  guardResult: string
  outputText: string | null
}

const args = process.argv.slice(2)
const remote = args.includes('--remote')
const dryRun = args.includes('--dry-run')
const retryFailed = args.includes('--retry-failed')
const fastModel = args.includes('--fast-model')
const sourceFilter = args.find((arg) => arg.startsWith('--source='))?.slice('--source='.length)
const ruleFilter = args.find((arg) => arg.startsWith('--rule='))?.slice('--rule='.length)
const limitArg = args.find((arg) => arg.startsWith('--limit='))?.slice('--limit='.length)
const concurrencyArg = args
  .find((arg) => arg.startsWith('--concurrency='))
  ?.slice('--concurrency='.length)
const limit = limitArg ? Math.max(Number(limitArg) || 0, 0) : null
const concurrency = Math.min(Math.max(Number(concurrencyArg ?? 2) || 2, 1), 8)
const promptVersion =
  args.find((arg) => arg.startsWith('--prompt='))?.slice('--prompt='.length) ??
  RULE_CONCRETE_DRAFT_PROMPT

if (args.includes('--help') || args.includes('-h')) {
  console.log(`Usage:
  pnpm rules:concrete-drafts:backfill -- --dry-run
  pnpm rules:concrete-drafts:backfill -- --retry-failed --concurrency=2
  pnpm rules:concrete-drafts:backfill -- --source=al.dor.individual_due_dates --limit=10
  pnpm rules:concrete-drafts:backfill -- --remote --retry-failed --concurrency=1`)
  process.exit(0)
}

function sourceDefinedTargets(): DraftTarget[] {
  const sourcesById = new Map(listRuleSources().map((source) => [source.id, source]))
  return listObligationRules({ includeCandidates: true }).flatMap((rule) => {
    if (rule.dueDateLogic.kind !== 'source_defined_calendar') return []
    const sourceId = rule.sourceIds[0] ?? rule.evidence[0]?.sourceId ?? null
    const source = sourceId ? sourcesById.get(sourceId) : null
    if (!source) return []
    if (sourceFilter && source.id !== sourceFilter) return []
    if (ruleFilter && rule.id !== ruleFilter) return []
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

async function queryRuns(
  db: Env['DB'],
  input: { contextRefs: readonly string[]; promptVersion: string },
): Promise<AiRunRow[]> {
  const results: { results?: AiRunRow[] }[] = await Promise.all(
    chunks(input.contextRefs, 80)
      .filter((batch) => batch.length > 0)
      .map((batch) => {
        const placeholders = batch.map(() => '?').join(',')
        const sql = `
      select
        input_context_ref as inputContextRef,
        guard_result as guardResult,
        output_text as outputText
      from ai_output
      where firm_id is null
        and kind = 'rule_concrete_draft'
        and prompt_version = ?
        and input_context_ref in (${placeholders})
      order by generated_at desc
    `
        return db
          .prepare(sql)
          .bind(input.promptVersion, ...batch)
          .all<AiRunRow>()
      }),
  )
  return results.flatMap((result) => result.results ?? [])
}

function selectMissingTargets(targets: readonly DraftTarget[], rows: readonly AiRunRow[]) {
  const attempted = new Set<string>()
  const successful = new Set<string>()
  for (const row of rows) {
    if (!row.inputContextRef) continue
    attempted.add(row.inputContextRef)
    if (row.guardResult === 'ok' && row.outputText && parseCachedConcreteDraft(row.outputText)) {
      successful.add(row.inputContextRef)
    }
  }

  const missing = targets.filter((target) => {
    if (successful.has(target.contextRef)) return false
    if (!retryFailed && attempted.has(target.contextRef)) return false
    return true
  })

  return {
    attempted: attempted.size,
    successful: successful.size,
    skippedAttempted: targets.filter(
      (target) => !successful.has(target.contextRef) && attempted.has(target.contextRef),
    ).length,
    missing: limit === null ? missing : missing.slice(0, limit),
  }
}

async function main() {
  const configPath = fileURLToPath(new URL('../wrangler.toml', import.meta.url))
  const platform = await getPlatformProxy<Env>({
    configPath,
    envFiles: ['.dev.vars'],
    remoteBindings: remote,
  })
  try {
    const env = platform.env
    if (fastModel && env.AI_GATEWAY_MODEL_FAST_JSON) {
      env.AI_GATEWAY_MODEL_QUALITY_JSON = env.AI_GATEWAY_MODEL_FAST_JSON
    }

    const targets = sourceDefinedTargets()
    const rows = await queryRuns(env.DB, {
      contextRefs: targets.map((target) => target.contextRef),
      promptVersion,
    })
    const selection = selectMissingTargets(targets, rows)

    console.log(`Prompt: ${promptVersion}`)
    console.log(`Scope: ${remote ? 'remote' : 'local'}`)
    console.log(`Targets: ${targets.length}`)
    console.log(`Successful global cached drafts: ${selection.successful}`)
    console.log(`Targets with any ${promptVersion} attempt: ${selection.attempted}`)
    console.log(
      `Skipped failed attempts without --retry-failed: ${retryFailed ? 0 : selection.skippedAttempted}`,
    )
    console.log(`Backfill queue size: ${selection.missing.length}`)
    console.log(`Concurrency: ${concurrency}`)

    if (dryRun || selection.missing.length === 0) return

    const db = createDb(env.DB)
    const aiRepo = makeAiRepo(db, 'global')
    const pulseRepo = makePulseOpsRepo(db)
    let cursor = 0
    let success = 0
    let failed = 0

    async function worker(workerId: number): Promise<void> {
      const target = selection.missing[cursor]
      cursor += 1
      if (!target) return

      const label = `${target.rule.id} | ${target.source.id}`
      try {
        const latestSourceSnapshot = await pulseRepo.getLatestSourceSnapshotBySourceId(
          target.source.id,
        )
        await generateConcreteDraft({
          env,
          aiRepo,
          scope: 'global',
          userId: null,
          base: target.rule,
          source: target.source,
          sourceSignal: null,
          latestSourceSnapshot,
        })
        success += 1
        console.log(`[${workerId}] ok ${success + failed}/${selection.missing.length} ${label}`)
      } catch (error) {
        failed += 1
        const message =
          error instanceof Error ? error.message : 'AI concrete draft generation failed.'
        console.log(
          `[${workerId}] fail ${success + failed}/${selection.missing.length} ${label} :: ${message}`,
        )
      }

      await worker(workerId)
    }

    await Promise.all(
      Array.from({ length: Math.min(concurrency, selection.missing.length) }, (_, index) =>
        worker(index + 1),
      ),
    )
    console.log(`Done. success=${success} failed=${failed}`)
  } finally {
    await platform.dispose()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
