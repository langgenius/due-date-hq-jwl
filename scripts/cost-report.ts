#!/usr/bin/env node
// Monthly cost report. Reads the remote staging D1 (read-only) and reconstructs
// the recurring cost picture the provider dashboards scatter across three places
// (OpenRouter for AI, Cloudflare for platform, browserless.io for renders).
//
// What it CAN measure (from D1): AI spend (llm_log.cost_usd is the source of
// truth, persisted from token usage × packages/ai/src/pricing.ts since 2026-06-10),
// the hidden cost of FAILED AI calls (cost_usd is null on failure — estimated here
// from their token counts so a fail-loop incident is not invisible), source fetch
// volume (computed from pulse_source_state.cadence_ms), and snapshot/extract volume.
//
// What it CANNOT bill (static annotations only): the Cloudflare Workers Paid base
// plan, browserless.io subscription, Resend. Those are flat or external; the report
// prints what drives them (fetch/render/email volume) and flags them for manual review.
//
// Run via `pnpm cost:report` (or `tsx scripts/cost-report.ts`). Flags:
//   --month YYYY-MM   scope to one calendar month (UTC)
//   --days N          trailing-N-day window (default 30; ignored if --month set)
//   --json out.json   also write the full structured result
import { execFile } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { computeCostUsd } from '../packages/ai/src/pricing.ts'

const execFileAsync = promisify(execFile)
const SERVER_DIR = fileURLToPath(new URL('../apps/server', import.meta.url))
const WRANGLER_TOML = fileURLToPath(new URL('../apps/server/wrangler.toml', import.meta.url))
const DB_NAME = 'due-date-hq-staging'
const DAY_MS = 24 * 60 * 60 * 1000
// cost_usd is only trustworthy from this date — the column was backfilled live
// mid-incident; anything before is null even where the provider did charge.
const COST_TRACKING_SINCE = '2026-06-10'
const FALLBACK_MODEL = 'google/gemini-3.5-flash'
// Cloudflare Workers Paid plan base (flat). Everything below the included
// allowances at current volume; surfaced so the monthly total is honest.
const CLOUDFLARE_BASE_USD = 5

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name)
  return i >= 0 ? process.argv[i + 1] : undefined
}

// ── window: --month YYYY-MM (calendar, UTC) or trailing --days N ──────────────
const now = Date.now()
const monthArg = arg('--month')
const days = Number(arg('--days') ?? '30')
let windowStart: number
let windowEnd: number
let windowLabel: string
if (monthArg) {
  const [y, m] = monthArg.split('-').map(Number)
  if (!y || !m || m < 1 || m > 12) throw new Error(`bad --month ${monthArg}, want YYYY-MM`)
  windowStart = Date.UTC(y, m - 1, 1)
  windowEnd = Date.UTC(y, m, 1)
  windowLabel = monthArg
} else {
  windowStart = now - days * DAY_MS
  windowEnd = now
  windowLabel = `trailing ${days}d`
}
const windowDays = Math.max(1, Math.round((Math.min(windowEnd, now) - windowStart) / DAY_MS))
const jsonPath = arg('--json')

// ── wrangler plumbing (mirrors scripts/eval-alert-recall.ts) ──────────────────
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
      // wrangler exits 1 on a transient "fetch failed", but the marker lands on
      // the child's stdout/stderr, not the thrown message — inspect all three.
      // oxlint-disable-next-line no-unsafe-type-assertion -- node's caught error is `unknown`; downstream reads are defensive
      const e = error as { message?: string; stdout?: string; stderr?: string }
      lastErr = [e.message, e.stdout, e.stderr].filter(Boolean).join(' ')
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

async function query(sql: string): Promise<Record<string, unknown>[]> {
  return parseD1Rows(
    await runWrangler(['d1', 'execute', DB_NAME, '--remote', '--json', '--command', sql]),
  )
}

const num = (v: unknown): number => (v == null ? 0 : Number(v))
// Only string/number/boolean ever come back from D1 columns — never stringify an
// object (no-base-to-string), so unknown/object falls through to ''.
const str = (v: unknown): string =>
  typeof v === 'string' ? v : typeof v === 'number' || typeof v === 'boolean' ? String(v) : ''
const usd = (n: number): string => `$${n.toFixed(2)}`
const sqlString = (value: string): string => `'${value.replaceAll("'", "''")}'`

// ── browserless source IDs are configured in wrangler.toml, not the DB — read
//    them so the render-volume estimate self-updates with the deploy config ────
function browserlessSourceIds(): string[] {
  const toml = readFileSync(WRANGLER_TOML, 'utf8')
  const raw = /PULSE_BROWSERLESS_SOURCE_IDS\s*=\s*"([^"]*)"/.exec(toml)?.[1]
  if (!raw) return []
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

// ── SQL (zero bound params: only script-computed epoch-ms / known ids inlined) ─
const AI_TOTALS_SQL =
  `SELECT COUNT(*) AS calls, ` +
  `SUM(CASE WHEN success=1 THEN 1 ELSE 0 END) AS ok, ` +
  `SUM(CASE WHEN success=0 THEN 1 ELSE 0 END) AS failed, ` +
  `SUM(COALESCE(cost_usd,0)) AS recorded_cost, ` +
  `SUM(COALESCE(input_tokens,0)) AS in_tok, ` +
  `SUM(COALESCE(output_tokens,0)) AS out_tok ` +
  `FROM llm_log WHERE created_at >= ${windowStart} AND created_at < ${windowEnd}`

const AI_BY_VERSION_SQL =
  `SELECT prompt_version, model, COUNT(*) AS calls, ` +
  `SUM(CASE WHEN success=0 THEN 1 ELSE 0 END) AS failed, ` +
  `SUM(COALESCE(cost_usd,0)) AS cost, ` +
  `SUM(COALESCE(input_tokens,0)) AS in_tok, ` +
  `SUM(COALESCE(output_tokens,0)) AS out_tok, ` +
  `SUM(CASE WHEN success=0 THEN COALESCE(input_tokens,0) ELSE 0 END) AS failed_in, ` +
  `SUM(CASE WHEN success=0 THEN COALESCE(output_tokens,0) ELSE 0 END) AS failed_out ` +
  `FROM llm_log WHERE created_at >= ${windowStart} AND created_at < ${windowEnd} ` +
  `GROUP BY prompt_version, model ORDER BY cost DESC`

const AI_BY_DAY_SQL =
  `SELECT date(created_at/1000,'unixepoch') AS day, COUNT(*) AS calls, ` +
  `SUM(CASE WHEN success=0 THEN 1 ELSE 0 END) AS failed, ` +
  `SUM(COALESCE(cost_usd,0)) AS cost ` +
  `FROM llm_log WHERE created_at >= ${windowStart} AND created_at < ${windowEnd} ` +
  `GROUP BY day ORDER BY day`

const AI_BY_KIND_SQL =
  `SELECT kind, COUNT(*) AS n, SUM(COALESCE(cost_usd,0)) AS cost ` +
  `FROM ai_output WHERE generated_at >= ${windowStart} AND generated_at < ${windowEnd} ` +
  `GROUP BY kind ORDER BY cost DESC`

const SOURCE_STATE_SQL =
  `SELECT SUM(CASE WHEN enabled=1 THEN 1 ELSE 0 END) AS enabled_sources, ` +
  `SUM(CASE WHEN enabled=0 THEN 1 ELSE 0 END) AS disabled_sources, ` +
  `SUM(CASE WHEN enabled=1 THEN 86400000.0/cadence_ms ELSE 0 END) AS fetches_per_day, ` +
  `SUM(CASE WHEN health_status='failing' THEN 1 ELSE 0 END) AS failing ` +
  `FROM pulse_source_state`

const SNAPSHOT_SQL =
  `SELECT COUNT(*) AS snaps, ` +
  `SUM(CASE WHEN ingest_method='browserless' THEN 1 ELSE 0 END) AS via_browserless ` +
  `FROM pulse_source_snapshot WHERE fetched_at >= ${windowStart} AND fetched_at < ${windowEnd}`

function browserlessCadenceSql(ids: readonly string[]): string {
  const list = ids.map(sqlString).join(', ')
  return (
    `SELECT COUNT(*) AS n, ROUND(SUM(86400000.0/cadence_ms),2) AS fetches_per_day ` +
    `FROM pulse_source_state WHERE enabled=1 AND source_id IN (${list})`
  )
}

// ── run ───────────────────────────────────────────────────────────────────────
// Sequential, not Promise.all: concurrent `wrangler d1 execute` spawns reliably
// trip "fetch failed". A monthly report has no latency budget worth that risk.
const blIds = browserlessSourceIds()
const totalsRows = await query(AI_TOTALS_SQL)
const byVersion = await query(AI_BY_VERSION_SQL)
const byDay = await query(AI_BY_DAY_SQL)
const byKind = await query(AI_BY_KIND_SQL)
const stateRows = await query(SOURCE_STATE_SQL)
const snapRows = await query(SNAPSHOT_SQL)
const blRows = blIds.length > 0 ? await query(browserlessCadenceSql(blIds)) : []

const totals = totalsRows[0] ?? {}
const recordedCost = num(totals.recorded_cost)
const okCalls = num(totals.ok)
const failedCalls = num(totals.failed)

// Hidden cost of failed calls: cost_usd is null on failure, so reconstruct it
// from each version-group's failed token sums × its model's published rate.
let estFailedCost = 0
for (const row of byVersion) {
  const model = str(row.model) || FALLBACK_MODEL
  const c = computeCostUsd(model, { input: num(row.failed_in), output: num(row.failed_out) })
  if (c) estFailedCost += c
}

// Daily rate must divide by COST-TRACKED days, not the calendar window: cost_usd
// only exists from COST_TRACKING_SINCE, so the empty pre-tracking days would
// otherwise dilute the rate toward zero.
const trackedStartMs = Math.max(windowStart, Date.parse(COST_TRACKING_SINCE))
const trackedDays = Math.max(1, Math.round((Math.min(windowEnd, now) - trackedStartMs) / DAY_MS))
const meanDaily = recordedCost / trackedDays
const dailyCosts = byDay.map((r) => num(r.cost)).toSorted((a, b) => a - b)
const medianDaily =
  dailyCosts.length === 0
    ? 0
    : dailyCosts.length % 2 === 1
      ? (dailyCosts[(dailyCosts.length - 1) / 2] ?? 0)
      : ((dailyCosts[dailyCosts.length / 2 - 1] ?? 0) + (dailyCosts[dailyCosts.length / 2] ?? 0)) /
        2

const state = stateRows[0] ?? {}
const enabledSources = num(state.enabled_sources)
const fetchesPerDay = Math.round(num(state.fetches_per_day))
const failingSources = num(state.failing)
const snaps = snapRows[0] ?? {}
const bl = blRows[0] ?? {}
const blFetchesPerDay = num(bl.fetches_per_day)

// One honest projection: mean over tracked days × 30. It is a rough CEILING — the
// few tracked days so far are dominated by one-time backfills, so it overstates
// the eventual steady state. Don't dress it up as a tight low/high band.
const aiMonthlyProjection = meanDaily * 30
const monthlyTotal = aiMonthlyProjection + CLOUDFLARE_BASE_USD
const lowConfidence = trackedDays < 14
// A fail-loop incident: more failures than successes, or failed-token cost rivaling
// the recorded spend. Either means real provider spend is invisible in cost_usd.
const incident = failedCalls > okCalls || estFailedCost > recordedCost

// ── render ──────────────────────────────────────────────────────────────────
const L: string[] = []
const p = (s = '') => L.push(s)

p(`# 月度成本报表 — Due Date HQ`)
p(``)
p(
  `- 窗口: **${windowLabel}** · ${windowDays} 天 · 截至 ${new Date(now).toISOString().slice(0, 10)}`,
)
p(`- 数据源: remote D1 \`${DB_NAME}\` (只读)`)
p(
  `- ⚠️ \`cost_usd\` 仅自 ${COST_TRACKING_SINCE} 起记录；更早的成本在 DB 中为 null（即使 provider 已扣费）。`,
)
p(``)

p(`## 1. AI 分析 — OpenRouter (经 CF AI Gateway)  ★ 唯一显著变量`)
p(``)
p(`- 调用: **${okCalls + failedCalls}** 次（成功 ${okCalls} / 失败 ${failedCalls}）`)
p(
  `- token: ${(num(totals.in_tok) / 1e6).toFixed(2)}M input · ${(num(totals.out_tok) / 1e6).toFixed(2)}M output`,
)
p(`- **记录成本: ${usd(recordedCost)}**`)
p(`- 失败调用隐藏成本（估算 = 失败 token × 单价，未计入上面）: **~${usd(estFailedCost)}** ⚠️`)
p(``)
p(
  `日成本（基于 ${trackedDays} 个有成本记录的天）: 均值 ${usd(meanDaily)}/天 · 中位数 ${usd(medianDaily)}/天`,
)
p(`月度投影（AI = 均值×30，**粗略上限**，含一次性 backfill）: ~${usd(aiMonthlyProjection)}`)
if (lowConfidence) {
  p(
    `> ⚠️ 仅 ${trackedDays} 天成本数据且多为 backfill/事件 — 投影偏高，需 ≥2-3 周稳态数据才能收窄。`,
  )
}
p(``)
p(`### 按用途 (prompt_version)`)
p(``)
p(`| prompt_version | model | calls | failed | 记录 $ | 估算失败 $ |`)
p(`|---|---|--:|--:|--:|--:|`)
for (const r of byVersion) {
  const model = str(r.model) || FALLBACK_MODEL
  const failedC = computeCostUsd(model, { input: num(r.failed_in), output: num(r.failed_out) }) ?? 0
  p(
    `| ${str(r.prompt_version)} | ${model.replace('google/', '')} | ${num(r.calls)} | ${num(r.failed)} | ${usd(num(r.cost))} | ${usd(failedC)} |`,
  )
}
p(``)
p(`### 按天`)
p(``)
p(`| day | calls | failed | $ |`)
p(`|---|--:|--:|--:|`)
for (const r of byDay) {
  p(`| ${str(r.day)} | ${num(r.calls)} | ${num(r.failed)} | ${usd(num(r.cost))} |`)
}
p(``)
p(`### 按产品功能 (ai_output.kind — 成功输出)`)
p(``)
p(`| kind | n | $ |`)
p(`|---|--:|--:|`)
for (const r of byKind) {
  p(`| ${str(r.kind)} | ${num(r.n)} | ${usd(num(r.cost))} |`)
}
p(``)

p(`## 2. Source 抓取`)
p(``)
p(`- 启用源: **${enabledSources}** · failing: ${failingSources}`)
p(
  `- 估算抓取量: **${fetchesPerDay} 次/天** (~${(fetchesPerDay * 30).toLocaleString()}/月) — 走 Workers subrequest，计入平台额度`,
)
p(
  `- browserless 渲染（外部付费）: ~**${blFetchesPerDay} 次/天** (~${Math.round(blFetchesPerDay * 30)}/月)，${blIds.length} 个配置源`,
)
p(
  `- 快照（内容变化 → 触发 pulse-extract）: 窗口内 ${num(snaps.snaps)} 个（browserless ${num(snaps.via_browserless)}）`,
)
p(``)

p(`## 3. Alert 生成 / 扇出`)
p(``)
p(`计入上游 pulse-extract（见 §1 ai_output.kind），无独立 API/计算成本；DB 写入可忽略。`)
p(``)

p(`## 4. Cloudflare 平台（固定基座，当前无超额）`)
p(``)
p(`- Workers Paid 基座: **${usd(CLOUDFLARE_BASE_USD)}/月**`)
p(`- D1 / KV / R2 / Queues / Cron: 当前用量均在包含额度内（R2 无出口费）`)
p(`- Vectorize: 已配置但未使用（$0）· 无原生 Browser Rendering 绑定（用外部 browserless）`)
p(``)

p(`## 5. 其他外部`)
p(``)
p(`- **browserless.io**: 仅 ~${blFetchesPerDay} 渲染/天 — ⚠️ 核实计划档位（月订阅 vs 按量）`)
p(`- **Resend** (邮件): 当前免费档内 · **CF AI Gateway**: 免费`)
p(``)

p(`## 月度合计估算`)
p(``)
p(
  `**≈ ${usd(monthlyTotal)} / 月（粗略上限）** = AI ~${usd(aiMonthlyProjection)} + Cloudflare ${usd(CLOUDFLARE_BASE_USD)} + browserless/Resend(待核实)`,
)
if (incident) {
  p(``)
  p(
    `> 🔴 失败调用 ${failedCalls} 次（成功仅 ${okCalls}）、隐藏成本 ~${usd(estFailedCost)} — fail-loop 迹象。这部分 provider 已扣费但 \`cost_usd\` 不可见；检查 AI_SYSTEM_DAILY_LIMIT 与 OpenRouter 余额告警。`,
  )
}

const report = L.join('\n')
console.log(report)

if (jsonPath) {
  const out = {
    window: { label: windowLabel, startMs: windowStart, endMs: windowEnd, days: windowDays },
    ai: {
      okCalls,
      failedCalls,
      inputTokens: num(totals.in_tok),
      outputTokens: num(totals.out_tok),
      recordedCostUsd: recordedCost,
      estimatedFailedCostUsd: estFailedCost,
      trackedDays,
      meanDailyUsd: meanDaily,
      medianDailyUsd: medianDaily,
      monthlyProjectionUsd: aiMonthlyProjection,
      lowConfidence,
      incident,
      byVersion,
      byDay,
      byKind,
    },
    sources: {
      enabled: enabledSources,
      disabled: num(state.disabled_sources),
      failing: failingSources,
      fetchesPerDay,
      browserlessSourceCount: blIds.length,
      browserlessFetchesPerDay: blFetchesPerDay,
      snapshotsInWindow: num(snaps.snaps),
    },
    platform: { cloudflareBaseUsd: CLOUDFLARE_BASE_USD },
    monthlyTotalUsd: monthlyTotal,
  }
  await writeFile(jsonPath, JSON.stringify(out, null, 2))
  console.log(`\n[wrote ${jsonPath}]`)
}
