import { createAI } from '@duedatehq/ai'
import type { BillingPlan } from '@duedatehq/core/plan-entitlements'
import { createDb, firmSchema, scoped } from '@duedatehq/db'
import { eq } from 'drizzle-orm'
import * as z from 'zod'
import type { Env } from '../../env'
import { isDashboardBriefRefreshMessage, type DashboardBriefRefreshMessage } from './message'

const BRIEF_TTL_MS = 24 * 60 * 60 * 1000

const BriefOutputSchema = z.object({
  headline: z.string().min(1).max(180),
  items: z
    .array(
      z.object({
        obligationId: z.string().min(1),
        summary: z.string().min(1).max(280),
        nextCheck: z.string().min(1).max(220),
        citationRefs: z.array(z.number().int().min(1)).min(1).max(4),
      }),
    )
    .min(1)
    .max(5),
  footer: z.string().max(180).optional(),
})

type BriefOutput = z.infer<typeof BriefOutputSchema>

interface BriefSource {
  ref: number
  obligationId: string
  clientPlaceholder: string
  clientName: string
  taxType: string
  dueDate: string
  status: string
  severity: string
  evidence: {
    id: string | null
    sourceType: string
    sourceUrl: string | null
    sourceId: string | null
  } | null
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

async function hashValue(value: unknown): Promise<string> {
  const data = new TextEncoder().encode(JSON.stringify(value))
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function stableSnapshot(
  input: Awaited<ReturnType<ReturnType<typeof scoped>['dashboard']['load']>>,
) {
  return {
    asOfDate: input.asOfDate,
    windowDays: input.windowDays,
    summary: input.summary,
    topRows: input.topRows.map((row) => ({
      obligationId: row.obligationId,
      clientId: row.clientId,
      clientName: row.clientName,
      taxType: row.taxType,
      currentDueDate: row.currentDueDate.toISOString().slice(0, 10),
      status: row.status,
      severity: row.severity,
      evidenceCount: row.evidenceCount,
      primaryEvidence: row.primaryEvidence
        ? {
            sourceType: row.primaryEvidence.sourceType,
            id: row.primaryEvidence.id,
            sourceId: row.primaryEvidence.sourceId,
            sourceUrl: row.primaryEvidence.sourceUrl,
          }
        : null,
    })),
  }
}

function buildSources(snapshot: ReturnType<typeof stableSnapshot>): BriefSource[] {
  return snapshot.topRows.slice(0, 5).map((row, index) => ({
    ref: index + 1,
    obligationId: row.obligationId,
    clientPlaceholder: `{{client_${index + 1}}}`,
    clientName: row.clientName,
    taxType: row.taxType,
    dueDate: row.currentDueDate,
    status: row.status,
    severity: row.severity,
    evidence: row.primaryEvidence,
  }))
}

function replacePlaceholders(value: string, sources: BriefSource[]): string {
  let output = value
  for (const source of sources) {
    output = output.split(source.clientPlaceholder).join(source.clientName)
  }
  return output
}

function validateBriefOutput(output: BriefOutput, sources: BriefSource[]): string | null {
  const sourceRefs = new Set(sources.map((source) => source.ref))
  const obligationIds = new Set(sources.map((source) => source.obligationId))
  const banned = /\b(AI confirmed|guaranteed|no penalty will apply|qualifies for relief)\b/i

  if (banned.test(output.headline) || (output.footer && banned.test(output.footer))) {
    return 'brief_guard_rejected'
  }

  for (const item of output.items) {
    if (!obligationIds.has(item.obligationId)) return 'brief_obligation_oob'
    if (banned.test(item.summary) || banned.test(item.nextCheck)) return 'brief_guard_rejected'
    if (!item.citationRefs.every((ref) => sourceRefs.has(ref))) return 'brief_citation_oob'
  }

  return null
}

function formatBriefText(output: BriefOutput, sources: BriefSource[]): string {
  const lines = [replacePlaceholders(output.headline, sources)]
  for (const [index, item] of output.items.entries()) {
    const refs = item.citationRefs.map((ref) => `[${ref}]`).join(' ')
    const summary = replacePlaceholders(item.summary, sources)
    const nextCheck = replacePlaceholders(item.nextCheck, sources)
    lines.push(`${index + 1}. ${summary} Next: ${nextCheck} ${refs}`)
  }
  if (output.footer) lines.push(replacePlaceholders(output.footer, sources))
  return lines.join('\n')
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

export async function consumeDashboardBriefRefresh(body: unknown, env: Env): Promise<void> {
  if (!isDashboardBriefRefreshMessage(body)) return
  await refreshDashboardBrief(body, env)
}

async function refreshDashboardBrief(
  message: DashboardBriefRefreshMessage,
  env: Env,
): Promise<void> {
  // 2026-06-10 (firm-scope Today line went deterministic): the Everyone
  // view no longer renders an AI sentence, so firm-scope briefs are never
  // displayed. Drop the work at the consumer — the data-change enqueues
  // scattered across client/obligation procedures become cheap no-ops
  // without touching each callsite. Personal ('me') briefs still
  // self-heal on view.
  if (message.scope === 'firm') return
  const firm = await loadFirmContext(env, message.firmId)
  if (!firm) return

  const asOfDate = message.asOfDate ?? dateInTimezone(firm.timezone)
  const now = new Date()
  const db = createDb(env.DB)
  const repo = scoped(db, message.firmId)
  // `scope` also filters the row snapshot (not just the brief lookup), so
  // a 'me' brief narrates the member's own queue — assigned-to-them plus
  // unassigned — never the whole firm's.
  const snapshotResult = await repo.dashboard.load({
    asOfDate,
    windowDays: 7,
    topLimit: 8,
    scope: message.scope,
    scopeUserId: message.userId ?? null,
  })
  const snapshot = stableSnapshot(snapshotResult)
  const inputHash = await hashValue(snapshot)
  const existing = await repo.dashboard.findBriefByHash({
    scope: message.scope,
    asOfDate,
    inputHash,
    userId: message.userId ?? null,
    statuses: ['ready', 'pending'],
    now,
  })
  if (existing) return

  const pending = await repo.dashboard.createBriefPending({
    scope: message.scope,
    userId: message.userId ?? null,
    asOfDate,
    inputHash,
    reason: message.reason,
    now,
  })
  const expiresAt = new Date(now.getTime() + BRIEF_TTL_MS)

  try {
    if (snapshot.topRows.length === 0) {
      await repo.dashboard.markBriefReady(pending.id, {
        summaryText: 'No open deadline risks are currently in the Dashboard window.',
        topObligationIds: [],
        citations: [],
        generatedAt: now,
        expiresAt,
      })
      return
    }

    const sources = buildSources(snapshot)
    const ai = createAI(env)
    const aiInput = {
      asOfDate,
      summary: snapshot.summary,
      sources: sources.map((source) => ({
        ref: source.ref,
        obligationId: source.obligationId,
        client: source.clientPlaceholder,
        taxType: source.taxType,
        dueDate: source.dueDate,
        status: source.status,
        severity: source.severity,
        evidence: source.evidence
          ? {
              sourceType: source.evidence.sourceType,
              sourceId: source.evidence.sourceId,
              sourceUrl: source.evidence.sourceUrl,
            }
          : null,
      })),
    }
    const aiResult = await ai.runPrompt('brief@v1', aiInput, BriefOutputSchema, {
      plan: firm.plan,
      firmId: message.firmId,
      taskKind: 'brief',
    })

    if (aiResult.refusal || !aiResult.result) {
      const recorded = await repo.ai.recordRun({
        userId: message.userId ?? null,
        kind: 'brief',
        inputContextRef: `dashboard:${message.scope}:${asOfDate}`,
        trace: {
          ...aiResult.trace,
          model: aiResult.model ?? aiResult.trace.model,
        },
        outputText: null,
        errorMsg: aiResult.refusal?.message ?? 'Dashboard brief generation failed.',
      })
      await repo.dashboard.markBriefFailed(pending.id, {
        aiOutputId: recorded.aiOutputId,
        errorCode: aiResult.refusal?.code ?? 'AI_BRIEF_FAILED',
        generatedAt: now,
        expiresAt,
      })
      return
    }

    const guardError = validateBriefOutput(aiResult.result, sources)
    const outputText = JSON.stringify(aiResult.result)
    const recorded = await repo.ai.recordRun({
      userId: message.userId ?? null,
      kind: 'brief',
      inputContextRef: `dashboard:${message.scope}:${asOfDate}`,
      trace: {
        ...aiResult.trace,
        model: aiResult.model ?? aiResult.trace.model,
        ...(guardError ? { guardResult: 'guard_rejected', refusalCode: guardError } : {}),
      },
      outputText,
      citations: sources.map((source) => ({
        ref: source.ref,
        obligationId: source.obligationId,
        evidence: source.evidence,
      })),
      errorMsg: guardError,
    })

    if (guardError) {
      await repo.dashboard.markBriefFailed(pending.id, {
        aiOutputId: recorded.aiOutputId,
        errorCode: guardError,
        generatedAt: now,
        expiresAt,
      })
      return
    }

    await repo.dashboard.markBriefReady(pending.id, {
      aiOutputId: recorded.aiOutputId,
      summaryText: formatBriefText(aiResult.result, sources),
      topObligationIds: aiResult.result.items.map((item) => item.obligationId),
      citations: sources.map((source) => ({
        ref: source.ref,
        obligationId: source.obligationId,
        evidence: source.evidence,
      })),
      generatedAt: now,
      expiresAt,
    })
  } catch (cause) {
    await repo.dashboard.markBriefFailed(pending.id, {
      errorCode: 'AI_BRIEF_EXCEPTION',
      generatedAt: now,
      expiresAt,
    })
    throw cause
  }
}
