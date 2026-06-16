/* TEMP — select local ai_output ids to push to prod (local-ready ∧ not prod-ready). */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import {
  listObligationRules,
  listRuleSources,
  type ObligationRule,
  type RuleSource,
} from '../packages/core/src/rules/index.ts'
import {
  cachedConcreteDraftKey,
  concreteDraftBulkTrustIssue,
  parseCachedConcreteDraft,
} from '../apps/server/src/procedures/rules/concrete-draft.ts'

function localD1Path(): string {
  const dir = 'apps/server/.wrangler/state/v3/d1/miniflare-D1DatabaseObject'
  const file = readdirSync(dir).find(
    (i) =>
      i.endsWith('.sqlite') &&
      i !== 'metadata.sqlite' &&
      !i.endsWith('-shm') &&
      !i.endsWith('-wal'),
  )
  if (!file) throw new Error('no local D1')
  return join(dir, file)
}
function sq(v: string) {
  return `'${v.replaceAll("'", "''")}'`
}
function q(db: string, sql: string): Record<string, unknown>[] {
  const out = execFileSync('sqlite3', ['-json', db, sql], {
    encoding: 'utf8',
    maxBuffer: 1 << 28,
  }).trim()
  return out ? (JSON.parse(out) as Record<string, unknown>[]) : []
}
function chunk<T>(a: readonly T[], n: number): T[][] {
  const o: T[][] = []
  for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n))
  return o
}

const db = localD1Path()
const prodReady = new Set(
  readFileSync('/tmp/prod_ready_refs.txt', 'utf8')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean),
)
const rules = listObligationRules({ includeCandidates: true })
const sourceById = new Map<string, RuleSource>(listRuleSources().map((s) => [s.id, s]))
function prim(r: Pick<ObligationRule, 'sourceIds' | 'evidence'>) {
  return r.sourceIds[0] ?? r.evidence[0]?.sourceId ?? null
}
function isSourceDefinedCalendarRule(rule: ObligationRule) {
  return rule.dueDateLogic.kind === 'source_defined_calendar' && rule.status !== 'deprecated'
}
const targets = rules.filter(isSourceDefinedCalendarRule).flatMap((r) => {
  const sid = prim(r)
  const s = sid ? sourceById.get(sid) : null
  if (!sid || !s) return []
  return [
    {
      ruleId: r.id,
      contextRef: cachedConcreteDraftKey({ ruleId: r.id, ruleVersion: r.version, sourceId: sid }),
    },
  ]
})

// latest ok non-det row (id + payload) per ref
const latest = new Map<string, { id: string; output_text: string; citations: unknown }>()
for (const c of chunk(
  targets.map((t) => t.contextRef),
  150,
)) {
  for (const r of q(
    db,
    [
      'with l as (select id,input_context_ref,output_text,citations_json,guard_result,model,generated_at,',
      'row_number() over (partition by input_context_ref order by generated_at desc) rn',
      "from ai_output where kind='rule_concrete_draft'",
      `and input_context_ref in (${c.map(sq).join(',')})`,
      ')',
      "select id,input_context_ref,output_text,citations_json from l where rn=1 and guard_result='ok' and output_text is not null and model<>'deterministic-source-text'",
    ].join(' '),
  )) {
    latest.set(String(r.input_context_ref), {
      id: String(r.id),
      output_text: String(r.output_text),
      citations:
        typeof r.citations_json === 'string' && r.citations_json
          ? JSON.parse(r.citations_json)
          : null,
    })
  }
}

const pushIds: string[] = []
type TrustBucket = 'high_trust' | 'fuzzy_excerpt' | 'low_confidence'
const buckets: Record<TrustBucket, number> = { high_trust: 0, fuzzy_excerpt: 0, low_confidence: 0 }
for (const t of targets) {
  if (prodReady.has(t.contextRef)) continue // prod already has it
  const row = latest.get(t.contextRef)
  if (!row) continue // local also has no draft (the 4 hard fails)
  const d = parseCachedConcreteDraft(row.output_text)
  if (!d) continue
  pushIds.push(row.id)
  const issue = concreteDraftBulkTrustIssue({
    confidence: d.confidence,
    sourceExcerpt: d.sourceExcerpt,
    citations: row.citations,
  })
  const bucket: TrustBucket =
    issue === 'low_confidence'
      ? 'low_confidence'
      : issue === 'fuzzy_excerpt'
        ? 'fuzzy_excerpt'
        : 'high_trust'
  buckets[bucket] += 1
}

writeFileSync('/tmp/push_ai_ids.txt', pushIds.join('\n'))
console.log(
  JSON.stringify(
    {
      prodReady: prodReady.size,
      localTargets: targets.length,
      toPush: pushIds.length,
      pushBuckets: buckets,
      expectedProdAfter: prodReady.size + pushIds.length,
    },
    null,
    2,
  ),
)
