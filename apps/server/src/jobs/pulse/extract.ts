import { createAI } from '@duedatehq/ai'
import { ruleCitesSourceAsBasis, rulesBySourceId } from '@duedatehq/core/rules'
import { taxAreasForAlert } from '@duedatehq/core/tax-area'
import { createDb, makePulseOpsRepo } from '@duedatehq/db'
import { aiOutput, llmLog } from '@duedatehq/db/schema/ai'
import type { Env } from '../../env'
import { sourceTextContainsExcerpt } from '../../procedures/rules/concrete-draft'
import { extractCanonicalEmailText } from './email-artifact'
import { pulseFullTextR2Key } from './ingest'
import { recordPulseAlert, recordPulseMetric } from './metrics'
import { isThresholdAdvisorySource, shouldForceReviewOnlyPulseAlert } from './rule-source-adapters'

type PulseExtractRepo = Pick<
  ReturnType<typeof makePulseOpsRepo>,
  | 'getSourceSnapshot'
  | 'updateSourceSnapshotStatus'
  | 'findDuplicatePulseForExtract'
  | 'applyDuplicateExtractToPulse'
  | 'refreshFirmAlertsForApprovedPulse'
  | 'createPulseForFirmReviewFromExtract'
  | 'mergeReverifyRuleIdsIntoPulse'
  | 'upsertRuleSourceDriftState'
>

function makePulseExtractRepo(db: ReturnType<typeof createDb>): PulseExtractRepo {
  const repo = makePulseOpsRepo(db)
  return {
    getSourceSnapshot: (snapshotId) => repo.getSourceSnapshot(snapshotId),
    updateSourceSnapshotStatus: (snapshotId, patch) =>
      repo.updateSourceSnapshotStatus(snapshotId, patch),
    findDuplicatePulseForExtract: (input) => repo.findDuplicatePulseForExtract(input),
    applyDuplicateExtractToPulse: (input) => repo.applyDuplicateExtractToPulse(input),
    refreshFirmAlertsForApprovedPulse: (pulseId) => repo.refreshFirmAlertsForApprovedPulse(pulseId),
    createPulseForFirmReviewFromExtract: (input) => repo.createPulseForFirmReviewFromExtract(input),
    mergeReverifyRuleIdsIntoPulse: (pulseId, ruleIds) =>
      repo.mergeReverifyRuleIdsIntoPulse(pulseId, ruleIds),
    upsertRuleSourceDriftState: (input) => repo.upsertRuleSourceDriftState(input),
  }
}

function dateFromIsoDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`)
}

function nullableDateFromIsoDate(value: string | null): Date | null {
  return value ? dateFromIsoDate(value) : null
}

// Only surface alerts for current/upcoming policy changes. When a newly-recovered
// source first succeeds it re-parses the page's whole history, and the AI extracts
// each old policy (2023 winter-storm relief, 2024/2025 forms, ...). Suppress an
// alert when every parsed policy date is before the rolling floor below. Items
// with no parsed date are kept (no evidence they are historical).
const HISTORICAL_GRACE_MS = 90 * 24 * 60 * 60 * 1000

/**
 * Rolling relevance floor: min(start of the current UTC year, now − 90 days).
 * Mid-year that is simply Jan 1 (identical to the old hardcoded 2026-01-01
 * through 2026); in January–March it reaches back up to 90 days into the prior
 * year so fresh alerts citing Q4 dates aren't suppressed right after rollover.
 */
export function pulseAlertMinRelevantAt(now: Date): Date {
  const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1))
  const grace = new Date(now.getTime() - HISTORICAL_GRACE_MS)
  return grace < startOfYear ? grace : startOfYear
}

// Confidence gating for AI regulatory extracts, calibrated against the live
// alert corpus (non-events cluster ≤0.25; genuine items ≥0.5):
//   < MIN     → drop outright (almost always a non-event the model failed to
//               mark no_regulatory_change — revenue-distribution press
//               releases, "no due-date relief" pages).
//   MIN..PUB  → real-but-shaky: create quarantined (kept for review, not
//               fanned out to firms).
//   ≥ PUB     → publish (approved + fan out) as before.
const PULSE_MIN_ALERT_CONFIDENCE = 0.3
const PULSE_PUBLISH_CONFIDENCE = 0.5

// Scope backstop behind the pulse-extract@v5 prompt exclusions: form/summary
// signals that an extracted "deadline" is an internal agency program window
// (grant, clinic, advisory council, job posting) rather than a taxpayer
// filing/payment obligation — e.g. the LITC matching-grant and IRSAC council
// application windows the model still occasionally mis-files as a deadline_shift.
const NON_OBLIGATION_DEADLINE_PATTERN =
  /\b(grants?|clinics?|advisory\s+(?:council|committee|board|panel)|councils?|membership|fellowships?|scholarships?|internships?|recruit\w*|nominations?|volunteers?)\b/i

function latestPolicyDate(values: ReadonlyArray<string | null>): Date | null {
  const times = values
    .map(nullableDateFromIsoDate)
    .filter((date): date is Date => date !== null)
    .map((date) => date.getTime())
  return times.length > 0 ? new Date(Math.max(...times)) : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function protectiveActionDeadlineFromStructuredChange(structuredChange: unknown): Date | null {
  if (!isRecord(structuredChange)) return null
  const deadline = structuredChange.actionDeadline
  if (typeof deadline !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return null
  return dateFromIsoDate(deadline)
}

function utcStartOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function hasCurrentProtectiveActionDeadline(structuredChange: unknown, now = new Date()): boolean {
  const deadline = protectiveActionDeadlineFromStructuredChange(structuredChange)
  if (!deadline) return false
  return deadline.getTime() >= utcStartOfDay(now).getTime()
}

/**
 * Coerce the AI-extracted jurisdiction into a value the output contract accepts
 * (`FED` or a 2-letter state/DC code — PulseJurisdictionSchema). The model
 * sometimes emits `US` (means federal here) or outright garbage (`f!`, `F4`),
 * and an illegal stored value 500s every firm's alert list through the
 * array-output validation (`listAlerts`). Recovery order:
 *   1. `US`/`USA` -> `FED` (the model has no standalone "US" jurisdiction).
 *   2. Already legal (`FED` or `^[A-Z]{2}$`) -> keep. Preserves a genuine state
 *      on a federally-sourced but state-scoped item (IRS relief scoped to `CA`).
 *   3. Garbage -> recover from the `<state|irs|fed>.<agency>` source-id
 *      convention: a 2-letter prefix is the state (`ca.ftb.news` -> `CA`),
 *      otherwise federal (`irs.*`, `fed.*`, unknown) -> `FED`.
 * The result is always contract-legal, so no extraction can poison the list.
 */
const GROUNDING_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

// The renderings US tax announcements actually use for a calendar date. UTC
// parts — parsed dates are date-valued, never moments.
function groundedDateRenderings(date: Date): string[] {
  const year = date.getUTCFullYear()
  const monthIndex = date.getUTCMonth()
  const day = date.getUTCDate()
  const month = GROUNDING_MONTHS[monthIndex] ?? ''
  const mon = month.slice(0, 3)
  const mm = String(monthIndex + 1).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return [
    `${month} ${day}, ${year}`,
    `${month} ${day} ${year}`,
    `${month} ${day}`,
    `${mon} ${day}, ${year}`,
    `${mon}. ${day}, ${year}`,
    `${day} ${month} ${year}`,
    `${monthIndex + 1}/${day}/${year}`,
    `${mm}/${dd}/${year}`,
    `${monthIndex + 1}/${day}/${String(year).slice(2)}`,
    `${year}-${mm}-${dd}`,
  ].map((rendering) => rendering.toLowerCase())
}

// Change language a due-date CHANGE plausibly uses. The prompt's decision
// test is the primary restatement filter (pulse-extract@v5); this is the
// deterministic backstop: an overlay alert whose summary + excerpt contain
// none of these is a restatement of a standing deadline ("X is due April
// 15"), not a change — live data showed several of those approved as
// deadline_shift. Deliberately generous (disaster/emergency cover FEMA-class
// precursors; conformity covers federal-conformity shifts).
const CHANGE_LANGUAGE_RE =
  /extend|extension|postpon|delay|relief|waiv|suspend|defer|now due|new (?:deadline|due date)|moved|revised|reschedul|pushed back|instead of|previously|disaster|emergency|conformity|grace period/i

export function looksLikeDueDateChange(text: string): boolean {
  return CHANGE_LANGUAGE_RE.test(text)
}

/**
 * Which of the AI-parsed dates can NOT be located in the source text, in any
 * of the renderings a US tax announcement plausibly uses. The excerpt guard
 * only proves the verbatim quote exists; this is the deterministic check that
 * the dates driving the matcher / apply flow / expiry predicate were actually
 * read off the page rather than hallucinated or misparsed. Returns the labels
 * of the offending dates; the caller degrades the pulse to 'quarantined'
 * (never drops it — the fields stay reviewable and promotable).
 */
export function ungroundedAlertDates(
  sourceText: string,
  dates: ReadonlyArray<readonly [label: string, date: Date | null]>,
): string[] {
  const normalized = sourceText
    .toLowerCase()
    // "June 15th" → "June 15" so ordinal prose grounds the parsed date.
    .replace(/(\d)(?:st|nd|rd|th)\b/g, '$1')
    .replace(/\s+/g, ' ')
  return dates
    .filter(([, date]) => {
      if (!date) return false
      return !groundedDateRenderings(date).some((rendering) => normalized.includes(rendering))
    })
    .map(([label]) => label)
}

export function normalizeExtractJurisdiction(sourceId: string, jurisdiction: string): string {
  const value = jurisdiction.trim().toUpperCase()
  if (value === 'US' || value === 'USA') return 'FED'
  if (value === 'FED' || /^[A-Z]{2}$/.test(value)) return value
  const prefix = sourceId.split('.')[0]?.toUpperCase() ?? ''
  if (prefix !== 'US' && /^[A-Z]{2}$/.test(prefix)) return prefix
  return 'FED'
}

type PulseExtractEnv = Pick<
  Env,
  | 'AI_GATEWAY_ACCOUNT_ID'
  | 'AI_GATEWAY_SLUG'
  | 'AI_GATEWAY_API_KEY'
  | 'AI_GATEWAY_PROVIDER'
  | 'AI_GATEWAY_PROVIDER_API_KEY'
  | 'AI_GATEWAY_MODEL_FAST_JSON'
  | 'AI_GATEWAY_MODEL_QUALITY_JSON'
  | 'AI_GATEWAY_MODEL_REASONING'
  | 'DB'
  | 'R2_PULSE'
>

type PulseExtractResult = {
  pulseId: string | null
  status: 'created' | 'failed' | 'missing' | 'skipped'
}

type PulseExtractSnapshot = NonNullable<Awaited<ReturnType<PulseExtractRepo['getSourceSnapshot']>>>

export async function extractPulseSnapshot(
  env: PulseExtractEnv,
  snapshotId: string,
  now: Date = new Date(),
): Promise<PulseExtractResult> {
  const db = createDb(env.DB)
  const repo = makePulseExtractRepo(db)
  const snapshot = await repo.getSourceSnapshot(snapshotId)
  if (!snapshot) return { pulseId: null, status: 'missing' }
  if (snapshot.pulseId || snapshot.parseStatus === 'extracted') {
    return { pulseId: snapshot.pulseId, status: 'skipped' }
  }
  // `extracting` is intentionally re-enterable: a prior attempt that was
  // hard-killed (CPU / wall-clock limit) after marking `extracting` but before
  // its catch ran would otherwise strand the snapshot here forever, turning
  // every queue retry into a no-op `skipped`.
  if (
    snapshot.parseStatus !== 'pending_extract' &&
    snapshot.parseStatus !== 'failed' &&
    snapshot.parseStatus !== 'extracting'
  ) {
    return { pulseId: null, status: 'skipped' }
  }

  await repo.updateSourceSnapshotStatus(snapshotId, { parseStatus: 'extracting' })
  try {
    return await runPulseExtractionAfterMark(env, db, repo, snapshot, snapshotId, now)
  } catch (error) {
    // A *thrown* error (R2 / AI / DB infra) is transient — distinct from an AI
    // refusal, which returns a `failed` result below. Reset `extracting` →
    // `failed` so the queue retry can re-enter and the DB never shows a dead
    // row as perpetually `extracting`. Best-effort: swallow a secondary write
    // error so the original error still propagates to the queue for retry / DLQ.
    try {
      await repo.updateSourceSnapshotStatus(snapshotId, {
        parseStatus: 'failed',
        failureReason: error instanceof Error ? error.message : 'Pulse extract threw.',
      })
    } catch {
      // ignore — surface the original error below
    }
    recordPulseMetric('pulse.extract.result', {
      snapshotId,
      sourceId: snapshot.sourceId,
      result: 'failed',
      refusalCode: null,
      confidence: null,
    })
    throw error
  }
}

async function runPulseExtractionAfterMark(
  env: PulseExtractEnv,
  db: ReturnType<typeof createDb>,
  repo: PulseExtractRepo,
  snapshot: PulseExtractSnapshot,
  snapshotId: string,
  now: Date = new Date(),
): Promise<PulseExtractResult> {
  // IRS annual inflation Revenue Procedure: emit a deterministic review_only
  // "pointer" advisory and skip AI entirely. We never let the model read a
  // Rev. Proc. and assert dollar figures (cf. "AI never invents dollar
  // amounts"); the Alert points the CPA at the official source. Idempotency
  // comes from snapshot contentHash dedup at ingest — one new Rev. Proc.
  // publication yields one new snapshot, hence one advisory.
  if (isThresholdAdvisorySource(snapshot.sourceId)) {
    const created = await repo.createPulseForFirmReviewFromExtract({
      snapshotId,
      source: snapshot.sourceId,
      sourceUrl: snapshot.officialSourceUrl,
      rawR2Key: snapshot.rawR2Key,
      publishedAt: snapshot.publishedAt,
      changeKind: 'threshold_advisory',
      actionMode: 'review_only',
      aiSummary:
        'IRS published an annual inflation-adjustment Revenue Procedure. Review thresholds that may affect your clients (gift/estate exclusions, estimated-tax safe harbor, …) — open the official source for the adjusted figures.',
      verbatimQuote: 'See the official IRS Revenue Procedure for the adjusted figures.',
      parsedJurisdiction: 'FED',
      parsedCounties: [],
      parsedForms: [],
      parsedEntityTypes: [],
      parsedOriginalDueDate: null,
      parsedNewDueDate: null,
      parsedEffectiveFrom: null,
      parsedEffectiveUntil: null,
      affectedRuleIds: [],
      reverifyRuleIds: [],
      structuredChange: {
        kind: 'threshold_advisory',
        sourceId: snapshot.sourceId,
        sourceUrl: snapshot.officialSourceUrl,
      },
      confidence: 1,
      requiresHumanReview: true,
      isSample: false,
    })
    recordPulseMetric('pulse.extract.result', {
      snapshotId,
      sourceId: snapshot.sourceId,
      result: 'created',
      refusalCode: null,
      confidence: 1,
    })
    return { pulseId: created.pulseId, status: 'created' }
  }

  const raw = await env.R2_PULSE.get(snapshot.rawR2Key)
  if (!raw) {
    await repo.updateSourceSnapshotStatus(snapshotId, {
      parseStatus: 'failed',
      failureReason: 'Raw Pulse snapshot is missing from R2.',
    })
    return { pulseId: null, status: 'failed' }
  }

  const rawText = extractCanonicalEmailText(await raw.text())
  const ai = createAI(env)
  const result = await ai.extractPulse(
    {
      sourceId: snapshot.sourceId,
      title: snapshot.title,
      officialSourceUrl: snapshot.officialSourceUrl,
      rawText,
    },
    { taskKind: 'pulse' },
  )
  const aiOutputId = crypto.randomUUID()
  const llmLogId = crypto.randomUUID()
  await Promise.all([
    db.insert(aiOutput).values({
      id: aiOutputId,
      firmId: null,
      userId: null,
      kind: 'pulse_extract',
      promptVersion: result.trace.promptVersion,
      model: result.model ?? result.trace.model,
      inputContextRef: snapshotId,
      inputHash: result.trace.inputHash,
      outputText: JSON.stringify(result.result ?? result.refusal),
      citationsJson: result.result
        ? {
            sourceUrl: snapshot.officialSourceUrl,
            sourceExcerpt: result.result.sourceExcerpt,
          }
        : null,
      guardResult: result.trace.guardResult,
      refusalCode: result.trace.refusalCode ?? result.refusal?.code ?? null,
      tokensIn: result.trace.tokens?.input ?? null,
      tokensOut: result.trace.tokens?.output ?? null,
      latencyMs: result.trace.latencyMs,
      costUsd: result.trace.costUsd ?? null,
    }),
    db.insert(llmLog).values({
      id: llmLogId,
      firmId: null,
      userId: null,
      promptVersion: result.trace.promptVersion,
      model: result.model ?? result.trace.model,
      inputHash: result.trace.inputHash,
      inputTokens: result.trace.tokens?.input ?? null,
      outputTokens: result.trace.tokens?.output ?? null,
      latencyMs: result.trace.latencyMs,
      costUsd: result.trace.costUsd ?? null,
      guardResult: result.trace.guardResult,
      refusalCode: result.trace.refusalCode ?? result.refusal?.code ?? null,
      success: Boolean(result.result),
      errorMsg: result.refusal?.message ?? null,
    }),
  ])

  if (!result.result) {
    const refusalCode = result.trace.refusalCode ?? result.refusal?.code ?? null
    const refusalMessage = result.refusal?.message ?? 'Pulse extract failed.'
    await repo.updateSourceSnapshotStatus(snapshotId, {
      parseStatus: 'failed',
      aiOutputId,
      // Code-prefixed so the failed-extract retry sweep can tell transient
      // failures (gateway/credit/budget — re-drivable) from deterministic ones.
      failureReason: refusalCode ? `${refusalCode}: ${refusalMessage}` : refusalMessage,
    })
    recordPulseMetric('pulse.extract.result', {
      snapshotId,
      sourceId: snapshot.sourceId,
      result: 'failed',
      refusalCode,
      confidence: null,
    })
    return { pulseId: null, status: 'failed' }
  }

  // Drift detection — verified rules that cite this source, and which of their
  // cited basis excerpts no longer appear in the changed page. `reverifyRuleIds`
  // surfaces on the alert for awareness; `driftRules` (broken citations) drive
  // the durable rule_source_drift_state gate that blocks any firm — including
  // a firm that adopts the rule later — from accepting it until it is re-verified.
  const reverifyRules = rulesBySourceId(snapshot.sourceId)
  const reverifyRuleIds = reverifyRules.map((rule) => rule.id)
  // The archived AI-input object is capped at 6000 chars (textExcerpt), so a
  // basis citation living deeper in the page (e.g. Pub. 15) would false-flag
  // as drifted and durably block rule acceptance. Compare against the FULL
  // stripped page text archived alongside the excerpt; older snapshots have
  // no `.full` sibling — fall back to the excerpt text (prior behavior).
  const fullRaw =
    reverifyRules.length > 0 ? await env.R2_PULSE.get(pulseFullTextR2Key(snapshot.rawR2Key)) : null
  const driftText = fullRaw ? await fullRaw.text() : rawText
  const driftRules = reverifyRules.filter((rule) => {
    const excerpt = ruleCitesSourceAsBasis(rule, snapshot.sourceId)
    return excerpt !== null && !sourceTextContainsExcerpt(driftText, excerpt)
  })
  const recordRuleSourceDrift = async (pulseId: string): Promise<void> => {
    const detectedAt = new Date()
    await Promise.all(
      driftRules.map((rule) =>
        repo.upsertRuleSourceDriftState({
          ruleId: rule.id,
          sourceId: snapshot.sourceId,
          snapshotId,
          pulseId,
          contentHash: snapshot.contentHash,
          excerptMatched: false,
          detectedAt,
        }),
      ),
    )
  }

  if (result.result.classification === 'no_regulatory_change') {
    // The AI saw no regulatory change, but if the page text backing a verified
    // rule's basis citation has disappeared, still raise a review_only drift
    // alert so the rule gets re-verified. Otherwise ignore as before.
    if (driftRules.length > 0) {
      const driftExcerpt =
        ruleCitesSourceAsBasis(driftRules[0]!, snapshot.sourceId) ??
        `${driftRules.length} verified rule(s) cite text no longer present in this source.`
      const created = await repo.createPulseForFirmReviewFromExtract({
        snapshotId,
        aiOutputId,
        source: snapshot.sourceId,
        sourceUrl: snapshot.officialSourceUrl,
        rawR2Key: snapshot.rawR2Key,
        publishedAt: snapshot.publishedAt,
        changeKind: 'rule_source_drift',
        actionMode: 'review_only',
        aiSummary: `Official source changed and ${driftRules.length} verified rule(s) cite text that no longer appears. Re-verify before relying on these rules.`,
        verbatimQuote: driftExcerpt,
        parsedJurisdiction: driftRules[0]!.jurisdiction,
        parsedCounties: [],
        parsedForms: [],
        parsedEntityTypes: [],
        parsedOriginalDueDate: null,
        parsedNewDueDate: null,
        parsedEffectiveFrom: null,
        parsedEffectiveUntil: null,
        affectedRuleIds: [],
        reverifyRuleIds: driftRules.map((rule) => rule.id),
        structuredChange: {
          kind: 'rule_source_drift',
          sourceId: snapshot.sourceId,
          ruleIds: driftRules.map((rule) => rule.id),
        },
        confidence: 1,
        requiresHumanReview: true,
        isSample: false,
      })
      await recordRuleSourceDrift(created.pulseId)
      recordPulseMetric('pulse.extract.result', {
        snapshotId,
        sourceId: snapshot.sourceId,
        result: 'rule_drift',
        refusalCode: null,
        confidence: result.result.confidence,
      })
      return { pulseId: created.pulseId, status: 'created' }
    }
    await repo.updateSourceSnapshotStatus(snapshotId, {
      parseStatus: 'ignored',
      aiOutputId,
      failureReason: null,
    })
    recordPulseMetric('pulse.extract.result', {
      snapshotId,
      sourceId: snapshot.sourceId,
      result: 'ignored',
      refusalCode: null,
      confidence: result.result.confidence,
    })
    return { pulseId: null, status: 'skipped' }
  }

  if (!result.result.changeKind || !result.result.actionMode) {
    await repo.updateSourceSnapshotStatus(snapshotId, {
      parseStatus: 'failed',
      aiOutputId,
      failureReason: 'Pulse extract returned a regulatory change without kind or action mode.',
    })
    return { pulseId: null, status: 'failed' }
  }

  // Scope guard: drop a dated "deadline" that is an internal agency program
  // window (grant/clinic, advisory council, job) rather than a taxpayer
  // filing/payment obligation. Triple-gated so it can't false-drop real relief:
  // disaster postponements also carry a due date and resolve to no tax area, but
  // their text matches no program keyword — that keyword gate is the separator.
  const hasParsedDueDate = Boolean(result.result.originalDueDate || result.result.newDueDate)
  const resolvesToNoTaxArea =
    taxAreasForAlert({ reverifyRuleIds, parsedForms: result.result.forms }).length === 0
  const scopeText = `${result.result.forms.join(' ')} ${result.result.summary}`
  if (hasParsedDueDate && resolvesToNoTaxArea && NON_OBLIGATION_DEADLINE_PATTERN.test(scopeText)) {
    await repo.updateSourceSnapshotStatus(snapshotId, {
      parseStatus: 'ignored',
      aiOutputId,
      failureReason: 'out_of_scope_program',
    })
    recordPulseMetric('pulse.extract.result', {
      snapshotId,
      sourceId: snapshot.sourceId,
      result: 'ignored',
      refusalCode: null,
      confidence: result.result.confidence,
    })
    return { pulseId: null, status: 'skipped' }
  }

  const latestRelevant = latestPolicyDate([
    result.result.originalDueDate,
    result.result.newDueDate,
    result.result.effectiveFrom,
    result.result.effectiveUntil,
  ])
  const keepHistoricalProtectiveWindow =
    result.result.changeKind === 'protective_claim_window' &&
    hasCurrentProtectiveActionDeadline(result.result.structuredChange, now)
  if (
    latestRelevant &&
    latestRelevant.getTime() < pulseAlertMinRelevantAt(now).getTime() &&
    !keepHistoricalProtectiveWindow
  ) {
    await repo.updateSourceSnapshotStatus(snapshotId, {
      parseStatus: 'ignored',
      aiOutputId,
      failureReason: 'historical_policy_dates',
    })
    recordPulseMetric('pulse.extract.result', {
      snapshotId,
      sourceId: snapshot.sourceId,
      result: 'ignored',
      refusalCode: null,
      confidence: result.result.confidence,
    })
    return { pulseId: null, status: 'skipped' }
  }

  // Confidence floor: drop near-zero-confidence extracts outright. These are
  // almost always non-events the model failed to mark no_regulatory_change.
  if (result.result.confidence < PULSE_MIN_ALERT_CONFIDENCE) {
    await repo.updateSourceSnapshotStatus(snapshotId, {
      parseStatus: 'ignored',
      aiOutputId,
      failureReason: 'low_confidence',
    })
    recordPulseMetric('pulse.extract.result', {
      snapshotId,
      sourceId: snapshot.sourceId,
      result: 'ignored',
      refusalCode: null,
      confidence: result.result.confidence,
    })
    return { pulseId: null, status: 'skipped' }
  }

  // Email-sourced snapshots never auto-approve: a crafted email matched to an
  // official source could otherwise mint a high-confidence deadline_shift that
  // fans out to firms. Same sourceId via web fetch keeps today's behavior.
  const isEmailSourced = snapshot.ingestMethod === 'inbound_email'
  const actionMode =
    isEmailSourced ||
    shouldForceReviewOnlyPulseAlert({
      sourceId: snapshot.sourceId,
      changeKind: result.result.changeKind,
    })
      ? 'review_only'
      : result.result.actionMode
  const parsedJurisdiction = normalizeExtractJurisdiction(
    snapshot.sourceId,
    result.result.jurisdiction,
  )
  const parsedOriginalDueDate = nullableDateFromIsoDate(result.result.originalDueDate)
  const parsedNewDueDate = nullableDateFromIsoDate(result.result.newDueDate)
  const parsedEffectiveUntil = nullableDateFromIsoDate(result.result.effectiveUntil)
  // Promote the protective-claim action deadline into its own column so the
  // still-actionable predicate and deadline sorting see it (review_only alerts
  // leave parsedNewDueDate / parsedEffectiveUntil NULL). Only this change kind
  // emits actionDeadline, but gate explicitly to match the column's semantics.
  const protectiveActionDeadline =
    result.result.changeKind === 'protective_claim_window'
      ? protectiveActionDeadlineFromStructuredChange(result.result.structuredChange)
      : null
  // Backfill-seeded snapshots (months-old announcements still in effect) route
  // their pulses through the quiet fan-out: impact-scoped origin='catchup'
  // rows, no digest emails / notifications — state, not news.
  const fanOutMode = snapshot.ingestMethod === 'backfill_seed' ? ('quiet' as const) : undefined
  // Matchability gate (universal since 2026-06-11, was backfill-only): a
  // due_date_overlay alert without the original due date can never match an
  // obligation (the fan-out matcher pins currentDueDate ==
  // parsedOriginalDueDate) and never expires (the read-time predicate treats
  // NULL dates as evergreen) — an un-dismissable forever-row that drives
  // nothing. Quarantine instead of approve OR drop: the fields are preserved,
  // and a richer re-observation of the same event either promotes it via the
  // dedupe fold or lands as its own dated, approved pulse.
  const datelessOverlay = actionMode === 'due_date_overlay' && parsedOriginalDueDate === null
  // Restatement backstop: an overlay whose own summary + excerpt carry no
  // change language is a standing-deadline restatement the prompt's decision
  // test should have classified no_regulatory_change. Degrade, don't trust.
  const restatementOverlay =
    actionMode === 'due_date_overlay' &&
    !looksLikeDueDateChange(`${result.result.summary} ${result.result.sourceExcerpt}`)
  // Date grounding: every load-bearing parsed date must be locatable in the
  // source text the model read. The excerpt guard only proves the QUOTE
  // exists — a hallucinated or misread date sails through it and would drive
  // a wrong deadline overlay. effective_from is deliberately not checked
  // (models legitimately infer it from publication context); the four dates
  // below feed the matcher, the apply flow, and the expiry predicate.
  const ungroundedDates = ungroundedAlertDates(rawText, [
    ['original_due_date', parsedOriginalDueDate],
    ['new_due_date', parsedNewDueDate],
    ['effective_until', parsedEffectiveUntil],
    ['protective_action_deadline', protectiveActionDeadline],
  ])
  // Low-confidence extracts land quarantined. The same band decides whether a
  // duplicate fold should promote a quarantined survivor (see
  // applyDuplicateExtractToPulse).
  const pulseStatus =
    isEmailSourced ||
    result.result.confidence < PULSE_PUBLISH_CONFIDENCE ||
    datelessOverlay ||
    restatementOverlay ||
    ungroundedDates.length > 0
      ? ('quarantined' as const)
      : ('approved' as const)
  if (datelessOverlay || restatementOverlay || ungroundedDates.length > 0) {
    recordPulseMetric('pulse.extract.grounding_quarantined', {
      snapshotId,
      sourceId: snapshot.sourceId,
      datelessOverlay,
      restatementOverlay,
      ungroundedDates: ungroundedDates.join(',') || null,
    })
  }

  const duplicatePulseId = await repo.findDuplicatePulseForExtract({
    publishedAt: snapshot.publishedAt,
    sourceUrl: snapshot.officialSourceUrl,
    parsedJurisdiction,
    parsedCounties: result.result.counties,
    parsedForms: result.result.forms,
    parsedEntityTypes: result.result.entityTypes,
    parsedOriginalDueDate,
    parsedNewDueDate: nullableDateFromIsoDate(result.result.newDueDate),
    changeKind: result.result.changeKind,
    actionMode,
  })
  if (duplicatePulseId) {
    await repo.mergeReverifyRuleIdsIntoPulse(duplicatePulseId, reverifyRuleIds)
    // Fold-merge before the counts refresh: promote a system-quarantined
    // survivor when this extract clears the publish floor, and union any
    // newly-named counties so the refresh below sees them.
    const fold = await repo.applyDuplicateExtractToPulse({
      pulseId: duplicatePulseId,
      incomingStatus: pulseStatus,
      confidence: result.result.confidence,
      parsedCounties: result.result.counties,
      ...(fanOutMode ? { fanOutMode } : {}),
    })
    // Promotion already ran the full first-publication fan-out (+ messages).
    const alertCount = fold.promoted
      ? fold.alertCount
      : await repo.refreshFirmAlertsForApprovedPulse(duplicatePulseId)
    await recordRuleSourceDrift(duplicatePulseId)
    await repo.updateSourceSnapshotStatus(snapshotId, {
      parseStatus: 'duplicate',
      pulseId: duplicatePulseId,
      aiOutputId,
      failureReason: null,
    })
    recordPulseMetric('pulse.extract.result', {
      snapshotId,
      sourceId: snapshot.sourceId,
      result: 'duplicate',
      refusalCode: null,
      confidence: result.result.confidence,
      alertCount,
    })
    return { pulseId: duplicatePulseId, status: 'skipped' }
  }

  const created = await repo.createPulseForFirmReviewFromExtract({
    snapshotId,
    aiOutputId,
    source: snapshot.sourceId,
    sourceUrl: snapshot.officialSourceUrl,
    rawR2Key: snapshot.rawR2Key,
    publishedAt: snapshot.publishedAt,
    changeKind: result.result.changeKind,
    actionMode,
    aiSummary: result.result.summary,
    verbatimQuote: result.result.sourceExcerpt,
    parsedJurisdiction,
    parsedCounties: result.result.counties,
    parsedForms: result.result.forms,
    parsedEntityTypes: result.result.entityTypes,
    parsedOriginalDueDate,
    parsedNewDueDate,
    parsedEffectiveFrom: nullableDateFromIsoDate(result.result.effectiveFrom),
    parsedEffectiveUntil,
    protectiveActionDeadline,
    affectedRuleIds: result.result.affectedRuleIds,
    reverifyRuleIds,
    structuredChange: result.result.structuredChange,
    confidence: result.result.confidence,
    requiresHumanReview: true,
    isSample: false,
    // Race-safe canonical de-duplication for AI extracts. Low-confidence items
    // land quarantined (retained for review, never fanned out).
    dedupe: true,
    status: pulseStatus,
    ...(fanOutMode ? { fanOutMode } : {}),
  })

  // The unique dedupe key caught a sibling/cross-feed extraction of the same
  // event that the signature pre-check missed — fold onto the survivor exactly
  // like the explicit duplicate branch above.
  if (created.deduped) {
    await repo.mergeReverifyRuleIdsIntoPulse(created.pulseId, reverifyRuleIds)
    const fold = await repo.applyDuplicateExtractToPulse({
      pulseId: created.pulseId,
      incomingStatus: pulseStatus,
      confidence: result.result.confidence,
      parsedCounties: result.result.counties,
      ...(fanOutMode ? { fanOutMode } : {}),
    })
    if (!fold.promoted) await repo.refreshFirmAlertsForApprovedPulse(created.pulseId)
    await recordRuleSourceDrift(created.pulseId)
    recordPulseMetric('pulse.extract.result', {
      snapshotId,
      sourceId: snapshot.sourceId,
      result: 'duplicate',
      refusalCode: null,
      confidence: result.result.confidence,
    })
    return { pulseId: created.pulseId, status: 'skipped' }
  }

  await recordRuleSourceDrift(created.pulseId)

  recordPulseMetric('pulse.extract.result', {
    snapshotId,
    sourceId: snapshot.sourceId,
    result: 'created',
    refusalCode: null,
    confidence: result.result.confidence,
  })
  if (result.result.confidence < PULSE_PUBLISH_CONFIDENCE) {
    recordPulseAlert('pulse.extract.low_confidence', {
      snapshotId,
      sourceId: snapshot.sourceId,
      confidence: result.result.confidence,
    })
  }
  return { pulseId: created.pulseId, status: 'created' }
}
