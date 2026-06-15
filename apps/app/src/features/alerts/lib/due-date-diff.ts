/**
 * Canonical tone for a deadline-shift day delta, shared by every surface that
 * renders an old→new due-date diff (the list row's KeyChange + the detail
 * hero's DeadlineChangeCard).
 *
 * 2026-06-15 (critique #8/#9): the two surfaces had drifted — the detail painted
 * "later" GREEN (relief) while the list painted it AMBER, so one alert's shift
 * read positive in one place and cautionary in another; and a 0-day (no-op)
 * shift rendered a coloured "+0 days" / "0 days later" instead of a neutral
 * "no change". One helper now owns the meaning:
 *   • sooner (negative) → destructive — the deadline moved up, less time, urgent.
 *   • later   (positive) → success — more time, relief.
 *   • same    (zero)     → neutral — the date didn't actually move.
 */
export type DueDateDiffTone = 'sooner' | 'later' | 'same'

export function dueDateDiffTone(daysDiff: number): DueDateDiffTone {
  if (daysDiff < 0) return 'sooner'
  if (daysDiff > 0) return 'later'
  return 'same'
}

/** Text-colour token per tone — the one place the diff's colour is decided. */
export const DUE_DATE_DIFF_TONE_CLASS: Record<DueDateDiffTone, string> = {
  sooner: 'text-text-destructive',
  later: 'text-text-success',
  same: 'text-text-muted',
}
