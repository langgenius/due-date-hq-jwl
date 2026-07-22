import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { useLingui } from '@lingui/react/macro'

import type { ClientPublic, ObligationInstancePublic } from '@duedatehq/contracts'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { cn } from '@duedatehq/ui/lib/utils'
import { CapsFieldLabel } from '@/components/primitives/caps-field-label'
import { JurisdictionChip } from '@/components/primitives/state-badge'
import { formatDatePretty } from '@/lib/utils'
import { fadeMotion } from '@/lib/motion'

import { useClientNextDue } from './use-client-next-due'

// "Filed" counts filings that are done/closed. `done` is the status that
// displays as "Filed" (Filed ≠ Done per the workflow), `completed` is the v2
// terminal, `paid` is filed + paid. `not_applicable` is deliberately excluded —
// it's not a filing. Labeled "Filed" (not "Filed YTD") because this is a
// status-based count with no year-to-date date window — matching the /clients
// table column (ClientFactsWorkspace), which was renamed for the same reason.
const FILED_STATUSES: ReadonlySet<string> = new Set(['done', 'completed', 'paid'])

type SummaryCell = {
  key: string
  label: string
  /** Pre-rendered value node (a mono number, a date, or jurisdiction chips). */
  value: ReactNode
  onClick?: () => void
  ariaLabel?: string
}

function summaryNumber(value: number) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={value}
        {...fadeMotion}
        className={cn(
          'text-lg leading-none font-medium tracking-tight tabular-nums whitespace-nowrap',
          value > 0 ? 'text-text-primary' : 'text-text-tertiary',
        )}
      >
        {value}
      </motion.span>
    </AnimatePresence>
  )
}

/**
 * ClientSummaryStrip — the /clients/[id] hero fact strip: Jurisdictions ·
 * Blocked · Open · Filed · Next due.
 *
 * Replicates Pencil `VtC73`: a single `bg-subtle` rounded-xl panel with the
 * facts as hairline-divider cells inside (10/700 muted label + a big
 * JetBrains-Mono number, color-coded). One grouped panel — not a stretched
 * borderless band, not five separate bordered cards — so the facts read as a
 * defined block. Count cells drill into the matching filtered queue.
 */
export function ClientSummaryStrip({
  client,
  obligations,
  isLoading,
}: {
  client: ClientPublic
  obligations: readonly ObligationInstancePublic[]
  /** In-flight obligations fetch — shows a skeleton panel instead of computing
   *  falsely-calm zeros from an empty obligation set. */
  isLoading?: boolean
}) {
  const { t } = useLingui()
  const navigate = useNavigate()
  const { nextDue, openCount } = useClientNextDue(obligations)
  const nextDueOverdue = nextDue ? Date.parse(nextDue.currentDueDate) < Date.now() : false

  const blockedCount = useMemo(
    () => obligations.filter((o) => o.status === 'blocked').length,
    [obligations],
  )

  // Filed — obligations that have been filed/closed (see FILED_STATUSES).
  const filedCount = useMemo(
    () => obligations.filter((o) => FILED_STATUSES.has(o.status)).length,
    [obligations],
  )
  const totalObligations = obligations.length

  // Distinct filing jurisdictions: the primary state + each non-archived filing
  // profile's state. Sorted, deduped.
  const jurisdictions = useMemo(() => {
    const set = new Set<string>()
    if (client.state) set.add(client.state)
    for (const profile of client.filingProfiles) {
      if (!profile.archivedAt) set.add(profile.state)
    }
    return [...set].toSorted()
  }, [client.state, client.filingProfiles])

  if (isLoading) {
    return <Skeleton className="h-[84px] w-full rounded-xl" />
  }

  const cells: SummaryCell[] = [
    {
      key: 'jurisdictions',
      label: t`Jurisdictions`,
      value:
        jurisdictions.length > 0 ? (
          <span className="flex flex-wrap items-center gap-2">
            {jurisdictions.map((code) => (
              // Canonical framed seal+code chip (2026-07-22 sweep — was a
              // hand-rolled filled cluster that forked the jurisdiction look
              // from every other surface).
              <JurisdictionChip key={code} code={code} />
            ))}
          </span>
        ) : (
          <span className="text-lg leading-none font-medium text-text-tertiary">—</span>
        ),
    },
    {
      key: 'blocked',
      label: t`Blocked`,
      value: summaryNumber(blockedCount),
      ...(blockedCount > 0
        ? {
            onClick: () => void navigate(`/deadlines?client=${client.id}&status=blocked`),
            ariaLabel: t`View blocked deadlines`,
          }
        : {}),
    },
    {
      key: 'open',
      label: t`Open`,
      value: summaryNumber(openCount),
      ...(openCount > 0
        ? {
            onClick: () => void navigate(`/deadlines?client=${client.id}`),
            ariaLabel: t`View open filings for this client`,
          }
        : {}),
    },
    {
      key: 'filed',
      label: t`Filed`,
      value: summaryNumber(filedCount),
      ...(filedCount > 0
        ? {
            onClick: () =>
              void navigate(`/deadlines?client=${client.id}&status=done,completed,paid`),
            ariaLabel: t`View filed deadlines`,
          }
        : {}),
    },
    {
      key: 'next-due',
      label: t`Next due`,
      value: nextDue ? (
        <span
          className={cn(
            // Same canonical stat-value size as the counts so the whole band
            // reads as one consistent set of numbers (Yuqi "why are the numbers
            // inconsistent? are these sizes used elsewhere?" — the prior 18px
            // date was a one-off, off the StatBand scale). Red carries the
            // overdue urgency — the band's single accent.
            // 500 (font-medium): the date is key data, 600 is titles-only.
            'text-lg leading-none font-medium tracking-tight tabular-nums whitespace-nowrap',
            nextDueOverdue ? 'text-text-warning' : 'text-text-primary',
          )}
        >
          {formatDatePretty(nextDue.currentDueDate)}
        </span>
      ) : (
        <span className="text-lg leading-none font-medium text-text-tertiary">—</span>
      ),
    },
  ]

  return (
    <section
      aria-label={t`Client summary`}
      // One grouped panel (VtC73 MetaStrip): bg-subtle rounded-xl, cells split
      // by hairline dividers. NO wrap — scrolls horizontally when the column is
      // squeezed (obligation panel open) so a cell never orphans onto a 2nd line
      // (Yuqi: NEXT DUE was wrapping under JURISDICTIONS at panel-open).
      className="flex flex-col gap-2.5 rounded-xl bg-background-subtle px-2 py-3"
    >
      <div className="flex overflow-x-auto">
        {cells.map((cell, i) => {
          const body = (
            <>
              <CapsFieldLabel as="span" variant="group" className="whitespace-nowrap">
                {cell.label}
              </CapsFieldLabel>
              <span className="flex min-h-[28px] items-center">{cell.value}</span>
            </>
          )
          const cellClass = cn(
            // No `min-w-0`: cells size to at least their content (label + value),
            // so the long "JURISDICTIONS" label and the "May 12" date never
            // shrink below their width and overflow into the neighbouring cell /
            // wrap to a second line. flex-1 distributes the remaining width.
            'flex flex-1 flex-col justify-center gap-2 px-4',
            i > 0 && 'border-l border-divider-subtle',
          )
          if (cell.onClick) {
            return (
              <button
                key={cell.key}
                type="button"
                onClick={cell.onClick}
                aria-label={cell.ariaLabel}
                className={cn(
                  cellClass,
                  '-my-2 cursor-pointer rounded-lg py-2 text-left transition hover:bg-state-base-hover active:scale-[0.99] motion-reduce:active:scale-100',
                  'focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:outline-none',
                )}
              >
                {body}
              </button>
            )
          }
          return (
            <div key={cell.key} className={cellClass}>
              {body}
            </div>
          )
        })}
      </div>
      {/* Filed-progress footer (img-080): a subtle filed-of-total bar under the
          band — a depth accent that doesn't disturb the uniform cell numbers.
          Real data: filed count ÷ total obligations for this client. */}
      {totalObligations > 0 ? (
        <div className="flex items-center gap-2 px-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-background-section">
            <div
              className="h-full rounded-full bg-state-success-solid transition-[width] duration-300 ease-apple motion-reduce:transition-none"
              style={{ width: `${Math.round((filedCount / totalObligations) * 100)}%` }}
            />
          </div>
          <span className="shrink-0 text-caption-xs font-medium text-text-tertiary">
            {/* "filed" label so the bare fraction isn't an orphaned "0/4" — it
                names what the green bar measures (filed of total filings). */}
            <span className="tabular-nums">
              {filedCount}/{totalObligations}
            </span>{' '}
            {t`filed`}
          </span>
        </div>
      ) : null}
    </section>
  )
}
