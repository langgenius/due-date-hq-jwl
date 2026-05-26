/**
 * `EmptyCellMark` — tiny primitive for "checked, nothing here" table
 * cells.
 *
 * Renders an em-dash (`—`, U+2014) in `text-text-tertiary` with an
 * accessible label so screen readers announce "no data" instead of
 * "dash". Stripe-pattern empty-cell semantics: use the em-dash ONLY
 * when 0 / null means "nothing here," not when a value happens to be
 * zero (those still render the number — a zero count is meaningful).
 *
 * Usage:
 *   <EmptyCellMark />
 *   <EmptyCellMark label="No opportunities" />
 *
 * 2026-05-26 (Stripe-level Phase A): canonical empty-cell primitive
 * per docs/Design/stripe-level-critique-2026-05-26.md §S10.
 */
export function EmptyCellMark({ label }: { label?: string }) {
  return (
    <span className="text-text-tertiary" aria-label={label ?? 'No data'}>
      —
    </span>
  )
}
