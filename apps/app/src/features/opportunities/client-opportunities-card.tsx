import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Trans } from '@lingui/react/macro'
import { ArrowUpRightIcon } from 'lucide-react'

import type { OpportunityPublic } from '@duedatehq/contracts'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Card, CardContent } from '@duedatehq/ui/components/ui/card'
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
 *
 * 2026-05-31: outer frame swapped from a hand-rolled `rounded-md border
 * bg-background-default p-4` div to `<Card size="sm" radius="md">` now
 * that the Card primitive carries the `radius="md"` axis. We render
 * without CardHeader to preserve the flat-frame shape (the TabSection
 * caller still owns the heading); CardContent supplies the px-4 since
 * the outer Card only owns py spacing.
 */
export function ClientOpportunitiesCard({ clientId }: { clientId: string }) {
  const opportunitiesQuery = useQuery(
    orpc.opportunities.list.queryOptions({ input: { clientId, limit: 3 } }),
  )
  const opportunities = opportunitiesQuery.data?.opportunities ?? []

  return (
    <Card size="sm" radius="md">
      <CardContent>
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
      </CardContent>
    </Card>
  )
}

function ClientOpportunityItem({ opportunity }: { opportunity: OpportunityPublic }) {
  const Icon = opportunityIcon(opportunity.kind)
  // 2026-05-26 (Yuqi propagation): card surface flipped to
  // `bg-background-default` (white) so it pops on the new
  // `bg-background-inset` gray. See
  // docs/Design/inset-surface-design-system.md.
  //
  // 2026-05-31: per-opportunity tile chrome moved from a hand-rolled
  // `rounded-md border bg-background-default p-3` article to the
  // shared `<Card size="xs" radius="md">` primitive (gap-2 py-3 px-3
  // text-sm, flat rounded-md radius). The element changes from
  // <article> to <div> because Card is a div primitive without an
  // asChild escape hatch; the surrounding list provides reading
  // structure so the article tag was an enrichment, not a behavior.
  // CardContent supplies the px-3 the outer Card omits.
  return (
    <Card size="xs" radius="md">
      <CardContent>
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
      </CardContent>
    </Card>
  )
}
