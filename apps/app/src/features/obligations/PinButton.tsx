import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useLingui } from '@lingui/react/macro'
import { Loader2Icon, PinIcon } from 'lucide-react'
import { toast } from 'sonner'

import type { ObligationQueueListOutput } from '@duedatehq/contracts'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'
import { cn } from '@duedatehq/ui/lib/utils'

import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'

// The `obligations.list` cache lives in two shapes: a plain
// `ObligationQueueListOutput` (the /today Pinned section's `useQuery`) and an
// `InfiniteData<ObligationQueueListOutput>` (the /deadlines `useInfiniteQuery`).
// Optimistic pin flips have to handle both. We pattern-match on the cache shape
// rather than the query key (the key alone doesn't tell us which it is) and
// return the input untouched for anything we don't recognise, so an unexpected
// shape can never corrupt the cache.
function flipPinnedInListCache(data: unknown, obligationId: string, isPinned: boolean): unknown {
  if (!data || typeof data !== 'object') return data
  const patchRows = (output: ObligationQueueListOutput): ObligationQueueListOutput => ({
    ...output,
    rows: output.rows.map((row) => (row.id === obligationId ? { ...row, isPinned } : row)),
  })
  if ('pages' in data && Array.isArray((data as { pages: unknown }).pages)) {
    // oxlint-disable-next-line no-unsafe-type-assertion -- already narrowed by the in/Array.isArray guard above
    const infinite = data as { pages: ObligationQueueListOutput[]; pageParams: unknown[] }
    return { ...infinite, pages: infinite.pages.map(patchRows) }
  }
  if ('rows' in data && Array.isArray((data as { rows: unknown }).rows)) {
    // oxlint-disable-next-line no-unsafe-type-assertion -- already narrowed by the in/Array.isArray guard above
    return patchRows(data as ObligationQueueListOutput)
  }
  return data
}

// Pin / unpin a single deadline. The canonical affordance for the /today
// "Pinned" section: an icon-only ghost button on the deadline row. A single
// pin glyph toggles outline→filled: hollow muted pin = unpinned ("pin this"),
// filled accent pin = pinned. (The earlier pin-OFF / slashed-pin for the
// unpinned state read as "pinning disabled" rather than an invitation — the
// conventional outline⇄filled toggle, like a bookmark/star, is unambiguous.)
// Same write authority as the status workflow (server enforces
// OBLIGATION_STATUS_WRITE_ROLES), so the caller gates visibility on
// `obligation.status.update` permission.
//
// The click optimistically flips the row's `isPinned` in the list cache so the
// icon toggles instantly; onSettled invalidates the queue list (powers the
// Pinned section), the detail, the dashboard load, and the audit log so every
// surface reconciles to server truth.
export function PinButton({
  obligationId,
  isPinned,
  className,
}: {
  obligationId: string
  isPinned: boolean
  className?: string
}) {
  const { t } = useLingui()
  const queryClient = useQueryClient()
  const mutation = useMutation(
    orpc.obligations.setPinned.mutationOptions({
      // Optimistic flip — the pin/unpin icon should toggle the instant it's
      // clicked, not after the mutation + 4 invalidations land. The icon reads
      // `isPinned` from the `obligations.list` cache (both the /today Pinned
      // section's plain query and the /deadlines infinite query), so we patch
      // the matching row's flag in every cached shape, snapshot for rollback,
      // and let onSettled reconcile to server truth. Mirrors the optimistic
      // status flip in routes/obligations.tsx.
      onMutate: async (variables) => {
        await queryClient.cancelQueries({ queryKey: orpc.obligations.list.key() })
        const previousLists = queryClient.getQueriesData({
          queryKey: orpc.obligations.list.key(),
        })
        queryClient.setQueriesData<unknown>(
          { queryKey: orpc.obligations.list.key() },
          (data: unknown) =>
            flipPinnedInListCache(data, variables.obligationId, variables.isPinned),
        )
        return { previousLists }
      },
      onError: (err, _variables, context) => {
        for (const [key, value] of context?.previousLists ?? []) {
          queryClient.setQueryData(key, value)
        }
        toast.error(isPinned ? t`Couldn't unpin deadline` : t`Couldn't pin deadline`, {
          description:
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
        })
      },
      onSettled: () => {
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.getDetail.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.audit.key() })
      },
    }),
  )

  const label = isPinned ? t`Unpin from Today` : t`Pin to Today`

  return (
    <Tooltip>
      <TooltipTrigger
        render={(props) => (
          <Button
            {...props}
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            aria-pressed={isPinned}
            disabled={mutation.isPending}
            className={cn(
              // Filled accent pin when pinned; hollow muted pin when not, so an
              // unpinned row's affordance stays quiet (one signal per row — the
              // data, not the control, carries the urgency).
              isPinned ? 'text-text-accent' : 'text-text-tertiary',
              className,
            )}
            onClick={(event) => {
              props.onClick?.(event)
              if (event.defaultPrevented) return
              // Row-level wrappers often navigate on click — keep the pin
              // toggle from bubbling into a row open.
              event.preventDefault()
              event.stopPropagation()
              mutation.mutate({ obligationId, isPinned: !isPinned })
            }}
          >
            {mutation.isPending ? (
              <Loader2Icon className="size-4 animate-spin" aria-hidden />
            ) : (
              // One pin glyph, outline⇄filled: filled (fill-current → accent)
              // when pinned, hollow when not. No slashed pin-off (it read as
              // "pinning disabled" on an unpinned row).
              <PinIcon className={cn('size-4', isPinned && 'fill-current')} aria-hidden />
            )}
          </Button>
        )}
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
