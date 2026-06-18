import { Fragment, useMemo } from 'react'
import { Plural, Trans, useLingui } from '@lingui/react/macro'

import type { AuditEventPublic, ObligationQueueRow } from '@duedatehq/contracts'

import { CapsFieldLabel } from '@/components/primitives/caps-field-label'
import { daysBetween, formatDatePretty } from '@/lib/utils'

/**
 * Inline key-dates summary rendered on the Completed stage. The
 * terminal stage card is otherwise sparse — just a stage label and
 * a "Archive workpapers" reminder. CPAs landing on a closed
 * obligation are usually answering "when did this close and how
 * long did it take" for client communication or year-end review;
 * this card surfaces those answers without forcing a trip to the
 * Dates panel.
 *
 * Dates derived from audit events:
 *  - Filed: first event where status became `done`
 *  - Completed: first event where status became `completed`
 *  - Total turnaround: createdAt → completed (in days)
 *
 * `row.createdAt` is always available; the other two only render if
 * we have audit evidence for them (some rows skip directly to
 * completed via the status picker without a `done` intermediate
 * stop — for those, the Filed row is omitted).
 */
export function CompletedKeyDates({
  row,
  auditEvents,
}: {
  row: ObligationQueueRow
  auditEvents: readonly AuditEventPublic[]
}) {
  const { t } = useLingui()
  const [filedAt, completedAt] = useMemo(() => {
    let filed: string | null = null
    let completed: string | null = null
    for (const event of auditEvents) {
      if (event.action !== 'status_changed') continue
      if (typeof event.afterJson !== 'object' || event.afterJson === null) continue
      const after = (event.afterJson as { status?: unknown }).status
      if (typeof after !== 'string') continue
      // Mine `paid` events as the Filed key date too. `paid` collapses
      // into the Filed milestone in lifecycle v2 (see MILESTONE_MAP in timeline.tsx
      // and STAGE_STATUS_GROUPS in routes/obligations.tsx). A row that
      // walks pending → paid → completed (no `done` intermediate stop —
      // payment-track obligations) would otherwise show a blank Filed
      // line on the terminal stage card.
      if ((after === 'done' || after === 'paid') && !filed) filed = event.createdAt
      if (after === 'completed' && !completed) completed = event.createdAt
    }
    return [filed, completed]
  }, [auditEvents])
  const turnaroundDays = useMemo(() => {
    if (!completedAt) return null
    return daysBetween(row.createdAt, completedAt)
  }, [row.createdAt, completedAt])
  const rows: Array<{ label: string; value: string }> = [
    // User-facing Key Dates panel uses prose dates.
    { label: t`Opened`, value: formatDatePretty(row.createdAt.slice(0, 10)) },
  ]
  if (filedAt) rows.push({ label: t`Filed`, value: formatDatePretty(filedAt.slice(0, 10)) })
  if (completedAt)
    rows.push({ label: t`Completed`, value: formatDatePretty(completedAt.slice(0, 10)) })
  return (
    // No frame chrome on this inner panel: it sits INSIDE the
    // already-tinted `ActiveStageDetailCard`, and the KEY DATES
    // uppercase tag + the gap-y-1 dl below carry enough section
    // grouping on their own. The consumer call site wraps this in
    // `<div className="mt-3">`, so no margin is needed here.
    <div>
      <CapsFieldLabel as="div" variant="group" className="mb-1.5 text-text-secondary">
        <Trans>Key dates</Trans>
      </CapsFieldLabel>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        {rows.map((r) => (
          <Fragment key={r.label}>
            <dt className="text-text-tertiary">{r.label}</dt>
            <dd className="text-right tabular-nums text-text-primary">{r.value}</dd>
          </Fragment>
        ))}
        {turnaroundDays !== null ? (
          <>
            <dt className="text-text-tertiary">
              <Trans>Cycle time</Trans>
            </dt>
            <dd className="text-right tabular-nums text-text-secondary">
              <Plural value={turnaroundDays} one="# day" other="# days" />
            </dd>
          </>
        ) : null}
      </dl>
    </div>
  )
}
