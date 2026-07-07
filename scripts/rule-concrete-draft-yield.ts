#!/usr/bin/env node
// Concrete-draft yield report against the LOCAL D1. For every source_defined
// candidate rule, classifies its latest cached draft into a bulk-trust bucket:
//   - high_trust      — confidence >= 0.5 AND excerpt is a verbatim match in source
//                       (eligible for one-click bulk verify)
//   - fuzzy_excerpt   — has a draft, but cited excerpt is not an exact source match
//   - low_confidence  — model self-confidence below the bulk threshold
//   - no_draft        — generation never produced an `ok` non-deterministic draft
// Run after `scripts/generate-local-concrete-drafts.ts` to measure how many
// rules are bulk-acceptable vs. need single human review vs. need source work.
// Wired as `pnpm rules:concrete-draft-yield`.
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
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
  if (!existsSync(dir) || !file) throw new Error('no local D1')
  return join(dir, file)
}
function sq(v: string) {
  return `'${v.replaceAll("'", "''")}'`
}
type SqlRow = Record<string, unknown>

function isSqlRows(value: unknown): value is SqlRow[] {
  return (
    Array.isArray(value) &&
    value.every((item) => item !== null && typeof item === 'object' && !Array.isArray(item))
  )
}

function q(db: string, sql: string): SqlRow[] {
  const out = execFileSync('sqlite3', ['-json', db, sql], {
    encoding: 'utf8',
    maxBuffer: 1 << 28,
  }).trim()
  if (!out) return []
  const parsed: unknown = JSON.parse(out)
  if (!isSqlRows(parsed)) throw new Error('sqlite3 -json returned non-object rows')
  return parsed
}
function chunk<T>(a: readonly T[], n: number): T[][] {
  const o: T[][] = []
  for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n))
  return o
}

const db = localD1Path()
const rules = listObligationRules({ includeCandidates: true })
const sourceById = new Map<string, RuleSource>(
  listRuleSources().map((source) => [source.id, source]),
)
function prim(r: Pick<ObligationRule, 'sourceIds' | 'evidence'>) {
  return r.sourceIds[0] ?? r.evidence[0]?.sourceId ?? null
}
function isSourceDefinedCalendarRule(rule: ObligationRule) {
  return rule.dueDateLogic.kind === 'source_defined_calendar' && rule.status !== 'deprecated'
}
const targets = rules.filter(isSourceDefinedCalendarRule).flatMap((rule) => {
  const sourceId = prim(rule)
  const source = sourceId ? sourceById.get(sourceId) : undefined
  if (!sourceId || !source) return []
  return [
    {
      ruleId: rule.id,
      sourceId,
      acq: source.acquisitionMethod,
      contextRef: cachedConcreteDraftKey({ ruleId: rule.id, ruleVersion: rule.version, sourceId }),
    },
  ]
})

// latest ok non-deterministic draft row per context_ref
const latestByRef = new Map<string, { output_text: string; citations: unknown; model: string }>()
for (const c of chunk(
  targets.map((t) => t.contextRef),
  150,
)) {
  const rows = q(
    db,
    [
      'with latest as (',
      'select input_context_ref, output_text, citations_json, model, guard_result,',
      'row_number() over (partition by input_context_ref order by generated_at desc) rn',
      "from ai_output where kind='rule_concrete_draft'",
      `and input_context_ref in (${c.map(sq).join(',')})`,
      ')',
      "select input_context_ref, output_text, citations_json, model from latest where rn=1 and guard_result='ok' and output_text is not null and model<>'deterministic-source-text'",
    ].join(' '),
  )
  for (const r of rows) {
    latestByRef.set(String(r.input_context_ref), {
      output_text: String(r.output_text),
      citations:
        typeof r.citations_json === 'string' && r.citations_json
          ? JSON.parse(r.citations_json)
          : null,
      model: String(r.model),
    })
  }
}

type Bucket = 'high_trust' | 'low_confidence' | 'fuzzy_excerpt' | 'unparseable' | 'no_draft'
type TargetYield = (typeof targets)[number] & { bucket: Bucket; confidence: number | null }
const perTarget = targets.map((t): TargetYield => {
  const row = latestByRef.get(t.contextRef)
  if (!row) return { ...t, bucket: 'no_draft', confidence: null }
  const draft = parseCachedConcreteDraft(row.output_text)
  if (!draft) return { ...t, bucket: 'unparseable', confidence: null }
  const issue = concreteDraftBulkTrustIssue({
    confidence: draft.confidence,
    sourceExcerpt: draft.sourceExcerpt,
    citations: row.citations,
  })
  const bucket: Bucket =
    issue === 'low_confidence'
      ? 'low_confidence'
      : issue === 'fuzzy_excerpt'
        ? 'fuzzy_excerpt'
        : 'high_trust'
  return { ...t, bucket, confidence: draft.confidence }
})

function tally(items: { bucket: Bucket }[]) {
  const o: Partial<Record<Bucket, number>> = {}
  for (const i of items) o[i.bucket] = (o[i.bucket] ?? 0) + 1
  return o
}
const byAcq: Record<string, Partial<Record<Bucket, number>>> = {}
for (const t of perTarget) {
  const acqCounts = byAcq[t.acq] ?? {}
  acqCounts[t.bucket] = (acqCounts[t.bucket] ?? 0) + 1
  byAcq[t.acq] = acqCounts
}

console.log(
  JSON.stringify(
    {
      totalTargets: targets.length,
      overall: tally(perTarget),
      byAcquisition: byAcq,
      sampleNoDraft: perTarget
        .filter((t) => t.bucket === 'no_draft')
        .slice(0, 25)
        .map((t) => `${t.ruleId} (${t.acq})`),
      sampleLowTrust: perTarget
        .filter((t) => t.bucket === 'low_confidence' || t.bucket === 'fuzzy_excerpt')
        .slice(0, 25)
        .map((t) => `${t.ruleId} [${t.bucket} conf=${t.confidence}]`),
    },
    null,
    2,
  ),
)
