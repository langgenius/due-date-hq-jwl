import { useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

import type { ClientPublic } from '@duedatehq/contracts'
import { cn } from '@duedatehq/ui/lib/utils'

import { orpc } from '@/lib/rpc'
import { useAppHotkey, useKeyboardShortcutsBlocked } from '@/components/patterns/keyboard-shell'

import { neighborsInClientCycle, readClientCycleList } from './client-cycle'

const CLIENTS_LIST_INPUT = { limit: 500 } as const
const EMPTY_CLIENTS: readonly ClientPublic[] = []

/**
 * Prev/Next cycling arrows for the client detail PageHeader. Reads
 * the sessionStorage cycle list written by `/clients` and lets the
 * user advance through the same filter subset they were looking at
 * without re-entering the list page.
 *
 * Hidden when:
 *  - the cycle list is empty (deep link, refreshed tab),
 *  - the current client isn't in the cycle, or
 *  - the cycle has only one entry.
 *
 * Keyboard: `j` advances to next, `k` to previous. Both shortcuts
 * defer to `useKeyboardShortcutsBlocked()` so modals / drawers /
 * inputs aren't disrupted.
 *
 * The destination name shows in the tooltip via a fresh
 * `clients.listByFirm` lookup keyed by id — the cycle list only
 * stores IDs, not names, so we resolve them with the same query the
 * list route uses (cache hits are likely from the previous visit).
 */
export function ClientCycleArrows({ currentClientId }: { currentClientId: string }) {
  const { t } = useLingui()
  const navigate = useNavigate()
  const shortcutsBlocked = useKeyboardShortcutsBlocked()

  // 2026-05-24 (useEffect audit): the previous shape kept a
  // useState seeded from sessionStorage and a useEffect that
  // re-read on every currentClientId change. Both were redundant —
  // `readClientCycleList()` is a cheap sessionStorage read, and
  // the useMemo below is keyed on `currentClientId` already, so
  // re-evaluating inline gives the same result without the state +
  // effect ping-pong (and matches the project's no-useEffect rule).
  const neighbors = useMemo(
    () => neighborsInClientCycle(readClientCycleList(), currentClientId),
    [currentClientId],
  )

  const clientsQuery = useQuery({
    ...orpc.clients.listByFirm.queryOptions({ input: CLIENTS_LIST_INPUT }),
    enabled: neighbors.prev !== null || neighbors.next !== null,
  })
  const nameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const client of clientsQuery.data ?? EMPTY_CLIENTS) {
      map.set(client.id, client.name)
    }
    return map
  }, [clientsQuery.data])

  const goPrev = useCallback(() => {
    if (neighbors.prev) void navigate(`/clients/${neighbors.prev}`)
  }, [navigate, neighbors.prev])

  const goNext = useCallback(() => {
    if (neighbors.next) void navigate(`/clients/${neighbors.next}`)
  }, [navigate, neighbors.next])

  // 2026-05-24 (useEffect audit): the previous shape hand-rolled a
  // window-level keydown listener via useEffect. useAppHotkey is
  // the project's canonical primitive — it threads through the
  // shortcuts-blocked context, ignores editable targets, and
  // wires cleanup automatically. Mirrors the obligations queue's
  // J/K contract.
  useAppHotkey(
    'J',
    () => {
      if (neighbors.next) goNext()
    },
    {
      enabled: !shortcutsBlocked && neighbors.next !== null,
      meta: {
        id: 'clients.cycle.next',
        name: 'Next client in cycle',
        description: 'Advance to the next client in the saved /clients filter cycle.',
        category: 'navigate',
        scope: 'route',
      },
    },
  )
  useAppHotkey(
    'K',
    () => {
      if (neighbors.prev) goPrev()
    },
    {
      enabled: !shortcutsBlocked && neighbors.prev !== null,
      meta: {
        id: 'clients.cycle.prev',
        name: 'Previous client in cycle',
        description: 'Step to the previous client in the saved /clients filter cycle.',
        category: 'navigate',
        scope: 'route',
      },
    },
  )

  if (neighbors.total <= 1) return null
  if (neighbors.prev === null && neighbors.next === null) return null

  const prevName = neighbors.prev ? nameById.get(neighbors.prev) : null
  const nextName = neighbors.next ? nameById.get(neighbors.next) : null

  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-md border border-divider-regular bg-background-default p-0.5"
      role="group"
      aria-label={t`Previous and next client in the filtered list`}
    >
      <CycleButton
        direction="prev"
        disabled={!neighbors.prev}
        onClick={goPrev}
        title={
          neighbors.prev
            ? prevName
              ? t`Previous client · ${prevName} (k)`
              : t`Previous client (k)`
            : t`No previous client`
        }
        ariaLabel={t`Previous client`}
      />
      <span
        aria-label={t`Position ${neighbors.position} of ${neighbors.total}`}
        title={t`Position ${neighbors.position} of ${neighbors.total}`}
        className="px-1 font-mono text-[11px] tabular-nums text-text-tertiary"
      >
        {neighbors.position} / {neighbors.total}
      </span>
      <CycleButton
        direction="next"
        disabled={!neighbors.next}
        onClick={goNext}
        title={
          neighbors.next
            ? nextName
              ? t`Next client · ${nextName} (j)`
              : t`Next client (j)`
            : t`No next client`
        }
        ariaLabel={t`Next client`}
      />
    </div>
  )
}

function CycleButton({
  direction,
  disabled,
  onClick,
  title,
  ariaLabel,
}: {
  direction: 'prev' | 'next'
  disabled: boolean
  onClick: () => void
  title: string
  ariaLabel: string
}) {
  const Icon = direction === 'prev' ? ChevronLeftIcon : ChevronRightIcon
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={title}
      className={cn(
        'inline-flex size-6 items-center justify-center rounded-sm text-text-secondary outline-none transition-colors hover:bg-state-base-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
        disabled &&
          'cursor-not-allowed text-text-disabled hover:bg-transparent hover:text-text-disabled',
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      <span className="sr-only">
        {direction === 'prev' ? <Trans>Previous</Trans> : <Trans>Next</Trans>}
      </span>
    </button>
  )
}
