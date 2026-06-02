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

// E-file sub-state pipeline (the `efileState` column). Mirrors the enum in
// packages/db/src/schema/obligations.ts + ObligationEfileStateSchema —
// duplicated locally here the same way OBLIGATION_STATUSES is, to keep the
// core workflow package dependency-free. The string literals must stay in
// lockstep across the three definitions.
export const OBLIGATION_EFILE_STATES = [
  'not_applicable',
  'authorization_requested',
  'authorization_signed',
  'ready_to_submit',
  'submitted',
  'accepted',
  'rejected',
  'corrected_resubmitted',
  'paper_filed',
  'final_package_delivered',
] as const
export type ObligationEfileState = (typeof OBLIGATION_EFILE_STATES)[number]

// Forward-only pipeline with the documented branches (reject → correct →
// resubmit; e-file vs paper). P0 only exercises
// `authorization_requested → authorization_signed` ("Mark 8879 signed");
// the rest of the map is defined so later slices that wire submitted /
// accepted / delivered reuse the same guard. `markFiledRejected` keeps its
// own status-level unwind path and does not flow through here.
const EFILE_TRANSITIONS: Record<ObligationEfileState, readonly ObligationEfileState[]> = {
  not_applicable: ['authorization_requested', 'ready_to_submit', 'paper_filed'],
  authorization_requested: [
    'authorization_signed',
    'ready_to_submit',
    'paper_filed',
    'not_applicable',
  ],
  authorization_signed: ['ready_to_submit', 'submitted', 'paper_filed', 'authorization_requested'],
  ready_to_submit: ['submitted', 'paper_filed', 'authorization_signed'],
  submitted: ['accepted', 'rejected'],
  accepted: ['final_package_delivered'],
  rejected: ['corrected_resubmitted', 'authorization_requested', 'ready_to_submit', 'paper_filed'],
  corrected_resubmitted: ['submitted', 'accepted', 'rejected'],
  paper_filed: ['final_package_delivered', 'accepted'],
  final_package_delivered: [],
}

export function isLegalEfileTransition(
  from: ObligationEfileState,
  to: ObligationEfileState,
): boolean {
  if (from === to) return true // no-op transitions are always legal
  return EFILE_TRANSITIONS[from].includes(to)
}

// Which obligations actually walk the 8879 signature loop. An IRS Form
// 8879 — and its state analogs (CA FTB 8453/8879, NY TR-579, …) — is a
// *signed e-file authorization* the client must return before an
// income-tax RETURN can be transmitted. It does NOT apply to
// estimated-tax payments, extensions, payroll/withholding returns,
// sales & use returns, information returns (1099 / UI wage), franchise
// *fees*, or LLC annual-tax payments — none of those carry an 8879.
//
// This is the single source of truth for the two call sites that must
// agree (or a row could be born outside the loop yet pulled in, or
// vice-versa):
//   1. generation seeds `efileState='authorization_requested'` for
//      these returns (everything else gets `not_applicable`); and
//   2. marking such a return Filed enters the loop on the spot — the
//      deterministic UI entry point, since migration-imported and
//      hand-added returns never ran through generation.
//
// Allowlist (not denylist) on purpose: the safe failure mode is "a
// return misses the loop", never "a payment falsely claims an 8879".
const EFILE_AUTHORIZATION_TAX_TYPES: ReadonlySet<string> = new Set([
  // Federal income-tax returns (8879 / 8879-PE / 8879-CORP / 8879-F / 8879-TE)
  'federal_1040',
  'federal_1041',
  'federal_1065',
  'federal_1065_or_1040',
  'federal_1120',
  'federal_1120s',
  'federal_990',
  // Generic state income / business / fiduciary / PTE returns (the
  // pre-jurisdiction-prefix forms used by the state candidate domains)
  'state_individual_income_tax',
  'state_business_income_tax',
  'state_fiduciary_income_tax',
  'state_pte_composite_ptet',
  // California income / franchise *returns* — the LLC $800 tax + the
  // gross-receipts fee are payments and stay out of the loop
  'ca_100',
  'ca_100_franchise',
  'ca_100s',
  'ca_100s_franchise',
  'ca_540',
  'ca_541',
  'ca_565',
  'ca_565_partnership',
  'ca_568',
  'ca_llc_568',
  // New York income / franchise returns — the IT-204-LL and the LLC
  // filing fee are fees and stay out
  'ny_ct3',
  'ny_ct3s',
  'ny_it201',
  'ny_it204',
  'ny_it205',
  // Illinois income-tax returns
  'il_il1040',
  'il_il1120',
  // Other state income-tax returns present in the matrix
  'fl_corp_income',
  'co_partnership',
])

// Jurisdiction-prefixed state income returns (`ca_state_business_income_tax`,
// `ny_state_individual_income_tax`, …) all carry a state e-file signature
// authorization. Matches only the income-tax families — franchise, sales/use,
// withholding, and UI-wage `*_state_*` codes are deliberately excluded.
const PREFIXED_STATE_RETURN_RE =
  /_state_(individual|business|fiduciary)_income_tax$|_state_pte_composite_ptet$/

/**
 * True when an obligation's tax type is an income-tax return that is
 * e-filed under a signed Form 8879 (or a state e-file authorization).
 * Drives both generation seeding and the Mark-filed entry into the
 * signature loop — see EFILE_AUTHORIZATION_TAX_TYPES above.
 */
export function obligationUsesEfileAuthorization(taxType: string | null | undefined): boolean {
  if (!taxType) return false
  const code = taxType.toLowerCase()
  return EFILE_AUTHORIZATION_TAX_TYPES.has(code) || PREFIXED_STATE_RETURN_RE.test(code)
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
