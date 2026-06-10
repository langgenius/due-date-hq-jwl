import type { ComponentType, ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { CircleAlertIcon, Clock3Icon, FlameIcon } from 'lucide-react'
import { Plural, Trans, useLingui } from '@lingui/react/macro'

import type { ObligationQueueRow } from '@duedatehq/contracts'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { cn } from '@duedatehq/ui/lib/utils'

/**
 * DeadlinesAtAGlance — the "AT A GLANCE" narrative tile row from the
 * /deadlines design (Pencil node `u3nNA`; tiles `Mi5CE` / `H0GSr` /
 * `Y1IdZj`).
 *
 * Unlike the /today AtAGlance tiles (numeric headlines from the
 * dashboard summary), these three tiles are *narrative*: each names the
 * single most-pressing item in its bucket and a short supporting line.
 *
 *   1. TODAY (overdue)   — the most-overdue open row, by daysUntilDue.
 *   2. THIS WEEK         — rows due in the next 1–7 days; names up to
 *                          three clients + the bucket count.
 *   3. NEEDS YOU         — rows in `review`; names the first + the count.
 *
 * All content is derived from the already-loaded queue `rows` — no extra
 * round-trip, no contract change. Tones map onto the existing token
 * system (destructive / warning / accent); the Pencil "Verdant" canvas
 * hexes are NOT ported.
 *
 * TODO(data): the design's supporting lines carry figures the queue row
 * contract does NOT expose — `$1,840 penalty exposure` (estimatedExposure
 * is omitted from ObligationQueueRow) and `est. 1h 40m focus`
 * (no focus-time estimate in the contract). Those specific numbers are
 * left out of the derived sub-lines; we surface the counts + dates we DO
 * have. Restore the richer copy once exposure + effort land on the row.
 */
type TileTone = 'destructive' | 'warning' | 'accent'

const ICON_CHIP_TONE: Record<TileTone, string> = {
  destructive: 'bg-state-destructive-hover text-text-destructive',
  warning: 'bg-state-warning-hover text-text-warning',
  accent: 'bg-state-accent-hover text-text-accent',
}

const TERMINAL_STATUSES = new Set(['done', 'completed', 'paid', 'not_applicable', 'filed'])

function formatClientList(names: readonly string[]): string {
  const unique = [...new Set(names)]
  if (unique.length === 0) return ''
  if (unique.length === 1) return unique[0]!
  if (unique.length === 2) return `${unique[0]}, ${unique[1]}`
  return `${unique[0]}, ${unique[1]} and ${unique[2]}`
}

export function DeadlinesAtAGlance({
  rows,
  reviewCount,
  isLoading,
  onOpenScope,
}: {
  rows: readonly ObligationQueueRow[]
  /** Server-side review-scope facet count (preferred over the loaded slice). */
  reviewCount: number
  isLoading: boolean
  /** Drill-in handler — receives the status scope filter to apply. */
  onOpenScope: (scope: 'overdue' | 'this_week' | 'review') => void
}) {
  const { t } = useLingui()

  // Collapse this card row as the page scrolls (hysteresis: collapse
  // >40px, expand <8px). The whole /deadlines
  // page now scrolls as one (the table no longer has its own scroll), so the
  // nearest scrollable ancestor is the app-shell main — found at mount. The
  // row only renders when the detail panel is closed, which is exactly when
  // the page scrolls, so the ancestor lookup always lands on the page scroll.
  const rootRef = useRef<HTMLDivElement>(null)
  const [collapsed, setCollapsed] = useState(false)
  useEffect(() => {
    const node = rootRef.current
    if (!node) return undefined
    // Find the nearest scrollable ancestor by overflow-y alone — NOT by
    // current scrollHeight (the page often still fits at mount, before rows
    // finish loading, which would miss the real scroll root).
    let scroller: HTMLElement | null = node.parentElement
    while (scroller) {
      const style = getComputedStyle(scroller)
      if (/(auto|scroll)/.test(style.overflowY)) break
      scroller = scroller.parentElement
    }
    const target: HTMLElement | Window = scroller ?? window
    const read = () => {
      const top = scroller ? scroller.scrollTop : window.scrollY
      setCollapsed((prev) => (prev ? top > 8 : top > 40))
    }
    read()
    target.addEventListener('scroll', read, { passive: true })
    return () => target.removeEventListener('scroll', read)
  }, [])

  const openRows = rows.filter((row) => !TERMINAL_STATUSES.has(row.status))

  const mostOverdue = openRows
    .filter((row) => row.daysUntilDue < 0)
    .toSorted((a, b) => a.daysUntilDue - b.daysUntilDue)[0]

  const thisWeekRows = openRows.filter((row) => row.daysUntilDue >= 0 && row.daysUntilDue <= 7)
  const reviewRows = rows.filter((row) => row.status === 'review')
  const reviewHeadlineClient = reviewRows[0]?.clientName
  const effectiveReviewCount = reviewCount > 0 ? reviewCount : reviewRows.length

  return (
    <div
      ref={rootRef}
      className={cn(
        'grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out',
        collapsed
          ? 'pointer-events-none -mt-8 grid-rows-[0fr] opacity-0'
          : 'grid-rows-[1fr] opacity-100',
      )}
      aria-hidden={collapsed}
    >
      <div className="overflow-hidden">
        <section aria-label={t`At a glance`} className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <NarrativeTile
            icon={FlameIcon}
            tone="destructive"
            label={<Trans>Today</Trans>}
            loading={isLoading}
            headline={
              mostOverdue ? (
                <Trans>
                  {mostOverdue.clientName} is {Math.abs(mostOverdue.daysUntilDue)} days overdue —
                  highest exposure
                </Trans>
              ) : (
                <Trans>Nothing overdue — you&apos;re clear</Trans>
              )
            }
            sub={
              mostOverdue ? (
                <Trans>
                  Most overdue open deadline · due {formatDueDate(mostOverdue.currentDueDate)}
                </Trans>
              ) : (
                <Trans>No open deadline has slipped past its due date</Trans>
              )
            }
            onClick={() => onOpenScope('overdue')}
            ariaLabel={t`View overdue deadlines`}
          />
          <NarrativeTile
            icon={Clock3Icon}
            tone="warning"
            label={<Trans>This week</Trans>}
            loading={isLoading}
            headline={
              thisWeekRows.length > 0 ? (
                <Trans>
                  {formatClientList(thisWeekRows.map((row) => row.clientName))} are filing soon
                </Trans>
              ) : (
                <Trans>No deadlines due in the next 7 days</Trans>
              )
            }
            sub={
              thisWeekRows.length > 0 ? (
                <Plural
                  value={thisWeekRows.length}
                  one="# deadline due in the next 7 days"
                  other="# deadlines due in the next 7 days"
                />
              ) : (
                <Trans>The week ahead is clear</Trans>
              )
            }
            onClick={() => onOpenScope('this_week')}
            ariaLabel={t`View deadlines due this week`}
          />
          <NarrativeTile
            icon={CircleAlertIcon}
            tone="accent"
            label={<Trans>Needs you</Trans>}
            loading={isLoading}
            headline={
              reviewHeadlineClient ? (
                <Trans>{reviewHeadlineClient} is waiting on your review</Trans>
              ) : (
                <Trans>Nothing is waiting on your review</Trans>
              )
            }
            sub={
              effectiveReviewCount > 0 ? (
                <Plural
                  value={effectiveReviewCount}
                  one="# item awaiting your eyes"
                  other="# items awaiting your eyes"
                />
              ) : (
                <Trans>Your review queue is empty</Trans>
              )
            }
            onClick={() => onOpenScope('review')}
            ariaLabel={t`View items needing your review`}
          />
        </section>
      </div>
    </div>
  )
}

function NarrativeTile({
  icon: Icon,
  tone,
  label,
  headline,
  sub,
  loading,
  onClick,
  ariaLabel,
}: {
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  tone: TileTone
  label: ReactNode
  headline: ReactNode
  sub: ReactNode
  loading: boolean
  onClick: () => void
  ariaLabel: string
}) {
  return (
    // Every element + text token below is matched to the /today alert
    // card (needs-attention-card.tsx) so the two surfaces read as one system —
    //   • card chrome → `rounded-xl bg-background-section p-[18px]` +
    //     `hover:bg-background-subtle transition-colors duration-200`
    //   • eyebrow label → `text-caption font-semibold tracking-[0.4px]
    //     text-text-tertiary uppercase` (matches the card's change-kind /
    //     meta eyebrow)
    //   • headline → `text-[14px] font-semibold leading-[1.3]
    //     text-text-primary` (matches the card's title h3)
    //   • sub line → `text-xs text-text-secondary` (matches the card's
    //     affects-clients line)
    // The tone icon-chip keeps the `bg-state-{tone}-hover text-text-{tone}`
    // token pair the card's High-impact pill already uses.
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-xl bg-background-section p-[18px] text-left',
        'outline-none transition-colors duration-200 hover:bg-background-subtle',
        'focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
      )}
    >
      <span
        className={cn(
          'flex size-7 shrink-0 items-center justify-center rounded-full',
          ICON_CHIP_TONE[tone],
        )}
      >
        <Icon className="size-3.5" aria-hidden />
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-caption font-semibold tracking-[0.4px] text-text-tertiary uppercase">
          {label}
        </span>
        {loading ? (
          <>
            <Skeleton className="h-4 w-48" aria-hidden />
            <Skeleton className="mt-1 h-3 w-32" aria-hidden />
          </>
        ) : (
          <>
            <span className="text-[14px] font-semibold leading-[1.3] text-text-primary">
              {headline}
            </span>
            <span className="text-xs leading-snug text-text-secondary">{sub}</span>
          </>
        )}
      </span>
    </button>
  )
}

function formatDueDate(value: string): string {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date)
}
