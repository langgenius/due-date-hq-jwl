import { useMemo, type ReactElement } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { ArrowUpRightIcon } from 'lucide-react'
import { Link } from 'react-router'

import type { ObligationInstancePublic } from '@duedatehq/contracts'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import {
  PreviewCard,
  PreviewCardContent,
  PreviewCardTrigger,
} from '@duedatehq/ui/components/ui/preview-card'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'

import { CapsFieldLabel } from '@/components/primitives/caps-field-label'
import { TaxCodeLabel } from '@/components/primitives/tax-code-label'
import { DueCountdownText } from '@/components/primitives/due-date-label'
import { getClientReadiness } from '@/features/clients/client-readiness'
import { useFirmAsOfDate } from '@/features/firm/use-firm-as-of-date'
import { orpc } from '@/lib/rpc'

import { useEntityLabels } from '@/routes/clients'
import { clientDetailPath } from './client-url'
import { daysUntilDueFromAsOf, useClientNextDue } from './use-client-next-due'

/**
 * `ClientPeekHoverCard` — the *hover* form of a client peek.
 *
 * Replaces the click-to-open `ClientDetailDrawer` for the
 * cross-surface eye-icon pattern. Hovering (or keyboard-focusing) the
 * trigger element opens a small popover anchored next to it; the
 * popover stays open as the cursor moves into it, so action buttons
 * inside the popover remain clickable.
 *
 * Trigger → Popover content shape:
 *
 *     ┌─ trigger ─┐   ╭─ popover ──────────────────╮
 *     │ 👁 (icon) │ → │ Bright Studio S-Corp        │
 *     └───────────┘   │ S corp · 1 open obligation  │
 *                     │ [S corp] [CA] [Ready]       │
 *                     │ ─────────────────────────── │
 *                     │ Next due  Form 1120-S · -1d │
 *                     │                             │
 *                     │ [Open full page →]  [Q...]  │
 *                     ╰─────────────────────────────╯
 *
 * Used in:
 *  - Obligations queue row eye icon
 *  - ClientFactsWorkspace related-client list eye icons
 *  - (any future "peek a client" affordance)
 *
 * Drops the previous `ClientDrawerProvider` round-trip for this use
 * case. Click on the trigger still navigates to `/clients/[id]` via
 * the optional `triggerLinkTo` prop — hover shows the popover, click
 * goes to the full page. The drawer remains available for legacy
 * call sites that need a sheet-shaped peek.
 */

export function ClientPeekHoverCard({
  clientId,
  children,
}: {
  clientId: string
  /** Single element to use as the hover trigger. Base UI's
   *  PreviewCardTrigger's `render` prop merges its event handlers and
   *  state attributes into this element, so it must be a real DOM
   *  element (e.g. `<button>`), not a string or fragment. */
  children: ReactElement
}) {
  return (
    // Base UI's PreviewCard is the right primitive for tooltip-style
    // hover cards — Popover is click-driven. `delay` and `closeDelay`
    // go on the Trigger; `delay=150ms` reacts faster than the default
    // 600ms so it feels like a tooltip, `closeDelay=200ms` gives the
    // user a moment to move the cursor from the trigger INTO the
    // card content without it closing mid-traversal.
    <PreviewCard>
      <PreviewCardTrigger render={children} delay={150} closeDelay={200} />
      <PreviewCardContent side="bottom" align="start" className="w-[320px] p-0">
        <ClientPeekBody clientId={clientId} />
      </PreviewCardContent>
    </PreviewCard>
  )
}

const EMPTY_OBLIGATIONS = [] as const

function ClientPeekBody({ clientId }: { clientId: string }) {
  const { t } = useLingui()
  const entityLabels = useEntityLabels()
  // The firm's "as of" anchor (not `Date.now()`) so the hover-card's
  // "Xd late" matches the rest of the surfaces (which calendar-pin off
  // this hook).
  const asOfDate = useFirmAsOfDate()

  // Data fetching only fires when the popover actually mounts — Base
  // UI's Popover unmounts its content when closed, so these queries
  // don't run until the first hover.
  const clientQuery = useQuery({
    ...orpc.clients.get.queryOptions({ input: { id: clientId } }),
    enabled: clientId.length > 0,
  })
  const obligationsQuery = useQuery({
    ...orpc.obligations.listByClient.queryOptions({ input: { clientId } }),
    enabled: clientId.length > 0,
  })

  const client = clientQuery.data ?? null
  const obligations = obligationsQuery.data ?? EMPTY_OBLIGATIONS

  const readiness = useMemo(() => (client ? getClientReadiness(client) : undefined), [client])

  const { openCount, nextDue, paymentOverdueCount } = useClientNextDue(obligations)

  if (clientQuery.isError) {
    return (
      <div className="flex flex-col gap-2 p-4 text-sm text-text-tertiary">
        <Trans>Couldn't load this client.</Trans>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="flex flex-col gap-2 p-4">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="mt-2 h-10 w-full" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Identity */}
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-sm font-semibold text-text-primary">{client.name}</span>
        {/* Subtitle is just the open-deadline count — the single
            useful state signal at this scan distance. Entity type is
            not repeated here; the chip row below carries it. */}
        <span className="text-xs text-text-secondary">
          {/* A deadline-load failure must not read as "No open deadlines" (audit P2). */}
          {obligationsQuery.isError
            ? t`Deadlines unavailable`
            : openCount === 0
              ? t`No open deadlines`
              : openCount === 1
                ? t`1 open deadline`
                : t`${openCount} open deadlines`}
        </span>
        {/* Payment-overdue line. Surfaces "Filed but payment overdue
            on N filings" inline with the identity subtitle so the peek
            doesn't bury the most expensive signal. Renders only when
            the count is > 0 so the common case (every filing's payment
            is up to date) stays quiet. Tinted destructive because
            interest keeps accruing until the wire lands — this IS
            active urgency, not a quality stat. */}
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

      {/* Identity chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className="text-caption-xs">
          {entityLabels[client.entityType]}
        </Badge>
        {client.state ? (
          <Badge variant="outline" className="text-caption-xs">
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
            className="text-caption-xs"
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

      {/* Next due */}
      <PeekNextDue nextDue={nextDue} asOfDate={asOfDate} />

      {/* Escape hatches */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          nativeButton={false}
          variant="primary"
          size="sm"
          render={<Link to={clientDetailPath(client)} />}
        >
          <Trans>Open full page</Trans>
          <ArrowUpRightIcon data-icon="inline-end" />
        </Button>
        <Button
          nativeButton={false}
          variant="outline"
          size="sm"
          render={<Link to={`/deadlines?client=${client.id}`} />}
        >
          <Trans>All deadlines</Trans>
        </Button>
      </div>
    </div>
  )
}

export { ClientPeekBody }

function PeekNextDue({
  nextDue,
  asOfDate,
}: {
  nextDue: ObligationInstancePublic | null
  // Firm's "as of" anchor. Falls back to Date.now() when missing so
  // the hover-card stays resilient if the timezone provider hasn't
  // hydrated yet.
  asOfDate: string | null
}) {
  if (!nextDue) {
    return (
      <p className="text-xs text-text-tertiary">
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
      <span className="flex flex-wrap items-baseline gap-x-2 text-xs">
        <span className="min-w-0 truncate font-medium text-text-primary">
          <TaxCodeLabel code={nextDue.taxType} />
        </span>
        {/* Shared compact vocabulary ("22d late" / "today" / "in 5d"). */}
        <span className={isLate ? 'text-text-destructive' : 'text-text-secondary'}>
          <DueCountdownText days={days} />
        </span>
      </span>
    </div>
  )
}
