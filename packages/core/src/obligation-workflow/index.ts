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

// Lifecycle v2 transition matrix — defines which target statuses are
// reachable from each source. Enforces "Filed ≠ Done" (PDF anti-
// pattern #3): `completed` can only follow a state that means the
// return was actually filed (`done`, the legacy paid-only `paid`,
// or admin reset from `completed → pending`). Encodes the rejection
// unwind (`done → review`) and admin-reset-from-completed.
//
// The matrix is conservative — legacy transitions that were always
// allowed before this slice stay allowed (back-compat). Only the
// two semantically-invalid jumps are blocked:
//   1. completed reached from anything other than done/paid/completed
//   2. pending reached from completed (admin reset only — opt-in via
//      a future override flag, not exposed in the dropdown today)
//
// Note: auto-transitions (parent unblock, e-file → filed, etc.) go
// through the same matrix from a 'system' actor in later slices.
const OBLIGATION_TRANSITIONS: Record<ObligationStatus, readonly ObligationStatus[]> = {
  pending: [
    'in_progress',
    'waiting_on_client',
    'blocked',
    'review',
    'done',
    'extended',
    'paid',
    'not_applicable',
  ],
  in_progress: [
    'pending',
    'waiting_on_client',
    'blocked',
    'review',
    'done',
    'extended',
    'paid',
    'not_applicable',
  ],
  waiting_on_client: [
    'pending',
    'in_progress',
    'blocked',
    'review',
    'done',
    'extended',
    'paid',
    'not_applicable',
  ],
  blocked: [
    'pending',
    'in_progress',
    'waiting_on_client',
    'review',
    'done',
    'extended',
    'paid',
    'not_applicable',
  ],
  review: [
    'pending',
    'in_progress',
    'waiting_on_client',
    'blocked',
    'done',
    'extended',
    'paid',
    'not_applicable',
  ],
  done: [
    // From filed, the legitimate forward step is `completed` (acceptance
    // landed). Rejection unwinds to `review` with a `rejected` chip
    // (slice 2c). Sliding back to pending/waiting_on_client is allowed
    // for forms that need re-prep after rejection.
    'completed',
    'review',
    'waiting_on_client',
    'paid',
    'not_applicable',
  ],
  extended: [
    // Legacy state — `extended` is retired in v2 as a status (becomes a
    // deadline mutation). Allow transitions out so existing rows can
    // migrate forward.
    'pending',
    'in_progress',
    'waiting_on_client',
    'blocked',
    'review',
    'done',
    'paid',
    'not_applicable',
  ],
  paid: [
    // Legacy state — folds into `completed` per the brief.
    'completed',
    'review',
    'not_applicable',
  ],
  not_applicable: [
    // Allow turning N/A back on if a row was suppressed in error.
    'pending',
    'in_progress',
    'waiting_on_client',
    'review',
  ],
  completed: [
    // Terminal in v2. Admin reset to `pending` is intentionally NOT
    // exposed in the manual dropdown — must be an explicit override
    // path (future slice).
  ],
}

export function isLegalObligationTransition(from: ObligationStatus, to: ObligationStatus): boolean {
  if (from === to) return true // no-op transitions are always legal
  return OBLIGATION_TRANSITIONS[from].includes(to)
}

export function allowedObligationTargets(from: ObligationStatus): readonly ObligationStatus[] {
  return OBLIGATION_TRANSITIONS[from]
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
