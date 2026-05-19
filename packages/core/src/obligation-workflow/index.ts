// Lifecycle v2: `blocked` and `completed` are non-breaking additions
// to support the 6-state migration. See
// docs/Design/obligation-lifecycle-design-brief.md.
export const OBLIGATION_STATUSES = [
  'pending',
  'in_progress',
  'done',
  'extended',
  'paid',
  'waiting_on_client',
  'review',
  'not_applicable',
  'blocked',
  'completed',
] as const

export type ObligationStatus = (typeof OBLIGATION_STATUSES)[number]

export const OBLIGATION_READINESSES = ['ready', 'waiting', 'needs_review'] as const
export type ObligationReadiness = (typeof OBLIGATION_READINESSES)[number]

export const READINESS_RESPONSE_STATUSES = ['ready', 'not_yet', 'need_help'] as const
export type ReadinessResponseStatus = (typeof READINESS_RESPONSE_STATUSES)[number]

// `blocked` is open work (waiting on an upstream obligation to clear).
export const OPEN_OBLIGATION_STATUSES = [
  'pending',
  'in_progress',
  'waiting_on_client',
  'review',
  'blocked',
] as const satisfies readonly ObligationStatus[]

// `completed` (v2 terminal — acceptance landed) joins `done` and friends in
// the closed set.
export const CLOSED_OBLIGATION_STATUSES = [
  'done',
  'extended',
  'paid',
  'not_applicable',
  'completed',
] as const satisfies readonly ObligationStatus[]

export type OpenObligationStatus = (typeof OPEN_OBLIGATION_STATUSES)[number]
export type ClosedObligationStatus = (typeof CLOSED_OBLIGATION_STATUSES)[number]

export type ObligationStatusDisplayKey =
  | 'not_started'
  | 'in_progress'
  | 'filed'
  | 'extended'
  | 'paid'
  | 'waiting_on_client'
  | 'needs_review'
  | 'not_applicable'
  | 'blocked'
  | 'completed'

export const OBLIGATION_STATUS_DISPLAY_KEYS: Record<ObligationStatus, ObligationStatusDisplayKey> =
  {
    pending: 'not_started',
    in_progress: 'in_progress',
    done: 'filed',
    extended: 'extended',
    paid: 'paid',
    waiting_on_client: 'waiting_on_client',
    review: 'needs_review',
    not_applicable: 'not_applicable',
    blocked: 'blocked',
    completed: 'completed',
  }

export function isOpenObligationStatus(status: ObligationStatus): status is OpenObligationStatus {
  return (OPEN_OBLIGATION_STATUSES as readonly ObligationStatus[]).includes(status)
}

export function isClosedObligationStatus(
  status: ObligationStatus,
): status is ClosedObligationStatus {
  return (CLOSED_OBLIGATION_STATUSES as readonly ObligationStatus[]).includes(status)
}

export function defaultReadinessForStatus(
  status: ObligationStatus,
  currentReadiness: ObligationReadiness | null | undefined,
): ObligationReadiness {
  if (status === 'waiting_on_client') return 'waiting'
  if (status === 'review') return 'needs_review'
  if (isClosedObligationStatus(status)) return 'ready'
  return currentReadiness ?? 'ready'
}

export function deriveObligationReadiness(input: {
  status: ObligationStatus
  requestStatus?: 'sent' | 'opened' | 'responded' | 'revoked' | 'expired' | null
  responseStatuses?: readonly ReadinessResponseStatus[]
}): ObligationReadiness {
  if (isClosedObligationStatus(input.status)) return 'ready'

  const responseStatuses = input.responseStatuses ?? []
  if (responseStatuses.length > 0) {
    if (responseStatuses.some((status) => status === 'need_help')) return 'needs_review'
    if (responseStatuses.every((status) => status === 'ready')) return 'ready'
    return 'waiting'
  }

  if (
    input.requestStatus === 'sent' ||
    input.requestStatus === 'opened' ||
    input.requestStatus === 'responded'
  ) {
    return 'waiting'
  }

  return defaultReadinessForStatus(input.status, undefined)
}
