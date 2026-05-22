#!/usr/bin/env node
import { fileURLToPath } from 'node:url'
import { listObligationRules, listRuleSources } from '@duedatehq/core/rules'
import type { Env } from '../src/env'
import {
  cachedConcreteDraftKey,
  parseCachedConcreteDraft,
  RULE_CONCRETE_DRAFT_PROMPT,
} from '../src/procedures/rules/concrete-draft'
import { getPlatformProxy } from 'wrangler'

type DraftTarget = {
  ruleId: string
  ruleVersion: number
  sourceId: string
  contextRef: string
}

type AiRunRow = {
  id: string
  inputContextRef: string | null
  guardResult: string
  refusalCode: string | null
  outputText: string | null
  generatedAtUtc: string
}

const args = process.argv.slice(2)
const limitArg = args.find((arg) => arg.startsWith('--limit='))?.slice('--limit='.length)
const limit = Math.min(Math.max(Number(limitArg ?? 50) || 50, 1), 500)
const remote = args.includes('--remote')
const showFailures = args.includes('--failures')
const promptVersion =
  args.find((arg) => arg.startsWith('--prompt='))?.slice('--prompt='.length) ??
  RULE_CONCRETE_DRAFT_PROMPT

if (args.includes('--help') || args.includes('-h')) {
  console.log(`Usage:
  pnpm rules:concrete-drafts:report
  pnpm rules:concrete-drafts:report -- --failures --limit=100
  pnpm rules:concrete-drafts:report -- --remote`)
  process.exit(0)
}

function sourceDefinedTargets(): DraftTarget[] {
  const sourcesById = new Map(listRuleSources().map((source) => [source.id, source]))
  return listObligationRules({ includeCandidates: true }).flatMap((rule) => {
    if (rule.dueDateLogic.kind !== 'source_defined_calendar') return []
    const sourceId = rule.sourceIds[0] ?? rule.evidence[0]?.sourceId ?? null
    if (!sourceId || !sourcesById.has(sourceId)) return []
    return [
      {
        ruleId: rule.id,
        ruleVersion: rule.version,
        sourceId,
        contextRef: cachedConcreteDraftKey({
          ruleId: rule.id,
          ruleVersion: rule.version,
          sourceId,
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
        id,
        input_context_ref as inputContextRef,
        guard_result as guardResult,
        refusal_code as refusalCode,
        output_text as outputText,
        datetime(generated_at / 1000, 'unixepoch') as generatedAtUtc
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

async function main() {
  const configPath = fileURLToPath(new URL('../wrangler.toml', import.meta.url))
  const platform = await getPlatformProxy<Env>({
    configPath,
    envFiles: ['.dev.vars'],
    remoteBindings: remote,
  })
  try {
    const targets = sourceDefinedTargets()
    const targetByContext = new Map(targets.map((target) => [target.contextRef, target]))
    const rows = await queryRuns(platform.env.DB, {
      contextRefs: targets.map((target) => target.contextRef),
      promptVersion,
    })
    const latestByContext = new Map<string, AiRunRow>()
    const successfulByContext = new Map<string, AiRunRow>()
    for (const row of rows) {
      if (!row.inputContextRef) continue
      if (!latestByContext.has(row.inputContextRef)) latestByContext.set(row.inputContextRef, row)
      if (
        row.guardResult === 'ok' &&
        row.outputText &&
        parseCachedConcreteDraft(row.outputText) &&
        !successfulByContext.has(row.inputContextRef)
      ) {
        successfulByContext.set(row.inputContextRef, row)
      }
    }

    const missing = targets.filter((target) => !successfulByContext.has(target.contextRef))
    const latestFailures = missing
      .map((target) => ({ target, row: latestByContext.get(target.contextRef) ?? null }))
      .filter((item) => item.row !== null)
    const failureCounts = new Map<string, number>()
    for (const item of latestFailures) {
      const key = item.row?.refusalCode ?? item.row?.guardResult ?? 'NO_REFUSAL_CODE'
      failureCounts.set(key, (failureCounts.get(key) ?? 0) + 1)
    }

    console.log(`Prompt: ${promptVersion}`)
    console.log(`Scope: ${remote ? 'remote' : 'local'}`)
    console.log(`Source-defined targets: ${targets.length}`)
    console.log(`Successful global cached drafts: ${successfulByContext.size}`)
    console.log(`Missing successful drafts: ${missing.length}`)
    console.log(
      `Targets with no ${promptVersion} attempt: ${missing.length - latestFailures.length}`,
    )
    if (failureCounts.size > 0) {
      console.log('Latest failed attempts by refusal:')
      const sortedFailureCounts = Array.from(failureCounts).reduce<[string, number][]>(
        (items, item) => {
          const insertAt = items.findIndex(([, count]) => count < item[1])
          if (insertAt < 0) {
            items.push(item)
          } else {
            items.splice(insertAt, 0, item)
          }
          return items
        },
        [],
      )
      for (const [key, count] of sortedFailureCounts) {
        console.log(`  ${key}: ${count}`)
      }
    }

    if (showFailures && missing.length > 0) {
      console.log(`\nFirst ${Math.min(limit, missing.length)} missing targets:`)
      for (const item of missing.slice(0, limit)) {
        const row = latestByContext.get(item.contextRef)
        const target = targetByContext.get(item.contextRef) ?? item
        console.log(
          [
            target.ruleId,
            `v${target.ruleVersion}`,
            target.sourceId,
            row ? (row.refusalCode ?? row.guardResult) : 'NO_ATTEMPT',
            row?.generatedAtUtc ?? '',
          ]
            .filter(Boolean)
            .join(' | '),
        )
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
