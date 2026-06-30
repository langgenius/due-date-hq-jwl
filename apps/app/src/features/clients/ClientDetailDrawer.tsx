import { useEffect, useMemo } from 'react'
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
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@duedatehq/ui/components/ui/sheet'
import { useOptionalSidebar } from '@duedatehq/ui/components/ui/sidebar'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'

import type { ObligationInstancePublic } from '@duedatehq/contracts'

import { CapsFieldLabel } from '@/components/primitives/caps-field-label'
import { TaxCodeLabel } from '@/components/primitives/tax-code-label'
import { DueCountdownText } from '@/components/primitives/due-date-label'
import { getClientReadiness } from '@/features/clients/client-readiness'
import { useFirmAsOfDate } from '@/features/firm/use-firm-as-of-date'
import { ANALYTICS_EVENTS, track } from '@/lib/analytics'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'

import { useEntityLabels } from '@/routes/clients'
import { clientDetailPath } from './client-url'

import { daysUntilDueFromAsOf, useClientNextDue } from './use-client-next-due'

/**
 * `ClientDetailDrawer` — the *peek* form of a client.
 *
 * A brief tooltip-style peek, not a drawer-shaped detail page: when a
 * CPA hits the eye icon on an obligations row, they want to know
 * *which client* this is — entity, state, readiness, what's next due —
 * not edit the compliance posture.
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
  // Every right-side drawer in the product opts into the same
  // auto-collapse behavior. ClientDetailDrawer mounts via
  // `ClientDrawerMount` in `routes/_layout.tsx` as a sibling of
  // AppShell, so SidebarProvider is NOT in scope — use the
  // optional variant which no-ops outside the provider. (Net
  // effect for /clients route consumers: same as the other
  // wide drawers; for the off-route case: no-op, no crash.)
  const sidebar = useOptionalSidebar()
  const setAutoCollapsed = sidebar?.setAutoCollapsed
  useEffect(() => {
    if (!setAutoCollapsed) return undefined
    setAutoCollapsed(isOpen)
    return () => {
      setAutoCollapsed(false)
    }
  }, [isOpen, setAutoCollapsed])

  // Fire once on each open transition of the peek drawer.
  useEffect(() => {
    if (isOpen) track(ANALYTICS_EVENTS.clientOpened, { surface: 'drawer' })
  }, [isOpen])

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

  const { openCount, nextDue, paymentOverdueCount } = useClientNextDue(obligations)

  const entityLabels = useEntityLabels()
  const { t } = useLingui()
  // Thread the firm's "as of" date through NextDueLine instead of
  // letting it call Date.now() directly. Keeps the peek's relative-day
  // text ("3d late") in sync with the rest of the app's day-math, which
  // anchors on the firm's timezone rather than the user's browser
  // clock.
  const asOfDate = useFirmAsOfDate()

  return (
    <Sheet open={isOpen} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      {/* Slim peek width (~400px) — this peek is just for
          identification; richer content lives on the full page. */}
      <SheetContent className="overflow-y-auto data-[side=right]:w-full data-[side=right]:max-w-[100vw] sm:data-[side=right]:w-[min(400px,calc(100vw-1rem))]">
        {client ? (
          <>
            {/* SheetHeader/SheetFooter so the peek inherits the
                canonical drawer padding (px-6) instead of rendering
                flush to the panel edge. */}
            <SheetHeader>
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
                {/* Payment-overdue line. Mirrors ClientPeekHoverCard so
                    the SAME client renders the SAME urgency cue whether
                    the user sees the hover popover or the drawer peek. */}
                {paymentOverdueCount > 0 ? (
                  <span className="text-xs font-medium text-text-destructive">
                    {paymentOverdueCount === 1 ? (
                      <Trans>Payment overdue on 1 filing</Trans>
                    ) : (
                      <Trans>Payment overdue on {paymentOverdueCount} filings</Trans>
                    )}
                  </span>
                ) : null}
              </div>

              {/* Identity chips — state + readiness color give a fast
                  visual read. No entity chip: the caption line above
                  already says "S corp · 1 open deadline", so an entity
                  chip would duplicate that label. State and readiness
                  are unique signals that earn their chip; entity does
                  not. */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {client.state ? (
                  <Badge variant="outline" className="text-caption">
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
                    className="text-caption"
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
            </SheetHeader>

            {/* One-line next-due summary — the most-asked question
                during a peek. Avoids the 3-tile grid that wrapped
                badly in the narrow drawer (Form 1120-S text breaking
                mid-name was the trigger for this redesign). */}
            <div className="px-6">
              <NextDueLine nextDue={nextDue} asOfDate={asOfDate} />
            </div>

            {/* Escape hatches. Anything beyond identification lives on
                the full page; obligations queue is the other natural
                drill-in. */}
            <SheetFooter className="flex-row flex-wrap items-center gap-2">
              <Button
                nativeButton={false}
                variant="primary"
                size="sm"
                render={<Link to={clientDetailPath(client)} />}
                onClick={onClose}
              >
                <Trans>Open full page</Trans>
                <ArrowUpRightIcon data-icon="inline-end" />
              </Button>
              <Button
                nativeButton={false}
                variant="secondary"
                size="sm"
                render={<Link to={`/deadlines?client=${client.id}`} />}
                onClick={onClose}
              >
                <Trans>View all deadlines</Trans>
              </Button>
            </SheetFooter>
          </>
        ) : clientQuery.isError ? (
          <Alert variant="destructive" className="mx-6">
            <AlertTitle>
              <Trans>Couldn't load this client</Trans>
            </AlertTitle>
            <AlertDescription>
              {rpcErrorMessage(clientQuery.error) ??
                t`Try again in a moment. If it keeps failing, contact support.`}
            </AlertDescription>
          </Alert>
        ) : (
          // Loading skeleton sized for the slim peek.
          // SheetTitle is a visible heading (not `sr-only`) so sighted
          // users get a label hinting at what the drawer is about to
          // show, not just three grey bars; AT gets the same
          // announcement. Description stays sr-only since the visible
          // bars already show "we're fetching things."
          <SheetHeader className="gap-3">
            <SheetTitle className="text-lg font-semibold text-text-primary">
              <Trans>Loading client…</Trans>
            </SheetTitle>
            <SheetDescription className="sr-only">
              <Trans>Fetching client detail.</Trans>
            </SheetDescription>
            <Skeleton className="h-4 w-1/2 rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </SheetHeader>
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
function NextDueLine({
  nextDue,
  asOfDate,
}: {
  nextDue: ObligationInstancePublic | null
  // Firm's "as of" anchor. Falls back to Date.now() when missing so
  // the component never breaks if the timezone provider isn't in scope.
  asOfDate: string | null
}) {
  if (!nextDue) {
    return (
      <p className="text-sm text-text-tertiary">
        <Trans>No open deadlines right now.</Trans>
      </p>
    )
  }
  const days = daysUntilDueFromAsOf(nextDue.currentDueDate, asOfDate)
  const isLate = days < 0
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-divider-subtle bg-background-subtle px-3 py-2">
      <CapsFieldLabel as="span" variant="group" className="text-text-tertiary">
        <Trans>Next due</Trans>
      </CapsFieldLabel>
      <span className="flex flex-wrap items-baseline gap-x-2 text-sm">
        {/* TaxCodeLabel renders the friendly form name (e.g. "Form
            1040" instead of the raw `federal_1040` code) and attaches
            the standard hover tooltip used everywhere else in the app. */}
        <span className="min-w-0 truncate font-medium text-text-primary">
          <TaxCodeLabel code={nextDue.taxType} />
        </span>
        {/* Shared compact vocabulary ("22d late" / "today" / "in 5d") — the
            "Next due" eyebrow carries the "due" context. */}
        <span className={isLate ? 'text-text-destructive' : 'text-text-secondary'}>
          <DueCountdownText days={days} />
        </span>
      </span>
    </div>
  )
}
