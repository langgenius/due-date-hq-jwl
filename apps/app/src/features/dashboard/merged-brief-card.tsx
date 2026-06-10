import { useMemo, useState } from 'react'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { ArrowRightIcon, ChevronDownIcon, ChevronUpIcon, SparklesIcon } from 'lucide-react'
import { Link } from 'react-router'

import type { DashboardBriefPublic, DashboardTopRow } from '@duedatehq/contracts'
import { Segmented } from '@duedatehq/ui/components/ui/segmented'
import { cn } from '@duedatehq/ui/lib/utils'

import { TaxCodeBadge } from '@/components/primitives/tax-code-label'
import { AssigneeAvatar } from '@/features/obligations/AssigneeAvatar'
import { ObligationStatusReadBadge, useLifecycleV2StatusLabels } from '@/features/obligations/status-control'
import { formatDatePretty, formatRelativeTime } from '@/lib/utils'

/**
 * MergedBriefCard — Pencil `jXPZ9` ("MergedBrief"). The Daily Brief fused with
 * the deadline queue into one card: a header (sparkles + "Today's brief" +
 * updated time + overdue/ending-today/this-week count pills + a By time / By
 * stage / By owner view toggle + collapse), then the deadlines grouped into
 * cards, then a footer linking to the full queue.
 *
 * Data is REAL: `counts` are the firm/me-scoped due-bucket totals (from facets),
 * `rows` is the server-ranked Smart-Priority shortlist that the Priority Actions
 * table also renders. Each group shows the shortlist rows it has and links the
 * rest to /deadlines (no fabricated rows). All chrome uses design tokens.
 */
export interface MergedBriefCounts {
  overdue: number
  endingToday: number
  thisWeek: number
}

type GroupMode = 'time' | 'stage' | 'owner'

function daysUntil(dueIso: string, asOf: Date): number {
  const due = Date.parse(dueIso)
  if (Number.isNaN(due)) return 0
  const a = Date.UTC(asOf.getFullYear(), asOf.getMonth(), asOf.getDate())
  const d = new Date(due)
  const b = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  return Math.round((b - a) / 86_400_000)
}

export function MergedBriefCard({
  scope: _scope,
  brief,
  counts,
  rows,
  asOfDate,
  onOpenObligation,
}: {
  scope: 'me' | 'firm'
  brief: DashboardBriefPublic | null
  counts: MergedBriefCounts
  rows: readonly DashboardTopRow[]
  asOfDate: string | null
  onOpenObligation: (obligationId: string) => void
}) {
  const { t } = useLingui()
  const statusLabels = useLifecycleV2StatusLabels()
  const [mode, setMode] = useState<GroupMode>('time')
  const [collapsed, setCollapsed] = useState(false)

  const asOf = useMemo(() => (asOfDate ? new Date(asOfDate) : new Date()), [asOfDate])
  const updatedLabel = brief?.generatedAt ? formatRelativeTime(brief.generatedAt) : null

  // Build the grouped display from the ranked shortlist. By time uses fixed
  // tone-carrying buckets; by stage/owner derive groups from the data.
  const groups = useMemo(() => {
    if (mode === 'time') {
      const bucket = (r: DashboardTopRow): 'overdue' | 'today' | 'week' | null => {
        const d = daysUntil(r.currentDueDate, asOf)
        if (d < 0) return 'overdue'
        if (d === 0) return 'today'
        if (d <= 7) return 'week'
        return null
      }
      const by: Record<'overdue' | 'today' | 'week', DashboardTopRow[]> = {
        overdue: [],
        today: [],
        week: [],
      }
      for (const r of rows) {
        const b = bucket(r)
        if (b) by[b].push(r)
      }
      return [
        {
          key: 'overdue',
          label: t`Overdue`,
          tone: 'destructive' as const,
          rows: by.overdue,
          total: counts.overdue,
        },
        {
          key: 'today',
          label: t`Ending today`,
          tone: 'warning' as const,
          rows: by.today,
          total: counts.endingToday,
        },
        {
          key: 'week',
          label: t`This week`,
          tone: 'neutral' as const,
          rows: by.week,
          total: counts.thisWeek,
        },
      ].filter((g) => g.rows.length > 0 || g.total > 0)
    }
    // stage / owner: derive groups from the shortlist itself.
    const keyOf = (r: DashboardTopRow): string =>
      mode === 'stage' ? statusLabels[r.status] : (r.assigneeName ?? t`Unassigned`)
    const map = new Map<string, DashboardTopRow[]>()
    for (const r of rows) {
      const k = keyOf(r)
      const list = map.get(k)
      if (list) list.push(r)
      else map.set(k, [r])
    }
    return [...map.entries()].map(([label, list]) => ({
      key: label,
      label,
      tone: 'neutral' as const,
      rows: list,
      total: list.length,
    }))
  }, [mode, rows, asOf, counts, statusLabels, t])

  return (
    <section
      aria-label={t`Daily brief`}
      className="flex flex-col gap-3.5 rounded-xl border border-divider-regular bg-background-default px-[18px] py-4"
    >
      {/* Header — sparkles + title + updated + count pills + view toggle + collapse */}
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background-section"
          aria-hidden
        >
          <SparklesIcon className="size-3.5 text-text-primary" />
        </span>
        <h2 className="text-base leading-tight font-semibold text-text-primary">
          <Trans>Today's brief</Trans>
        </h2>
        {updatedLabel ? (
          <span className="text-caption text-text-muted">
            <Trans>· updated {updatedLabel}</Trans>
          </span>
        ) : null}

        <div className="flex flex-wrap items-center gap-1.5">
          <CountPill count={counts.overdue} label={t`overdue`} tone="destructive" />
          <CountPill count={counts.endingToday} label={t`ending today`} tone="neutral" />
          <CountPill count={counts.thisWeek} label={t`this week`} tone="neutral" />
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          {!collapsed ? (
            <Segmented
              value={mode}
              onValueChange={(v) => setMode(v)}
              ariaLabel={t`Group deadlines by`}
              options={[
                { value: 'time', label: t`By time` },
                { value: 'stage', label: t`By stage` },
                { value: 'owner', label: t`By owner` },
              ]}
            />
          ) : null}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? t`Expand brief` : t`Collapse brief`}
            aria-expanded={!collapsed}
            className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-background-section hover:text-text-secondary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:outline-none"
          >
            {collapsed ? (
              <ChevronDownIcon className="size-3.5" aria-hidden />
            ) : (
              <ChevronUpIcon className="size-3.5" aria-hidden />
            )}
          </button>
        </div>
      </div>

      {/* Grouped deadline cards */}
      {!collapsed ? (
        <>
          <div className="flex flex-col gap-4">
            {groups.length === 0 ? (
              <p className="px-1 text-sm text-text-tertiary">
                <Trans>Nothing due in the next week. You're clear.</Trans>
              </p>
            ) : (
              groups.map((g) => (
                <GroupCard
                  key={g.key}
                  label={g.label}
                  tone={g.tone}
                  total={g.total}
                  rows={g.rows.slice(0, 3)}
                  moreHref={`/deadlines${mode === 'time' && g.key !== 'week' ? `?due=${g.key === 'today' ? 'today' : 'overdue'}` : ''}`}
                  moreCount={Math.max(0, g.total - Math.min(3, g.rows.length))}
                  asOf={asOf}
                  onOpenObligation={onOpenObligation}
                  // In "By stage" the group header IS the status, so the per-row
                  // status pill would be redundant — hide it there only.
                  showStatus={mode !== 'stage'}
                />
              ))
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 border-t border-divider-subtle pt-3">
            <span className="min-w-0 text-caption text-text-muted">
              <Trans>
                One source of deadlines on Today — switch views in place. Full filtering on
                Deadlines.
              </Trans>
            </span>
            <Link
              to="/deadlines"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-1 text-xs font-medium text-text-secondary outline-none transition-colors hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
            >
              <Trans>Open queue</Trans>
              <ArrowRightIcon className="size-3" aria-hidden />
            </Link>
          </div>
        </>
      ) : null}
    </section>
  )
}

function CountPill({
  count,
  label,
  tone,
}: {
  count: number
  label: string
  tone: 'destructive' | 'neutral'
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-divider-regular px-2.5 py-0.5 text-xs">
      <span
        className={cn(
          'font-semibold tabular-nums',
          tone === 'destructive' && count > 0 ? 'text-text-destructive' : 'text-text-primary',
        )}
      >
        {count}
      </span>
      <span className="text-text-secondary">{label}</span>
    </span>
  )
}

function GroupCard({
  label,
  tone,
  total,
  rows,
  moreHref,
  moreCount,
  asOf,
  onOpenObligation,
  showStatus,
}: {
  label: string
  tone: 'destructive' | 'warning' | 'neutral'
  total: number
  rows: readonly DashboardTopRow[]
  moreHref: string
  moreCount: number
  asOf: Date
  onOpenObligation: (obligationId: string) => void
  showStatus: boolean
}) {
  const eyebrowTone =
    tone === 'destructive'
      ? 'text-text-destructive'
      : tone === 'warning'
        ? 'text-text-warning'
        : 'text-text-secondary'
  const badgeTone =
    tone === 'destructive'
      ? 'bg-state-destructive-hover text-text-destructive'
      : tone === 'warning'
        ? 'bg-state-warning-hover text-text-warning'
        : 'bg-background-section text-text-secondary'
  return (
    // Flat section — NOT a bordered box. The brief card is the only frame; each
    // group is delineated by its colored eyebrow + count badge and the outer
    // gap, so there are no frames-within-frames (Yuqi).
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 border-b border-divider-subtle px-1 pb-1.5">
        <span className={cn('text-caption-xs font-semibold tracking-wider uppercase', eyebrowTone)}>
          {label}
        </span>
        <span
          className={cn(
            'inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 text-caption-xs font-semibold tabular-nums',
            badgeTone,
          )}
        >
          {total}
        </span>
      </div>
      {rows.map((row) => (
        <BriefDeadlineRow
          key={row.obligationId}
          row={row}
          asOf={asOf}
          onOpen={onOpenObligation}
          showStatus={showStatus}
        />
      ))}
      {moreCount > 0 ? (
        <Link
          to={moreHref}
          className="flex items-center gap-1.5 rounded-lg px-1 py-1.5 text-caption font-medium text-text-secondary outline-none transition-colors hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
        >
          <Trans>View {moreCount} more</Trans>
          <ArrowRightIcon className="size-2.5" aria-hidden />
        </Link>
      ) : null}
    </div>
  )
}

function BriefDeadlineRow({
  row,
  asOf,
  onOpen,
  showStatus,
}: {
  row: DashboardTopRow
  asOf: Date
  onOpen: (obligationId: string) => void
  showStatus: boolean
}) {
  const { t } = useLingui()
  const d = daysUntil(row.currentDueDate, asOf)
  const dueText =
    d < 0
      ? t`past ${formatDatePretty(row.currentDueDate)}`
      : d === 0
        ? t`EOD`
        : formatDatePretty(row.currentDueDate)
  return (
    <button
      type="button"
      onClick={() => onOpen(row.obligationId)}
      className="flex w-full items-center gap-2.5 border-b border-divider-subtle px-1 py-2.5 text-left outline-none transition-colors last:border-b-0 hover:bg-background-section focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-state-accent-active-alt"
    >
      <TaxCodeBadge code={row.taxType} />
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">
        {row.clientName}
      </span>
      {showStatus ? (
        <ObligationStatusReadBadge status={row.status} className="h-5 shrink-0 text-caption-xs" />
      ) : null}
      <AssigneeAvatar name={row.assigneeName} title={row.assigneeName ?? t`Unassigned`} />
      <span className="w-[60px] shrink-0 text-right text-caption tabular-nums text-text-secondary">
        {dueText}
      </span>
    </button>
  )
}
