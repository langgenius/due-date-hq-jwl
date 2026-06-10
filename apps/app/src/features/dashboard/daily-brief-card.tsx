import { Fragment, useMemo } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { ExternalLinkIcon, RotateCwIcon, SparklesIcon, XIcon } from 'lucide-react'

import type {
  DashboardBriefPublic,
  DashboardBriefScope,
  DashboardRecap,
  DashboardSummary,
} from '@duedatehq/contracts'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { TextLink } from '@duedatehq/ui/components/ui/text-link'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'
import { cn } from '@duedatehq/ui/lib/utils'

import { formatRelativeTime } from '@/lib/utils'
import { formatTaxCode } from '@/lib/tax-codes'
import { parseBriefText } from './brief-text'

type DashboardBriefCitation = NonNullable<DashboardBriefPublic['citations']>[number]

export interface DailyBriefTodayCounts {
  overdueCount: number
  waitingOnClientCount: number
  dueThisWeekCount: number
}

/**
 * DailyBriefCard — the AI narrative of the firm's day. A white card with a
 * single hairline border (no shadow), a calm title row (sparkles + "Daily
 * Brief" + one status dot + a mono age label), an icon-only refresh, then
 * the prose. The page-level "My work / Everyone" Segmented in the /today
 * header switches the brief AND Priority Actions together; the card just
 * renders whatever brief the scoped dashboard.load returned. Each
 * `[n]` token resolves to an accent citation chip that deep-links back to
 * the obligation it cites (evidence traceability, not decoration).
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
}: {
  scope: DashboardBriefScope
  brief: DashboardBriefPublic | null
  recap: DashboardRecap | null
  todayCounts: DailyBriefTodayCounts
  concentration: DashboardSummary['overdueConcentration']
  onOpenObligation: (obligationId: string) => void
  onClose?: (() => void) | undefined
}) {
  const { t } = useLingui()
  const aiEnabled = scope === 'me'
  if (!brief && !recap && !(scope === 'firm' && concentration)) return null

  const isPending = brief.status === 'pending' || refreshing
  // Refresh is only meaningful once a brief exists in some terminal-ish
  // state; while it's generating the status label shows the spinner.
  const canRefresh = !isPending

  // A failed brief collapses to a single thin banner — title · short
  // message · inline retry — instead of the full card with body prose.
  if (brief.status === 'failed' && !refreshing) {
    return (
      <section
        aria-label={t`Daily brief`}
        className="group flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-background-section px-[18px] py-2.5"
      >
        <span
          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-background-section"
          aria-hidden
        >
          <SparklesIcon className="size-3.5 text-text-secondary" />
        </span>
        <h2 className="text-base leading-tight font-semibold text-text-primary">
          <Trans>Daily Brief</Trans>
        </h2>
        <span className="min-w-0 truncate text-xs text-text-tertiary">
          <Trans>We couldn't generate today's brief.</Trans>
        </span>
        {/* No "Failed" label (the message already says it failed); the retry
            is a quiet "Regenerate brief" text button right after the message. */}
        <TextLink variant="accent" onClick={onRefresh} className="shrink-0">
          <RotateCwIcon className="size-3.5" aria-hidden />
          <Trans>Regenerate brief</Trans>
        </TextLink>
        <div className="flex flex-1 shrink-0 items-center justify-end gap-1">
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
      </section>
    )
  }

  return (
    <section
      aria-label={t`Daily brief`}
      // 2026-06-10 (Yuqi "restrain borders and lines"): no hairline border —
      // a calm gray fill (bg-background-section, matching the alert cards)
      // defines the brief without a line. The sparkles icon carries the AI
      // signal.
      className="group flex flex-col gap-3 rounded-xl bg-background-section p-5"
    >
      {/* TopRow — Pencil tvSsP `header`: sparkles icon-wrap + "Daily Brief"
          (13/600) + freshness, with a labeled Regenerate button on the right. */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background-section"
            aria-hidden
          >
            <SparklesIcon className="size-4 text-text-secondary" />
          </span>
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
            <h2 className="text-base leading-tight font-semibold text-text-primary">
              <Trans>Daily Brief</Trans>
            </h2>
            <BriefFreshness
              brief={brief}
              pending={isPending}
              onRefresh={canRefresh ? onRefresh : undefined}
            />
          </div>
        </div>
        {/* Right — labeled Regenerate (tvSsP `Regenerate btn`) + dismiss */}
        <div className="flex shrink-0 items-center gap-1">
          {canRefresh && brief.status !== 'failed' ? (
            <button
              type="button"
              onClick={onRefresh}
              aria-label={t`Regenerate brief`}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-background-section hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:outline-none"
            >
              <RotateCwIcon className="size-3" aria-hidden />
              <Trans>Regenerate</Trans>
            </button>
          ) : null}
          {/* Dismiss the brief for the day. The parent persists the dismissal
              keyed to this brief's generation, so a freshly regenerated brief
              returns. */}
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

      {/* Body — Pencil qYrr3 `zgUBx`: prose at 14/normal, primary ink,
          with inline accent citation chips. */}
      {/* The skeleton only shows on a COLD generate (no prior text). While
          regenerating an existing brief we keep the current prose on screen —
          the freshness chip's spinner carries the "working" signal — so the
          card doesn't flash blank → skeleton → prose on every refresh. */}
      {isPending && !brief.text ? (
        <div className="grid gap-2" aria-busy>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[88%]" />
          <Skeleton className="h-4 w-[60%]" />
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
 * Structured brief body. The stored text is the consumer's flattened
 * headline/items/footer format; rendering it in one <p> collapsed the
 * newlines into a wall of prose. Parse it back apart (brief-text.ts) and
 * render:
 *   • headline — one 14/500 lead line, the at-a-glance takeaway
 *   • items — one compact line each: why-clause in primary ink, then the
 *     verification step toned down ("Next: …" in tertiary), citation
 *     chips inline via BriefProse. A muted dot anchors each line start.
 *   • footer — DROPPED. It's the model's generic compliance closer
 *     ("review all pending items…"): bulk without information. The
 *     brief@v1 prompt now also tells the model to omit it.
 * Plain prose with no numbered items (e.g. the zero-risk brief) falls
 * back to the original single-paragraph rendering, so unknown shapes
 * never lose content.
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
      <p className="min-w-0 text-sm leading-[1.5] font-medium text-text-primary">
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
    // The failed state has no status dot and carries an inline retry icon
    // right after the label, so recovery lives on the FAILED chip itself
    // (the separate right-side regenerate button hides while failed).
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

  // The outdated state is a plain amber "Outdated" label — the icon-only
  // regenerate button on the right handles refresh.
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
