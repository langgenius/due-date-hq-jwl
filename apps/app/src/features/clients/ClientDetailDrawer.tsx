import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { ArrowUpRightIcon } from 'lucide-react'
import { Link } from 'react-router'

import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@duedatehq/ui/components/ui/sheet'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'

import type { ObligationInstancePublic } from '@duedatehq/contracts'

import { TaxCodeLabel } from '@/components/primitives/tax-code-label'
import { getClientReadiness } from '@/features/clients/client-readiness'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'

import { useEntityLabels } from '@/routes/clients'

// Statuses that mean "the obligation is done" — exclude these when
// hunting for the next-due. Mirrors the set used by ClientSummaryStrip
// (the full-page tile) so the peek's next-due matches what the full
// client page would show.
const TERMINAL_STATUSES: ReadonlySet<string> = new Set([
  'done',
  'paid',
  'completed',
  'filed',
  'not_applicable',
])

/**
 * `ClientDetailDrawer` — the *peek* form of a client.
 *
 * Redesigned 2026-05-22 from "drawer-shaped detail page" to "brief
 * tooltip-style peek." The previous shape (full SummaryStrip + alerts
 * band + compliance posture inside a 640px sheet) was over-rendering
 * for the actual job: when a CPA hits the eye icon on an obligations
 * row, they want to know *which client* this is — entity, state,
 * readiness, what's next due — not edit the compliance posture.
 *
 * Anyone who needs more clicks "Open full page" → the canonical
 * `/clients/[id]` workspace, where the rich body has room to render
 * properly.
 *
 * Contents (top → bottom):
 *  1. Name + caption ("S corp · 1 open obligation")
 *  2. Identity chips (entity, state, readiness)
 *  3. One-line next due (form name + days late/until + assignee)
 *  4. Action cluster (Open full page, View all obligations)
 *
 * Mounted by `<ClientDrawerProvider>` once at the app shell.
 */

interface ClientDetailDrawerProps {
  clientId: string | null
  onClose: () => void
}

const EMPTY_OBLIGATIONS = [] as const

export function ClientDetailDrawer({ clientId, onClose }: ClientDetailDrawerProps) {
  const isOpen = clientId !== null
  const isQueryEnabled = clientId !== null && clientId.length > 0

  const clientQuery = useQuery({
    ...orpc.clients.get.queryOptions({ input: { id: clientId ?? '' } }),
    enabled: isQueryEnabled,
  })
  const obligationsQuery = useQuery({
    ...orpc.obligations.listByClient.queryOptions({ input: { clientId: clientId ?? '' } }),
    enabled: isQueryEnabled,
  })

  const client = clientQuery.data ?? null
  const obligations = obligationsQuery.data ?? EMPTY_OBLIGATIONS

  const readiness = useMemo(() => (client ? getClientReadiness(client) : undefined), [client])

  // Compute the next-due obligation inline. Same logic as
  // ClientSummaryStrip's tile so the peek matches the full-page tile.
  const { openCount, nextDue } = useMemo(() => {
    const openObligations = obligations.filter((o) => !TERMINAL_STATUSES.has(o.status))
    let best: ObligationInstancePublic | null = null
    let bestTs = Infinity
    for (const o of openObligations) {
      const ts = Date.parse(o.currentDueDate)
      if (!Number.isNaN(ts) && ts < bestTs) {
        bestTs = ts
        best = o
      }
    }
    return { openCount: openObligations.length, nextDue: best }
  }, [obligations])

  const entityLabels = useEntityLabels()
  const { t } = useLingui()

  return (
    <Sheet open={isOpen} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      {/* Slim peek width (~400px). Was ~640px when the drawer carried
          the full SummaryStrip + alerts band + compliance posture —
          that content moved to the full page; this peek is just for
          identification. */}
      <SheetContent className="flex flex-col gap-4 overflow-y-auto data-[side=right]:w-full data-[side=right]:max-w-[100vw] sm:data-[side=right]:w-[min(400px,calc(100vw-1rem))]">
        {client ? (
          <>
            <header className="flex flex-col gap-3">
              <div className="flex min-w-0 flex-col gap-1">
                <SheetTitle className="truncate text-lg font-semibold text-text-primary">
                  {client.name}
                </SheetTitle>
                <SheetDescription className="text-xs text-text-secondary">
                  {entityLabels[client.entityType]} ·{' '}
                  {openCount === 0
                    ? t`No open deadlines`
                    : openCount === 1
                      ? t`1 open deadline`
                      : t`${openCount} open deadlines`}
                </SheetDescription>
              </div>

              {/* Identity chips — entity is already in the caption above,
                  but the badge form gives a faster visual read on
                  state + readiness color. */}
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className="text-[11px]">
                  {entityLabels[client.entityType]}
                </Badge>
                {client.state ? (
                  <Badge variant="outline" className="text-[11px]">
                    {client.state}
                  </Badge>
                ) : null}
                {readiness?.status ? (
                  <Badge
                    variant={
                      readiness.status === 'ready'
                        ? 'success'
                        : readiness.status === 'needs_facts'
                          ? 'warning'
                          : 'outline'
                    }
                    className="text-[11px]"
                  >
                    {readiness.status === 'ready' ? (
                      <Trans>Ready for rules</Trans>
                    ) : readiness.status === 'needs_facts' ? (
                      <Trans>Needs facts</Trans>
                    ) : (
                      <Trans>Setup</Trans>
                    )}
                  </Badge>
                ) : null}
              </div>
            </header>

            {/* One-line next-due summary — the most-asked question
                during a peek. Avoids the 3-tile grid that wrapped
                badly in the narrow drawer (Form 1120-S text breaking
                mid-name was the trigger for this redesign). */}
            <NextDueLine nextDue={nextDue} />

            {/* Escape hatches. Anything beyond identification lives on
                the full page; obligations queue is the other natural
                drill-in. */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                render={<Link to={`/clients/${client.id}`} />}
                onClick={onClose}
              >
                <Trans>Open full page</Trans>
                <ArrowUpRightIcon data-icon="inline-end" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                render={<Link to={`/obligations?client=${client.id}`} />}
                onClick={onClose}
              >
                <Trans>View all deadlines</Trans>
              </Button>
            </div>
          </>
        ) : clientQuery.isError ? (
          <Alert variant="destructive">
            <AlertTitle>
              <Trans>Couldn't load this client</Trans>
            </AlertTitle>
            <AlertDescription>
              {rpcErrorMessage(clientQuery.error) ?? t`Please try again.`}
            </AlertDescription>
          </Alert>
        ) : (
          // Loading skeleton sized for the slim peek.
          <div className="flex flex-col gap-3">
            <SheetTitle className="sr-only">
              <Trans>Loading client</Trans>
            </SheetTitle>
            <SheetDescription className="sr-only">
              <Trans>Fetching client detail.</Trans>
            </SheetDescription>
            <Skeleton className="h-6 w-2/3 rounded-md" />
            <Skeleton className="h-4 w-1/2 rounded-md" />
            <Skeleton className="h-12 w-full rounded-md" />
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

/**
 * Single-line next-due summary for the peek drawer. Renders
 * "Form 941 · 22d late" or "Form 1120-S · due in 5d" or "No open
 * obligations" — whichever fits the obligations state.
 */
function NextDueLine({ nextDue }: { nextDue: ObligationInstancePublic | null }) {
  const { t } = useLingui()
  if (!nextDue) {
    return (
      <p className="text-sm text-text-tertiary">
        <Trans>No open deadlines right now.</Trans>
      </p>
    )
  }
  const days = Math.ceil((Date.parse(nextDue.currentDueDate) - Date.now()) / 86_400_000)
  const isLate = days < 0
  const daysAbs = Math.abs(days)
  const daysLabel = isLate ? t`${daysAbs}d late` : days === 0 ? t`due today` : t`due in ${days}d`
  return (
    <div className="flex flex-col gap-1 rounded-md border border-divider-subtle bg-background-subtle px-3 py-2">
      <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-text-muted">
        <Trans>Next due</Trans>
      </span>
      <span className="flex flex-wrap items-baseline gap-x-2 text-sm">
        {/* TaxCodeLabel renders the friendly form name (e.g. "Form
            1040" instead of the raw `federal_1040` code) and attaches
            the standard hover tooltip used everywhere else in the app. */}
        <span className="min-w-0 truncate font-medium text-text-primary">
          <TaxCodeLabel code={nextDue.taxType} />
        </span>
        <span className={isLate ? 'text-text-destructive' : 'text-text-secondary'}>
          {daysLabel}
        </span>
      </span>
    </div>
  )
}
