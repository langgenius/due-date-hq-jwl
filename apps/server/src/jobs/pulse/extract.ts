import { createAI } from '@duedatehq/ai'
import { ruleCitesSourceAsBasis, rulesBySourceId } from '@duedatehq/core/rules'
import { createDb, makePulseOpsRepo } from '@duedatehq/db'
import { aiOutput, llmLog } from '@duedatehq/db/schema/ai'
import type { Env } from '../../env'
import { sourceTextContainsExcerpt } from '../../procedures/rules/concrete-draft'
import { extractCanonicalEmailText } from './email-artifact'
import { recordPulseAlert, recordPulseMetric } from './metrics'
import { isThresholdAdvisorySource, shouldForceReviewOnlyPulseAlert } from './rule-source-adapters'

type PulseExtractRepo = Pick<
  ReturnType<typeof makePulseOpsRepo>,
  | 'getSourceSnapshot'
  | 'updateSourceSnapshotStatus'
  | 'findDuplicatePulseForExtract'
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
// alert when every parsed policy date is before this floor. Items with no parsed
// date are kept (no evidence they are historical). Bump the year to raise the floor.
const PULSE_ALERT_MIN_RELEVANT_AT = new Date('2026-01-01T00:00:00.000Z')

function latestPolicyDate(values: ReadonlyArray<string | null>): Date | null {
  const times = values
    .map(nullableDateFromIsoDate)
    .filter((date): date is Date => date !== null)
    .map((date) => date.getTime())
  return times.length > 0 ? new Date(Math.max(...times)) : null
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
    return await runPulseExtractionAfterMark(env, db, repo, snapshot, snapshotId)
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
    await repo.updateSourceSnapshotStatus(snapshotId, {
      parseStatus: 'failed',
      aiOutputId,
      failureReason: result.refusal?.message ?? 'Pulse extract failed.',
    })
    recordPulseMetric('pulse.extract.result', {
      snapshotId,
      sourceId: snapshot.sourceId,
      result: 'failed',
      refusalCode: result.trace.refusalCode ?? result.refusal?.code ?? null,
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
  const driftRules = reverifyRules.filter((rule) => {
    const excerpt = ruleCitesSourceAsBasis(rule, snapshot.sourceId)
    return excerpt !== null && !sourceTextContainsExcerpt(rawText, excerpt)
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

  const latestRelevant = latestPolicyDate([
    result.result.originalDueDate,
    result.result.newDueDate,
    result.result.effectiveFrom,
    result.result.effectiveUntil,
  ])
  if (latestRelevant && latestRelevant.getTime() < PULSE_ALERT_MIN_RELEVANT_AT.getTime()) {
    await repo.updateSourceSnapshotStatus(snapshotId, {
      parseStatus: 'ignored',
      aiOutputId,
      failureReason: 'historical_pre_2026',
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

  const actionMode = shouldForceReviewOnlyPulseAlert({
    sourceId: snapshot.sourceId,
    changeKind: result.result.changeKind,
  })
    ? 'review_only'
    : result.result.actionMode
  const parsedJurisdiction = normalizeExtractJurisdiction(
    snapshot.sourceId,
    result.result.jurisdiction,
  )

  const duplicatePulseId = await repo.findDuplicatePulseForExtract({
    publishedAt: snapshot.publishedAt,
    sourceUrl: snapshot.officialSourceUrl,
    parsedJurisdiction,
    parsedCounties: result.result.counties,
    parsedForms: result.result.forms,
    parsedEntityTypes: result.result.entityTypes,
    parsedOriginalDueDate: nullableDateFromIsoDate(result.result.originalDueDate),
    parsedNewDueDate: nullableDateFromIsoDate(result.result.newDueDate),
    changeKind: result.result.changeKind,
    actionMode,
  })
  if (duplicatePulseId) {
    const alertCount = await repo.refreshFirmAlertsForApprovedPulse(duplicatePulseId)
    await repo.mergeReverifyRuleIdsIntoPulse(duplicatePulseId, reverifyRuleIds)
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
    parsedOriginalDueDate: nullableDateFromIsoDate(result.result.originalDueDate),
    parsedNewDueDate: nullableDateFromIsoDate(result.result.newDueDate),
    parsedEffectiveFrom: nullableDateFromIsoDate(result.result.effectiveFrom),
    parsedEffectiveUntil: nullableDateFromIsoDate(result.result.effectiveUntil),
    affectedRuleIds: result.result.affectedRuleIds,
    reverifyRuleIds,
    structuredChange: result.result.structuredChange,
    confidence: result.result.confidence,
    requiresHumanReview: true,
    isSample: false,
  })
  await recordRuleSourceDrift(created.pulseId)

  recordPulseMetric('pulse.extract.result', {
    snapshotId,
    sourceId: snapshot.sourceId,
    result: 'created',
    refusalCode: null,
    confidence: result.result.confidence,
  })
  if (result.result.confidence < 0.5) {
    recordPulseAlert('pulse.extract.low_confidence', {
      snapshotId,
      sourceId: snapshot.sourceId,
      confidence: result.result.confidence,
    })
  }
  return { pulseId: created.pulseId, status: 'created' }
}
