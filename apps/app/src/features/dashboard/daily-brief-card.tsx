import { Fragment, type ReactNode } from 'react'
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
  scope,
  onScopeChange,
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

  return (
    <section
      aria-label={t`Daily brief`}
      // 2026-06-08 (Yuqi /today #1 "top padding reduce"): the section's
      // top padding is trimmed (pt-3 vs the 18px on the other sides) so the
      // title row sits closer to the top edge and the card reads tighter.
      className="group flex flex-col gap-1 rounded-[14px] border border-state-accent-border bg-state-accent-hover px-[18px] pt-3 pb-[18px]"
    >
      {/* TopRow — Pencil qYrr3 `LfcWh` */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left — title + freshness (dot + mono age). Yuqi: icon removed;
            the title takes the dark brand color on hover. */}
        <div className="flex min-w-0 items-center gap-2.5">
          <h2 className="text-base leading-tight font-semibold tracking-[-0.01em] text-text-primary transition-colors group-hover:text-text-accent">
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
          <BriefScopeToggle value={scope} onChange={onScopeChange} />
          {canRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              aria-label={t`Regenerate brief`}
              className="inline-flex size-7 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-background-section hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:outline-none"
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
              className="inline-flex size-7 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-background-section hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:outline-none"
            >
              <XIcon className="size-3.5" aria-hidden />
            </button>
          ) : null}
        </div>
      </div>

      {/* Body — Pencil qYrr3 `zgUBx`: prose at 14/normal, primary ink,
          with inline accent citation chips. */}
      {isPending ? (
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
    const label = (
      <span className="inline-flex shrink-0 items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-text-destructive" aria-hidden />
        <span className="font-mono text-[11px] font-medium tracking-[0.4px] text-text-destructive uppercase">
          <Trans>Failed</Trans>
        </span>
      </span>
    )
    if (!brief.errorCode) return label
    return (
      <Tooltip>
        <TooltipTrigger render={label} />
        <TooltipContent>{brief.errorCode}</TooltipContent>
      </Tooltip>
    )
  }
  const stale = brief.status === 'stale'
  const age = brief.generatedAt ? formatRelativeTime(brief.generatedAt) : null

  // 2026-06-08 (Yuqi /today #2 "what do you do when it's outdated"): the
  // stale state is no longer a dead label — it's the affordance. When the
  // brief is outdated it renders as an amber "Outdated · Refresh" button
  // that regenerates on click, so the next step is obvious from the chip
  // itself rather than relying on the separate icon-only refresh control.
  if (stale && onRefresh) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              onClick={onRefresh}
              className="group/stale inline-flex shrink-0 items-center gap-1.5 rounded-full text-text-warning outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
            >
              <span className="size-1.5 rounded-full bg-text-warning" aria-hidden />
              <span className="font-mono text-[11px] font-medium tracking-[0.4px] uppercase">
                <Trans>Outdated</Trans>
              </span>
              <span className="inline-flex items-center gap-0.5 font-mono text-[11px] font-medium tracking-[0.4px] text-text-warning/70 uppercase transition-colors group-hover/stale:text-text-warning">
                <RotateCwIcon className="size-2.5" aria-hidden />
                <Trans>Refresh</Trans>
              </span>
            </button>
          }
        />
        <TooltipContent>
          <Trans>This brief is out of date — regenerate it</Trans>
        </TooltipContent>
      </Tooltip>
    )
  }

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
 * Firm / Me scope toggle — Pencil qYrr3 `ni1JL`: a pill track in the
 * subtle surface; the active scope is a white pill with a hairline border,
 * the inactive one is borderless and quieter.
 */
function BriefScopeToggle({
  value,
  onChange,
}: {
  value: DashboardBriefScope
  onChange: (scope: DashboardBriefScope) => void
}) {
  const { t } = useLingui()
  return (
    <div
      role="group"
      aria-label={t`Brief scope`}
      className="inline-flex items-center gap-0.5 rounded-lg bg-background-section p-0.5"
    >
      <ScopeButton active={value === 'firm'} onClick={() => onChange('firm')}>
        <Trans>Firm</Trans>
      </ScopeButton>
      <ScopeButton active={value === 'me'} onClick={() => onChange('me')}>
        <Trans>Me</Trans>
      </ScopeButton>
    </div>
  )
}

function ScopeButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-md px-2.5 py-[3px] text-xs transition-colors',
        active
          ? 'border border-divider-subtle bg-background-default font-semibold text-text-primary'
          : 'border border-transparent font-medium text-text-secondary hover:text-text-primary',
      )}
    >
      {children}
    </button>
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
      className="mx-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[4px] border border-state-accent-border bg-background-default px-1.5 align-text-bottom font-mono text-[11px] leading-none font-semibold text-text-accent tabular-nums hover:bg-state-accent-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:outline-none"
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
