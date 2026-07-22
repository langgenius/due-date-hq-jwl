import type { Env } from '../env'
import { consumeAiInsightRefresh } from './ai-insights/consumer'
import { isAiInsightRefreshMessage } from './ai-insights/message'
import { generateAuditEvidencePackage } from './audit/package'
import { consumeDashboardBriefRefresh } from './dashboard-brief/consumer'
import { isDashboardBriefRefreshMessage } from './dashboard-brief/message'
import { flushEmailOutbox } from './email/outbox'
import { dispatchOpsAlert } from './ops-alerts'
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
import { consumeXPublish, isXPublishQueueMessage, markXPublishDeadLetter } from './social/consumer'

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
    isXPublishQueueMessage(body) ||
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

// Names the affected source(s) on a dropped/dead-lettered message so an ops
// alert says WHICH source failed, not just its message type — otherwise the
// only way to find the culprit is hand-querying pulse_source_state. Pulse
// ingest messages can ride a host-group of several sources, so report the whole
// list; other contracts that carry a `sourceId` (rule scans, draft prewarm)
// fall through to it. `pulse.extract` carries no source id (only snapshotId,
// surfaced separately), so it returns null.
export function queueMessageSourceId(body: unknown): string | null {
  if (isPulseIngestSourceMessage(body)) {
    return body.sourceIds?.length ? body.sourceIds.join(',') : body.sourceId
  }
  return isRecord(body) && typeof body.sourceId === 'string' ? body.sourceId : null
}

export function queueMessageRunId(body: unknown): string | null {
  return isXPublishQueueMessage(body) ? body.runId : null
}

// Dead-letter queues are wired in wrangler.toml (e.g. due-date-hq-pulse-dlq-*).
// A batch arriving from the Pulse DLQ means a snapshot exhausted max_retries —
// re-dispatching would just re-run the failing handler, so we alert and ack to
// drain it instead. Without this consumer the messages die silently.
export function isPulseDeadLetterQueue(queueName: string): boolean {
  return queueName.includes('pulse') && queueName.includes('dlq')
}

export function isSocialDeadLetterQueue(queueName: string): boolean {
  return queueName.includes('social') && queueName.includes('dlq')
}

function queueErrorMessage(error: unknown): string {
  return (error instanceof Error ? error.message : 'Queue dispatch failed.').slice(0, 500)
}

function queueFailureFields(queueName: string, message: Message, error: unknown) {
  return {
    queue: queueName,
    messageId: message.id,
    messageType: queueMessageType(message.body),
    attempts: message.attempts,
    sourceId: queueMessageSourceId(message.body),
    error: queueErrorMessage(error),
  }
}

function recordQueueRetry(queueName: string, message: Message, error: unknown): void {
  console.warn(
    JSON.stringify({
      type: 'queue.metric',
      name: 'queue.dispatch.retry',
      at: new Date().toISOString(),
      ...queueFailureFields(queueName, message, error),
    }),
  )
}

export async function drainDeadLetterBatch(
  batch: MessageBatch,
  env: Env,
  dependencies: { markXDeadLetter?: typeof markXPublishDeadLetter } = {},
): Promise<void> {
  for (const message of batch.messages) {
    if (isSocialDeadLetterQueue(batch.queue) && isXPublishQueueMessage(message.body)) {
      await (dependencies.markXDeadLetter ?? markXPublishDeadLetter)(message.body, env)
      message.ack()
      continue
    }
    const fields = {
      queue: batch.queue,
      messageId: message.id,
      messageType: queueMessageType(message.body),
      attempts: message.attempts,
      sourceId: queueMessageSourceId(message.body),
      snapshotId: isPulseExtractMessage(message.body) ? message.body.snapshotId : null,
      runId: queueMessageRunId(message.body),
    }
    const alertName = isSocialDeadLetterQueue(batch.queue)
      ? 'social.queue.dead_letter'
      : 'pulse.queue.dead_letter'
    if (alertName === 'pulse.queue.dead_letter') {
      recordPulseAlert(alertName, fields)
    } else {
      console.error(JSON.stringify({ type: alertName, at: new Date().toISOString(), ...fields }))
    }
    await dispatchOpsAlert(env, alertName, fields)
    message.ack()
  }
}

// Queue consumer entry. Keep message contracts explicit so additional queues
// can be routed here without conflating job payloads.
export async function queue(batch: MessageBatch, env: Env, _ctx: ExecutionContext): Promise<void> {
  if (isPulseDeadLetterQueue(batch.queue) || isSocialDeadLetterQueue(batch.queue)) {
    await drainDeadLetterBatch(batch, env)
    return
  }
  assertQueueDispatchable(batch)
  await Promise.all(batch.messages.map((message) => dispatchMessage(message, env, batch.queue)))
}

// Cloudflare's max_retries=3 produces four deliveries including the original.
// Process all four: the old pre-dispatch `attempts > 3` gate threw the final
// recovery opportunity away and could not include the actual terminal error in
// its ops email. On the fourth failed PROCESSING attempt we alert + ack instead
// of asking Cloudflare for a retry that would only route to the DLQ.
const MAX_DISPATCH_PROCESSING_ATTEMPTS = 4

type DispatchMessageDependencies = {
  dispatchBody?: (body: unknown, env: Env) => Promise<void>
  dispatchAlert?: typeof dispatchOpsAlert
}

export async function dispatchMessage(
  message: Message,
  env: Env,
  queueName: string,
  dependencies: DispatchMessageDependencies = {},
): Promise<void> {
  try {
    await (dependencies.dispatchBody ?? dispatchMessageBody)(message.body, env)
    message.ack()
  } catch (error) {
    if (message.attempts >= MAX_DISPATCH_PROCESSING_ATTEMPTS) {
      const fields = queueFailureFields(queueName, message, error)
      recordPulseAlert('queue.dispatch.dropped', fields)
      await (dependencies.dispatchAlert ?? dispatchOpsAlert)(env, 'queue.dispatch.dropped', fields)
      message.ack()
      return
    }
    recordQueueRetry(queueName, message, error)
    message.retry()
  }
}

async function dispatchMessageBody(body: unknown, env: Env): Promise<void> {
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
  if (isXPublishQueueMessage(body)) {
    await consumeXPublish(body, env)
  }
  if (isEmailFlushMessage(body)) {
    await flushEmailOutbox(env)
  }
  if (isAuditPackageGenerateMessage(body)) {
    await generateAuditEvidencePackage(env, body.packageId)
  }
}
