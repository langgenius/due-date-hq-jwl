import { Link } from 'react-router'
import { useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  ArrowUpRightIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  RotateCcwIcon,
  SparklesIcon,
  XIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import type { OpportunityDismissalRow, OpportunityPublic } from '@duedatehq/contracts'
import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@duedatehq/ui/components/ui/card'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { EmptyState } from '@/components/patterns/empty-state'
import { PageHeader } from '@/components/patterns/page-header'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import {
  OpportunityKindBadge,
  OpportunitySeverityBadge,
  OpportunityTimingBadge,
  opportunityIcon,
} from './opportunity-ui'

const EMPTY_OPPORTUNITIES: OpportunityPublic[] = []

export function OpportunitiesPage() {
  const opportunitiesQuery = useQuery(
    orpc.opportunities.list.queryOptions({ input: { limit: 24 } }),
  )
  const opportunities = opportunitiesQuery.data?.opportunities ?? EMPTY_OPPORTUNITIES
  const summary = opportunitiesQuery.data?.summary

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 p-4 md:p-6">
      <PageHeader title={<Trans>Opportunities</Trans>} />

      {opportunitiesQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>
            <Trans>Couldn't load opportunities</Trans>
          </AlertTitle>
          <AlertDescription>
            {rpcErrorMessage(opportunitiesQuery.error) ?? <Trans>Please try again.</Trans>}
          </AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-3 md:grid-cols-3">
        <SummaryCard
          label={<Trans>Advisory conversations</Trans>}
          value={summary?.advisoryConversationCount}
        />
        <SummaryCard label={<Trans>Scope reviews</Trans>} value={summary?.scopeReviewCount} />
        <SummaryCard
          label={<Trans>Retention check-ins</Trans>}
          value={summary?.retentionCheckInCount}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>
            <Trans>Business guidance queue</Trans>
          </CardTitle>
          <CardDescription>
            <Trans>Open the client to review facts before deciding whether to follow up.</Trans>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {opportunitiesQuery.isLoading ? (
            <div className="grid gap-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : opportunities.length === 0 ? (
            <EmptyState
              icon={SparklesIcon}
              title={<Trans>No opportunity cues yet</Trans>}
              description={
                <Trans>
                  Add client facts, filing profiles, and due-date work before the guidance queue has
                  enough signal.
                </Trans>
              }
            />
          ) : (
            <div className="divide-y divide-divider-subtle">
              {opportunities.map((opportunity) => (
                <OpportunityRow key={opportunity.id} opportunity={opportunity} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <DismissedOpportunitiesSection />
    </div>
  )
}

// 2026-05-24 (critique /polish — un-dismiss): bottom-of-page
// disclosure listing the user's active dismissals + snoozes with
// per-row Restore buttons. Collapsed by default so it doesn't
// compete with the live queue above. Hidden entirely when there
// are no dismissals.
function DismissedOpportunitiesSection() {
  const { t } = useLingui()
  const [expanded, setExpanded] = useState(false)
  const queryClient = useQueryClient()
  const dismissedQuery = useQuery(
    orpc.opportunities.listDismissed.queryOptions({ input: undefined }),
  )
  const dismissals = dismissedQuery.data?.dismissals ?? []
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: orpc.opportunities.list.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.opportunities.listDismissed.key() })
  }
  const restoreMutation = useMutation(
    orpc.opportunities.restore.mutationOptions({
      onSuccess: (output) => {
        invalidate()
        if (output.restored) {
          toast.success(t`Opportunity restored.`)
        } else {
          toast.message(t`Already restored.`)
        }
      },
      onError: (error) => {
        toast.error(rpcErrorMessage(error) ?? t`Couldn't restore this opportunity.`)
      },
    }),
  )

  if (dismissedQuery.isLoading || dismissals.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex w-full items-center justify-between gap-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
          aria-expanded={expanded}
        >
          <div className="flex items-center gap-2">
            {expanded ? (
              <ChevronDownIcon className="size-4 text-text-tertiary" aria-hidden />
            ) : (
              <ChevronRightIcon className="size-4 text-text-tertiary" aria-hidden />
            )}
            <CardTitle className="text-base">
              <Trans>Recently dismissed</Trans>{' '}
              <span className="text-sm font-normal text-text-tertiary">({dismissals.length})</span>
            </CardTitle>
          </div>
          <span className="text-xs text-text-tertiary">
            <Trans>Restore brings the row back to the queue</Trans>
          </span>
        </button>
      </CardHeader>
      {expanded ? (
        <CardContent className="grid gap-2 pt-0">
          {dismissals.map((dismissal) => (
            <DismissedRow
              key={dismissal.opportunityKey}
              dismissal={dismissal}
              onRestore={() => restoreMutation.mutate({ opportunityKey: dismissal.opportunityKey })}
              pending={restoreMutation.isPending}
            />
          ))}
        </CardContent>
      ) : null}
    </Card>
  )
}

function DismissedRow({
  dismissal,
  onRestore,
  pending,
}: {
  dismissal: OpportunityDismissalRow
  onRestore: () => void
  pending: boolean
}) {
  const { t } = useLingui()
  const label = humanizeOpportunityKey(dismissal.opportunityKey)
  const snoozeNote =
    dismissal.kind === 'snoozed' && dismissal.snoozeUntil
      ? t`Snoozed until ${formatDismissalDate(dismissal.snoozeUntil)}`
      : t`Dismissed`
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-divider-subtle px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm text-text-primary">{label}</p>
        <p className="truncate text-xs text-text-tertiary">
          {snoozeNote}
          {dismissal.createdByName ? <> · {dismissal.createdByName}</> : null}
        </p>
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={onRestore}
        disabled={pending}
        aria-label={t`Restore ${label}`}
      >
        <RotateCcwIcon data-icon="inline-start" />
        <Trans>Restore</Trans>
      </Button>
    </div>
  )
}

// `retention_check_in:client:10000000-...` → "Retention check-in"
// for the small dismissed-list row label. The client name lives in
// the audit row + the future un-restored opportunity itself; this
// just needs to read as "what was the kind of cue I dismissed".
function humanizeOpportunityKey(key: string): string {
  const [head] = key.split(':')
  if (!head) return key
  return head
    .split('_')
    .map((part) => (part.length > 0 ? part[0]!.toUpperCase() + part.slice(1) : part))
    .join(' ')
}

function formatDismissalDate(iso: string): string {
  const date = new Date(iso)
  if (!Number.isFinite(date.getTime())) return iso
  return date.toISOString().slice(0, 10)
}

function SummaryCard({ label, value }: { label: ReactNode; value: number | undefined }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <span className="text-sm text-text-secondary">{label}</span>
        {value === undefined ? (
          <Skeleton className="h-7 w-10" />
        ) : (
          <span className="text-2xl font-semibold tabular-nums text-text-primary">{value}</span>
        )}
      </CardContent>
    </Card>
  )
}

// 2026-05-24 (critique P2): default snooze window when the user
// picks the Snooze action. 14 days is the canonical "talk to me
// next bi-weekly cycle" interval — long enough for client circumstances
// to actually shift, short enough to keep the queue alive. Server
// clamps to a 90-day ceiling regardless.
const DEFAULT_SNOOZE_DAYS = 14
const MS_PER_DAY = 24 * 60 * 60 * 1000

function OpportunityRow({ opportunity }: { opportunity: OpportunityPublic }) {
  const Icon = opportunityIcon(opportunity.kind)
  const { t } = useLingui()
  const queryClient = useQueryClient()
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: orpc.opportunities.list.key() })
  }
  const dismissMutation = useMutation(
    orpc.opportunities.dismiss.mutationOptions({
      onSuccess: () => {
        invalidate()
        toast.success(t`Opportunity dismissed.`)
      },
      onError: (error) => {
        toast.error(rpcErrorMessage(error) ?? t`Couldn't dismiss this opportunity.`)
      },
    }),
  )
  const snoozeMutation = useMutation(
    orpc.opportunities.snooze.mutationOptions({
      onSuccess: () => {
        invalidate()
        toast.success(t`Snoozed for ${DEFAULT_SNOOZE_DAYS} days.`)
      },
      onError: (error) => {
        toast.error(rpcErrorMessage(error) ?? t`Couldn't snooze this opportunity.`)
      },
    }),
  )
  const pending = dismissMutation.isPending || snoozeMutation.isPending
  return (
    <article className="grid gap-3 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
      <div className="flex min-w-0 gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-md bg-background-subtle text-text-secondary">
          <Icon className="size-4" aria-hidden />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <OpportunityKindBadge kind={opportunity.kind} />
            <OpportunitySeverityBadge severity={opportunity.severity} />
            <OpportunityTimingBadge timing={opportunity.timing} />
          </div>
          <h2 className="mt-2 text-sm font-medium text-text-primary">{opportunity.title}</h2>
          <p className="mt-1 text-sm text-text-secondary">{opportunity.summary}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {opportunity.evidence.map((item) => (
              <Badge key={`${opportunity.id}:${item.label}`} variant="outline">
                {item.label}: {item.value}
              </Badge>
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
        <Link
          to={opportunity.primaryAction.href}
          className="text-sm font-medium text-text-primary hover:underline"
        >
          {opportunity.client.name}
        </Link>
        {/* 2026-05-24 (critique P2): user-driven hide. Snooze parks
            the row for DEFAULT_SNOOZE_DAYS; Dismiss is forever. Both
            go through `opportunity_dismissal` server-side, so the
            row reliably stays gone across devices and sessions. */}
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() =>
            snoozeMutation.mutate({
              opportunityKey: opportunity.id,
              until: new Date(Date.now() + DEFAULT_SNOOZE_DAYS * MS_PER_DAY).toISOString(),
            })
          }
          aria-label={t`Snooze ${opportunity.title} for ${DEFAULT_SNOOZE_DAYS} days`}
        >
          <ClockIcon data-icon="inline-start" />
          <Trans>Snooze</Trans>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => dismissMutation.mutate({ opportunityKey: opportunity.id })}
          aria-label={t`Dismiss ${opportunity.title}`}
        >
          <XIcon data-icon="inline-start" />
          <Trans>Dismiss</Trans>
        </Button>
        <Button size="sm" variant="outline" render={<Link to={opportunity.primaryAction.href} />}>
          <ArrowUpRightIcon data-icon="inline-start" />
          <Trans>Open client</Trans>
        </Button>
      </div>
    </article>
  )
}
