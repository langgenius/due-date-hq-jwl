import type { PulseAlertPublic, PulsePriorityLevel } from '@duedatehq/contracts'

/**
 * Deadline-proximity urgency — Layer 1 of the alert list urgency model
 * (see docs/dev-log/_eng-brief-2026-06-14-alert-urgency-model.md).
 *
 * A pure function of the alert's `actionDeadline` (already on every row,
 * derived server-side as `parsedNewDueDate ?? protectiveActionDeadline ??
 * parsedEffectiveUntil`). Needs no permission and no extra query, so it gives
 * EVERY firm a baseline time signal — including those without the
 * smart-priority queue permission, who otherwise see a flat list.
 *
 * The richer smart-priority tier (`scorePulsePriority` in @duedatehq/db,
 * surfaced via `AlertPriorityInfo.level`) stays Layer 2: when present it wins
 * the row's leading pill; this proximity tier is the fallback. One cue per row.
 *
 * Thresholds are per-kind (see KIND_THRESHOLDS) — a starting point to tune
 * against the real `actionDeadline` distribution.
 */
export type DeadlineProximity = 'overdue' | 'imminent' | 'soon' | 'scheduled' | 'none'

export interface ProximityResult {
  proximity: DeadlineProximity
  /** Whole days until the deadline (negative = overdue). `null` when no deadline. */
  days: number | null
}

/** Day cutoffs for the proximity buckets. `≤ imminentDays` → imminent (urgent),
 *  `≤ soonDays` → soon (high), beyond → scheduled (quiet). */
export interface ProximityThresholds {
  imminentDays: number
  soonDays: number
}

/** Default horizon for most change kinds — a deadline two weeks out starts to
 *  matter, three days out is act-now. */
export const DEFAULT_THRESHOLDS: ProximityThresholds = { imminentDays: 3, soonDays: 14 }

/**
 * Per-kind overrides. `protective_claim_window` is a hard legal cutoff (the
 * refund-claim window simply closes), so it surfaces far earlier — a 60-day
 * `soon` horizon that mirrors the server scorer, which adds +45 (= the `high`
 * threshold) when a protective-claim deadline is ≤60 days
 * (`scorePulsePriority`, @duedatehq/db). `imminentDays` stays 3: a claim
 * window closing within 3 days is genuinely act-now (urgent), everything from
 * 4–60 days reads as high.
 */
const KIND_THRESHOLDS: Partial<Record<PulseAlertPublic['changeKind'], ProximityThresholds>> = {
  protective_claim_window: { imminentDays: 3, soonDays: 60 },
}

export function thresholdsForKind(kind: PulseAlertPublic['changeKind']): ProximityThresholds {
  return KIND_THRESHOLDS[kind] ?? DEFAULT_THRESHOLDS
}

/**
 * Bucket an alert's action deadline relative to `nowMs`. `nowMs` is INJECTED
 * (never `Date.now()` inside) so the calc is testable and matches the horizon
 * filter in AlertsListPage. Pass `thresholds` from `thresholdsForKind` so each
 * change kind gets its own horizon; omitting it uses DEFAULT_THRESHOLDS.
 *
 *   • overdue    — deadline already passed
 *   • imminent   — ≤ thresholds.imminentDays out
 *   • soon       — ≤ thresholds.soonDays out
 *   • scheduled  — further out
 *   • none       — no deadline on the alert
 */
export function deadlineProximity(
  actionDeadlineIso: string | null,
  nowMs: number,
  thresholds: ProximityThresholds = DEFAULT_THRESHOLDS,
): ProximityResult {
  if (!actionDeadlineIso) return { proximity: 'none', days: null }
  const deadlineMs = new Date(actionDeadlineIso).getTime()
  if (Number.isNaN(deadlineMs)) return { proximity: 'none', days: null }
  const days = Math.ceil((deadlineMs - nowMs) / 86_400_000)
  if (days < 0) return { proximity: 'overdue', days }
  if (days <= thresholds.imminentDays) return { proximity: 'imminent', days }
  if (days <= thresholds.soonDays) return { proximity: 'soon', days }
  return { proximity: 'scheduled', days }
}

/**
 * Map a deadline proximity onto the shared priority tier vocabulary so a
 * baseline (Layer 1) row can render the SAME `LEVEL_PILL` as a smart-priority
 * (Layer 2) row — one visual language, two data sources.
 *
 *   overdue | imminent → urgent
 *   soon              → high
 *   scheduled | none  → normal
 */
export function proximityToTier(proximity: DeadlineProximity): PulsePriorityLevel {
  switch (proximity) {
    case 'overdue':
    case 'imminent':
      return 'urgent'
    case 'soon':
      return 'high'
    case 'scheduled':
    case 'none':
      return 'normal'
    default: {
      const exhaustive: never = proximity
      return exhaustive
    }
  }
}

/**
 * The tier that should drive the row's leading pill. Layer 2 (smart priority)
 * wins when present — it weighs needs-review, confidence, impact and
 * preparer-requested, strictly richer than time alone. Layer 1 (deadline
 * proximity) is the fallback so no firm ever sees a flat list.
 *
 * Pass `smartLevel` from `priorityById.get(alert.id)?.level` (undefined when the
 * firm lacks the priority-queue permission or the alert isn't queued).
 */
export function effectiveTier(
  alert: Pick<PulseAlertPublic, 'actionDeadline' | 'changeKind'>,
  nowMs: number,
  smartLevel: PulsePriorityLevel | undefined,
): PulsePriorityLevel {
  if (smartLevel) return smartLevel
  const thresholds = thresholdsForKind(alert.changeKind)
  return proximityToTier(deadlineProximity(alert.actionDeadline, nowMs, thresholds).proximity)
}

/**
 * Short mono time tag for the row meta strip — `3d left`, `2d overdue`,
 * `Due today`. Returns `null` for `scheduled`/`none` (silence is the signal).
 * Caller owns color: red only for overdue/imminent, neutral otherwise, so the
 * pill and tag stay ONE cue (red-restraint rule).
 *
 * INTENTIONAL divergence from DueCountdownText ("in 3d / 3d late / today"),
 * reviewed 2026-07-22 cross-surface sweep: this is the alert ACTION-WINDOW
 * axis ("how long you have LEFT to act on a regulatory change"), semantically
 * distinct from an obligation's FILING due date. "left"/"overdue" reads as a
 * countdown-to-act; "in Nd"/"late" reads as a filing schedule. Forcing them
 * onto one vocabulary would conflate two different questions. Do not "unify".
 */
export function proximityTimeTag(result: ProximityResult): string | null {
  const { proximity, days } = result
  if (days === null || proximity === 'scheduled' || proximity === 'none') return null
  if (days < 0) return `${Math.abs(days)}d overdue`
  if (days === 0) return 'Due today'
  return `${days}d left`
}
