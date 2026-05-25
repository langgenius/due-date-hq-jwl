import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Trans } from '@lingui/react/macro'
import { ArrowUpRightIcon } from 'lucide-react'

import type { OpportunityPublic } from '@duedatehq/contracts'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { orpc } from '@/lib/rpc'
import { OpportunityKindBadge, OpportunityTimingBadge, opportunityIcon } from './opportunity-ui'

/**
 * `ClientOpportunitiesCard` — list of lightweight advisory opportunities
 * surfaced on the client detail page (Discover tab).
 *
 * 2026-05-24: dropped the outer <Card> chrome + the internal
 * "Future business cues" CardTitle. The component is used inside a
 * TabSection that already owns the section heading, so the Card title
 * doubled the heading and the Card frame stacked a second border
 * around what was already inside a section wrapper. Renders flat now:
 * a `rounded-md border bg-background-default p-4` frame + opportunity
 * items. The TabSection caller provides the heading.
 */
export function ClientOpportunitiesCard({ clientId }: { clientId: string }) {
  const opportunitiesQuery = useQuery(
    orpc.opportunities.list.queryOptions({ input: { clientId, limit: 3 } }),
  )
  const opportunities = opportunitiesQuery.data?.opportunities ?? []

  return (
    <div className="rounded-md border border-divider-regular bg-background-default p-4">
      {opportunitiesQuery.isLoading ? (
        <div className="grid gap-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : opportunities.length === 0 ? (
        <p className="text-sm text-text-secondary">
          <Trans>No lightweight opportunity cues for this client yet.</Trans>
        </p>
      ) : (
        <div className="grid gap-3">
          {opportunities.map((opportunity) => (
            <ClientOpportunityItem key={opportunity.id} opportunity={opportunity} />
          ))}
          <Button
            nativeButton={false}
            size="sm"
            variant="outline"
            className="w-fit"
            render={<Link to="/opportunities" />}
          >
            <ArrowUpRightIcon data-icon="inline-start" />
            <Trans>View all opportunities</Trans>
          </Button>
        </div>
      )}
    </div>
  )
}

function ClientOpportunityItem({ opportunity }: { opportunity: OpportunityPublic }) {
  const Icon = opportunityIcon(opportunity.kind)
  // 2026-05-26 (Yuqi propagation): card surface flipped to
  // `bg-background-default` (white) so it pops on the new
  // `bg-background-inset` gray. See
  // docs/Design/inset-surface-design-system.md.
  return (
    <article className="grid gap-2 rounded-md border border-divider-subtle bg-background-default p-3">
      <div className="flex min-w-0 items-start gap-2">
        <div className="grid size-7 shrink-0 place-items-center rounded-md bg-background-default text-text-secondary">
          <Icon className="size-3.5" aria-hidden />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap gap-1.5">
            <OpportunityKindBadge kind={opportunity.kind} />
            <OpportunityTimingBadge timing={opportunity.timing} />
          </div>
          <h3 className="mt-2 text-sm font-medium text-text-primary">{opportunity.title}</h3>
          <p className="mt-1 text-sm text-text-secondary">{opportunity.summary}</p>
        </div>
      </div>
    </article>
  )
}
