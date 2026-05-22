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
  sourceTitle: string
  sourceUrl: string
  jurisdiction: string
  sourceType: string
  acquisitionMethod: string
  domain: string
  contextRef: string
}

type AiRunRow = {
  id: string
  inputContextRef: string | null
  inputHash: string
  guardResult: string
  refusalCode: string | null
  outputText: string | null
  citationsJson: unknown
  latencyMs: number
  generatedAtMs: number
  generatedAtUtc: string
}

type LlmLogRow = {
  inputHash: string
  errorMsg: string | null
  createdAtMs: number
}

const args = process.argv.slice(2)
const limitArg = args.find((arg) => arg.startsWith('--limit='))?.slice('--limit='.length)
const limit = Math.min(Math.max(Number(limitArg ?? 50) || 50, 1), 500)
const remote = args.includes('--remote')
const showFailures = args.includes('--failures')
const json = args.includes('--json')
const groupBy = args
  .filter((arg) => arg.startsWith('--group-by='))
  .flatMap((arg) => arg.slice('--group-by='.length).split(','))
  .map((value) => value.trim())
  .filter(Boolean)
const promptVersion =
  args.find((arg) => arg.startsWith('--prompt='))?.slice('--prompt='.length) ??
  RULE_CONCRETE_DRAFT_PROMPT

if (args.includes('--help') || args.includes('-h')) {
  console.log(`Usage:
  pnpm rules:concrete-drafts:report
  pnpm rules:concrete-drafts:report -- --failures --limit=100
  pnpm rules:concrete-drafts:report -- --group-by=acquisition,source --failures
  pnpm rules:concrete-drafts:report -- --json
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
        sourceTitle: sourcesById.get(sourceId)?.title ?? sourceId,
        sourceUrl: sourcesById.get(sourceId)?.url ?? '',
        jurisdiction: rule.jurisdiction,
        sourceType: sourcesById.get(sourceId)?.sourceType ?? 'unknown',
        acquisitionMethod: sourcesById.get(sourceId)?.acquisitionMethod ?? 'unknown',
        domain: domainForUrl(sourcesById.get(sourceId)?.url ?? ''),
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
        input_hash as inputHash,
        guard_result as guardResult,
        refusal_code as refusalCode,
        output_text as outputText,
        citations_json as citationsJson,
        latency_ms as latencyMs,
        generated_at as generatedAtMs,
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

async function queryLlmLogs(
  db: Env['DB'],
  input: { inputHashes: readonly string[]; promptVersion: string },
): Promise<LlmLogRow[]> {
  const inputHashes = Array.from(new Set(input.inputHashes)).filter(Boolean)
  const results: { results?: LlmLogRow[] }[] = await Promise.all(
    chunks(inputHashes, 80)
      .filter((batch) => batch.length > 0)
      .map((batch) => {
        const placeholders = batch.map(() => '?').join(',')
        const sql = `
      select
        input_hash as inputHash,
        error_msg as errorMsg,
        created_at as createdAtMs
      from llm_log
      where prompt_version = ?
        and input_hash in (${placeholders})
      order by created_at desc
    `
        return db
          .prepare(sql)
          .bind(input.promptVersion, ...batch)
          .all<LlmLogRow>()
      }),
  )
  return results.flatMap((result) => result.results ?? [])
}

function domainForUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'unknown'
  }
}

function failureKey(row: AiRunRow | null): string {
  return row?.refusalCode ?? row?.guardResult ?? 'NO_ATTEMPT'
}

function shortErrorMessage(message: string | null | undefined): string {
  return (message ?? 'NO_ERROR_MESSAGE').replace(/\s+/g, ' ').trim().slice(0, 160)
}

function groupKey(input: {
  field: string
  target: DraftTarget
  row: AiRunRow | null
  log: LlmLogRow | null
}): string {
  switch (input.field) {
    case 'refusal':
    case 'category':
      return failureKey(input.row)
    case 'message':
      return shortErrorMessage(input.log?.errorMsg)
    case 'source':
      return input.target.sourceId
    case 'source-type':
    case 'sourceType':
      return input.target.sourceType
    case 'acquisition':
    case 'acquisitionMethod':
      return input.target.acquisitionMethod
    case 'domain':
      return input.target.domain
    case 'jurisdiction':
      return input.target.jurisdiction
    default:
      return `unknown:${input.field}`
  }
}

function countGroups(
  items: readonly { target: DraftTarget; row: AiRunRow | null; log: LlmLogRow | null }[],
  fields: readonly string[],
): [string, number][] {
  const counts = new Map<string, number>()
  for (const item of items) {
    const key = fields.map((field) => groupKey({ ...item, field })).join(' | ')
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return sortedCountEntries(counts)
}

function sortedCountEntries(counts: ReadonlyMap<string, number>): [string, number][] {
  return Array.from(counts).reduce<[string, number][]>((items, item) => {
    const insertAt = items.findIndex(
      ([key, count]) => count < item[1] || (count === item[1] && key.localeCompare(item[0]) > 0),
    )
    if (insertAt < 0) {
      items.push(item)
    } else {
      items.splice(insertAt, 0, item)
    }
    return items
  }, [])
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
    const llmLogs = await queryLlmLogs(platform.env.DB, {
      inputHashes: rows.map((row) => row.inputHash),
      promptVersion,
    })
    const latestLogByHash = new Map<string, LlmLogRow>()
    for (const log of llmLogs) {
      if (!latestLogByHash.has(log.inputHash)) latestLogByHash.set(log.inputHash, log)
    }
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
      .map((target) => {
        const row = latestByContext.get(target.contextRef) ?? null
        return { target, row, log: row ? (latestLogByHash.get(row.inputHash) ?? null) : null }
      })
      .filter((item) => item.row !== null)
    const failureCounts = new Map<string, number>()
    for (const item of latestFailures) {
      const key = failureKey(item.row)
      failureCounts.set(key, (failureCounts.get(key) ?? 0) + 1)
    }

    if (json) {
      console.log(
        JSON.stringify(
          {
            promptVersion,
            scope: remote ? 'remote' : 'local',
            sourceDefinedTargets: targets.length,
            successfulGlobalCachedDrafts: successfulByContext.size,
            missingSuccessfulDrafts: missing.length,
            targetsWithNoAttempt: missing.length - latestFailures.length,
            failureCounts: Object.fromEntries(sortedCountEntries(failureCounts)),
            groups:
              groupBy.length > 0
                ? countGroups(
                    missing.map((target) => {
                      const row = latestByContext.get(target.contextRef) ?? null
                      return {
                        target,
                        row,
                        log: row ? (latestLogByHash.get(row.inputHash) ?? null) : null,
                      }
                    }),
                    groupBy,
                  ).map(([key, count]) => ({ key, count }))
                : [],
            failures: showFailures
              ? missing.slice(0, limit).map((target) => {
                  const row = latestByContext.get(target.contextRef) ?? null
                  const log = row ? (latestLogByHash.get(row.inputHash) ?? null) : null
                  return {
                    ruleId: target.ruleId,
                    ruleVersion: target.ruleVersion,
                    sourceId: target.sourceId,
                    sourceTitle: target.sourceTitle,
                    sourceUrl: target.sourceUrl,
                    sourceType: target.sourceType,
                    acquisitionMethod: target.acquisitionMethod,
                    domain: target.domain,
                    category: failureKey(row),
                    errorMsg: log?.errorMsg ?? null,
                    generatedAtUtc: row?.generatedAtUtc ?? null,
                  }
                })
              : [],
          },
          null,
          2,
        ),
      )
      return
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

    if (groupBy.length > 0 && missing.length > 0) {
      console.log(`Latest missing targets grouped by ${groupBy.join(', ')}:`)
      for (const [key, count] of countGroups(
        missing.map((target) => {
          const row = latestByContext.get(target.contextRef) ?? null
          return { target, row, log: row ? (latestLogByHash.get(row.inputHash) ?? null) : null }
        }),
        groupBy,
      ).slice(0, limit)) {
        console.log(`  ${key}: ${count}`)
      }
    }

    if (showFailures && missing.length > 0) {
      console.log(`\nFirst ${Math.min(limit, missing.length)} missing targets:`)
      for (const item of missing.slice(0, limit)) {
        const row = latestByContext.get(item.contextRef)
        const log = row ? latestLogByHash.get(row.inputHash) : null
        const target = targetByContext.get(item.contextRef) ?? item
        console.log(
          [
            target.ruleId,
            `v${target.ruleVersion}`,
            target.sourceId,
            `${target.acquisitionMethod}/${target.sourceType}`,
            target.domain,
            failureKey(row ?? null),
            shortErrorMessage(log?.errorMsg),
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
