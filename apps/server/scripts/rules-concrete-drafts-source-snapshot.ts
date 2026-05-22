#!/usr/bin/env node
import { execFile } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { createDb, makePulseOpsRepo } from '@duedatehq/db'
import { listObligationRules, listRuleSources } from '@duedatehq/core/rules'
import { stableExternalId } from '@duedatehq/ingest/http'
import type { Env } from '../src/env'
import {
  cachedConcreteDraftKey,
  isUsableConcreteDraftOfficialSourceText,
  parseCachedConcreteDraft,
  RULE_CONCRETE_DRAFT_PROMPT,
} from '../src/procedures/rules/concrete-draft'
import { extractOfficialSourceText } from '../src/procedures/rules/source-text'
import { archivePulseRaw } from '../src/jobs/pulse/ingest'
import { getPlatformProxy } from 'wrangler'

const execFileAsync = promisify(execFile)
const CODEX_PDF_PYTHON =
  '/Users/hanxujiang/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3'

type Target = {
  sourceId: string
  contextRef: string
}

type AiRunRow = {
  inputContextRef: string | null
  guardResult: string
  refusalCode: string | null
  outputText: string | null
}

const args = process.argv.slice(2)
const remote = args.includes('--remote')
const sourceFilter = args.find((arg) => arg.startsWith('--source='))?.slice('--source='.length)
const limitArg = args.find((arg) => arg.startsWith('--limit='))?.slice('--limit='.length)
const limit = limitArg ? Math.max(Number(limitArg) || 0, 0) : null
const concurrencyArg = args
  .find((arg) => arg.startsWith('--concurrency='))
  ?.slice('--concurrency='.length)
const concurrency = Math.max(Number(concurrencyArg) || 4, 1)
const promptVersion =
  args.find((arg) => arg.startsWith('--prompt='))?.slice('--prompt='.length) ??
  RULE_CONCRETE_DRAFT_PROMPT

if (args.includes('--help') || args.includes('-h')) {
  console.log(`Usage:
  pnpm rules:concrete-drafts:snapshot-sources -- --limit=20
  pnpm rules:concrete-drafts:snapshot-sources -- --source=ca.ftb_business_due_dates

Fetches source-unavailable concrete-draft source URLs with local curl, extracts
source text, and archives source snapshots to R2 for the existing draft backfill.`)
  process.exit(0)
}

function chunks<T>(items: readonly T[], size: number): T[][] {
  const result: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size))
  }
  return result
}

function sourceDefinedTargets(): Target[] {
  return listObligationRules({ includeCandidates: true }).flatMap((rule) => {
    if (rule.dueDateLogic.kind !== 'source_defined_calendar') return []
    const sourceId = rule.sourceIds[0] ?? rule.evidence[0]?.sourceId ?? null
    if (!sourceId) return []
    if (sourceFilter && sourceId !== sourceFilter) return []
    return [
      {
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

async function queryRuns(
  db: Env['DB'],
  input: { contextRefs: readonly string[]; promptVersion: string },
): Promise<AiRunRow[]> {
  const results: { results?: AiRunRow[] }[] = await Promise.all(
    chunks(input.contextRefs, 80)
      .filter((batch) => batch.length > 0)
      .map((batch) => {
        const placeholders = batch.map(() => '?').join(',')
        return db
          .prepare(
            `
              select
                input_context_ref as inputContextRef,
                guard_result as guardResult,
                refusal_code as refusalCode,
                output_text as outputText
              from ai_output
              where firm_id is null
                and kind = 'rule_concrete_draft'
                and prompt_version = ?
                and input_context_ref in (${placeholders})
              order by generated_at desc
            `,
          )
          .bind(input.promptVersion, ...batch)
          .all<AiRunRow>()
      }),
  )
  return results.flatMap((result) => result.results ?? [])
}

function sourceIdsNeedingSnapshot(targets: readonly Target[], rows: readonly AiRunRow[]): string[] {
  const latest = new Map<string, AiRunRow>()
  const successful = new Set<string>()
  for (const row of rows) {
    if (!row.inputContextRef) continue
    if (!latest.has(row.inputContextRef)) latest.set(row.inputContextRef, row)
    if (row.guardResult === 'ok' && row.outputText && parseCachedConcreteDraft(row.outputText)) {
      successful.add(row.inputContextRef)
    }
  }

  const sourceIds = new Set<string>()
  for (const target of targets) {
    if (successful.has(target.contextRef)) continue
    const row = latest.get(target.contextRef)
    if ((row?.refusalCode ?? row?.guardResult) === 'SOURCE_TEXT_UNAVAILABLE') {
      sourceIds.add(target.sourceId)
    }
  }
  return Array.from(sourceIds)
}

async function curlSource(url: string): Promise<Buffer | null> {
  try {
    const { stdout } = await execFileAsync(
      'curl',
      ['-L', '-sS', '--max-time', '30', '-A', 'curl/8.7.1', url],
      {
        encoding: 'buffer',
        maxBuffer: 8 * 1024 * 1024,
      },
    )
    return Buffer.isBuffer(stdout) && stdout.length > 0 ? stdout : null
  } catch {
    return null
  }
}

function looksLikePdf(raw: Buffer, url: string): boolean {
  return raw.subarray(0, 4).toString('utf8') === '%PDF' || /\.pdf(?:[?#]|$)/i.test(url)
}

async function extractPdfText(raw: Buffer): Promise<string | null> {
  const workdir = await mkdtemp(join(tmpdir(), 'duedatehq-pdf-source-'))
  const pdfPath = join(workdir, 'source.pdf')
  await writeFile(pdfPath, raw)

  const script = [
    'import sys',
    'from pypdf import PdfReader',
    'reader = PdfReader(sys.argv[1])',
    'parts = []',
    'for page in reader.pages:',
    '    text = page.extract_text() or ""',
    '    if text.strip(): parts.append(text)',
    'print("\\n\\n".join(parts))',
  ].join('\n')

  const candidates = [process.env.PDF_TEXT_PYTHON, CODEX_PDF_PYTHON, 'python3'].filter(
    (candidate): candidate is string => Boolean(candidate),
  )

  const tryCandidate = async (index: number): Promise<string | null> => {
    const candidate = candidates[index]
    if (!candidate) return null
    try {
      const { stdout } = await execFileAsync(candidate, ['-c', script, pdfPath], {
        encoding: 'utf8',
        maxBuffer: 12 * 1024 * 1024,
      })
      const text = stdout.replace(/\s+/g, ' ').trim()
      return isUsableConcreteDraftOfficialSourceText(text) ? text : null
    } catch {
      return tryCandidate(index + 1)
    }
  }

  try {
    return await tryCandidate(0)
  } finally {
    await rm(workdir, { recursive: true, force: true })
  }
}

async function sourceTextFromRaw(raw: Buffer, url: string): Promise<string | null> {
  if (looksLikePdf(raw, url)) {
    return extractPdfText(raw)
  }

  const rawText = raw.toString('utf8')
  return sourceTextFromRawText(rawText)
}

function sourceTextFromRawText(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('<') || /<html[\s>]/i.test(trimmed)) {
    const text = extractOfficialSourceText(trimmed)
    return isUsableConcreteDraftOfficialSourceText(text) ? text : null
  }
  const text = trimmed.replace(/\s+/g, ' ').trim()
  return isUsableConcreteDraftOfficialSourceText(text) ? text : null
}

async function main() {
  const configPath = fileURLToPath(new URL('../wrangler.toml', import.meta.url))
  const platform = await getPlatformProxy<Env>({
    configPath,
    envFiles: ['.dev.vars'],
    remoteBindings: remote,
  })

  try {
    const sourcesById = new Map(listRuleSources().map((source) => [source.id, source]))
    const targets = sourceDefinedTargets()
    const rows = await queryRuns(platform.env.DB, {
      contextRefs: targets.map((target) => target.contextRef),
      promptVersion,
    })
    const sourceIds = sourceIdsNeedingSnapshot(targets, rows)
    const selected = (limit === null ? sourceIds : sourceIds.slice(0, limit))
      .map((sourceId) => sourcesById.get(sourceId) ?? null)
      .filter((source): source is NonNullable<typeof source> => source !== null)

    console.log(`Scope: ${remote ? 'remote' : 'local'}`)
    console.log(`Source-unavailable source ids: ${sourceIds.length}`)
    console.log(`Snapshot queue size: ${selected.length}`)

    const pulseRepo = makePulseOpsRepo(createDb(platform.env.DB))
    let created = 0
    let skipped = 0
    let failed = 0

    let cursor = 0
    const snapshotSource = async (source: NonNullable<(typeof selected)[number]>) => {
      const raw = await curlSource(source.url)
      const sourceText = raw ? await sourceTextFromRaw(raw, source.url) : null
      if (!sourceText) {
        skipped += 1
        console.log(`skip ${source.id} :: no extractable text`)
        return
      }

      try {
        const fetchedAt = new Date()
        const externalId = stableExternalId(source.url)
        const archived = await archivePulseRaw(platform.env, {
          sourceId: source.id,
          externalId,
          fetchedAt,
          body: sourceText,
          contentType: 'text/plain; charset=utf-8',
        })
        const result = await pulseRepo.createSourceSnapshot({
          sourceId: source.id,
          externalId,
          title: `${source.title} curl source snapshot`,
          officialSourceUrl: source.url,
          publishedAt: fetchedAt,
          fetchedAt,
          contentHash: archived.contentHash,
          rawR2Key: archived.r2Key,
        })
        created += result.inserted ? 1 : 0
        skipped += result.inserted ? 0 : 1
        console.log(
          `${result.inserted ? 'ok' : 'existing'} ${source.id} :: ${sourceText.length} chars`,
        )
      } catch (error) {
        failed += 1
        console.log(
          `fail ${source.id} :: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    }
    const claimNext = async (): Promise<void> => {
      const source = selected[cursor]
      cursor += 1
      if (!source) return
      await snapshotSource(source)
      return claimNext()
    }
    const workers = Array.from({ length: Math.min(concurrency, selected.length) }, () =>
      claimNext(),
    )
    await Promise.all(workers)

    console.log(`Done. created=${created} skipped=${skipped} failed=${failed}`)
  } finally {
    await platform.dispose()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
