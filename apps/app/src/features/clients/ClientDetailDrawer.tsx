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
  SheetTitle,
} from '@duedatehq/ui/components/ui/sheet'
import { useOptionalSidebar } from '@duedatehq/ui/components/ui/sidebar'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'

import type { ObligationInstancePublic } from '@duedatehq/contracts'

import { TaxCodeLabel } from '@/components/primitives/tax-code-label'
import { getClientReadiness } from '@/features/clients/client-readiness'
import { useFirmAsOfDate } from '@/features/firm/use-firm-as-of-date'
import { isPaymentOverdue } from '@/features/obligations/payment-overdue'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'

import { useEntityLabels } from '@/routes/clients'
import { clientDetailPath } from './client-url'

// Statuses that mean "the obligation is done" — exclude these when
// hunting for the next-due. Mirrors the set used by ClientSummaryStrip
// (the full-page tile) so the peek's next-due matches what the full
// client page would show.
// 2026-05-27 (TERMINAL_STATUSES root bug): `'done'` (UI "Filed") is
// NOT terminal — filing done but payment may be outstanding. Only
// `'completed'`, `'paid'`, and `'not_applicable'` are. See dev-log
// 2026-05-27-terminal-statuses-root-bug.md.
const TERMINAL_STATUSES: ReadonlySet<string> = new Set(['paid', 'completed', 'not_applicable'])

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
  // 2026-05-26 (Yuqi sidebar mental-model pass — consistency):
  // every right-side drawer in the product opts into the same
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
  const { openCount, nextDue, paymentOverdueCount } = useMemo(() => {
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
    // 2026-05-27 (phi journey audit J1): match ClientPeekHoverCard's
    // payment-overdue surfacing so both peek shapes agree on the
    // same client. See payment-overdue.ts.
    const today = Date.now()
    const paymentOverdue = obligations.filter((o) => isPaymentOverdue(o, today)).length
    return {
      openCount: openObligations.length,
      nextDue: best,
      paymentOverdueCount: paymentOverdue,
    }
  }, [obligations])

  const entityLabels = useEntityLabels()
  const { t } = useLingui()
  // 2026-05-27 (D16 — Agent ω, journey-audit drain): threaded the
  // firm's "as of" date through NextDueLine instead of letting it
  // call Date.now() directly. Keeps the peek's relative-day text
  // ("3d late") in sync with the rest of the app's day-math, which
  // anchors on the firm's timezone rather than the user's browser
  // clock.
  const asOfDate = useFirmAsOfDate()

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
                {/* 2026-05-27 (phi journey audit J1): payment-overdue
                    line. Mirrors ClientPeekHoverCard so the SAME
                    client renders the SAME urgency cue whether the
                    user sees the hover popover or the drawer peek. */}
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
                  visual read.
                  2026-05-27 (Step 6 UX audit #86): entity chip dropped.
                  The caption line above already says "S corp · 1 open
                  deadline" — the chip below was rendering the same
                  entity label a second time at smaller scale, which
                  read as duplicate metadata. State and readiness are
                  unique signals that earn their chip; entity does not. */}
              <div className="flex flex-wrap items-center gap-1.5">
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
            </header>

            {/* One-line next-due summary — the most-asked question
                during a peek. Avoids the 3-tile grid that wrapped
                badly in the narrow drawer (Form 1120-S text breaking
                mid-name was the trigger for this redesign). */}
            <NextDueLine nextDue={nextDue} asOfDate={asOfDate} />

            {/* Escape hatches. Anything beyond identification lives on
                the full page; obligations queue is the other natural
                drill-in. */}
            <div className="flex flex-wrap items-center gap-2">
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
                variant="outline"
                size="sm"
                render={<Link to={`/deadlines?client=${client.id}`} />}
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
              {rpcErrorMessage(clientQuery.error) ??
                t`Check your network and try again. If this keeps happening, contact support.`}
            </AlertDescription>
          </Alert>
        ) : (
          // Loading skeleton sized for the slim peek.
          // 2026-05-27 (Step 6 UX audit #84): SheetTitle used to be
          // `sr-only` — so AT users heard "Loading client…" but
          // sighted users just saw three grey bars with no label
          // hinting at what the drawer was about to show. Promoted
          // the title to a visible heading; AT still gets the same
          // announcement (semantics unchanged). Description stays
          // sr-only since the visible bars already show "we're
          // fetching things."
          <div className="flex flex-col gap-3">
            <SheetTitle className="text-lg font-semibold text-text-primary">
              <Trans>Loading client…</Trans>
            </SheetTitle>
            <SheetDescription className="sr-only">
              <Trans>Fetching client detail.</Trans>
            </SheetDescription>
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
function NextDueLine({
  nextDue,
  asOfDate,
}: {
  nextDue: ObligationInstancePublic | null
  // 2026-05-27 (D16): firm's "as of" anchor. Falls back to Date.now()
  // when missing so the component never breaks if the timezone
  // provider isn't in scope.
  asOfDate: string | null
}) {
  const { t } = useLingui()
  if (!nextDue) {
    return (
      <p className="text-sm text-text-tertiary">
        <Trans>No open deadlines right now.</Trans>
      </p>
    )
  }
  const asOfMs = asOfDate ? Date.parse(asOfDate) : Date.now()
  const days = Math.ceil(
    (Date.parse(nextDue.currentDueDate) - (Number.isNaN(asOfMs) ? Date.now() : asOfMs)) /
      86_400_000,
  )
  const isLate = days < 0
  const daysAbs = Math.abs(days)
  const daysLabel = isLate ? t`${daysAbs}d late` : days === 0 ? t`due today` : t`due in ${days}d`
  return (
    <div className="flex flex-col gap-1 rounded-md border border-divider-subtle bg-background-subtle px-3 py-2">
      <span className="text-caption-xs font-medium uppercase tracking-eyebrow text-text-muted">
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
