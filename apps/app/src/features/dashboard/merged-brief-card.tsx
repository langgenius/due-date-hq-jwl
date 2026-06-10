import { useMemo, useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { ArrowRightIcon, SparklesIcon } from 'lucide-react'
import { Link } from 'react-router'

import type { DashboardTopRow } from '@duedatehq/contracts'
import { cn } from '@duedatehq/ui/lib/utils'

import { DueDateLabel } from '@/components/primitives/due-date-label'
import { ReadinessIndicator } from '@/components/primitives/readiness-indicator'
import { TaxCodeBadge } from '@/components/primitives/tax-code-label'
import { AssigneeAvatar } from '@/features/obligations/AssigneeAvatar'
import { isPaymentOverdue, paymentOverdueDays } from '@/features/obligations/payment-overdue'
import { ObligationStatusReadBadge } from '@/features/obligations/status-control'
import { ExtensionChip } from './extension-chip'

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
    { key: 'overdue' as const, label: t`Overdue`, count: counts.overdue, dot: 'text-text-destructive' },
    { key: 'today' as const, label: t`Ending today`, count: counts.endingToday, dot: 'text-text-warning' },
    { key: 'week' as const, label: t`This week`, count: counts.thisWeek, dot: 'text-text-tertiary' },
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

  // One-line deterministic summary — the lede of the brief. It surfaces the
  // docs blocker the count chips can't, so it says something they don't.
  const overdueNeedingDocs = byBucket.overdue.filter((r) => r.evidenceCount === 0).length
  const weekAhead = counts.endingToday + counts.thisWeek
  const totalActive = counts.overdue + weekAhead

  return (
    <section
      aria-label={t`Priorities`}
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
        {/* "Priorities", not "Today's brief" — the card leads with overdue work,
            so a "today" headline would lie about its own content (Yuqi). */}
        <h2 className="text-base leading-tight font-semibold text-text-primary">
          <Trans>Priorities</Trans>
        </h2>

        {/* Status-scope segmented control borrowed verbatim from the /deadlines
            queue: rounded-full track, white active pill, tone dot + label + muted
            count. Pinned top-right (Yuqi). */}
        <div className="ml-auto flex items-center gap-0.5 rounded-full bg-background-subtle p-1">
          {tabs.map((tab) => {
            const active = tab.key === selected
            return (
              <button
                key={tab.key}
                type="button"
                data-active={active}
                onClick={() => setOverride(tab.key)}
                aria-pressed={active}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium text-text-secondary outline-none transition-colors hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt data-[active=true]:bg-background-default data-[active=true]:text-text-primary"
              >
                <span className={cn('size-1.5 shrink-0 rounded-full bg-current', tab.dot)} aria-hidden />
                <span className="whitespace-nowrap">{tab.label}</span>
                <span className="tabular-nums text-text-tertiary">{tab.count}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Body — the selected bucket's rows. No dividers: rows separate by space
          + hover so the card stays calm. */}
      <div className="flex flex-col gap-0.5">
          {/* Lede — one-line deterministic summary of the day. */}
          <p className="px-2 pb-1.5 text-sm text-text-secondary">
            {totalActive === 0 ? (
              <Trans>You're clear — nothing due in the next week.</Trans>
            ) : counts.overdue > 0 && overdueNeedingDocs > 0 ? (
              <Trans>
                {counts.overdue} overdue, {overdueNeedingDocs} awaiting source documents.
              </Trans>
            ) : counts.overdue > 0 ? (
              <Trans>{counts.overdue} overdue.</Trans>
            ) : (
              <Trans>{weekAhead} due this week, none overdue.</Trans>
            )}
          </p>
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
              <BriefRow
                key={row.obligationId}
                row={row}
                asOf={asOf}
                asOfDate={asOfDate}
                onOpen={onOpenObligation}
              />
            ))
          )}

          {/* Footer — one link to the full list, with extra top padding so it
              doesn't crowd the last row (Yuqi). */}
          <div className="mt-3 flex items-center justify-end gap-2 px-2">
            {moreCount > 0 ? (
              <span className="text-caption tabular-nums text-text-tertiary">
                <Trans>{moreCount} more not shown</Trans>
              </span>
            ) : null}
            <Link
              to="/deadlines"
              className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-text-secondary outline-none transition-colors hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
            >
              <Trans>See all deadlines</Trans>
              <ArrowRightIcon className="size-3" aria-hidden />
            </Link>
          </div>
        </div>
    </section>
  )
}

function BriefRow({
  row,
  asOf,
  asOfDate,
  onOpen,
}: {
  row: DashboardTopRow
  asOf: Date
  asOfDate: string | null
  onOpen: (obligationId: string) => void
}) {
  const { t } = useLingui()
  const d = daysUntil(row.currentDueDate, asOf)
  // Action verb inline — the lingui `t` macro must stay in component scope;
  // passing it into a helper compiles fine (tsgo) but returns "" at runtime.
  // Verb is STAGE-FIRST: a return in review/blocked has already gathered its
  // docs, so status must win over the evidence check — otherwise an in-review
  // row wrongly reads "Attach the source document". evidenceCount only drives
  // the verb in the early doc-gathering stages.
  const verb =
    row.status === 'waiting_on_client'
      ? t`Follow up with the client for documents`
      : row.status === 'review'
        ? t`Review the prepared return and sign off`
        : row.status === 'blocked'
          ? t`Clear the blocker to proceed`
          : row.evidenceCount === 0
            ? t`Attach the source document`
            : d <= 0
              ? t`Confirm filing or payment status`
              : d <= 2
                ? t`Final-check owner, source, and cutoff`
                : t`Re-verify the source still applies`
  // Readiness (Docs N/M) only matters while still gathering source docs — hide
  // it once prep is done (review/blocked/filed/…) so an in-review row doesn't
  // contradict itself with a "Docs 0/3" reading.
  const showReadiness =
    row.status === 'pending' ||
    row.status === 'in_progress' ||
    row.status === 'waiting_on_client'
  // Payment-late is a SEPARATE obligation from the filing — it rides next to the
  // status as its own chip, so the due column can stay the filing countdown that
  // matches the action (Yuqi: two obligations, two homes).
  const paymentLate = isPaymentOverdue(row.paymentDueDate, asOfDate)
  const paymentLateDays = paymentOverdueDays(row.paymentDueDate, asOfDate)
  return (
    <button
      type="button"
      onClick={() => onOpen(row.obligationId)}
      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left outline-none transition-colors hover:bg-background-section focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-state-accent-active-alt"
    >
      {/* Fixed-width form column so every client name + action starts at the
          same x — the name/action reads as one left-aligned column (Yuqi). */}
      <span className="flex w-28 shrink-0 items-center">
        <TaxCodeBadge code={row.taxType} />
      </span>
      {/* Client + the instruction/readiness sub-line. Capped width pulls the
          status/owner/due cluster IN so the row isn't two islands with a dead
          middle (Yuqi #3). Client name is the row anchor — bumped to semibold so
          one thing is clearly primary (Yuqi #2). */}
      <span className="flex min-w-0 max-w-[440px] flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-semibold text-text-primary">{row.clientName}</span>
        <span className="flex min-w-0 items-center gap-1.5 text-caption text-text-tertiary">
          <span className="truncate">{verb}</span>
          {showReadiness ? (
            <ReadinessIndicator
              obligationType={row.obligationType}
              attached={row.evidenceCount}
              className="shrink-0"
            />
          ) : null}
        </span>
      </span>
      {/* Status / owner / due are each a fixed-width, LEFT-aligned column so
          they line up vertically across rows — a real table, not a right-pushed
          cluster whose x shifts with the status-pill width (Yuqi: obey columns). */}
      <span className="flex w-[104px] shrink-0 flex-col items-start gap-1">
        <span className="flex items-center gap-1.5">
          <ObligationStatusReadBadge status={row.status} className="h-5 text-caption-xs" />
          {row.status === 'extended' ? <ExtensionChip /> : null}
        </span>
        {paymentLate ? (
          // Neutral, not red: payment-late is a DIFFERENT obligation from the
          // filing, and this design system has no amber (warning IS red-orange),
          // so a gray chip is the only way to keep RED pointing at exactly one
          // thing per row — the filing lateness in the due column (Yuqi #1).
          <span className="inline-flex items-center rounded bg-background-subtle px-1.5 py-0.5 text-caption-xs font-medium text-text-secondary">
            <Trans>Pay {paymentLateDays}d late</Trans>
          </span>
        ) : null}
      </span>
      <span className="flex w-6 shrink-0 items-center">
        <AssigneeAvatar size="xs" name={row.assigneeName} title={row.assigneeName ?? t`Unassigned`} />
      </span>
      {/* Due = the FILING countdown (paymentDueDate nulled so payment-late doesn't
          hijack it) — it now matches the action verb instead of describing a
          different obligation (Yuqi). */}
      <span className="flex w-[124px] shrink-0 items-center">
        <DueDateLabel days={d} status={row.status} paymentDueDate={null} asOfDate={asOfDate} />
      </span>
    </button>
  )
}
