import { useMemo } from 'react'
import { motion } from 'motion/react'
import { useQuery } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { PinIcon } from 'lucide-react'

import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'

import { fadeMotion } from '@/lib/motion'
import { DueDateLabel } from '@/components/primitives/due-date-label'
import { TaxCodeBadge } from '@/components/primitives/tax-code-label'
import { PinButton } from '@/features/obligations/PinButton'
import { ObligationStatusReadBadge } from '@/features/obligations/status-control'
import { daysUntilEffectiveInternalDueDate } from '@/features/obligations/queue/helpers'
import { orpc } from '@/lib/rpc'

// Cap the section — pins are a focused shortlist, not a second queue. A CPA who
// pins more than this is using it as a filter; they should open /deadlines.
const PINNED_DISPLAY_LIMIT = 8

/**
 * /today "Pinned" section. Lists the deadlines the CPA has manually starred
 * (obligation_instance.is_pinned), most-urgent first. The whole section is
 * hidden when there are no pins — it never claims real estate it hasn't earned.
 *
 * Reads the real `obligations.list` query with the `pinned` lens, so every
 * field traces to a backend column. Each row reuses the canonical row
 * primitives (TaxCodeBadge / DueDateLabel / status badge) and opens the same
 * obligation drawer the rest of /today uses.
 */
export function PinnedSection({
  asOfDate,
  onOpenObligation,
}: {
  asOfDate: string | null
  onOpenObligation: (obligationId: string) => void
}) {
  const { t } = useLingui()
  const pinnedQuery = useQuery(
    orpc.obligations.list.queryOptions({
      input: {
        pinned: true,
        sort: 'due_asc',
        limit: PINNED_DISPLAY_LIMIT,
        ...(asOfDate ? { asOfDate } : {}),
      },
    }),
  )

  const rows = useMemo(() => pinnedQuery.data?.rows ?? [], [pinnedQuery.data])

  // Loading flashes nothing — the section is opt-in, so a brief absence reads
  // as "no pins" which is the common case. Only render the skeleton once we
  // know there's data coming (placeholder rows would imply pins that may not
  // exist).
  if (pinnedQuery.isLoading) {
    return (
      <section aria-label={t`Pinned`} aria-busy className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <PinIcon className="size-4 text-text-tertiary" aria-hidden />
          <h2 className="text-region-title text-text-primary">
            <Trans>Pinned</Trans>
          </h2>
        </div>
        <Skeleton className="h-16 rounded-xl" />
      </section>
    )
  }

  // No pins (or a failed load) → render nothing. The Pinned section only shows
  // when there's something pinned.
  if (rows.length === 0) return null

  return (
    <section aria-label={t`Pinned`} className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {/* Accent lives in the icon container, not the title text. */}
        <PinIcon className="size-4 text-text-accent" aria-hidden />
        <h2 className="text-region-title text-text-primary">
          <Trans>Pinned</Trans>
        </h2>
      </div>

      {/* Flat list inside one bordered card (canon: border + bg contrast for
          lift, no shadow; 12 wrapper radius). Rows are divided by hairlines,
          not boxed individually. The card fades in as one surface when the pins
          land (section arrival only — rows never animate; this is a work
          surface, not a reveal). */}
      <motion.div {...fadeMotion}>
        <ul className="divide-y divide-border-subtle overflow-hidden rounded-xl border border-border bg-background">
          {rows.map((row) => {
            const days = daysUntilEffectiveInternalDueDate(row, asOfDate ?? undefined)
            return (
              <li key={row.id}>
                <div className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-background-section">
                  <PinButton obligationId={row.id} isPinned={row.isPinned} />
                  {/* Client + form is the row's identity anchor — clicking it
                    opens the deadline drawer. */}
                  <button
                    type="button"
                    onClick={() => onOpenObligation(row.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-text-primary">
                        {row.clientName}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1.5">
                        <TaxCodeBadge code={row.taxType} size="compact" />
                      </span>
                    </span>
                    <DueDateLabel
                      days={days}
                      status={row.status}
                      paymentDueDate={row.paymentDueDate}
                      asOfDate={asOfDate}
                      className="shrink-0"
                    />
                    <ObligationStatusReadBadge status={row.status} className="shrink-0" />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      </motion.div>
    </section>
  )
}
