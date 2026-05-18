import { Link } from 'react-router'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Trans } from '@lingui/react/macro'
import { ArrowUpRightIcon, SparklesIcon } from 'lucide-react'

import type { OpportunityPublic } from '@duedatehq/contracts'
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
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold text-text-primary">
              <Trans>Opportunities</Trans>
            </h1>
            <p className="max-w-3xl text-sm text-text-secondary">
              <Trans>
                Lightweight client conversation cues for future service, retention, and engagement
                scope. DueDateHQ does not generate tax strategies here.
              </Trans>
            </p>
          </div>
        </div>
      </header>

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
            <div className="grid min-h-48 place-items-center rounded-md border border-dashed border-divider-subtle bg-background-subtle p-6 text-center">
              <div className="max-w-md">
                <SparklesIcon className="mx-auto size-8 text-text-tertiary" aria-hidden />
                <h2 className="mt-3 text-sm font-medium text-text-primary">
                  <Trans>No opportunity cues yet</Trans>
                </h2>
                <p className="mt-1 text-sm text-text-secondary">
                  <Trans>
                    Add client facts, filing profiles, and due-date work before the guidance queue
                    has enough signal.
                  </Trans>
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-divider-subtle">
              {opportunities.map((opportunity) => (
                <OpportunityRow key={opportunity.id} opportunity={opportunity} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryCard({ label, value }: { label: ReactNode; value: number | undefined }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <span className="text-sm text-text-secondary">{label}</span>
        {value === undefined ? (
          <Skeleton className="h-7 w-10" />
        ) : (
          <span className="font-mono text-2xl font-semibold tabular-nums text-text-primary">
            {value}
          </span>
        )}
      </CardContent>
    </Card>
  )
}

function OpportunityRow({ opportunity }: { opportunity: OpportunityPublic }) {
  const Icon = opportunityIcon(opportunity.kind)
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
        <Button size="sm" variant="outline" render={<Link to={opportunity.primaryAction.href} />}>
          <ArrowUpRightIcon data-icon="inline-start" />
          <Trans>Open client</Trans>
        </Button>
      </div>
    </article>
  )
}
