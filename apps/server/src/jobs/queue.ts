import type { Env } from '../env'
import { consumeAiInsightRefresh } from './ai-insights/consumer'
import { isAiInsightRefreshMessage } from './ai-insights/message'
import { generateAuditEvidencePackage } from './audit/package'
import { consumeDashboardBriefRefresh } from './dashboard-brief/consumer'
import { isDashboardBriefRefreshMessage } from './dashboard-brief/message'
import { flushEmailOutbox } from './email/outbox'
import { extractPulseSnapshot } from './pulse/extract'
import { consumePulseIngestSource, isPulseIngestSourceMessage } from './pulse/ingest'
import { recordPulseAlert } from './pulse/metrics'
import {
  consumeRuleConcreteDraftGenerate,
  isRuleConcreteDraftGenerateMessage,
} from './rules/concrete-draft'
import {
  consumeRuleDateReconciliation,
  consumeRuleRegistryCatalogSync,
  consumePulseRuleSourceScan,
  isPulseRuleSourceScanMessage,
  isRuleDateReconciliationMessage,
  isRuleRegistryCatalogSyncMessage,
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
    isPulseIngestSourceMessage(body) ||
    isPulseExtractMessage(body) ||
    isRuleConcreteDraftGenerateMessage(body) ||
    isPulseRuleSourceScanMessage(body) ||
    isRuleRegistryCatalogSyncMessage(body) ||
    isRuleDateReconciliationMessage(body) ||
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

export function queueMessageType(body: unknown): string {
  return isRecord(body) && typeof body.type === 'string' ? body.type : 'unknown'
}

// Dead-letter queues are wired in wrangler.toml (e.g. due-date-hq-pulse-dlq-*).
// A batch arriving from the Pulse DLQ means a snapshot exhausted max_retries —
// re-dispatching would just re-run the failing handler, so we alert and ack to
// drain it instead. Without this consumer the messages die silently.
export function isPulseDeadLetterQueue(queueName: string): boolean {
  return queueName.includes('pulse') && queueName.includes('dlq')
}

function recordQueueRetry(body: unknown, error: unknown): void {
  console.warn(
    JSON.stringify({
      type: 'queue.metric',
      name: 'queue.dispatch.retry',
      at: new Date().toISOString(),
      messageType: queueMessageType(body),
      error: error instanceof Error ? error.message : 'Queue dispatch failed.',
    }),
  )
}

function drainDeadLetterBatch(batch: MessageBatch): void {
  for (const message of batch.messages) {
    recordPulseAlert('pulse.queue.dead_letter', {
      queue: batch.queue,
      messageType: queueMessageType(message.body),
      attempts: message.attempts,
      snapshotId: isPulseExtractMessage(message.body) ? message.body.snapshotId : null,
    })
    message.ack()
  }
}

// Queue consumer entry. Keep message contracts explicit so additional queues
// can be routed here without conflating job payloads.
export async function queue(batch: MessageBatch, env: Env, _ctx: ExecutionContext): Promise<void> {
  if (isPulseDeadLetterQueue(batch.queue)) {
    drainDeadLetterBatch(batch)
    return
  }
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
    if (isPulseIngestSourceMessage(body)) {
      await consumePulseIngestSource(env, body)
    }
    if (isPulseExtractMessage(body)) {
      await extractPulseSnapshot(env, body.snapshotId)
    }
    if (isRuleConcreteDraftGenerateMessage(body)) {
      await consumeRuleConcreteDraftGenerate(body, env)
    }
    if (isPulseRuleSourceScanMessage(body)) {
      await consumePulseRuleSourceScan(body, env)
    }
    if (isRuleRegistryCatalogSyncMessage(body)) {
      await consumeRuleRegistryCatalogSync(body, env)
    }
    if (isRuleDateReconciliationMessage(body)) {
      await consumeRuleDateReconciliation(body, env)
    }
    if (isEmailFlushMessage(body)) {
      await flushEmailOutbox(env)
    }
    if (isAuditPackageGenerateMessage(body)) {
      await generateAuditEvidencePackage(env, body.packageId)
    }
    message.ack()
  } catch (error) {
    recordQueueRetry(message.body, error)
    message.retry()
  }
}
