import { useMemo, useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { ArrowRightIcon, ChevronDownIcon, ChevronUpIcon, SparklesIcon } from 'lucide-react'
import { Link } from 'react-router'

import type { DashboardTopRow } from '@duedatehq/contracts'
import { cn } from '@duedatehq/ui/lib/utils'

import { ReadinessIndicator } from '@/components/primitives/readiness-indicator'
import { TaxCodeBadge } from '@/components/primitives/tax-code-label'
import { AssigneeAvatar } from '@/features/obligations/AssigneeAvatar'
import { ObligationStatusReadBadge } from '@/features/obligations/status-control'
import { formatDatePretty } from '@/lib/utils'

/**
 * MergedBriefCard — Pencil `jXPZ9`, refined per Yuqi: compact + informative.
 *
 * "Today's brief" IS the deadline queue, grouped by time only. The three count
 * chips (overdue / ending today / this week) ARE the view selector — click one
 * to switch which bucket shows; there is no separate segmented control. Each row
 * carries the full triage payload that the old Priority Actions table did
 * (action verb + Docs N/M readiness + status + owner + due), so this single card
 * replaces it. Minimal chrome: the card is the only frame — rows separate by
 * space + hover, not borders or dividers.
 */
export interface MergedBriefCounts {
  overdue: number
  endingToday: number
  thisWeek: number
}

type Bucket = 'overdue' | 'today' | 'week'

const ROWS_PER_BUCKET = 4

function daysUntil(dueIso: string, asOf: Date): number {
  const due = Date.parse(dueIso)
  if (Number.isNaN(due)) return 0
  const a = Date.UTC(asOf.getFullYear(), asOf.getMonth(), asOf.getDate())
  const d = new Date(due)
  const b = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  return Math.round((b - a) / 86_400_000)
}

export function MergedBriefCard({
  counts,
  rows,
  asOfDate,
  onOpenObligation,
}: {
  counts: MergedBriefCounts
  rows: readonly DashboardTopRow[]
  asOfDate: string | null
  onOpenObligation: (obligationId: string) => void
}) {
  const { t } = useLingui()
  const [collapsed, setCollapsed] = useState(false)
  const asOf = useMemo(() => (asOfDate ? new Date(asOfDate) : new Date()), [asOfDate])

  const byBucket = useMemo(() => {
    const by: Record<Bucket, DashboardTopRow[]> = { overdue: [], today: [], week: [] }
    for (const r of rows) {
      const d = daysUntil(r.currentDueDate, asOf)
      if (d < 0) by.overdue.push(r)
      else if (d === 0) by.today.push(r)
      else if (d <= 7) by.week.push(r)
    }
    return by
  }, [rows, asOf])

  const tabs = [
    { key: 'overdue' as const, label: t`overdue`, count: counts.overdue, urgent: true },
    { key: 'today' as const, label: t`ending today`, count: counts.endingToday, urgent: false },
    { key: 'week' as const, label: t`this week`, count: counts.thisWeek, urgent: false },
  ]

  // No explicit pick yet → follow the data (first non-empty bucket, overdue
  // leading). Derived (not initial-state) so it stays correct as counts load in;
  // once the user clicks a chip we honor that choice.
  const [override, setOverride] = useState<Bucket | null>(null)
  const selected: Bucket =
    override ?? (counts.overdue > 0 ? 'overdue' : counts.endingToday > 0 ? 'today' : 'week')
  const activeTotal =
    selected === 'overdue'
      ? counts.overdue
      : selected === 'today'
        ? counts.endingToday
        : counts.thisWeek
  const shown = byBucket[selected].slice(0, ROWS_PER_BUCKET)
  const moreCount = Math.max(0, activeTotal - shown.length)

  return (
    <section
      aria-label={t`Daily brief`}
      className="flex flex-col gap-3 rounded-xl border border-divider-regular bg-background-default px-[18px] py-3.5"
    >
      {/* Header — sparkles + title + the count-chip selector + collapse. */}
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
        <span
          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-background-section"
          aria-hidden
        >
          <SparklesIcon className="size-3.5 text-text-primary" />
        </span>
        <h2 className="text-base leading-tight font-semibold text-text-primary">
          <Trans>Today's brief</Trans>
        </h2>

        <div className="ml-auto flex flex-wrap items-center gap-1">
          {tabs.map((tab) => {
            const active = tab.key === selected
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setOverride(tab.key)}
                aria-pressed={active}
                className={cn(
                  'inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:outline-none',
                  active
                    ? 'bg-components-segmented-item-bg-active font-medium text-components-segmented-text-active'
                    : 'text-text-tertiary hover:bg-background-section',
                )}
              >
                <span
                  className={cn(
                    'font-semibold tabular-nums',
                    active
                      ? 'text-text-primary'
                      : tab.urgent && tab.count > 0
                        ? 'text-text-destructive'
                        : 'text-text-secondary',
                  )}
                >
                  {tab.count}
                </span>
                <span>{tab.label}</span>
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? t`Expand brief` : t`Collapse brief`}
            aria-expanded={!collapsed}
            className="ml-0.5 inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-background-section hover:text-text-secondary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:outline-none"
          >
            {collapsed ? (
              <ChevronDownIcon className="size-3.5" aria-hidden />
            ) : (
              <ChevronUpIcon className="size-3.5" aria-hidden />
            )}
          </button>
        </div>
      </div>

      {/* Body — the selected bucket's rows. No dividers: rows separate by space
          + hover so the card stays calm. */}
      {!collapsed ? (
        <div className="flex flex-col gap-0.5">
          {shown.length === 0 ? (
            <p className="px-2 py-1.5 text-sm text-text-tertiary">
              {activeTotal > 0 ? (
                <Trans>None in the priority shortlist — open the queue to see all {activeTotal}.</Trans>
              ) : (
                <Trans>Nothing here. You're clear.</Trans>
              )}
            </p>
          ) : (
            shown.map((row) => (
              <BriefRow key={row.obligationId} row={row} asOf={asOf} onOpen={onOpenObligation} />
            ))
          )}

          <div className="mt-1 flex items-center justify-between gap-3 px-2">
            {moreCount > 0 ? (
              <Link
                to="/deadlines"
                className="inline-flex items-center gap-1 text-caption font-medium text-text-secondary outline-none transition-colors hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
              >
                <Trans>View {moreCount} more</Trans>
                <ArrowRightIcon className="size-2.5" aria-hidden />
              </Link>
            ) : (
              <span />
            )}
            <Link
              to="/deadlines"
              className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-text-secondary outline-none transition-colors hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
            >
              <Trans>Open queue</Trans>
              <ArrowRightIcon className="size-3" aria-hidden />
            </Link>
          </div>
        </div>
      ) : null}
    </section>
  )
}

function BriefRow({
  row,
  asOf,
  onOpen,
}: {
  row: DashboardTopRow
  asOf: Date
  onOpen: (obligationId: string) => void
}) {
  const { t } = useLingui()
  const d = daysUntil(row.currentDueDate, asOf)
  const dueText =
    d < 0
      ? t`past ${formatDatePretty(row.currentDueDate)}`
      : d === 0
        ? t`EOD`
        : formatDatePretty(row.currentDueDate)
  // Action verb inline — the lingui `t` macro must stay in component scope;
  // passing it into a helper compiles fine (tsgo) but returns "" at runtime.
  const verb =
    row.status === 'waiting_on_client'
      ? t`Follow up with the client for documents`
      : row.evidenceCount === 0
        ? t`Attach the source document`
        : row.status === 'review'
          ? t`Review the prepared return and sign off`
          : d <= 0
            ? t`Confirm filing or payment status`
            : d <= 2
              ? t`Final-check owner, source, and cutoff`
              : t`Re-verify the source still applies`
  return (
    <button
      type="button"
      onClick={() => onOpen(row.obligationId)}
      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left outline-none transition-colors hover:bg-background-section focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-state-accent-active-alt"
    >
      <TaxCodeBadge code={row.taxType} />
      {/* Client + the instruction/readiness sub-line, aligned together. */}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-medium text-text-primary">{row.clientName}</span>
        <span className="flex min-w-0 items-center gap-1.5 text-caption text-text-tertiary">
          <span className="truncate">{verb}</span>
          <ReadinessIndicator
            obligationType={row.obligationType}
            attached={row.evidenceCount}
            className="shrink-0"
          />
        </span>
      </span>
      <ObligationStatusReadBadge status={row.status} className="h-5 shrink-0 text-caption-xs" />
      <AssigneeAvatar name={row.assigneeName} title={row.assigneeName ?? t`Unassigned`} />
      <span className="w-[56px] shrink-0 text-right text-caption tabular-nums text-text-secondary">
        {dueText}
      </span>
    </button>
  )
}
