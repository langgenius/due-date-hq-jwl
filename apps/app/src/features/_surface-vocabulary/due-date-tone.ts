/**
 * Canonical due-date TONE vocabulary, shared by every surface that colours a
 * date by urgency — /alerts AND /deadlines. One home so "late = red" can't
 * drift into three hand-rolled mappings (it had: PulseAlertRow + DeadlineRow's
 * DueDaysPill + the rail + the group-header each hardcoding their own).
 *
 * There are TWO distinct axes; keep them separate:
 *
 *  1. SHIFT DIFF (alerts) — a due date MOVED from old → new. The signed day
 *     delta is relief-or-alarm: a deadline pushed LATER is good news (more
 *     time), pulled SOONER is the dangerous case.
 *       sooner (negative) → destructive · later (positive) → success · same → neutral
 *
 *  2. COUNTDOWN (deadlines) — days until a due date (negative = overdue). This
 *     is an urgency ramp, not relief: overdue is loud, due-soon is a warning,
 *     comfortably-future is quiet.
 *       overdue (< 0) → destructive · soon (0–7) → warning · upcoming (> 7) → neutral
 */

// ── 1. Shift diff (alerts: old → new due date) ──────────────────────────────
export type DueDateDiffTone = 'sooner' | 'later' | 'same'

export function dueDateDiffTone(daysDiff: number): DueDateDiffTone {
  if (daysDiff < 0) return 'sooner'
  if (daysDiff > 0) return 'later'
  return 'same'
}

/** Text-colour token per shift-diff tone — the one place the diff colour lives. */
export const DUE_DATE_DIFF_TONE_CLASS: Record<DueDateDiffTone, string> = {
  sooner: 'text-text-destructive',
  later: 'text-text-success',
  same: 'text-text-muted',
}

// ── 2. Countdown (deadlines: days until due, negative = overdue) ─────────────
export type DueCountdownTone = 'overdue' | 'soon' | 'upcoming'

/**
 * `daysUntilDue` is signed: negative = overdue, 0 = due today, positive = future.
 * The 0–7 "soon" band matches the deadline queue's prior `dueDaysTone` ladder
 * exactly (overdue → destructive, ≤7 → warning, else → neutral), so adopting
 * this is a pixel-for-pixel swap for the due-days pill.
 */
export function dueCountdownTone(daysUntilDue: number): DueCountdownTone {
  if (daysUntilDue < 0) return 'overdue'
  if (daysUntilDue <= 7) return 'soon'
  return 'upcoming'
}

// The urgency colours are single-sourced here; only the NEUTRAL step differs by
// context (a prominent value reads primary, a quiet caption reads muted).
const OVERDUE_TEXT = 'text-text-destructive'
const SOON_TEXT = 'text-text-warning'

/** For a prominent due value (the due-days pill): neutral reads `primary`. */
export const DUE_COUNTDOWN_TEXT_CLASS: Record<DueCountdownTone, string> = {
  overdue: OVERDUE_TEXT,
  soon: SOON_TEXT,
  upcoming: 'text-text-primary',
}

/** For a quiet caption (the navigator rail's relative-due line): neutral muted. */
export const DUE_COUNTDOWN_TEXT_CLASS_QUIET: Record<DueCountdownTone, string> = {
  overdue: OVERDUE_TEXT,
  soon: SOON_TEXT,
  upcoming: 'text-text-muted',
}
