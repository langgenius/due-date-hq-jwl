import {
  PIPELINE_LIVE_SINCE,
  RECALL_LAG_BUDGET_DEFAULT_DAYS,
  type RecallGroundTruthEvent,
} from '@duedatehq/core/rules'

// Pure recall evaluator: ground-truth events + the pipeline's own rows in,
// a scorecard out. No I/O — the CLI (scripts/eval-alert-recall.ts) fetches the
// D1 rows and the golden-audit KV blob and feeds them here, so every branch is
// unit-testable and a Phase-2 /api/ops endpoint could reuse it verbatim.

const DAY_MS = 24 * 60 * 60 * 1000

// ── Row shapes (the CLI maps raw D1 snake_case into these) ──

export interface RecallPulseRow {
  id: string
  source: string
  sourceUrl: string
  publishedAt: number
  createdAt: number
  changeKind: string
  status: string
  parsedJurisdiction: string
  parsedCounties: readonly string[]
  parsedForms: readonly string[]
  parsedNewDueDate: number | null
  dedupeKey: string | null
  aiSummary: string
  verbatimQuote: string
}

export interface RecallSnapshotRow {
  id: string
  sourceId: string
  externalId: string
  title: string
  officialSourceUrl: string
  publishedAt: number | null
  fetchedAt: number
  parseStatus: string
  failureReason: string | null
  pulseId: string | null
  ingestMethod: string | null
}

export interface RecallSourceStateRow {
  sourceId: string
  enabled: boolean
  healthStatus: string
  lastSuccessAt: number | null
}

export interface GoldenAuditMissLite {
  sourceId: string
  externalId: string
}

export interface RecallEvalInput {
  events: readonly RecallGroundTruthEvent[]
  pulses: readonly RecallPulseRow[]
  snapshots: readonly RecallSnapshotRow[]
  sourceStates: readonly RecallSourceStateRow[]
  /** jurisdiction → source ids that should catch its events, already ∩ pulseManagedSourceIds. */
  coveringSourceIds: (jurisdiction: string) => readonly string[]
  now: Date
  // `| undefined` is explicit because the repo runs exactOptionalPropertyTypes —
  // callers pass `golden?.misses` directly, which may be undefined.
  goldenAuditMisses?: readonly GoldenAuditMissLite[] | undefined
  goldenAuditRanAt?: string | null | undefined
}

export type RecallMatchTier =
  | 'url'
  | 'snapshot_url'
  | 'keyword_identifier'
  | 'structured+keyword'
  | 'structured'
  | 'keyword'

const TIER_RANK: Record<RecallMatchTier, number> = {
  url: 1,
  snapshot_url: 2,
  keyword_identifier: 3,
  'structured+keyword': 4,
  structured: 5,
  keyword: 6,
}

export type RecallOutcome =
  | 'CAUGHT_ALERTED'
  | 'CAUGHT_LATE'
  | 'CAUGHT_IN_REVIEW'
  | 'CAUGHT_QUARANTINED'
  | 'CAUGHT_REJECTED'
  | 'MISSED_NO_SOURCE'
  | 'MISSED_FETCH'
  | 'MISSED_NOT_PARSED'
  | 'MISSED_STUCK_QUEUE'
  | 'MISSED_EXTRACT_FAILED'
  | 'MISSED_FILTERED'
  | 'PASS_FILTERED'
  | 'FAIL_FALSE_ALERT'
  | 'PENDING'

export interface RecallEventResult {
  eventId: string
  jurisdiction: string
  title: string
  announcedOn: string
  evalMode: RecallGroundTruthEvent['evalMode']
  expectedOutcome: 'alerted' | 'filtered'
  outcome: RecallOutcome
  matchedVia: RecallMatchTier | null
  matchedPulseIds: readonly string[]
  matchedSnapshotIds: readonly string[]
  lagDays: number | null
  diedAt: string | null
  failureReason: string | null
  coveringSourceIds: readonly string[]
  warnings: readonly string[]
  notes: readonly string[]
}

export interface RecallMetrics {
  countableLive: number
  strictRecall: number
  headlineRecall: number
  lenientRecall: number
  strictCaught: number
  headlineCaught: number
  lenientCaught: number
  lagP50: number | null
  lagP90: number | null
  filteredTotal: number
  filteredPass: number
  filteredFail: number
  pending: number
  backtestTotal: number
  backtestCaught: number
}

export interface RecallReport {
  generatedAt: string
  metrics: RecallMetrics
  byJurisdiction: readonly { jurisdiction: string; events: number; caught: number }[]
  funnel: Readonly<Record<string, number>>
  results: readonly RecallEventResult[]
  warnings: readonly string[]
  datasetSummary: {
    live: number
    backtest: number
    filteredExpected: number
    newestAddedOn: string
    stalenessDays: number
  }
}

// ── URL normalization ──

export function normalizeOfficialUrl(raw: string): string {
  try {
    const url = new URL(raw.trim())
    let host = url.host.toLowerCase()
    if (host.startsWith('www.')) host = host.slice(4)
    let path = decodeURIComponent(url.pathname).toLowerCase()
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1)
    return `${host}${path}`
  } catch {
    return raw.trim().toLowerCase()
  }
}

// An "identifier" keyword is a high-specificity agency code (IR-2026-45,
// GA-2026-03, notice 2026-12, DR-4830). Plain words ('wildfire', 'kona low')
// are not identifiers — they only match in the lower keyword tiers.
const IDENTIFIER_RE = /^(?:[a-z]{1,5}-\d{2,4}(?:-\d{1,4})?|dr-?\d{3,5}|notice\s?\d{4}-\d{1,3})$/i

export function isIdentifierKeyword(keyword: string): boolean {
  return IDENTIFIER_RE.test(keyword.trim())
}

function pulseText(pulse: RecallPulseRow): string {
  return `${pulse.aiSummary}\n${pulse.verbatimQuote}\n${pulse.sourceUrl}`.toLowerCase()
}

function normJurisdiction(j: string): string {
  return j.toUpperCase() === 'US' ? 'FED' : j.toUpperCase()
}

function jurisdictionMatches(pulseJur: string, eventJur: string): boolean {
  return normJurisdiction(pulseJur) === normJurisdiction(eventJur)
}

function withinDateProximity(event: RecallGroundTruthEvent, pulse: RecallPulseRow): boolean {
  const announced = Date.parse(event.announcedOn)
  const budget = (event.lagBudgetDays ?? RECALL_LAG_BUDGET_DEFAULT_DAYS) * DAY_MS
  if (event.expectedNewDueDate && pulse.parsedNewDueDate != null) {
    return Math.abs(pulse.parsedNewDueDate - Date.parse(event.expectedNewDueDate)) <= DAY_MS
  }
  return pulse.publishedAt >= announced - 2 * DAY_MS && pulse.publishedAt <= announced + budget
}

function countyOverlap(event: RecallGroundTruthEvent, pulse: RecallPulseRow): boolean {
  if (!event.expectedCounties || event.expectedCounties.length === 0) return true
  const have = new Set(pulse.parsedCounties.map((c) => c.toLowerCase()))
  return event.expectedCounties.some((c) => have.has(c.toLowerCase()))
}

function plainKeywordHits(event: RecallGroundTruthEvent, pulse: RecallPulseRow): number {
  const text = pulseText(pulse)
  let hits = 0
  for (const kw of event.keywords) {
    if (isIdentifierKeyword(kw)) continue
    if (text.includes(kw.toLowerCase())) hits += 1
  }
  return hits
}

// Best (lowest-rank) tier by which this pulse matches this event, or null.
function matchTier(
  event: RecallGroundTruthEvent,
  pulse: RecallPulseRow,
  snapshotUrlPulseIds: ReadonlySet<string>,
): RecallMatchTier | null {
  const officialNorm = event.officialUrls.map(normalizeOfficialUrl)
  if (officialNorm.includes(normalizeOfficialUrl(pulse.sourceUrl))) return 'url'
  if (snapshotUrlPulseIds.has(pulse.id)) return 'snapshot_url'

  const text = pulseText(pulse)
  const idHit = event.keywords.some(
    (kw) => isIdentifierKeyword(kw) && text.includes(kw.toLowerCase()),
  )
  if (idHit) return 'keyword_identifier'

  const jurAndKind =
    jurisdictionMatches(pulse.parsedJurisdiction, event.jurisdiction) &&
    pulse.changeKind === event.expectedChangeKind
  const plainHits = plainKeywordHits(event, pulse)

  if (jurAndKind && plainHits >= 1) return 'structured+keyword'
  if (jurAndKind && withinDateProximity(event, pulse) && countyOverlap(event, pulse)) {
    return 'structured'
  }
  if (plainHits >= 2) return 'keyword'
  return null
}

// ── Funnel attribution for an unmatched event ──

function snapshotMatchesEvent(
  event: RecallGroundTruthEvent,
  snapshot: RecallSnapshotRow,
  covering: ReadonlySet<string>,
): boolean {
  if (!covering.has(snapshot.sourceId)) return false
  const announced = Date.parse(event.announcedOn)
  if (snapshot.fetchedAt < announced - 2 * DAY_MS) return false
  const officialNorm = event.officialUrls.map(normalizeOfficialUrl)
  if (officialNorm.includes(normalizeOfficialUrl(snapshot.officialSourceUrl))) return true
  const title = snapshot.title.toLowerCase()
  return event.keywords.some((kw) => title.includes(kw.toLowerCase()))
}

function fetchedInWindow(
  event: RecallGroundTruthEvent,
  states: readonly RecallSourceStateRow[],
  covering: ReadonlySet<string>,
): boolean {
  const announced = Date.parse(event.announcedOn)
  const budget = (event.lagBudgetDays ?? RECALL_LAG_BUDGET_DEFAULT_DAYS) * DAY_MS
  return states.some(
    (s) =>
      covering.has(s.sourceId) &&
      s.enabled &&
      s.lastSuccessAt != null &&
      s.lastSuccessAt >= announced &&
      s.lastSuccessAt <= announced + budget + 2 * DAY_MS,
  )
}

interface FunnelVerdict {
  outcome: RecallOutcome
  diedAt: string
  failureReason: string | null
  matchedSnapshotIds: string[]
  notes: string[]
}

function attributeMiss(
  event: RecallGroundTruthEvent,
  input: RecallEvalInput,
  covering: ReadonlySet<string>,
): FunnelVerdict {
  if (covering.size === 0) {
    return {
      outcome: 'MISSED_NO_SOURCE',
      diedAt: 'no covering source',
      failureReason: null,
      matchedSnapshotIds: [],
      notes: [],
    }
  }
  const matchingSnapshots = input.snapshots.filter((s) => snapshotMatchesEvent(event, s, covering))
  if (matchingSnapshots.length === 0) {
    if (!fetchedInWindow(event, input.sourceStates, covering)) {
      return {
        outcome: 'MISSED_FETCH',
        diedAt: 'source never fetched in window',
        failureReason: null,
        matchedSnapshotIds: [],
        notes: [],
      }
    }
    const notes: string[] = []
    const golden = input.goldenAuditMisses ?? []
    if (golden.some((m) => covering.has(m.sourceId))) notes.push('confirmed_by_golden_audit')
    return {
      outcome: 'MISSED_NOT_PARSED',
      diedAt: 'listing parser / filter',
      failureReason: null,
      matchedSnapshotIds: [],
      notes,
    }
  }
  const ids = matchingSnapshots.map((s) => s.id)
  // Worst-case (most-recovered) status across matching snapshots leads.
  const order: Record<string, number> = {
    extracted: 0,
    duplicate: 0,
    ignored: 1,
    failed: 2,
    extracting: 3,
    pending_extract: 3,
  }
  const worst = [...matchingSnapshots].toSorted(
    (a, b) => (order[b.parseStatus] ?? 9) - (order[a.parseStatus] ?? 9),
  )[0]!
  if (worst.parseStatus === 'pending_extract' || worst.parseStatus === 'extracting') {
    return {
      outcome: 'MISSED_STUCK_QUEUE',
      diedAt: 'extract queue',
      failureReason: null,
      matchedSnapshotIds: ids,
      notes: [],
    }
  }
  if (worst.parseStatus === 'failed') {
    return {
      outcome: 'MISSED_EXTRACT_FAILED',
      diedAt: 'extract failed',
      failureReason: worst.failureReason,
      matchedSnapshotIds: ids,
      notes: [],
    }
  }
  // ignored, or extracted/duplicate whose pulse didn't match this event.
  return {
    outcome: 'MISSED_FILTERED',
    diedAt: 'extract filter',
    failureReason: worst.failureReason,
    matchedSnapshotIds: ids,
    notes: worst.pulseId ? ['extracted_pulse_did_not_match_event'] : [],
  }
}

// ── Per-event evaluation ──

const STATUS_VISIBLE = new Set(['approved', 'pending_review'])

function evaluateEvent(
  event: RecallGroundTruthEvent,
  input: RecallEvalInput,
  snapshotUrlPulseIds: ReadonlySet<string>,
): RecallEventResult {
  const expectedOutcome = event.expectedOutcome ?? 'alerted'
  const covering = new Set(input.coveringSourceIds(event.jurisdiction))
  const warnings: string[] = []
  const notes: string[] = []

  const matched: { pulse: RecallPulseRow; tier: RecallMatchTier }[] = []
  for (const pulse of input.pulses) {
    const tier = matchTier(event, pulse, snapshotUrlPulseIds)
    if (tier) matched.push({ pulse, tier })
  }
  matched.sort((a, b) => TIER_RANK[a.tier] - TIER_RANK[b.tier])
  const matchedVia = matched[0]?.tier ?? null
  const matchedPulseIds = matched.map((m) => m.pulse.id)
  if (matched.length > 3) warnings.push('noisy_match')

  const announced = Date.parse(event.announcedOn)
  const budget = (event.lagBudgetDays ?? RECALL_LAG_BUDGET_DEFAULT_DAYS) * DAY_MS

  const base = {
    eventId: event.id,
    jurisdiction: event.jurisdiction,
    title: event.title,
    announcedOn: event.announcedOn,
    evalMode: event.evalMode,
    expectedOutcome,
    matchedVia,
    matchedPulseIds,
    coveringSourceIds: [...covering],
  }

  if (matched.length > 0) {
    const statuses = new Set(matched.map((m) => m.pulse.status))
    const visibleCreatedAts = matched
      .filter((m) => STATUS_VISIBLE.has(m.pulse.status))
      .map((m) => m.pulse.createdAt)
    let lagDays: number | null = null
    if (visibleCreatedAts.length > 0) {
      const earliest = Math.min(...visibleCreatedAts)
      const rawLag = (earliest - announced) / DAY_MS
      if (rawLag < 0) warnings.push('lag_negative_check_announcedOn')
      lagDays = Math.max(0, Math.round(rawLag))
    }

    let outcome: RecallOutcome
    if (statuses.has('approved')) {
      outcome =
        lagDays != null && earliestVisibleWithinBudget(matched, announced, budget)
          ? 'CAUGHT_ALERTED'
          : 'CAUGHT_LATE'
    } else if (statuses.has('pending_review')) {
      outcome = 'CAUGHT_IN_REVIEW'
    } else if (statuses.has('quarantined')) {
      outcome = 'CAUGHT_QUARANTINED'
    } else {
      outcome = 'CAUGHT_REJECTED'
    }
    if (
      statuses.has('source_revoked') &&
      (outcome === 'CAUGHT_ALERTED' || outcome === 'CAUGHT_LATE')
    ) {
      notes.push('was_visible_then_revoked')
    }

    if (expectedOutcome === 'filtered') {
      // A true negative that produced an approved alert is a false positive.
      const failed = statuses.has('approved')
      return {
        ...base,
        outcome: failed ? 'FAIL_FALSE_ALERT' : 'PASS_FILTERED',
        matchedSnapshotIds: [],
        lagDays,
        diedAt: null,
        failureReason: null,
        warnings,
        notes,
      }
    }
    return {
      ...base,
      outcome,
      matchedSnapshotIds: [],
      lagDays,
      diedAt: null,
      failureReason: null,
      warnings,
      notes,
    }
  }

  // No pulse matched → funnel attribution.
  const verdict = attributeMiss(event, input, covering)
  let outcome = verdict.outcome
  // A pre-go-live or still-within-budget miss is PENDING, not a real miss.
  const budgetElapsed = announced + budget <= input.now.getTime()
  if (expectedOutcome === 'filtered') {
    // A true negative the pipeline correctly did not alert on = pass.
    outcome = 'PASS_FILTERED'
  } else if (!budgetElapsed) {
    outcome = 'PENDING'
  }
  return {
    ...base,
    outcome,
    matchedSnapshotIds: verdict.matchedSnapshotIds,
    lagDays: null,
    diedAt: outcome === 'PASS_FILTERED' || outcome === 'PENDING' ? null : verdict.diedAt,
    failureReason: verdict.failureReason,
    warnings,
    notes: [...notes, ...verdict.notes],
  }
}

function earliestVisibleWithinBudget(
  matched: { pulse: RecallPulseRow; tier: RecallMatchTier }[],
  announced: number,
  budget: number,
): boolean {
  const approved = matched
    .filter((m) => m.pulse.status === 'approved')
    .map((m) => m.pulse.createdAt)
  if (approved.length === 0) return false
  return Math.min(...approved) - announced <= budget
}

// ── Top-level evaluation ──

const HEADLINE_CAUGHT = new Set<RecallOutcome>(['CAUGHT_ALERTED', 'CAUGHT_IN_REVIEW'])
const STRICT_CAUGHT = new Set<RecallOutcome>(['CAUGHT_ALERTED', 'CAUGHT_LATE'])
const LENIENT_CAUGHT = new Set<RecallOutcome>([
  'CAUGHT_ALERTED',
  'CAUGHT_IN_REVIEW',
  'CAUGHT_QUARANTINED',
])

function percentile(sorted: readonly number[], p: number): number | null {
  if (sorted.length === 0) return null
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))
  return sorted[idx]!
}

export function evaluateRecall(input: RecallEvalInput): RecallReport {
  // Pulses reachable by a canonical snapshot URL — lets a pulse whose own text
  // lacks the keywords still match via the snapshot's official URL.
  const snapshotUrlByEvent = input.snapshots.filter((s) => s.pulseId)
  const snapshotUrlPulseIdsByEvent = (event: RecallGroundTruthEvent): Set<string> => {
    const officialNorm = new Set(event.officialUrls.map(normalizeOfficialUrl))
    const ids = new Set<string>()
    for (const s of snapshotUrlByEvent) {
      if (s.pulseId && officialNorm.has(normalizeOfficialUrl(s.officialSourceUrl))) {
        ids.add(s.pulseId)
      }
    }
    return ids
  }

  const results = input.events.map((event) =>
    evaluateEvent(event, input, snapshotUrlPulseIdsByEvent(event)),
  )

  // Cross-event dedupe-fold detection: ≥2 events matching the same pulse only
  // via a structured/keyword tier, with differing expected due dates.
  const globalWarnings = detectBadFolds(input.events, results)

  const live = results.filter((r) => r.evalMode === 'live')
  const countableEvents = live.filter(
    (r) => r.expectedOutcome === 'alerted' && r.outcome !== 'PENDING',
  )
  const filtered = live.filter((r) => r.expectedOutcome === 'filtered')
  const backtest = results.filter((r) => r.evalMode === 'backtest_only')

  const strictCaught = countableEvents.filter((r) => STRICT_CAUGHT.has(r.outcome)).length
  const headlineCaught = countableEvents.filter((r) => HEADLINE_CAUGHT.has(r.outcome)).length
  const lenientCaught = countableEvents.filter((r) => LENIENT_CAUGHT.has(r.outcome)).length

  const lags = countableEvents
    .flatMap((r) => (r.lagDays == null ? [] : [r.lagDays]))
    .toSorted((a, b) => a - b)

  const metrics: RecallMetrics = {
    countableLive: countableEvents.length,
    strictRecall: ratio(strictCaught, countableEvents.length),
    headlineRecall: ratio(headlineCaught, countableEvents.length),
    lenientRecall: ratio(lenientCaught, countableEvents.length),
    strictCaught,
    headlineCaught,
    lenientCaught,
    lagP50: percentile(lags, 50),
    lagP90: percentile(lags, 90),
    filteredTotal: filtered.length,
    filteredPass: filtered.filter((r) => r.outcome === 'PASS_FILTERED').length,
    filteredFail: filtered.filter((r) => r.outcome === 'FAIL_FALSE_ALERT').length,
    pending: live.filter((r) => r.outcome === 'PENDING').length,
    backtestTotal: backtest.length,
    backtestCaught: backtest.filter(
      (r) =>
        HEADLINE_CAUGHT.has(r.outcome) ||
        r.outcome === 'CAUGHT_LATE' ||
        r.outcome === 'CAUGHT_QUARANTINED',
    ).length,
  }

  const byJurisdiction = rollupByJurisdiction(countableEvents)
  const funnel = countFunnel(results)

  const newestAddedOn =
    input.events
      .map((e) => e.addedOn)
      .toSorted()
      .at(-1) ?? PIPELINE_LIVE_SINCE
  const stalenessDays = Math.floor((input.now.getTime() - Date.parse(newestAddedOn)) / DAY_MS)

  return {
    generatedAt: input.now.toISOString(),
    metrics,
    byJurisdiction,
    funnel,
    results,
    warnings: [...new Set([...results.flatMap((r) => r.warnings), ...globalWarnings])],
    datasetSummary: {
      live: live.length,
      backtest: backtest.length,
      filteredExpected: filtered.length,
      newestAddedOn,
      stalenessDays,
    },
  }
}

function ratio(caught: number, total: number): number {
  return total === 0 ? 1 : caught / total
}

function detectBadFolds(
  events: readonly RecallGroundTruthEvent[],
  results: readonly RecallEventResult[],
): string[] {
  const byEvent = new Map(events.map((e) => [e.id, e]))
  const pulseToEvents = new Map<string, string[]>()
  for (const r of results) {
    if (r.matchedVia && TIER_RANK[r.matchedVia] >= TIER_RANK['structured+keyword']) {
      for (const pid of r.matchedPulseIds) {
        pulseToEvents.set(pid, [...(pulseToEvents.get(pid) ?? []), r.eventId])
      }
    }
  }
  const warnings: string[] = []
  for (const [pid, eventIds] of pulseToEvents) {
    if (eventIds.length < 2) continue
    const dueDates = new Set(eventIds.map((id) => byEvent.get(id)?.expectedNewDueDate ?? null))
    if (dueDates.size > 1) {
      warnings.push(`possible_bad_dedupe_fold:${pid}:${eventIds.join(',')}`)
    }
  }
  return warnings
}

function rollupByJurisdiction(
  countable: readonly RecallEventResult[],
): { jurisdiction: string; events: number; caught: number }[] {
  const map = new Map<string, { events: number; caught: number }>()
  for (const r of countable) {
    const cur = map.get(r.jurisdiction) ?? { events: 0, caught: 0 }
    cur.events += 1
    if (HEADLINE_CAUGHT.has(r.outcome)) cur.caught += 1
    map.set(r.jurisdiction, cur)
  }
  return [...map.entries()]
    .map(([jurisdiction, v]) => Object.assign({ jurisdiction }, v))
    .toSorted((a, b) => a.jurisdiction.localeCompare(b.jurisdiction))
}

function countFunnel(results: readonly RecallEventResult[]): Record<string, number> {
  const funnel: Record<string, number> = {}
  for (const r of results) {
    if (r.outcome.startsWith('MISSED_') || r.outcome === 'FAIL_FALSE_ALERT') {
      funnel[r.outcome] = (funnel[r.outcome] ?? 0) + 1
    }
  }
  return funnel
}

// ── Scorecard markdown (sections 1 Recall + 2 Golden audit) ──

export interface GoldenAuditSummary {
  ranAt: string
  auditedSources: number
  parsedItems: number
  misses: readonly { sourceId: string; externalId: string; title?: string }[]
  missingAdapterIds: readonly string[]
}

const pct = (n: number) => `${Math.round(n * 100)}%`
const MISS_OUTCOMES: ReadonlySet<RecallOutcome> = new Set<RecallOutcome>([
  'MISSED_NO_SOURCE',
  'MISSED_FETCH',
  'MISSED_NOT_PARSED',
  'MISSED_STUCK_QUEUE',
  'MISSED_EXTRACT_FAILED',
  'MISSED_FILTERED',
  'CAUGHT_REJECTED',
  'FAIL_FALSE_ALERT',
])

export function renderScorecardMarkdown(
  report: RecallReport,
  golden: GoldenAuditSummary | null,
  now: Date,
): string {
  const m = report.metrics
  const lines: string[] = []
  lines.push(`## Alert recall scorecard — ${report.generatedAt}`)
  lines.push(
    `Headline recall@budget: **${pct(m.headlineRecall)}** (${m.headlineCaught}/${m.countableLive}) · ` +
      `strict (approved only): ${pct(m.strictRecall)} · lenient (+quarantined): ${pct(m.lenientRecall)}`,
  )
  lines.push(
    `Lag: P50 ${m.lagP50 ?? '—'}d · P90 ${m.lagP90 ?? '—'}d · ` +
      `Dataset: ${report.datasetSummary.live} live, ${report.datasetSummary.backtest} backtest, ` +
      `${report.datasetSummary.filteredExpected} filtered-expected · newest GT entry ${report.datasetSummary.newestAddedOn}`,
  )
  lines.push(
    `True-negative integrity: ${m.filteredPass}/${m.filteredTotal} held` +
      (m.filteredFail > 0 ? ` · ⚠️ ${m.filteredFail} false alert(s)` : ''),
  )
  if (report.datasetSummary.stalenessDays > 21) {
    lines.push(
      `> ⚠️ GT curation stale — newest entry is ${report.datasetSummary.stalenessDays}d old. Run the weekly sweep (docs/ops/alert-recall-curation.md).`,
    )
  }
  lines.push('')

  // Missed / flagged events.
  const flagged = report.results.filter((r) => MISS_OUTCOMES.has(r.outcome))
  if (flagged.length > 0) {
    lines.push('### Missed / flagged events')
    lines.push('| event | jur | announced | outcome | died at | detail |')
    lines.push('| --- | --- | --- | --- | --- | --- |')
    for (const r of flagged) {
      const detail = [
        r.failureReason ? `failureReason=${r.failureReason}` : '',
        r.matchedSnapshotIds.length ? `snapshot=${r.matchedSnapshotIds[0]}` : '',
        r.notes.join(';'),
      ]
        .filter(Boolean)
        .join(' ')
      lines.push(
        `| \`${r.eventId}\` | ${r.jurisdiction} | ${r.announcedOn} | ${r.outcome} | ${r.diedAt ?? '—'} | ${detail || '—'} |`,
      )
    }
    lines.push('')
  } else {
    lines.push('_No missed or flagged live events._\n')
  }

  // Per-jurisdiction.
  if (report.byJurisdiction.length > 0) {
    lines.push('### Per-jurisdiction (live, countable)')
    lines.push('| jur | events | caught | recall |')
    lines.push('| --- | --- | --- | --- |')
    for (const j of report.byJurisdiction) {
      lines.push(
        `| ${j.jurisdiction} | ${j.events} | ${j.caught} | ${pct(ratio(j.caught, j.events))} |`,
      )
    }
    lines.push('')
  }

  // Backtest section.
  const backtest = report.results.filter((r) => r.evalMode === 'backtest_only')
  if (backtest.length > 0) {
    lines.push('<details><summary>Backtest events (pre-go-live / historical)</summary>\n')
    lines.push('| event | jur | outcome | lag | via |')
    lines.push('| --- | --- | --- | --- | --- |')
    for (const r of backtest) {
      lines.push(
        `| \`${r.eventId}\` | ${r.jurisdiction} | ${r.outcome} | ${r.lagDays ?? '—'} | ${r.matchedVia ?? '—'} |`,
      )
    }
    lines.push(`\n_Backtest caught: ${m.backtestCaught}/${m.backtestTotal}_`)
    lines.push('</details>\n')
  }

  // Pending + warnings.
  const pending = report.results.filter((r) => r.outcome === 'PENDING')
  if (pending.length > 0) {
    lines.push(`<details><summary>Pending (within lag budget): ${pending.length}</summary>\n`)
    lines.push(
      pending.map((r) => `- \`${r.eventId}\` (${r.jurisdiction}, ${r.announcedOn})`).join('\n'),
    )
    lines.push('</details>\n')
  }
  if (report.warnings.length > 0) {
    lines.push('<details><summary>Warnings</summary>\n')
    lines.push(report.warnings.map((w) => `- ${w}`).join('\n'))
    lines.push('</details>\n')
  }

  // Section 2: golden audit (ingestion completeness).
  lines.push('## Golden-set audit (ingestion completeness)')
  if (!golden) {
    lines.push(
      '> ⚠️ No golden-audit result in KV yet — the in-Worker audit writes it Mondays 10:00 UTC.',
    )
  } else {
    const ranDaysAgo = Math.floor((now.getTime() - Date.parse(golden.ranAt)) / DAY_MS)
    if (ranDaysAgo > 7) {
      lines.push(
        `> ⚠️ Last audit ran ${ranDaysAgo}d ago (${golden.ranAt}) — stale, treat as not run.`,
      )
    } else {
      lines.push(
        `Ran ${golden.ranAt} · ${golden.auditedSources} sources · ${golden.parsedItems} items parsed.`,
      )
    }
    if (golden.misses.length === 0) {
      lines.push('Ingestion misses: **0** ✅')
    } else {
      lines.push(
        `Ingestion misses: **${golden.misses.length}** (items on a golden page never snapshotted)`,
      )
      lines.push('')
      lines.push('| source | item |')
      lines.push('| --- | --- |')
      for (const miss of golden.misses.slice(0, 15)) {
        lines.push(`| \`${miss.sourceId}\` | ${miss.title ?? miss.externalId} |`)
      }
    }
    if (golden.missingAdapterIds.length > 0) {
      lines.push(
        `\n⚠️ Golden source ids missing from registry: ${golden.missingAdapterIds.join(', ')}`,
      )
    }
  }

  return lines.join('\n')
}

// One-line history comment for the weekly issue's comment stream.
export function renderHistoryLine(
  report: RecallReport,
  golden: GoldenAuditSummary | null,
  runUrl: string,
): string {
  const m = report.metrics
  const goldenStr = golden ? `golden ${golden.misses.length} miss` : 'golden n/a'
  return (
    `${report.generatedAt.slice(0, 10)} — recall@budget ${pct(m.headlineRecall)} ` +
    `(${m.headlineCaught}/${m.countableLive}), strict ${pct(m.strictRecall)}, ` +
    `lag P50 ${m.lagP50 ?? '—'}d/P90 ${m.lagP90 ?? '—'}d, ${goldenStr} — ${runUrl}`
  )
}
