import { Fragment, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { ExternalLinkIcon, RotateCwIcon, XIcon } from 'lucide-react'
import { Link } from 'react-router'

import type {
  DashboardBriefPublic,
  DashboardBriefScope,
  DashboardRecap,
  DashboardSummary,
} from '@duedatehq/contracts'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { TextLink } from '@duedatehq/ui/components/ui/text-link'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'
import { cn } from '@duedatehq/ui/lib/utils'

import { formatRelativeTime } from '@/lib/utils'
import { formatTaxCode } from '@/lib/tax-codes'
import { useAlertsListQueryOptions } from '@/features/alerts/api'
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
 * 2026-06-10 (Yuqi — firm scope goes deterministic): at scope='firm' the
 * Today line is NOT an AI sentence. The Everyone reader is supervising,
 * not executing — their line is "where does the overdue work cluster",
 * expressed by FORM TYPE only (never by member name) from
 * summary.overdueConcentration, plus the count chips. No AI call, no
 * freshness chip, no refresh affordance at firm scope; firm-scope brief
 * generation is retired server-side (cron fan-out removed, consumer
 * drops firm messages). The personal scope keeps the AI sentence.
 *
 * Card chrome stays Pencil `qYrr3` (accent-tinted, hairline-free, calm
 * title row with one freshness dot). Renders nothing only when there is
 * neither a brief nor a recap (initial load / feature-off firms).
 */
export function DailyBriefCard({
  scope,
  brief,
  recap,
  todayCounts,
  concentration,
  onOpenObligation,
  onClose,
  showCounts = true,
}: {
  scope: DashboardBriefScope
  brief: DashboardBriefPublic | null
  recap: DashboardRecap | null
  todayCounts: DailyBriefTodayCounts
  concentration: DashboardSummary['overdueConcentration']
  onOpenObligation: (obligationId: string) => void
  onClose?: (() => void) | undefined
  // Suppress the count chips when another surface (the Priorities card) already
  // carries them, so the digest reads as narrative only (Yuqi).
  showCounts?: boolean
}) {
  const { t } = useLingui()
  const aiEnabled = scope === 'me'
  if (!brief && !recap && !(scope === 'firm' && concentration)) return null

  // 2026-06-10 (manual refresh retired): the brief is a self-tending
  // daily edition — it regenerates on the firm-tz day rollover and
  // self-heals failed/stale states server-side, so the card carries NO
  // refresh affordance anywhere. The freshness chip is display-only.
  const isPending = aiEnabled && brief?.status === 'pending'

  return (
    <section
      aria-label={t`Daily brief`}
      // The accent-tinted banner of /today (Yuqi: "background blue tint") —
      // the page's ONE chromatic surface, marking the AI digest apart from
      // the neutral monitor (alerts) and work (priorities) sections. No
      // border: the tint alone defines the edge (avoid too much borders).
      // Same editorial bones as the /deadlines at-a-glance banner (title →
      // content sentence → metric lines); see
      // docs/Design/brief-banner-language.md.
      className="group relative flex flex-col gap-1.5 rounded-xl bg-state-accent-hover px-5 py-4 pr-9"
    >
      {/* Dismiss — ghost ✕ top-right. The parent persists the dismissal keyed
          to this brief's generation, so a freshly regenerated brief returns. */}
      {onClose ? (
        <Button
          variant="ghost"
          size="icon-xs"
          type="button"
          onClick={onClose}
          aria-label={t`Dismiss brief`}
          // size-7 (28px) hit area over the icon-xs default — the audit
          // flagged the ~24px dismiss target as the floor.
          className="absolute top-2 right-2 size-7 text-text-tertiary"
        >
          <XIcon className="size-3.5" aria-hidden />
        </Button>
      ) : null}

      {/* Title — a proper title (Yuqi: not a tracked-caps eyebrow, no dot),
          sharing the /today section-title voice (text-xl, one step above the
          16px card headlines). Freshness chip rides beside. */}
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl leading-tight font-semibold tracking-[-0.01em] text-text-primary">
          <Trans>Daily Brief</Trans>
        </h2>
        {aiEnabled && brief ? <BriefFreshness brief={brief} pending={isPending} /> : null}
      </div>

      {/* Content — today's focus sentence (the title anchors the card, so the
          sentence reads as content, not a competing headline). */}
      {aiEnabled ? (
        <TodayLine brief={brief} pending={isPending} onOpenObligation={onOpenObligation} />
      ) : (
        <FirmTodayLine concentration={concentration} counts={todayCounts} />
      )}

      {/* Metric + recap — calm text-sm lines below the content. The workload
          counts render ONLY when a real AI sentence exists (audit: otherwise
          this line just duplicates the Priorities bucket chips ~100px below —
          the digest shouldn't end by repeating the tool under it). The recap
          is the brief's own information and always renders. */}
      {(showCounts && aiEnabled && Boolean(brief?.text)) || recap ? (
        <div className="flex flex-col gap-0.5">
          {showCounts && aiEnabled && Boolean(brief?.text) ? (
            <TodayCountsLine counts={todayCounts} />
          ) : null}
          {recap ? <YesterdayLine recap={recap} /> : null}
        </div>
      ) : null}
      {/* Self-hiding (renders null at zero count), so it lives outside the
          showCounts/recap gate — a brand-new firm with no counts or recap
          still sees its already-in-effect obligations. */}
      <CatchupLine />
    </section>
  )
}

/**
 * Persistent "already in effect" line — relief windows published before the
 * firm joined (origin='catchup') that still await handling. NOT part of the
 * recap: catch-up rows are excluded from newAlertCount by design (state, not
 * news), so without this line the brief would stay silent about deadlines a
 * brand-new firm must still act on. Renders for as long as unhandled rows
 * exist and disappears once the band is cleared — not a one-shot toast.
 */
function CatchupLine() {
  const catchupQuery = useQuery(useAlertsListQueryOptions(50, 'catchup'))
  const count = catchupQuery.data?.alerts.length ?? 0
  if (count === 0) return null
  return (
    <p className="min-w-0 text-sm leading-[1.5] text-text-primary">
      <Link to="/alerts" className="text-text-accent underline-offset-2 hover:underline">
        <Plural
          value={count}
          one="# change already in effect affects your clients"
          other="# changes already in effect affect your clients"
        />
      </Link>
    </p>
  )
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
 * quiet "will retry automatically" note — the server self-heals failed
 * briefs with backoff, so there is no manual retry affordance and the
 * deterministic rows around it keep rendering regardless. Old multi-item
 * briefs render their headline; if it carries no citation marker, the
 * first item's markers are appended so the deep-link affordance survives.
 */
function TodayLine({
  brief,
  pending,
  onOpenObligation,
}: {
  brief: DashboardBriefPublic | null
  pending: boolean
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
        <Trans>We couldn't generate today's brief — it will retry automatically.</Trans>
      </p>
    )
  }
  if (!brief || !brief.text || !parsed) {
    return (
      <p className="text-sm leading-[1.5] text-text-tertiary">
        <Trans>No brief for this view yet.</Trans>
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
    <p className="min-w-0 max-w-[72ch] text-base leading-[1.5] font-medium text-text-primary">
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

/**
 * Firm-scope Today line — fully deterministic, supervisory voice. Says
 * where the overdue work CLUSTERS by form type ("Overdue concentrated in
 * Form 1120 (3 of 5)") and deliberately never names a member. Renders
 * only when there is a real cluster (≥2 of one form); scattered overdue
 * is already carried by the count chips below. All-quiet collapses to
 * one muted line so the row never sits empty.
 */
function FirmTodayLine({
  concentration,
  counts,
}: {
  concentration: DashboardSummary['overdueConcentration']
  counts: DailyBriefTodayCounts
}) {
  if (concentration && concentration.count >= 2) {
    const formLabel = formatTaxCode(concentration.taxType)
    return (
      <p className="min-w-0 max-w-[72ch] text-base leading-[1.5] font-medium text-text-primary">
        <Trans>
          Overdue work is concentrated in {formLabel} ({concentration.count} of{' '}
          {concentration.overdueTotal})
        </Trans>{' '}
        <Link to="/deadlines" className="text-text-accent underline-offset-2 hover:underline">
          <Trans>View deadlines</Trans>
        </Link>
      </p>
    )
  }
  const allQuiet =
    counts.overdueCount === 0 && counts.waitingOnClientCount === 0 && counts.dueThisWeekCount === 0
  if (allQuiet) {
    return (
      <p className="text-sm leading-[1.5] text-text-tertiary">
        <Trans>No deadline pressure right now.</Trans>
      </p>
    )
  }
  // Scattered or light overdue — the count chips below carry the signal.
  return null
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
function BriefFreshness({ brief, pending }: { brief: DashboardBriefPublic; pending: boolean }) {
  if (pending) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5">
        <RotateCwIcon className="size-3 animate-spin text-text-secondary" aria-hidden />
        <span className="font-mono text-xs font-medium tracking-[0.4px] text-text-secondary uppercase">
          <Trans>Generating</Trans>
        </span>
      </span>
    )
  }
  if (brief.status === 'failed') {
    // 2026-06-10 (manual refresh retired): the FAILED chip is display-only
    // — recovery is the server's failed self-heal, not a user action. The
    // error code stays one hover away for support conversations.
    const failedText = (
      <span className="text-xs font-medium tracking-[0.4px] text-text-secondary uppercase">
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
          'font-mono text-xs font-medium tracking-[0.4px] tabular-nums uppercase',
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
      className="mx-0.5 inline-flex h-[18px] min-w-[18px] cursor-pointer items-center justify-center rounded border border-state-accent-border bg-background-default px-1.5 align-text-bottom font-mono text-xs leading-none font-semibold text-text-accent tabular-nums hover:bg-state-accent-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:outline-none"
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
