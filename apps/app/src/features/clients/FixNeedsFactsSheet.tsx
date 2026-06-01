import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { ArrowUpRightIcon, CheckCircle2Icon } from 'lucide-react'
import { toast } from 'sonner'

import type { ClientPublic } from '@duedatehq/contracts'
import { RuleGenerationStateValues } from '@duedatehq/contracts'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@duedatehq/ui/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@duedatehq/ui/components/ui/sheet'

import { EmptyState } from '@/components/patterns/empty-state'
import { getClientReadiness } from './client-readiness'
import { clientDetailPath } from './client-url'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'

/**
 * Inline batch flow for the "Fix now" banner on the /clients page.
 *
 * Earlier behavior: Fix-now narrowed the table to needs-facts
 * clients, then the CPA had to open each one's detail page, drill
 * to Filing jurisdictions, save, back, repeat. L-2 turns that into
 * a single in-place batch: every needs-facts client gets one row,
 * the missing field becomes an inline picker, save fires the
 * existing mutation, the row disappears.
 *
 * Scope today:
 *   - Missing `state`     → inline state picker, calls
 *                            `clients.updateJurisdiction`
 *   - Missing `entityType` → "Open client to fix" link button
 *                            (no targeted mutation exists; tracked
 *                            in the IA doc as future schema work)
 *
 * The two-tier shape isn't ideal — but most needs-facts clients
 * are missing state, not entityType. Once a generic `clients.update`
 * mutation lands we'll fold both into the same inline picker.
 *
 * Counter at the top reads `N of M fixed` so the CPA sees progress.
 */
export function FixNeedsFactsSheet({
  open,
  onOpenChange,
  clients,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  clients: readonly ClientPublic[]
}) {
  // Snapshot the needs-facts subset when the sheet opens. We DON'T
  // re-derive on every render — if `clients` updates while the sheet
  // is open (e.g. a successful save invalidates the list query), the
  // fixed row would disappear mid-flight. Local `fixedIds` set tracks
  // what's saved so the "N of M fixed" counter and row hiding stay
  // stable.
  const pendingClients = useMemo(() => {
    return clients.filter((client) => {
      const readiness = getClientReadiness(client)
      return readiness.status === 'needs_facts'
    })
  }, [clients])

  const [fixedIds, setFixedIds] = useState<Set<string>>(new Set())
  const totalCount = pendingClients.length
  const fixedCount = fixedIds.size

  const visibleClients = pendingClients.filter((client) => !fixedIds.has(client.id))

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) setFixedIds(new Set())
        onOpenChange(next)
      }}
    >
      {/* 2026-06-01: SheetContent flush variant absorbs the
          gap-0/overflow-hidden/p-0 recipe so the header + counter strip
          + list can each own their own padding + dividers. */}
      <SheetContent flush className="w-full max-w-[640px] sm:max-w-[640px]">
        <SheetHeader className="border-b border-divider-subtle">
          <SheetTitle>
            <Trans>Fix missing facts</Trans>
          </SheetTitle>
          <SheetDescription>
            <Trans>
              The rule library skips clients without a filing state or entity type. Fill them in
              here so generated deadlines start landing.
            </Trans>
          </SheetDescription>
        </SheetHeader>

        <div className="flex items-center justify-between border-b border-divider-subtle px-6 py-3 text-xs text-text-tertiary">
          <span>
            <Trans>
              {fixedCount} of {totalCount} fixed
            </Trans>
          </span>
          {visibleClients.length === 0 && totalCount > 0 ? (
            // 2026-06-01: hand-rolled inline-flex success tag swapped for
            // the canonical success Badge so the chip inherits the same
            // height/icon-sizing as the rest of the app's success pills.
            <Badge variant="success">
              <CheckCircle2Icon aria-hidden />
              <Trans>All caught up</Trans>
            </Badge>
          ) : null}
        </div>

        {totalCount === 0 ? (
          <div className="px-6 py-10">
            <EmptyState
              icon={CheckCircle2Icon}
              title={<Trans>Nothing to fix</Trans>}
              description={
                <Trans>
                  Every client on this list has the facts the rule library needs. Close to return.
                </Trans>
              }
            />
          </div>
        ) : visibleClients.length === 0 ? (
          <div className="px-6 py-10">
            <EmptyState
              icon={CheckCircle2Icon}
              title={<Trans>All done</Trans>}
              description={
                <Trans>
                  Every client you opened is fixed. Close the sheet to refresh the list, or re-open
                  Fix-now if more clients come in.
                </Trans>
              }
              cta={
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  <Trans>Close</Trans>
                </Button>
              }
            />
          </div>
        ) : (
          <ul className="divide-y divide-divider-subtle">
            {visibleClients.map((client) => (
              <li key={client.id}>
                <FixNeedsFactsRow
                  client={client}
                  onFixed={() =>
                    setFixedIds((prev) => {
                      const next = new Set(prev)
                      next.add(client.id)
                      return next
                    })
                  }
                  closeSheet={() => onOpenChange(false)}
                />
              </li>
            ))}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  )
}

function FixNeedsFactsRow({
  client,
  onFixed,
  closeSheet,
}: {
  client: ClientPublic
  onFixed: () => void
  closeSheet: () => void
}) {
  const { t } = useLingui()
  const queryClient = useQueryClient()
  const readiness = getClientReadiness(client)
  const missing = readiness.missingRequiredFacts

  const needsState = missing.includes('state')
  const needsEntityType = missing.includes('entityType')

  const [pendingState, setPendingState] = useState<string>('')

  const updateJurisdictionMutation = useMutation(
    orpc.clients.updateJurisdiction.mutationOptions({
      onSuccess: () => {
        // Invalidate so the parent list query refetches with the
        // updated readiness; closing the sheet later (or re-opening
        // Fix-now) will then see this client gone. In the meantime
        // the local fixedIds tracking hides the row immediately.
        void queryClient.invalidateQueries({ queryKey: orpc.clients.listByFirm.key() })
        toast.success(t`Saved`, { description: client.name })
        onFixed()
      },
      onError: (err) => {
        toast.error(t`Couldn't save`, {
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )

  return (
    <div className="flex flex-col gap-2 px-6 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="truncate text-sm font-medium text-text-primary">{client.name}</span>
        {needsState ? (
          <Badge variant="destructive" className="text-xs">
            <Trans>Needs state</Trans>
          </Badge>
        ) : null}
        {needsEntityType ? (
          <Badge variant="destructive" className="text-xs">
            <Trans>Needs entity</Trans>
          </Badge>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {needsState ? (
          <div className="flex items-center gap-2">
            <Select
              value={pendingState}
              onValueChange={(value) => {
                if (typeof value === 'string') setPendingState(value)
              }}
            >
              <SelectTrigger className="h-8 w-32 text-sm">
                <SelectValue placeholder={t`Pick state`} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {RuleGenerationStateValues.map((code) => (
                    <SelectItem key={code} value={code}>
                      {code}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Button
              type="button"
              size="sm"
              disabled={pendingState.length === 0 || updateJurisdictionMutation.isPending}
              onClick={() => {
                updateJurisdictionMutation.mutate({
                  id: client.id,
                  state: pendingState,
                  county: null,
                })
              }}
            >
              <Trans>Save state</Trans>
            </Button>
          </div>
        ) : null}

        {needsEntityType ? (
          // No clients.update mutation handles entityType today, so
          // this row routes to the detail page where the existing
          // edit flow can take it. Closing the sheet so the user lands
          // on the destination cleanly.
          <Button
            type="button"
            variant="outline"
            size="sm"
            render={<Link to={`${clientDetailPath(client)}?tab=info`} />}
            onClick={() => closeSheet()}
          >
            <Trans>Open client to fix entity</Trans>
            <ArrowUpRightIcon data-icon="inline-end" />
          </Button>
        ) : null}
      </div>
    </div>
  )
}
