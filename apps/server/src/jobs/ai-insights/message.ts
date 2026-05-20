import type { AiInsightKind, AiInsightSubjectType } from '@duedatehq/ports/ai-insights'

export const AI_INSIGHT_MESSAGE_TYPE = 'ai.insight.refresh'

export type AiInsightRefreshReason =
  | 'manual_refresh'
  | 'client_jurisdiction_update'
  | 'client_risk_profile_update'
  | 'client_tax_year_profile_update'
  | 'status_change'
  | 'readiness_change'
  | 'evidence_change'
  | 'penalty_override'
  | 'due_date_update'

export interface AiInsightRefreshMessage {
  type: typeof AI_INSIGHT_MESSAGE_TYPE
  firmId: string
  kind: AiInsightKind
  subjectType: AiInsightSubjectType
  subjectId: string
  asOfDate?: string
  reason: AiInsightRefreshReason
  idempotencyKey: string
  requestedAt: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function subjectTypeForKind(kind: AiInsightKind): AiInsightSubjectType {
  return kind === 'client_risk_summary' ? 'client' : 'obligation'
}

export function isAiInsightRefreshMessage(value: unknown): value is AiInsightRefreshMessage {
  if (!isRecord(value)) return false
  if (value.type !== AI_INSIGHT_MESSAGE_TYPE) return false
  if (value.kind !== 'client_risk_summary' && value.kind !== 'deadline_tip') return false
  return (
    value.subjectType === subjectTypeForKind(value.kind) &&
    typeof value.firmId === 'string' &&
    typeof value.subjectId === 'string' &&
    typeof value.reason === 'string' &&
    typeof value.idempotencyKey === 'string' &&
    typeof value.requestedAt === 'string'
  )
}

export function aiInsightIdempotencyKey(input: {
  firmId: string
  kind: AiInsightKind
  subjectId: string
  reason: AiInsightRefreshReason
  asOfDate?: string
}): string {
  return [
    'ai-insight',
    input.firmId,
    input.kind,
    input.subjectId,
    input.asOfDate ?? 'auto-date',
    input.reason,
  ].join(':')
}
