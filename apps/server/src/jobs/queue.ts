import type { Env } from '../env'
import { consumeAiInsightRefresh } from './ai-insights/consumer'
import { isAiInsightRefreshMessage } from './ai-insights/message'
import { generateAuditEvidencePackage } from './audit/package'
import { consumeDashboardBriefRefresh } from './dashboard-brief/consumer'
import { isDashboardBriefRefreshMessage } from './dashboard-brief/message'
import { flushEmailOutbox } from './email/outbox'
import { extractPulseSnapshot } from './pulse/extract'
import { recordPulseMetric } from './pulse/metrics'
import {
  consumeRuleConcreteDraftGenerate,
  isRuleConcreteDraftGenerateMessage,
} from './rules/concrete-draft'
import {
  consumeRuleRegistryCatalogSync,
  consumeRuleRegistrySourceReconcile,
  isRuleRegistryCatalogSyncMessage,
  isRuleRegistrySourceReconcileMessage,
} from './rules/reconcile'

interface QueueBatchLike {
  queue: string
  messages: readonly { body?: unknown }[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function assertQueueDispatchable(batch: QueueBatchLike): void {
  for (const message of batch.messages) {
    if (!isDispatchableMessage(message.body)) {
      throw new Error(`No queue dispatcher is implemented for ${batch.queue}.`)
    }
  }
}

function isDispatchableMessage(body: unknown): boolean {
  return (
    isAiInsightRefreshMessage(body) ||
    isDashboardBriefRefreshMessage(body) ||
    isPulseExtractMessage(body) ||
    isRuleConcreteDraftGenerateMessage(body) ||
    isRuleRegistrySourceReconcileMessage(body) ||
    isRuleRegistryCatalogSyncMessage(body) ||
    isEmailFlushMessage(body) ||
    isAuditPackageGenerateMessage(body)
  )
}

function isPulseExtractMessage(
  body: unknown,
): body is { type: 'pulse.extract'; snapshotId: string } {
  return isRecord(body) && body.type === 'pulse.extract' && typeof body.snapshotId === 'string'
}

function isEmailFlushMessage(body: unknown): body is { type: 'email.flush' } {
  return isRecord(body) && body.type === 'email.flush'
}

function isAuditPackageGenerateMessage(
  body: unknown,
): body is { type: 'audit.package.generate'; packageId: string } {
  return (
    isRecord(body) && body.type === 'audit.package.generate' && typeof body.packageId === 'string'
  )
}

// Queue consumer entry. Keep message contracts explicit so additional queues
// can be routed here without conflating job payloads.
export async function queue(batch: MessageBatch, env: Env, _ctx: ExecutionContext): Promise<void> {
  assertQueueDispatchable(batch)
  await Promise.all(batch.messages.map((message) => dispatchMessage(message, env)))
}

async function dispatchMessage(message: Message, env: Env): Promise<void> {
  try {
    const body = message.body
    if (isAiInsightRefreshMessage(body)) {
      await consumeAiInsightRefresh(body, env)
    }
    if (isDashboardBriefRefreshMessage(body)) {
      await consumeDashboardBriefRefresh(body, env)
    }
    if (isPulseExtractMessage(body)) {
      await extractPulseSnapshot(env, body.snapshotId)
    }
    if (isRuleConcreteDraftGenerateMessage(body)) {
      await consumeRuleConcreteDraftGenerate(body, env)
    }
    if (isRuleRegistrySourceReconcileMessage(body)) {
      await consumeRuleRegistrySourceReconcile(body, env)
    }
    if (isRuleRegistryCatalogSyncMessage(body)) {
      await consumeRuleRegistryCatalogSync(body, env)
    }
    if (isEmailFlushMessage(body)) {
      await flushEmailOutbox(env)
    }
    if (isAuditPackageGenerateMessage(body)) {
      await generateAuditEvidencePackage(env, body.packageId)
    }
    message.ack()
  } catch (error) {
    recordPulseMetric('pulse.queue.retry', {
      queue: 'unknown',
      error: error instanceof Error ? error.message : 'Queue dispatch failed.',
    })
    message.retry()
  }
}
