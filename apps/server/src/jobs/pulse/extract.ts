import { createAI } from '@duedatehq/ai'
import { createDb, makePulseOpsRepo } from '@duedatehq/db'
import { aiOutput, llmLog } from '@duedatehq/db/schema/ai'
import type { Env } from '../../env'
import { recordPulseAlert, recordPulseMetric } from './metrics'
import { requiresReviewOnlyPulseAlert } from './rule-source-adapters'

type PulseExtractRepo = Pick<
  ReturnType<typeof makePulseOpsRepo>,
  | 'getSourceSnapshot'
  | 'updateSourceSnapshotStatus'
  | 'findDuplicatePulseForExtract'
  | 'createPulseForFirmReviewFromExtract'
>

function makePulseExtractRepo(db: ReturnType<typeof createDb>): PulseExtractRepo {
  const repo = makePulseOpsRepo(db)
  return {
    getSourceSnapshot: (snapshotId) => repo.getSourceSnapshot(snapshotId),
    updateSourceSnapshotStatus: (snapshotId, patch) =>
      repo.updateSourceSnapshotStatus(snapshotId, patch),
    findDuplicatePulseForExtract: (input) => repo.findDuplicatePulseForExtract(input),
    createPulseForFirmReviewFromExtract: (input) => repo.createPulseForFirmReviewFromExtract(input),
  }
}

function dateFromIsoDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`)
}

function nullableDateFromIsoDate(value: string | null): Date | null {
  return value ? dateFromIsoDate(value) : null
}

function hasCompleteDueDateOverlayEvidence(result: {
  changeKind: string | null
  actionMode: string | null
  originalDueDate: string | null
  newDueDate: string | null
  jurisdiction: string | null
}): boolean {
  return (
    result.changeKind === 'deadline_shift' &&
    result.actionMode === 'due_date_overlay' &&
    Boolean(result.originalDueDate) &&
    Boolean(result.newDueDate) &&
    Boolean(result.jurisdiction)
  )
}

export async function extractPulseSnapshot(
  env: Pick<
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
  >,
  snapshotId: string,
): Promise<{ pulseId: string | null; status: 'created' | 'failed' | 'missing' | 'skipped' }> {
  const db = createDb(env.DB)
  const repo = makePulseExtractRepo(db)
  const snapshot = await repo.getSourceSnapshot(snapshotId)
  if (!snapshot) return { pulseId: null, status: 'missing' }
  if (snapshot.pulseId || snapshot.parseStatus === 'extracted') {
    return { pulseId: snapshot.pulseId, status: 'skipped' }
  }
  if (snapshot.parseStatus !== 'pending_extract' && snapshot.parseStatus !== 'failed') {
    return { pulseId: null, status: 'skipped' }
  }

  await repo.updateSourceSnapshotStatus(snapshotId, { parseStatus: 'extracting' })
  const raw = await env.R2_PULSE.get(snapshot.rawR2Key)
  if (!raw) {
    await repo.updateSourceSnapshotStatus(snapshotId, {
      parseStatus: 'failed',
      failureReason: 'Raw Pulse snapshot is missing from R2.',
    })
    return { pulseId: null, status: 'failed' }
  }

  const rawText = await raw.text()
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

  if (result.result.classification === 'no_regulatory_change') {
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

  const actionMode =
    requiresReviewOnlyPulseAlert(snapshot.sourceId) ||
    (result.result.actionMode === 'due_date_overlay' &&
      !hasCompleteDueDateOverlayEvidence(result.result))
      ? 'review_only'
      : result.result.actionMode

  const duplicatePulseId = await repo.findDuplicatePulseForExtract({
    publishedAt: snapshot.publishedAt,
    sourceUrl: snapshot.officialSourceUrl,
    parsedJurisdiction: result.result.jurisdiction,
    parsedCounties: result.result.counties,
    parsedForms: result.result.forms,
    parsedEntityTypes: result.result.entityTypes,
    parsedOriginalDueDate: nullableDateFromIsoDate(result.result.originalDueDate),
    parsedNewDueDate: nullableDateFromIsoDate(result.result.newDueDate),
    changeKind: result.result.changeKind,
    actionMode,
  })
  if (duplicatePulseId) {
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
    parsedJurisdiction: result.result.jurisdiction,
    parsedCounties: result.result.counties,
    parsedForms: result.result.forms,
    parsedEntityTypes: result.result.entityTypes,
    parsedOriginalDueDate: nullableDateFromIsoDate(result.result.originalDueDate),
    parsedNewDueDate: nullableDateFromIsoDate(result.result.newDueDate),
    parsedEffectiveFrom: nullableDateFromIsoDate(result.result.effectiveFrom),
    parsedEffectiveUntil: nullableDateFromIsoDate(result.result.effectiveUntil),
    affectedRuleIds: result.result.affectedRuleIds,
    structuredChange: result.result.structuredChange,
    confidence: result.result.confidence,
    requiresHumanReview: true,
    isSample: false,
  })

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
