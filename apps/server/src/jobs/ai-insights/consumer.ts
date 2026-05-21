import { createAI } from '@duedatehq/ai'
import type { BillingPlan } from '@duedatehq/core/plan-entitlements'
import { createDb, firmSchema, scoped } from '@duedatehq/db'
import {
  AiInsightCitationSchema,
  AiInsightSectionSchema,
  type AiInsightCitation,
  type AiInsightKind,
  type AiInsightSection,
} from '@duedatehq/contracts'
import { eq } from 'drizzle-orm'
import * as z from 'zod'
import type { Env } from '../../env'
import { isAiInsightRefreshMessage, type AiInsightRefreshMessage } from './message'

const INSIGHT_TTL_MS = 24 * 60 * 60 * 1000

const InsightOutputSchema = z.object({
  sections: z.array(AiInsightSectionSchema).min(1).max(4),
})

type InsightOutput = z.infer<typeof InsightOutputSchema>
type ScopedRepos = ReturnType<typeof scoped>

interface InsightSource {
  ref: number
  obligationId: string | null
  label: string
  facts: Record<string, unknown>
  evidence: AiInsightCitation['evidence']
}

function dateInTimezone(timezone: string, date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value
  return `${year}-${month}-${day}`
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10)
}

async function hashValue(value: unknown): Promise<string> {
  const data = new TextEncoder().encode(JSON.stringify(value))
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function safeUrl(value: string | null): string | null {
  if (!value) return null
  const parsed = z.url().safeParse(value)
  return parsed.success ? parsed.data : null
}

function citationEvidence(
  row:
    | {
        id: string
        sourceType: string
        sourceId: string | null
        sourceUrl: string | null
      }
    | null
    | undefined,
): AiInsightCitation['evidence'] {
  if (!row) return null
  return {
    id: row.id,
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    sourceUrl: safeUrl(row.sourceUrl),
  }
}

function citationsFromSources(sources: InsightSource[]): AiInsightCitation[] {
  return sources.map((source) =>
    AiInsightCitationSchema.parse({
      ref: source.ref,
      obligationId: source.obligationId,
      evidence: source.evidence,
    }),
  )
}

async function loadFirmContext(
  env: Env,
  firmId: string,
): Promise<{ timezone: string; plan: BillingPlan } | null> {
  const db = createDb(env.DB)
  const [firm] = await db
    .select({ timezone: firmSchema.firmProfile.timezone, plan: firmSchema.firmProfile.plan })
    .from(firmSchema.firmProfile)
    .where(eq(firmSchema.firmProfile.id, firmId))
    .limit(1)
  return firm ?? null
}

async function buildClientRiskSnapshot(
  repos: ScopedRepos,
  clientId: string,
  asOfDate: string,
): Promise<{ snapshot: unknown; sources: InsightSource[] } | null> {
  const client = await repos.clients.findById(clientId)
  if (!client) return null

  const obligations = await repos.obligations.listByClient(clientId)
  const obligationQueueRows = await repos.obligationQueue.listByIds(
    obligations.map((obligation) => obligation.id),
    { asOfDate },
  )
  const topRows = obligationQueueRows.slice(0, 5)
  const evidenceRows = await Promise.all(
    topRows.map((row) => repos.evidence.listByObligation(row.id)),
  )

  const snapshot = {
    asOfDate,
    client: {
      id: client.id,
      name: client.name,
      state: client.state,
      county: client.county,
      entityType: client.entityType,
      importanceWeight: client.importanceWeight,
      lateFilingCountLast12mo: client.lateFilingCountLast12mo,
      estimatedTaxLiabilityCents: client.estimatedTaxLiabilityCents,
      equityOwnerCount: client.equityOwnerCount,
    },
    obligations: topRows.map((row) => ({
      id: row.id,
      taxType: row.taxType,
      currentDueDate: toDateOnly(row.currentDueDate),
      status: row.status,
      readiness: row.readiness,
      evidenceCount: row.evidenceCount,
      smartPriority: row.smartPriority,
    })),
  }

  const sources: InsightSource[] = [
    {
      ref: 1,
      obligationId: null,
      label: 'Client risk profile',
      facts: snapshot.client,
      evidence: null,
    },
    ...topRows.map(
      (row, index): InsightSource => ({
        ref: index + 2,
        obligationId: row.id,
        label: `${row.taxType} deadline`,
        facts: snapshot.obligations[index] ?? {},
        evidence: citationEvidence(evidenceRows[index]?.[0] ?? null),
      }),
    ),
  ]

  return { snapshot, sources }
}

async function buildDeadlineTipSnapshot(
  repos: ScopedRepos,
  obligationId: string,
  asOfDate: string,
): Promise<{ snapshot: unknown; sources: InsightSource[] } | null> {
  const obligation = await repos.obligations.findById(obligationId)
  if (!obligation) return null
  const [client, obligationQueueRows, evidenceRows] = await Promise.all([
    repos.clients.findById(obligation.clientId),
    repos.obligationQueue.listByIds([obligationId], { asOfDate }),
    repos.evidence.listByObligation(obligationId),
  ])
  if (!client) return null

  const obligationQueueRow = obligationQueueRows[0]
  const obligationFacts = {
    id: obligation.id,
    taxType: obligation.taxType,
    taxYear: obligation.taxYear,
    currentDueDate: obligationQueueRow
      ? toDateOnly(obligationQueueRow.currentDueDate)
      : toDateOnly(obligation.currentDueDate),
    status: obligation.status,
    readiness: obligation.readiness,
    evidenceCount: evidenceRows.length,
    smartPriority: obligationQueueRow?.smartPriority ?? null,
    extensionDecision: obligation.extensionDecision,
  }
  const clientFacts = {
    id: client.id,
    name: client.name,
    state: client.state,
    county: client.county,
    entityType: client.entityType,
    importanceWeight: client.importanceWeight,
    lateFilingCountLast12mo: client.lateFilingCountLast12mo,
  }
  const snapshot = {
    asOfDate,
    client: clientFacts,
    obligation: obligationFacts,
    evidence: evidenceRows.slice(0, 4).map((row) => ({
      id: row.id,
      sourceType: row.sourceType,
      sourceId: row.sourceId,
      sourceUrl: safeUrl(row.sourceUrl),
      rawValue: row.rawValue,
      normalizedValue: row.normalizedValue,
      appliedAt: row.appliedAt.toISOString(),
    })),
  }
  const sources: InsightSource[] = [
    {
      ref: 1,
      obligationId,
      label: 'Deadline record',
      facts: obligationFacts,
      evidence: null,
    },
    {
      ref: 2,
      obligationId: null,
      label: 'Client risk profile',
      facts: clientFacts,
      evidence: null,
    },
    ...evidenceRows.slice(0, 4).map(
      (row, index): InsightSource => ({
        ref: index + 3,
        obligationId,
        label: `Evidence ${index + 1}`,
        facts: {
          sourceType: row.sourceType,
          sourceId: row.sourceId,
          rawValue: row.rawValue,
          normalizedValue: row.normalizedValue,
        },
        evidence: citationEvidence(row),
      }),
    ),
  ]

  return { snapshot, sources }
}

function promptNameForKind(kind: AiInsightKind) {
  return kind === 'client_risk_summary' ? 'client-risk-summary@v1' : 'deadline-tip@v1'
}

function aiRunKind(kind: AiInsightKind): 'summary' | 'tip' {
  return kind === 'client_risk_summary' ? 'summary' : 'tip'
}

function expectedSectionKeys(kind: AiInsightKind): string[] {
  return kind === 'deadline_tip' ? ['what', 'why', 'prepare'] : ['risk', 'drivers', 'next_step']
}

function normalizeSections(kind: AiInsightKind, output: InsightOutput): AiInsightSection[] {
  const expected = new Set(expectedSectionKeys(kind))
  return output.sections.filter((section) => expected.has(section.key))
}

export async function consumeAiInsightRefresh(body: unknown, env: Env): Promise<void> {
  if (!isAiInsightRefreshMessage(body)) return
  await refreshAiInsight(body, env)
}

async function refreshAiInsight(message: AiInsightRefreshMessage, env: Env): Promise<void> {
  const firm = await loadFirmContext(env, message.firmId)
  if (!firm) return

  const asOfDate = message.asOfDate ?? dateInTimezone(firm.timezone)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + INSIGHT_TTL_MS)
  const db = createDb(env.DB)
  const repos = scoped(db, message.firmId)
  const built =
    message.kind === 'client_risk_summary'
      ? await buildClientRiskSnapshot(repos, message.subjectId, asOfDate)
      : await buildDeadlineTipSnapshot(repos, message.subjectId, asOfDate)
  if (!built) return

  const inputHash = await hashValue(built.snapshot)
  const existing = await repos.aiInsights.findByHash({
    kind: message.kind,
    subjectType: message.subjectType,
    subjectId: message.subjectId,
    asOfDate,
    inputHash,
    statuses: ['ready', 'pending'],
    now,
  })
  if (existing) return

  const previous = await repos.aiInsights.findLatest({
    kind: message.kind,
    subjectType: message.subjectType,
    subjectId: message.subjectId,
    asOfDate,
    now,
  })
  const pending = await repos.aiInsights.createPending({
    kind: message.kind,
    subjectType: message.subjectType,
    subjectId: message.subjectId,
    asOfDate,
    inputHash,
    reason: message.reason,
    output: previous?.output ?? undefined,
    citations: previous?.citations ?? undefined,
    generatedAt: previous?.generatedAt ?? null,
    expiresAt: previous?.expiresAt ?? null,
    now,
  })

  try {
    if (built.sources.length === 0) {
      await repos.aiInsights.markFailed(pending.id, {
        errorCode: 'EMPTY_RETRIEVAL',
        generatedAt: now,
        expiresAt,
      })
      return
    }

    const citations = citationsFromSources(built.sources)
    const ai = createAI(env)
    const aiInput = {
      snapshot: built.snapshot,
      sources: built.sources.map((source) => ({
        ref: source.ref,
        label: source.label,
        obligationId: source.obligationId,
        facts: source.facts,
        evidence: source.evidence,
      })),
    }
    const aiResult = await ai.runPrompt(
      promptNameForKind(message.kind),
      aiInput,
      InsightOutputSchema,
      { plan: firm.plan, firmId: message.firmId, taskKind: 'insight' },
    )

    if (aiResult.refusal || !aiResult.result) {
      const recorded = await repos.ai.recordRun({
        userId: null,
        kind: aiRunKind(message.kind),
        inputContextRef: `${message.kind}:${message.subjectId}:${asOfDate}`,
        trace: {
          ...aiResult.trace,
          model: aiResult.model ?? aiResult.trace.model,
        },
        outputText: null,
        citations,
        errorMsg: aiResult.refusal?.message ?? 'AI insight generation failed.',
      })
      await repos.aiInsights.markFailed(pending.id, {
        aiOutputId: recorded.aiOutputId,
        errorCode: aiResult.refusal?.code ?? 'AI_INSIGHT_FAILED',
        generatedAt: now,
        expiresAt,
      })
      return
    }

    const sections = normalizeSections(message.kind, aiResult.result)
    const guardError =
      sections.length !== expectedSectionKeys(message.kind).length
        ? 'INSIGHT_SECTION_MISMATCH'
        : null
    const recorded = await repos.ai.recordRun({
      userId: null,
      kind: aiRunKind(message.kind),
      inputContextRef: `${message.kind}:${message.subjectId}:${asOfDate}`,
      trace: {
        ...aiResult.trace,
        model: aiResult.model ?? aiResult.trace.model,
        ...(guardError ? { guardResult: 'guard_rejected', refusalCode: guardError } : {}),
      },
      outputText: JSON.stringify(aiResult.result),
      citations,
      errorMsg: guardError,
    })

    if (guardError) {
      await repos.aiInsights.markFailed(pending.id, {
        aiOutputId: recorded.aiOutputId,
        errorCode: guardError,
        generatedAt: now,
        expiresAt,
      })
      return
    }

    await repos.aiInsights.markReady(pending.id, {
      aiOutputId: recorded.aiOutputId,
      output: { sections },
      citations,
      generatedAt: now,
      expiresAt,
    })
  } catch (cause) {
    await repos.aiInsights.markFailed(pending.id, {
      errorCode: 'AI_INSIGHT_EXCEPTION',
      generatedAt: now,
      expiresAt,
    })
    throw cause
  }
}
