import { Fragment, useMemo } from 'react'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { ExternalLinkIcon, RotateCwIcon, XIcon } from 'lucide-react'
import { Link } from 'react-router'

import type { DashboardBriefPublic, DashboardRecap } from '@duedatehq/contracts'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { TextLink } from '@duedatehq/ui/components/ui/text-link'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'
import { cn } from '@duedatehq/ui/lib/utils'

import { formatRelativeTime } from '@/lib/utils'
import { parseBriefText } from './brief-text'

type DashboardBriefCitation = NonNullable<DashboardBriefPublic['citations']>[number]

export interface DailyBriefTodayCounts {
  overdueCount: number
  waitingOnClientCount: number
  dueThisWeekCount: number
}

/**
 * DailyBriefCard — rebuilt 2026-06-10 (Yuqi: "打开 Today 一目了然看到昨天
 * 的总结和今天的安排") into a two-row "Yesterday / Today" digest:
 *
 *   YESTERDAY  3 completed (2 filed · 1 paid) · 2 new alerts · 1 due date moved
 *   TODAY      <one AI sentence: focus + start-here, with citation chip>
 *              2 overdue · 1 waiting on client · 2 due this week
 *
 * Yesterday is DETERMINISTIC (audit-derived counts since the viewer's
 * previous earlier-day visit — see dashboard repo recap) so it renders
 * instantly and truthfully even while the AI sentence is generating or
 * failed. The AI's role shrank to ONE sentence; the detailed plan is the
 * Priority Actions table right below, so the card never repeats it.
 * Citation `[n]` tokens resolve to accent chips deep-linking back to the
 * obligation (evidence traceability, not decoration).
 *
 * Card chrome stays Pencil `qYrr3` (accent-tinted, hairline-free, calm
 * title row with one freshness dot). Renders nothing only when there is
 * neither a brief nor a recap (initial load / feature-off firms).
 */
export function DailyBriefCard({
  brief,
  recap,
  todayCounts,
  onRefresh,
  refreshing,
  onOpenObligation,
  onClose,
}: {
  brief: DashboardBriefPublic | null
  recap: DashboardRecap | null
  todayCounts: DailyBriefTodayCounts
  onRefresh: () => void
  refreshing: boolean
  onOpenObligation: (obligationId: string) => void
  onClose?: (() => void) | undefined
}) {
  const { t } = useLingui()
  if (!brief && !recap) return null

  const isPending = brief?.status === 'pending' || refreshing
  // Refresh is only meaningful once a brief exists in some terminal-ish
  // state; while it's generating the status label shows the spinner, and
  // with no brief at all the Today row carries its own Generate link.
  const canRefresh = brief !== null && !isPending

  return (
    <section
      aria-label={t`Daily brief`}
      // 2026-06-08 (Yuqi /today #1 "top padding reduce"): the section's
      // top padding is trimmed (pt-3 vs the 18px on the other sides) so the
      // title row sits closer to the top edge and the card reads tighter.
      className="group flex flex-col gap-1 rounded-xl bg-state-accent-hover px-[18px] pt-3 pb-[18px]"
    >
      {/* TopRow — Pencil qYrr3 `LfcWh` */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left — title + freshness (dot + mono age). Yuqi: icon removed;
            the title takes the dark brand color on hover. */}
        <div className="flex min-w-0 items-center gap-2.5">
          <h2 className="text-base leading-tight font-semibold tracking-[-0.01em] text-text-accent">
            <Trans>Daily Brief</Trans>
          </h2>
          {brief ? (
            <BriefFreshness
              brief={brief}
              pending={isPending}
              onRefresh={canRefresh ? onRefresh : undefined}
            />
          ) : null}
        </div>
        {/* Right — icon-only refresh + dismiss */}
        <div className="flex shrink-0 items-center gap-2.5">
          {canRefresh && brief.status !== 'failed' ? (
            <button
              type="button"
              onClick={onRefresh}
              aria-label={t`Regenerate brief`}
              // 2026-06-09 (Yuqi #5 "gray"): the regenerate control was a gray
              // icon on the accent card — it read as disabled chrome. It now
              // carries the card's accent ink at rest and lifts onto a white
              // chip on hover, so it reads as the card's one live affordance.
              className="inline-flex size-7 cursor-pointer items-center justify-center rounded-lg text-text-accent transition-colors hover:bg-background-default hover:text-text-accent focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:outline-none"
            >
              <RotateCwIcon className="size-3.5" aria-hidden />
            </button>
          ) : null}
          {/* 2026-06-08 (Yuqi /today #8 "able to close it"): dismiss the
              brief for the day. The parent persists the dismissal keyed to
              this brief's generation, so a freshly regenerated brief returns. */}
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label={t`Dismiss brief`}
              className="inline-flex size-7 cursor-pointer items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-background-section hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:outline-none"
            >
              <XIcon className="size-3.5" aria-hidden />
            </button>
          ) : null}
        </div>
      </div>

      {/* Body — the Yesterday / Today grid. Labels are mono eyebrows in
          the freshness chip's voice; content lines stay 14px prose. */}
      <div className="grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-1.5 pt-1">
        {recap ? (
          <>
            <BriefRowLabel title={t`Since ${formatRecapSince(recap.since)}`}>
              <Trans>Yesterday</Trans>
            </BriefRowLabel>
            <YesterdayLine recap={recap} />
          </>
        ) : null}
        <BriefRowLabel>
          <Trans>Today</Trans>
        </BriefRowLabel>
        <div className="flex min-w-0 flex-col gap-0.5">
          <TodayLine
            brief={brief}
            pending={isPending}
            onRefresh={onRefresh}
            onOpenObligation={onOpenObligation}
          />
          <TodayCountsLine counts={todayCounts} />
        </div>
      </div>
    </section>
  )
}

/** Mono uppercase row label — same voice as the freshness chip. */
function BriefRowLabel({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className="font-mono text-[11px] leading-[1.6] font-medium tracking-[0.4px] text-text-tertiary uppercase select-none"
    >
      {children}
    </span>
  )
}

function formatRecapSince(since: string): string {
  const date = new Date(since)
  if (Number.isNaN(date.getTime())) return since
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

/**
 * Deterministic "what happened while you were away" line — only the
 * activity that actually happened renders; an all-quiet window collapses
 * to one muted sentence. The alerts segment links to /alerts (the only
 * segment with a dedicated review surface).
 */
function YesterdayLine({ recap }: { recap: DashboardRecap }) {
  const segments: React.ReactNode[] = []

  if (recap.completedCount > 0) {
    segments.push(
      <span key="completed">
        <Plural value={recap.completedCount} one="# completed" other="# completed" />
        {recap.filedCount > 0 && recap.paidCount > 0 ? (
          <span className="text-text-tertiary">
            {' '}
            ({recap.filedCount} <Trans>filed</Trans> · {recap.paidCount} <Trans>paid</Trans>)
          </span>
        ) : null}
      </span>,
    )
  }
  if (recap.newAlertCount > 0) {
    segments.push(
      <Link
        key="alerts"
        to="/alerts"
        className="text-text-accent underline-offset-2 hover:underline"
      >
        <Plural value={recap.newAlertCount} one="# new alert" other="# new alerts" />
      </Link>,
    )
  }
  if (recap.dueDateMovedCount > 0) {
    segments.push(
      <span key="moved">
        <Plural value={recap.dueDateMovedCount} one="# due date moved" other="# due dates moved" />
      </span>,
    )
  }
  if (recap.remindersSentCount > 0) {
    segments.push(
      <span key="reminders">
        <Plural value={recap.remindersSentCount} one="# reminder sent" other="# reminders sent" />
      </span>,
    )
  }

  if (segments.length === 0) {
    return (
      <p className="text-sm leading-[1.5] text-text-tertiary">
        <Trans>No changes since your last visit.</Trans>
      </p>
    )
  }
  return (
    <p className="min-w-0 text-sm leading-[1.5] text-text-primary">
      {segments.map((segment, index) => (
        <Fragment key={index}>
          {index > 0 ? <span className="text-text-muted"> · </span> : null}
          {segment}
        </Fragment>
      ))}
    </p>
  )
}

/**
 * The one AI sentence: today's focus + where to start, citation chip
 * inline. Pending shows a single skeleton line; failed degrades to a
 * quiet inline retry (the deterministic rows around it keep rendering —
 * the AI path must never take the card down with it). Old multi-item
 * briefs render their headline; if it carries no citation marker, the
 * first item's markers are appended so the deep-link affordance survives.
 */
function TodayLine({
  brief,
  pending,
  onRefresh,
  onOpenObligation,
}: {
  brief: DashboardBriefPublic | null
  pending: boolean
  onRefresh: () => void
  onOpenObligation: (obligationId: string) => void
}) {
  const parsed = useMemo(() => (brief?.text ? parseBriefText(brief.text) : null), [brief?.text])

  if (pending && !brief?.text) {
    return (
      <div aria-busy>
        <Skeleton className="h-4 w-[70%]" />
      </div>
    )
  }
  if (brief && brief.status === 'failed' && !brief.text) {
    return (
      <p className="text-sm leading-[1.5] text-text-tertiary">
        <Trans>We couldn't generate today's brief.</Trans>{' '}
        <TextLink variant="accent" onClick={onRefresh} className="align-baseline">
          <Trans>Regenerate brief</Trans>
        </TextLink>
      </p>
    )
  }
  if (!brief || !brief.text || !parsed) {
    return (
      <p className="text-sm leading-[1.5] text-text-tertiary">
        <Trans>No brief for this view yet.</Trans>{' '}
        <TextLink variant="accent" onClick={onRefresh} className="align-baseline">
          <Trans>Generate brief</Trans>
        </TextLink>
      </p>
    )
  }

  const headline = parsed.headline ?? brief.text
  // Older briefs put citations on the items, not the headline — surface
  // the first item's markers so the chip affordance survives.
  const fallbackMarkers =
    !/\[\d+\]/.test(headline) && parsed.items[0]
      ? [
          ...new Set(
            `${parsed.items[0].text} ${parsed.items[0].nextCheck ?? ''}`.match(/\[\d+\]/g) ?? [],
          ),
        ].join(' ')
      : ''

  return (
    <p className="min-w-0 text-sm leading-[1.5] font-medium text-text-primary">
      <BriefProse text={headline} citations={brief.citations} onOpenObligation={onOpenObligation} />
      {fallbackMarkers ? (
        <>
          {' '}
          <BriefProse
            text={fallbackMarkers}
            citations={brief.citations}
            onOpenObligation={onOpenObligation}
          />
        </>
      ) : null}
    </p>
  )
}

/** Scoped workload counts under the AI sentence — only non-zero render. */
function TodayCountsLine({ counts }: { counts: DailyBriefTodayCounts }) {
  const segments: React.ReactNode[] = []
  if (counts.overdueCount > 0) {
    segments.push(
      <span key="overdue" className="text-text-destructive">
        <Plural value={counts.overdueCount} one="# overdue" other="# overdue" />
      </span>,
    )
  }
  if (counts.waitingOnClientCount > 0) {
    segments.push(
      <span key="waiting">
        <Plural
          value={counts.waitingOnClientCount}
          one="# waiting on client"
          other="# waiting on client"
        />
      </span>,
    )
  }
  if (counts.dueThisWeekCount > 0) {
    segments.push(
      <span key="week">
        <Plural value={counts.dueThisWeekCount} one="# due this week" other="# due this week" />
      </span>,
    )
  }
  if (segments.length === 0) return null
  return (
    <p className="text-xs leading-[1.5] text-text-tertiary">
      {segments.map((segment, index) => (
        <Fragment key={index}>
          {index > 0 ? <span className="text-text-muted"> · </span> : null}
          {segment}
        </Fragment>
      ))}
    </p>
  )
}

/**
 * Freshness signal — Pencil qYrr3 `kcUpS` + `v5X2Y`: one small status dot
 * followed by a mono, uppercase age label, both sitting just after the
 * title. The dot's color is the only freshness cue (green = fresh, amber =
 * outdated, red = failed), so the rest of the title row reads neutral.
 */
function BriefFreshness({
  brief,
  pending,
  onRefresh,
}: {
  brief: DashboardBriefPublic
  pending: boolean
  onRefresh?: (() => void) | undefined
}) {
  const { t } = useLingui()
  if (pending) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5">
        <RotateCwIcon className="size-3 animate-spin text-text-secondary" aria-hidden />
        <span className="font-mono text-[11px] font-medium tracking-[0.4px] text-text-secondary uppercase">
          <Trans>Generating</Trans>
        </span>
      </span>
    )
  }
  if (brief.status === 'failed') {
    // 2026-06-08 (Yuqi: "move to FAILED icon, remove the left dot"): the
    // failed state drops the red status dot and carries an inline retry
    // icon right after the label, so recovery lives on the FAILED chip
    // itself (the separate right-side regenerate button hides while failed).
    const failedText = (
      <span className="text-[11px] font-medium tracking-[0.4px] text-text-secondary uppercase">
        <Trans>Failed</Trans>
      </span>
    )
    return (
      <span className="inline-flex shrink-0 items-center gap-1">
        {brief.errorCode ? (
          <Tooltip>
            <TooltipTrigger render={failedText} />
            <TooltipContent>{brief.errorCode}</TooltipContent>
          </Tooltip>
        ) : (
          failedText
        )}
        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            aria-label={t`Regenerate brief`}
            className="inline-flex size-5 cursor-pointer items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-background-section hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:outline-none"
          >
            <RotateCwIcon className="size-3" aria-hidden />
          </button>
        ) : null}
      </span>
    )
  }
  const stale = brief.status === 'stale'
  const age = brief.generatedAt ? formatRelativeTime(brief.generatedAt) : null

  // 2026-06-08 (Yuqi "remove the REFRESH"): the outdated state is a plain
  // amber "Outdated" label again — the inline "· Refresh" affordance is
  // gone; the icon-only regenerate button on the right handles refresh.
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5">
      <span
        className={cn('size-1.5 rounded-full', stale ? 'bg-text-warning' : 'bg-text-success')}
        aria-hidden
      />
      <span
        className={cn(
          'font-mono text-[11px] font-medium tracking-[0.4px] tabular-nums uppercase',
          stale ? 'text-text-warning' : 'text-text-secondary',
        )}
      >
        {stale ? <Trans>Outdated</Trans> : (age ?? <Trans>Live</Trans>)}
      </span>
    </span>
  )
}

/**
 * Splits the brief text on `[n]` markers and renders each as a clickable
 * citation chip when a matching citation exists. Unmatched markers fall
 * back to plain text so a stray `[7]` never becomes a dead chip.
 */
function BriefProse({
  text,
  citations,
  onOpenObligation,
}: {
  text: string
  citations: DashboardBriefPublic['citations']
  onOpenObligation: (obligationId: string) => void
}) {
  const segments = text.split(/(\[\d+\])/g)
  // Key each split part by its running character offset — unique and stable for a
  // given text, so repeated text/marker segments never collide on an index key.
  let charOffset = 0
  return (
    <>
      {segments.map((segment) => {
        const key = `${charOffset}:${segment}`
        charOffset += segment.length
        const match = /^\[(\d+)\]$/.exec(segment)
        if (!match) return <Fragment key={key}>{segment}</Fragment>
        const ref = Number(match[1])
        const citation = citations?.find((entry) => entry.ref === ref)
        if (!citation) return <Fragment key={key}>{segment}</Fragment>
        return (
          <CitationChip
            key={key}
            n={ref}
            citation={citation}
            onOpen={() => onOpenObligation(citation.obligationId)}
          />
        )
      })}
    </>
  )
}

function CitationChip({
  n,
  citation,
  onOpen,
}: {
  n: number
  citation: DashboardBriefCitation
  onOpen: () => void
}) {
  const { t } = useLingui()
  // Pencil qYrr3 `Cite`: a tight accent pill (#eff4ff fill, accent mono
  // numeral). The accent is the card's single chromatic accent.
  const chip = (
    <button
      type="button"
      onClick={onOpen}
      aria-label={t`Citation ${n} — open deadline`}
      className="mx-0.5 inline-flex h-[18px] min-w-[18px] cursor-pointer items-center justify-center rounded-[4px] border border-state-accent-border bg-background-default px-1.5 align-text-bottom font-mono text-[11px] leading-none font-semibold text-text-accent tabular-nums hover:bg-state-accent-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:outline-none"
    >
      {n}
    </button>
  )
  const evidence = citation.evidence
  if (!evidence) {
    return (
      <Tooltip>
        <TooltipTrigger render={chip} />
        <TooltipContent>
          <Trans>Open deadline</Trans>
        </TooltipContent>
      </Tooltip>
    )
  }
  return (
    <Tooltip>
      <TooltipTrigger render={chip} />
      <TooltipContent className="flex flex-col items-start gap-1">
        <span className="text-caption-xs text-text-tertiary">{evidence.sourceType}</span>
        {evidence.sourceUrl ? (
          <TextLink
            variant="accent"
            size="sm"
            render={<a href={evidence.sourceUrl} target="_blank" rel="noreferrer" />}
          >
            <Trans>View source</Trans>
            <ExternalLinkIcon className="size-3" aria-hidden />
          </TextLink>
        ) : null}
      </TooltipContent>
    </Tooltip>
  )
}
