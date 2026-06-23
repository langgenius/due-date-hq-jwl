#!/usr/bin/env node
// Alert-recall evaluation. Reads the ground-truth dataset, queries the remote
// staging D1 (read-only) + the golden-audit KV blob, and scores recall —
// "正确监听" is a CPA-grade claim only if something counts the misses.
//
// Run via `vp run pulse:eval-recall` (optionally `-- --json out.json`).
// Exit code is a bitmask: 0 = clean, 1 = recall below threshold or a live miss,
// 2 = dataset/static problem (stale curation), 4 = infrastructure failure
// (a query failed — NEVER counted as a recall miss).
import { execFile } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import {
  PIPELINE_LIVE_SINCE,
  RECALL_GROUND_TRUTH_EVENTS,
  RECALL_LAG_BUDGET_DEFAULT_DAYS,
  type RuleJurisdiction,
} from '../packages/core/src/rules/index.ts'
import { GOLDEN_AUDIT_KV_KEY } from '../apps/server/src/jobs/pulse/golden-audit.ts'
import {
  evaluateRecall,
  renderHistoryLine,
  renderScorecardMarkdown,
  type GoldenAuditSummary,
  type RecallPulseRow,
  type RecallSnapshotRow,
  type RecallSourceStateRow,
} from '../apps/server/src/jobs/pulse/recall-eval.ts'
import {
  listAlertSourceCoverage,
  pulseManagedSourceIds,
} from '../apps/server/src/jobs/pulse/rule-source-adapters.ts'

const execFileAsync = promisify(execFile)
const SERVER_DIR = fileURLToPath(new URL('../apps/server', import.meta.url))
const DB_NAME = 'due-date-hq-staging'
const DAY_MS = 24 * 60 * 60 * 1000

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name)
  return i >= 0 ? process.argv[i + 1] : undefined
}
const jsonPath = arg('--json')
const dryRun = process.argv.includes('--dry-run')
const threshold = Number(arg('--threshold') ?? '0.9')
const STALE_FAIL_DAYS = 35

// Window: from the earliest event we care about, floored a week before go-live
// (the pipeline has no data older than that), minus 3 days of slack.
const earliestAnnounced = Math.min(
  ...RECALL_GROUND_TRUTH_EVENTS.map((e) => Date.parse(e.announcedOn)),
)
const floor = Date.parse(PIPELINE_LIVE_SINCE) - 7 * DAY_MS
const windowStart = arg('--window-start')
  ? Date.parse(arg('--window-start')!)
  : Math.max(earliestAnnounced - 3 * DAY_MS, floor)

// ── SQL (zero bound params: only script-computed epoch-ms is inlined) ──
function pulseSql(): string {
  return (
    `SELECT id, source, source_url, published_at, created_at, change_kind, status, ` +
    `parsed_jurisdiction, parsed_counties, parsed_forms, parsed_new_due_date, dedupe_key, ` +
    `substr(ai_summary,1,500) AS ai_summary, substr(verbatim_quote,1,500) AS verbatim_quote ` +
    `FROM pulse WHERE published_at >= ${windowStart} OR created_at >= ${windowStart}`
  )
}
function snapshotSql(): string {
  return (
    `SELECT id, source_id, external_id, substr(title,1,300) AS title, official_source_url, ` +
    `published_at, fetched_at, parse_status, failure_reason, pulse_id, ingest_method ` +
    `FROM pulse_source_snapshot WHERE published_at >= ${windowStart} OR fetched_at >= ${windowStart}`
  )
}
const STATE_SQL =
  'SELECT source_id, enabled, health_status, cadence_ms, last_success_at FROM pulse_source_state'

async function runWrangler(args: readonly string[]): Promise<string> {
  let lastErr = ''
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      // oxlint-disable-next-line no-await-in-loop -- sequential retry; concurrent wrangler invocations would defeat backoff
      const { stdout } = await execFileAsync('npx', ['wrangler', ...args], {
        cwd: SERVER_DIR,
        maxBuffer: 64 * 1024 * 1024,
      })
      if (/"error"\s*:\s*\{\s*"text"\s*:\s*"fetch failed"/.test(stdout)) {
        lastErr = 'fetch failed'
      } else {
        return stdout
      }
    } catch (error) {
      lastErr = error instanceof Error ? error.message : String(error)
      if (!/fetch failed|ECONN|ETIMEDOUT|network/i.test(lastErr)) throw error
    }
    // oxlint-disable-next-line no-await-in-loop -- backoff between retry attempts
    await new Promise((r) => setTimeout(r, 8000))
  }
  throw new Error(`wrangler failed after retries: ${lastErr}`)
}

function parseD1Rows(stdout: string): Record<string, unknown>[] {
  const start = stdout.indexOf('[')
  if (start < 0) throw new Error('no JSON array in wrangler output')
  // oxlint-disable-next-line no-unsafe-type-assertion -- wrangler d1 execute output shape; optional-chain read below tolerates surprises
  const parsed = JSON.parse(stdout.slice(start)) as { results?: Record<string, unknown>[] }[]
  return parsed[0]?.results ?? []
}

const num = (v: unknown): number => (v == null ? 0 : Number(v))
const numOrNull = (v: unknown): number | null => (v == null ? null : Number(v))
// D1 columns are TEXT/INTEGER/NULL — only primitives ever appear; ignore the
// (impossible) object case rather than emit '[object Object]'.
const str = (v: unknown): string =>
  typeof v === 'string' ? v : typeof v === 'number' || typeof v === 'boolean' ? String(v) : ''
function jsonArray(v: unknown): string[] {
  if (typeof v !== 'string' || v.length === 0) return []
  try {
    const parsed: unknown = JSON.parse(v)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

function mapPulse(r: Record<string, unknown>): RecallPulseRow {
  return {
    id: str(r.id),
    source: str(r.source),
    sourceUrl: str(r.source_url),
    publishedAt: num(r.published_at),
    createdAt: num(r.created_at),
    changeKind: str(r.change_kind),
    status: str(r.status),
    parsedJurisdiction: str(r.parsed_jurisdiction),
    parsedCounties: jsonArray(r.parsed_counties),
    parsedForms: jsonArray(r.parsed_forms),
    parsedNewDueDate: numOrNull(r.parsed_new_due_date),
    dedupeKey: r.dedupe_key == null ? null : str(r.dedupe_key),
    aiSummary: str(r.ai_summary),
    verbatimQuote: str(r.verbatim_quote),
  }
}
function mapSnapshot(r: Record<string, unknown>): RecallSnapshotRow {
  return {
    id: str(r.id),
    sourceId: str(r.source_id),
    externalId: str(r.external_id),
    title: str(r.title),
    officialSourceUrl: str(r.official_source_url),
    publishedAt: numOrNull(r.published_at),
    fetchedAt: num(r.fetched_at),
    parseStatus: str(r.parse_status),
    failureReason: r.failure_reason == null ? null : str(r.failure_reason),
    pulseId: r.pulse_id == null ? null : str(r.pulse_id),
    ingestMethod: r.ingest_method == null ? null : str(r.ingest_method),
  }
}
function mapState(r: Record<string, unknown>): RecallSourceStateRow {
  return {
    sourceId: str(r.source_id),
    enabled: num(r.enabled) === 1,
    healthStatus: str(r.health_status),
    lastSuccessAt: numOrNull(r.last_success_at),
  }
}

// jurisdiction → managed source ids that should catch its events.
const fedSourceIds = new Set(listAlertSourceCoverage('FED')[0]!.sourceIds)
const coveringCache = new Map<string, string[]>()
function coveringSourceIds(jurisdiction: string): string[] {
  const cached = coveringCache.get(jurisdiction)
  if (cached) return cached
  // oxlint-disable-next-line no-unsafe-type-assertion -- jurisdiction is read from already-validated wrangler output upstream
  const own = listAlertSourceCoverage(jurisdiction as RuleJurisdiction)[0]?.sourceIds ?? []
  const covering = [...new Set([...own, ...fedSourceIds])].filter((id) =>
    pulseManagedSourceIds.has(id),
  )
  coveringCache.set(jurisdiction, covering)
  return covering
}

async function readGoldenAudit(): Promise<GoldenAuditSummary | null> {
  try {
    const out = await runWrangler([
      'kv',
      'key',
      'get',
      GOLDEN_AUDIT_KV_KEY,
      '--binding=CACHE',
      '--remote',
    ])
    const start = out.indexOf('{')
    if (start < 0) return null
    // oxlint-disable-next-line no-unsafe-type-assertion -- KV-stored golden audit; ranAt presence check below guards against shape drift
    const parsed = JSON.parse(out.slice(start)) as GoldenAuditSummary
    return parsed.ranAt ? parsed : null
  } catch {
    return null // key-not-found / not configured → render "no golden result"
  }
}

async function main(): Promise<void> {
  const datasetSummary = {
    total: RECALL_GROUND_TRUTH_EVENTS.length,
    live: RECALL_GROUND_TRUTH_EVENTS.filter((e) => e.evalMode === 'live').length,
    backtest: RECALL_GROUND_TRUTH_EVENTS.filter((e) => e.evalMode === 'backtest_only').length,
    windowStart: new Date(windowStart).toISOString(),
    lagBudgetDefault: RECALL_LAG_BUDGET_DEFAULT_DAYS,
  }

  if (dryRun) {
    console.log('dataset', JSON.stringify(datasetSummary))
    console.log('\n-- pulse query --\n', pulseSql())
    console.log('\n-- snapshot query --\n', snapshotSql())
    console.log('\n-- state query --\n', STATE_SQL)
    return
  }

  let pulses: RecallPulseRow[] = []
  let snapshots: RecallSnapshotRow[] = []
  let sourceStates: RecallSourceStateRow[] = []
  let infraError: string | null = null
  try {
    const [pulseOut, snapOut, stateOut] = await Promise.all([
      runWrangler(['d1', 'execute', DB_NAME, '--remote', '--json', '--command', pulseSql()]),
      runWrangler(['d1', 'execute', DB_NAME, '--remote', '--json', '--command', snapshotSql()]),
      runWrangler(['d1', 'execute', DB_NAME, '--remote', '--json', '--command', STATE_SQL]),
    ])
    pulses = parseD1Rows(pulseOut).map(mapPulse)
    snapshots = parseD1Rows(snapOut).map(mapSnapshot)
    sourceStates = parseD1Rows(stateOut).map(mapState)
  } catch (error) {
    infraError = error instanceof Error ? error.message : String(error)
  }

  const golden = infraError ? null : await readGoldenAudit()
  const now = new Date()

  if (infraError) {
    console.error(`INFRA FAILURE — not a recall result: ${infraError}`)
    if (jsonPath) {
      await writeFile(
        jsonPath,
        `${JSON.stringify({ generatedAt: now.toISOString(), infraError, datasetSummary }, null, 2)}\n`,
      )
    }
    process.exitCode = 4
    return
  }

  const report = evaluateRecall({
    events: RECALL_GROUND_TRUTH_EVENTS,
    pulses,
    snapshots,
    sourceStates,
    coveringSourceIds,
    now,
    goldenAuditMisses: golden?.misses.map((m) => ({
      sourceId: m.sourceId,
      externalId: m.externalId,
    })),
    goldenAuditRanAt: golden?.ranAt ?? null,
  })

  const scorecardMarkdown = renderScorecardMarkdown(report, golden, now)
  const runUrl = process.env.GITHUB_RUN_URL ?? process.env.GITHUB_SERVER_URL ?? '(local run)'
  const historyLine = renderHistoryLine(report, golden, runUrl)

  const m = report.metrics
  console.log(
    `recall@budget ${Math.round(m.headlineRecall * 100)}% (${m.headlineCaught}/${m.countableLive}) · ` +
      `strict ${Math.round(m.strictRecall * 100)}% · lag P50 ${m.lagP50 ?? '—'}d/P90 ${m.lagP90 ?? '—'}d · ` +
      `filtered ${m.filteredPass}/${m.filteredTotal} · golden ${golden ? `${golden.misses.length} miss` : 'n/a'}`,
  )

  if (jsonPath) {
    await writeFile(
      jsonPath,
      `${JSON.stringify({ ...report, golden, scorecardMarkdown, historyLine, datasetSummary }, null, 2)}\n`,
    )
  }

  // Exit bitmask.
  let exitCode = 0
  const liveMiss = report.results.some(
    (r) =>
      r.evalMode === 'live' &&
      (r.outcome.startsWith('MISSED_') || r.outcome === 'FAIL_FALSE_ALERT'),
  )
  if (m.countableLive > 0 && (m.headlineRecall < threshold || liveMiss)) exitCode |= 1
  if (m.filteredFail > 0) exitCode |= 1
  if (report.datasetSummary.stalenessDays > STALE_FAIL_DAYS) exitCode |= 2
  process.exitCode = exitCode
}

await main()
