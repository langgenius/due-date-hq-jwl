import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useLingui } from '@lingui/react/macro'
import { PinIcon, PinOffIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@duedatehq/ui/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'
import { cn } from '@duedatehq/ui/lib/utils'

import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'

// Pin / unpin a single deadline. The canonical affordance for the /today
// "Pinned" section: an icon-only ghost button on the deadline row. Filled pin
// = pinned, hollow pin-off = unpin-on-click. Same write authority as the
// status workflow (server enforces OBLIGATION_STATUS_WRITE_ROLES), so the
// caller gates visibility on `obligation.status.update` permission.
//
// On success it invalidates the queue list (powers the Pinned section), the
// detail, the dashboard load, and the audit log so every surface reconciles.
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
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.getDetail.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.audit.key() })
      },
      onError: (err) => {
        toast.error(isPinned ? t`Couldn't unpin deadline` : t`Couldn't pin deadline`, {
          description:
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
        })
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
              // Filled pin reads accent when active; hollow stays muted until
              // hover so an unpinned row's affordance is quiet (one signal per
              // row — the data, not the control, carries the urgency).
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
            {isPinned ? (
              <PinIcon className="size-4" aria-hidden />
            ) : (
              <PinOffIcon className="size-4" aria-hidden />
            )}
          </Button>
        )}
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
