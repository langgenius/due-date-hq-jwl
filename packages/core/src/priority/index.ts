export const SMART_PRIORITY_VERSION = 'smart-priority-v1'
export const SMART_PRIORITY_PROFILE_VERSION = 'smart-priority-profile-v1'

export const SMART_PRIORITY_WEIGHTS = {
  exposure: 0.45,
  urgency: 0.25,
  importance: 0.15,
  history: 0.1,
  readiness: 0.05,
} as const

export type SmartPriorityFactorKey = keyof typeof SMART_PRIORITY_WEIGHTS

export interface SmartPriorityProfile {
  version: typeof SMART_PRIORITY_PROFILE_VERSION
  weights: Record<SmartPriorityFactorKey, number>
  exposureCapCents: number
  urgencyWindowDays: number
  historyCapCount: number
}

export const SMART_PRIORITY_DEFAULT_PROFILE = {
  version: SMART_PRIORITY_PROFILE_VERSION,
  weights: {
    exposure: 45,
    urgency: 25,
    importance: 15,
    history: 10,
    readiness: 5,
  },
  exposureCapCents: 1_000_000,
  urgencyWindowDays: 30,
  historyCapCount: 5,
} as const satisfies SmartPriorityProfile

// Mirrors ObligationStatus; updated for lifecycle v2 (see
// docs/Design/obligation-lifecycle-design-brief.md).
export type SmartPriorityStatus =
  | 'pending'
  | 'in_progress'
  | 'done'
  | 'extended'
  | 'paid'
  | 'waiting_on_client'
  | 'review'
  | 'not_applicable'
  | 'blocked'
  | 'completed'

export type SmartPriorityExposureStatus = 'ready' | 'needs_input' | 'unsupported'

export interface SmartPriorityInput {
  obligationId: string
  currentDueDate: string | Date
  asOfDate: string
  status: SmartPriorityStatus
  estimatedExposureCents: number | null
  exposureStatus: SmartPriorityExposureStatus
  importanceWeight: number
  lateFilingCountLast12mo: number
  evidenceCount: number
}

export interface SmartPriorityFactor {
  key: SmartPriorityFactorKey
  label: string
  weight: number
  rawValue: string
  normalized: number
  contribution: number
  sourceLabel: string
}

export interface SmartPriorityBreakdown {
  version: typeof SMART_PRIORITY_VERSION
  score: number
  rank: number | null
  factors: SmartPriorityFactor[]
}

export interface SmartPriorityRanked<T> {
  row: T
  smartPriority: SmartPriorityBreakdown
}

const DAY_MS = 24 * 60 * 60 * 1000
const FACTOR_KEYS = ['exposure', 'urgency', 'importance', 'history', 'readiness'] as const

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value))
}

function roundScore(value: number): number {
  return Math.round(value * 10) / 10
}

function isSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value)
}

export function smartPriorityWeightTotal(
  profile: Pick<SmartPriorityProfile, 'weights'> = SMART_PRIORITY_DEFAULT_PROFILE,
): number {
  return FACTOR_KEYS.reduce((sum, key) => sum + profile.weights[key], 0)
}

export function isSmartPriorityProfile(value: unknown): value is SmartPriorityProfile {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<SmartPriorityProfile>
  if (candidate.version !== SMART_PRIORITY_PROFILE_VERSION) return false
  if (!candidate.weights || typeof candidate.weights !== 'object') return false
  if (
    !FACTOR_KEYS.every((key) => {
      const weight = candidate.weights?.[key]
      return isSafeInteger(weight) && weight >= 0 && weight <= 100
    })
  ) {
    return false
  }
  const total = FACTOR_KEYS.reduce((sum, key) => sum + (candidate.weights?.[key] ?? 0), 0)
  if (total !== 100) {
    return false
  }
  return (
    isSafeInteger(candidate.exposureCapCents) &&
    candidate.exposureCapCents > 0 &&
    isSafeInteger(candidate.urgencyWindowDays) &&
    candidate.urgencyWindowDays > 0 &&
    isSafeInteger(candidate.historyCapCount) &&
    candidate.historyCapCount > 0
  )
}

export function resolveSmartPriorityProfile(
  profile?: SmartPriorityProfile | null,
): SmartPriorityProfile {
  return isSmartPriorityProfile(profile) ? profile : SMART_PRIORITY_DEFAULT_PROFILE
}

function factorWeight(profile: SmartPriorityProfile, key: SmartPriorityFactorKey): number {
  return profile.weights[key] / 100
}

function parseDateOnly(value: string | Date): Date {
  if (value instanceof Date) {
    return new Date(`${value.toISOString().slice(0, 10)}T00:00:00.000Z`)
  }
  return new Date(`${value}T00:00:00.000Z`)
}

export function smartPriorityDaysUntilDue(input: {
  currentDueDate: string | Date
  asOfDate: string
}): number {
  return Math.floor(
    (parseDateOnly(input.currentDueDate).getTime() - parseDateOnly(input.asOfDate).getTime()) /
      DAY_MS,
  )
}

function exposureFactor(
  input: SmartPriorityInput,
  profile: SmartPriorityProfile,
): SmartPriorityFactor {
  const cents =
    input.exposureStatus === 'ready' && input.estimatedExposureCents !== null
      ? Math.max(0, input.estimatedExposureCents)
      : 0
  const weight = factorWeight(profile, 'exposure')
  const normalized = clamp(cents / profile.exposureCapCents)
  return {
    key: 'exposure',
    label: 'Projected risk',
    weight,
    rawValue:
      input.exposureStatus === 'ready' ? `$${Math.round(cents / 100)}` : input.exposureStatus,
    normalized,
    contribution: roundScore(normalized * weight * 100),
    sourceLabel: 'Penalty Radar',
  }
}

function urgencyFactor(
  input: SmartPriorityInput,
  profile: SmartPriorityProfile,
): SmartPriorityFactor {
  const days = smartPriorityDaysUntilDue(input)
  const weight = factorWeight(profile, 'urgency')
  const normalized =
    days <= 0
      ? 1
      : days >= profile.urgencyWindowDays
        ? 0
        : clamp((profile.urgencyWindowDays - days) / profile.urgencyWindowDays)
  return {
    key: 'urgency',
    label: 'Deadline urgency',
    weight,
    rawValue: days < 0 ? `${Math.abs(days)} days late` : days === 0 ? 'today' : `${days} days`,
    normalized,
    contribution: roundScore(normalized * weight * 100),
    sourceLabel: 'Current due date',
  }
}

function importanceFactor(
  input: SmartPriorityInput,
  profile: SmartPriorityProfile,
): SmartPriorityFactor {
  const weight = Math.round(clamp(input.importanceWeight, 1, 3))
  const normalized = clamp((weight - 1) / 2)
  const label = weight === 3 ? 'high' : weight === 2 ? 'medium' : 'low'
  const factor = factorWeight(profile, 'importance')
  return {
    key: 'importance',
    label: 'Client importance',
    weight: factor,
    rawValue: label,
    normalized,
    contribution: roundScore(normalized * factor * 100),
    sourceLabel: 'Client risk profile',
  }
}

function historyFactor(
  input: SmartPriorityInput,
  profile: SmartPriorityProfile,
): SmartPriorityFactor {
  const count = Math.max(0, Math.floor(input.lateFilingCountLast12mo))
  const weight = factorWeight(profile, 'history')
  const normalized = clamp(count / profile.historyCapCount)
  return {
    key: 'history',
    label: 'Late filing history',
    weight,
    rawValue: `${count}`,
    normalized,
    contribution: roundScore(normalized * weight * 100),
    sourceLabel: 'Client risk profile',
  }
}

function readinessFactor(
  input: SmartPriorityInput,
  profile: SmartPriorityProfile,
): SmartPriorityFactor {
  const blocked =
    input.status === 'waiting_on_client' ||
    input.status === 'review' ||
    input.exposureStatus === 'needs_input' ||
    input.evidenceCount === 0
  const normalized = blocked ? 1 : 0
  const weight = factorWeight(profile, 'readiness')
  const rawValue =
    input.status === 'waiting_on_client'
      ? 'waiting on client'
      : input.status === 'review'
        ? 'needs review'
        : input.exposureStatus === 'needs_input'
          ? 'needs exposure input'
          : input.evidenceCount === 0
            ? 'needs evidence'
            : 'ready'
  return {
    key: 'readiness',
    label: 'Readiness pressure',
    weight,
    rawValue,
    normalized,
    contribution: roundScore(normalized * weight * 100),
    sourceLabel: 'Obligations status',
  }
}

export function scoreSmartPriority(
  input: SmartPriorityInput,
  profileInput?: SmartPriorityProfile | null,
): SmartPriorityBreakdown {
  const profile = resolveSmartPriorityProfile(profileInput)
  const factors = [
    exposureFactor(input, profile),
    urgencyFactor(input, profile),
    importanceFactor(input, profile),
    historyFactor(input, profile),
    readinessFactor(input, profile),
  ]
  return {
    version: SMART_PRIORITY_VERSION,
    score: roundScore(factors.reduce((sum, factor) => sum + factor.contribution, 0)),
    rank: null,
    factors,
  }
}

export function compareSmartPriority(
  a: Pick<SmartPriorityInput, 'obligationId' | 'currentDueDate'> & {
    smartPriority: Pick<SmartPriorityBreakdown, 'score'>
  },
  b: Pick<SmartPriorityInput, 'obligationId' | 'currentDueDate'> & {
    smartPriority: Pick<SmartPriorityBreakdown, 'score'>
  },
): number {
  const scoreDelta = b.smartPriority.score - a.smartPriority.score
  if (scoreDelta !== 0) return scoreDelta
  const dateDelta =
    parseDateOnly(a.currentDueDate).getTime() - parseDateOnly(b.currentDueDate).getTime()
  if (dateDelta !== 0) return dateDelta
  return a.obligationId.localeCompare(b.obligationId)
}

export function rankSmartPriorities<T extends SmartPriorityInput>(
  rows: readonly T[],
  profileInput?: SmartPriorityProfile | null,
): Array<SmartPriorityRanked<T>> {
  const profile = resolveSmartPriorityProfile(profileInput)
  return rows
    .map((row) => ({ row, smartPriority: scoreSmartPriority(row, profile) }))
    .toSorted((a, b) =>
      compareSmartPriority(
        { ...a.row, smartPriority: a.smartPriority },
        { ...b.row, smartPriority: b.smartPriority },
      ),
    )
    .map((item, index) => ({
      row: item.row,
      smartPriority: {
        ...item.smartPriority,
        rank: index + 1,
      },
    }))
}
