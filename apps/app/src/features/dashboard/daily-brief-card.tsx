import { Fragment, type ReactNode } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { Astroid, ExternalLinkIcon, RotateCwIcon } from 'lucide-react'

import type { DashboardBriefPublic, DashboardBriefScope } from '@duedatehq/contracts'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@duedatehq/ui/components/ui/card'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { TextLink } from '@duedatehq/ui/components/ui/text-link'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'
import { cn } from '@duedatehq/ui/lib/utils'

import { formatRelativeTime } from '@/lib/utils'

type DashboardBriefCitation = NonNullable<DashboardBriefPublic['citations']>[number]

/**
 * DailyBriefCard — surfaces the server-generated dashboard brief that
 * `dashboard.load` already returns but the route never rendered. The
 * brief is an AI narrative of the firm's day; each `[n]` token in the
 * text resolves to a citation that deep-links to the obligation it's
 * about, so a claim like "3 returns are overdue [1][2][3]" is clickable
 * back to the underlying work (evidence traceability, not decoration).
 *
 * Renders nothing when no brief exists (feature-off firms). Status drives
 * the chrome: pending → skeleton + "Generating…"; stale → "Outdated" +
 * emphasized Refresh; failed → quiet error + Retry; ready → prose.
 */
export function DailyBriefCard({
  brief,
  scope,
  onScopeChange,
  onRefresh,
  refreshing,
  onOpenObligation,
}: {
  brief: DashboardBriefPublic | null
  scope: DashboardBriefScope
  onScopeChange: (scope: DashboardBriefScope) => void
  onRefresh: () => void
  refreshing: boolean
  onOpenObligation: (obligationId: string) => void
}) {
  const { t } = useLingui()
  if (!brief) return null

  const isPending = brief.status === 'pending' || refreshing
  // Refresh is only meaningful once a brief exists in some terminal-ish
  // state; while it's generating we show the spinner in the chip instead.
  const canRefresh = !isPending

  return (
    <Card className="bg-background-section">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <Astroid className="size-4 text-text-accent" aria-hidden />
          <Trans>Your daily brief</Trans>
        </CardTitle>
        <div className="flex items-center gap-2">
          <BriefScopeToggle value={scope} onChange={onScopeChange} />
          <BriefFreshnessChip brief={brief} pending={isPending} />
          {canRefresh ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 px-2 text-text-secondary"
              onClick={onRefresh}
              aria-label={t`Regenerate brief`}
            >
              <RotateCwIcon className="size-3.5" aria-hidden />
              <span className="hidden sm:inline">
                <Trans>Regenerate</Trans>
              </span>
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isPending ? (
          <div className="grid gap-2" aria-busy>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[92%]" />
            <Skeleton className="h-4 w-[64%]" />
          </div>
        ) : brief.status === 'failed' ? (
          <p className="text-sm text-text-tertiary">
            <Trans>We couldn't generate today's brief. Try again, or check back shortly.</Trans>
          </p>
        ) : brief.text ? (
          <p className="text-sm leading-relaxed text-text-secondary">
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
      </CardContent>
    </Card>
  )
}

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
      className="inline-flex items-center rounded-md border border-divider-subtle bg-background-default p-0.5"
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
        'rounded px-2 py-0.5 text-caption-xs font-medium transition-colors',
        active
          ? 'bg-state-accent-active-alt text-text-accent'
          : 'text-text-tertiary hover:text-text-secondary',
      )}
    >
      {children}
    </button>
  )
}

function BriefFreshnessChip({ brief, pending }: { brief: DashboardBriefPublic; pending: boolean }) {
  const { t } = useLingui()
  if (pending) {
    return (
      <Badge variant="secondary" size="sm" className="gap-1">
        <RotateCwIcon className="size-3 animate-spin" aria-hidden />
        <Trans>Generating…</Trans>
      </Badge>
    )
  }
  if (brief.status === 'failed') {
    const chip = (
      <Badge variant="destructive" size="sm">
        <Trans>Couldn't generate</Trans>
      </Badge>
    )
    if (!brief.errorCode) return chip
    return (
      <Tooltip>
        <TooltipTrigger render={chip} />
        <TooltipContent>{brief.errorCode}</TooltipContent>
      </Tooltip>
    )
  }
  if (brief.status === 'stale') {
    return (
      <Badge variant="warning" size="sm">
        <Trans>Outdated</Trans>
      </Badge>
    )
  }
  // ready
  if (!brief.generatedAt) return null
  return (
    <span className="text-caption-xs tabular-nums text-text-tertiary">
      <Trans>Updated {formatRelativeTime(brief.generatedAt)}</Trans>
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
  return (
    <>
      {segments.map((segment, index) => {
        const match = /^\[(\d+)\]$/.exec(segment)
        if (!match) return <Fragment key={index}>{segment}</Fragment>
        const ref = Number(match[1])
        const citation = citations?.find((entry) => entry.ref === ref)
        if (!citation) return <Fragment key={index}>{segment}</Fragment>
        return (
          <CitationChip
            key={index}
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
  const chip = (
    <button
      type="button"
      onClick={onOpen}
      aria-label={t`Citation ${n} — open deadline`}
      className="mx-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded bg-state-accent-active-alt px-1 align-text-top text-[10px] font-medium tabular-nums leading-none text-text-accent hover:bg-state-accent-active focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:outline-none"
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
