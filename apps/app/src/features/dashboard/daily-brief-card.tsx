import { Fragment } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { ExternalLinkIcon, RotateCwIcon, XIcon } from 'lucide-react'

import type { DashboardBriefPublic, DashboardBriefScope } from '@duedatehq/contracts'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { TextLink } from '@duedatehq/ui/components/ui/text-link'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'
import { cn } from '@duedatehq/ui/lib/utils'

import { formatRelativeTime } from '@/lib/utils'

type DashboardBriefCitation = NonNullable<DashboardBriefPublic['citations']>[number]

/**
 * DailyBriefCard — the AI narrative of the firm's day. Rebuilt to Pencil
 * `qYrr3`: a white card with a single hairline border (no shadow), a calm
 * title row (sparkles + "Daily Brief" + one status dot + a mono age label),
 * a Firm/Me pill toggle and an icon-only refresh, then the prose. Each
 * `[n]` token resolves to an accent citation chip that deep-links back to
 * the obligation it cites (evidence traceability, not decoration).
 *
 * The single status dot carries freshness, so the rest of the card stays
 * neutral — the body prose is the one thing meant to be read. Renders
 * nothing when no brief exists (feature-off firms).
 */
export function DailyBriefCard({
  brief,
  onRefresh,
  refreshing,
  onOpenObligation,
  onClose,
}: {
  brief: DashboardBriefPublic | null
  scope: DashboardBriefScope
  onScopeChange: (scope: DashboardBriefScope) => void
  onRefresh: () => void
  refreshing: boolean
  onOpenObligation: (obligationId: string) => void
  onClose?: (() => void) | undefined
}) {
  const { t } = useLingui()
  if (!brief) return null

  const isPending = brief.status === 'pending' || refreshing
  // Refresh is only meaningful once a brief exists in some terminal-ish
  // state; while it's generating the status label shows the spinner.
  const canRefresh = !isPending

  // 2026-06-08 (Yuqi "in one line, thin banner if it failed"): a failed brief
  // collapses to a single thin banner — title · Failed · short message · inline
  // retry — instead of the full card with body prose.
  if (brief.status === 'failed' && !refreshing) {
    return (
      <section
        aria-label={t`Daily brief`}
        className="group flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[14px] bg-state-accent-hover px-[18px] py-2.5"
      >
        <h2 className="text-base leading-tight font-semibold tracking-[-0.01em] text-text-accent">
          <Trans>Daily Brief</Trans>
        </h2>
        <span className="min-w-0 truncate text-xs text-text-tertiary">
          <Trans>We couldn't generate today's brief.</Trans>
        </span>
        {/* 2026-06-08 (Yuqi /today): the "Failed" label is dropped (the message
            already says it failed) and the icon-only retry becomes a quiet
            "Regenerate brief" TEXT button sitting right after the message. */}
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
              className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-background-section hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:outline-none"
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
      // 2026-06-08 (Yuqi /today #1 "top padding reduce"): the section's
      // top padding is trimmed (pt-3 vs the 18px on the other sides) so the
      // title row sits closer to the top edge and the card reads tighter.
      className="group flex flex-col gap-1 rounded-[14px] bg-state-accent-hover px-[18px] pt-3 pb-[18px]"
    >
      {/* TopRow — Pencil qYrr3 `LfcWh` */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left — title + freshness (dot + mono age). Yuqi: icon removed;
            the title takes the dark brand color on hover. */}
        <div className="flex min-w-0 items-center gap-2.5">
          <h2 className="text-base leading-tight font-semibold tracking-[-0.01em] text-text-accent">
            <Trans>Daily Brief</Trans>
          </h2>
          <BriefFreshness
            brief={brief}
            pending={isPending}
            onRefresh={canRefresh ? onRefresh : undefined}
          />
        </div>
        {/* Right — scope toggle + icon-only refresh + dismiss */}
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
              className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-text-accent transition-colors hover:bg-background-default hover:text-text-accent focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:outline-none"
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
              className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-background-section hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:outline-none"
            >
              <XIcon className="size-3.5" aria-hidden />
            </button>
          ) : null}
        </div>
      </div>

      {/* Body — Pencil qYrr3 `zgUBx`: prose at 14/normal, primary ink,
          with inline accent citation chips. */}
      {/* 2026-06-09 (Yuqi #5 "click to regenerate, the page flicks"): the
          skeleton only shows on a COLD generate (no prior text). While
          regenerating an existing brief we keep the current prose on screen —
          the freshness chip's spinner carries the "working" signal — so the
          card no longer flashes blank → skeleton → prose on every refresh. */}
      {isPending && !brief.text ? (
        <div className="grid gap-2" aria-busy>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[88%]" />
          <Skeleton className="h-4 w-[60%]" />
        </div>
      ) : brief.status === 'failed' ? (
        <p className="text-sm text-text-tertiary">
          <Trans>We couldn't generate today's brief. Try again, or check back shortly.</Trans>
        </p>
      ) : brief.text ? (
        <p className="text-sm leading-[1.5] font-normal text-text-primary">
          <BriefProse
            text={brief.text}
            citations={brief.citations}
            onOpenObligation={onOpenObligation}
          />
        </p>
      ) : (
        <p className="text-sm text-text-tertiary">
          <Trans>No brief for this view yet.</Trans>
        </p>
      )}
    </section>
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
            className="inline-flex size-5 cursor-pointer items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-background-section hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:outline-none"
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
