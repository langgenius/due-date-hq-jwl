import { Trans, useLingui } from '@lingui/react/macro'

import { Button } from '@duedatehq/ui/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@duedatehq/ui/components/ui/dialog'
import { Label } from '@duedatehq/ui/components/ui/label'
import { Textarea } from '@duedatehq/ui/components/ui/textarea'

export type PulseReasonAction = 'dismiss' | 'snooze' | 'reviewed'

/**
 * Single in-app modal for Pulse alert dismiss / snooze / mark-reviewed,
 * each of which the audit trail requires a typed reason for. Used by:
 *
 *  - `PulseDetailDrawer` (deep review of a single alert)
 *  - `AlertsListPage` (quick action on a row in the /rules/pulse list)
 *
 * 2026-05-24 (re-critique): the list-page surface used to call
 * `window.prompt()` for the reason — system-styled, blocked the page,
 * no validation, no audit context, no Cancel-vs-empty distinction.
 * Lifted from the drawer into a shared component so both entrances
 * go through the same Lingui-translated Dialog with a Textarea +
 * character counter + Save/Cancel.
 *
 * The component is fully controlled: parent owns `action` + `reason`
 * state and reacts to `onSubmit` / `onOpenChange`. Submission strips
 * the reason and routes through the parent's mutation hooks; this
 * component never calls a mutation itself.
 */
export function PulseReasonDialog({
  action,
  reason,
  pending,
  onChangeReason,
  onOpenChange,
  onSubmit,
}: {
  action: PulseReasonAction | null
  reason: string
  pending: boolean
  onChangeReason: (next: string) => void
  onOpenChange: (open: boolean) => void
  onSubmit: () => void
}) {
  const { t } = useLingui()
  const open = action !== null
  const isDismiss = action === 'dismiss'
  const isReviewed = action === 'reviewed'
  const trimmed = reason.trim()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit()
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {isReviewed ? (
                <Trans>Mark reviewed</Trans>
              ) : isDismiss ? (
                <Trans>Dismiss alert</Trans>
              ) : (
                <Trans>Snooze alert 24h</Trans>
              )}
            </DialogTitle>
            <DialogDescription>
              <Trans>
                Audit trail requires a reason for this action. Owners can see why and by whom.
              </Trans>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="pulse-reason-text">
              <Trans>Reason</Trans>
            </Label>
            <Textarea
              id="pulse-reason-text"
              value={reason}
              maxLength={500}
              disabled={pending}
              placeholder={
                isReviewed
                  ? t`What did you review?`
                  : isDismiss
                    ? t`Why is this alert not relevant?`
                    : t`Why snooze — what unblocks it tomorrow?`
              }
              onChange={(event) => onChangeReason(event.target.value)}
              autoFocus
            />
            <p className="text-xs text-text-tertiary">
              <Trans>{reason.length}/500 characters</Trans>
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              <Trans>Cancel</Trans>
            </Button>
            <Button type="submit" disabled={pending || trimmed.length === 0}>
              {pending ? (
                <Trans>Saving…</Trans>
              ) : isReviewed ? (
                <Trans>Mark reviewed</Trans>
              ) : isDismiss ? (
                <Trans>Dismiss</Trans>
              ) : (
                <Trans>Snooze</Trans>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
