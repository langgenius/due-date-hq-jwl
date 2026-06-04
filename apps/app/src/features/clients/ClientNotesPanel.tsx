import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { ScrollTextIcon } from 'lucide-react'
import { toast } from 'sonner'

import type { ClientPublic } from '@duedatehq/contracts'
import { Button } from '@duedatehq/ui/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@duedatehq/ui/components/ui/sheet'
import { Textarea } from '@duedatehq/ui/components/ui/textarea'

import { EmptyState } from '@/components/patterns/empty-state'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'

/**
 * `<ClientNotesPanel>` — slide-in editor for the per-client notes
 * field on `/clients/[id]`.
 *
 * ## Why this lives in a slide-in (not a tab)
 *
 * Notes used to live inside the "Activity" tab body as a read-only
 * display. Two problems:
 *
 * 1. **Mode mismatch.** Notes is a *write-mode* interaction (the
 *    coordinator persona — Jules — opens this page to *leave* a
 *    note for the next preparer). Activity is a *read-mode* tab
 *    (AI summary + audit log). Mixing them meant a coordinator
 *    looking to write context had to guess which tab held the
 *    editor — multiple tabs guessed wrong before finding it.
 *
 * 2. **No write path existed.** The old "display only" treatment
 *    showed `client.notes` but had no editor — anyone wanting to
 *    update notes had to use a back-channel. The slide-in adds
 *    the missing write surface.
 *
 * The slide-in is anchored next to the page title via a small
 * leading-icon button (handled by the caller, not this component),
 * so the affordance is always visible without claiming tab-bar
 * real estate.
 *
 * ## Behavior
 *
 * - Read state: shows `client.notes` body if present, EmptyState
 *   otherwise.
 * - Edit state: textarea, save button (disabled when no diff or
 *   while mutation pending), cancel button.
 * - Submission routes through the dedicated `clients.updateNotes`
 *   mutation (single-purpose, audited as `client.notes.updated`).
 * - On save: query invalidations for `clients.get` (refresh the
 *   panel data) + `audit` (the History tab's audit log gets the
 *   new event).
 *
 * ## RBAC
 *
 * The Sheet trigger is rendered by the caller; if the current
 * user lacks `client.write` permission the caller is expected
 * to swap the trigger to a read-only display (or omit it entirely).
 * The save mutation will still 403 server-side if a user bypasses
 * the gate; treated as defense in depth.
 */
export function ClientNotesPanel({
  client,
  canWrite,
  open,
  onOpenChange,
}: {
  client: ClientPublic
  /** When false, the panel renders the notes body in read-only mode (no textarea, no save). */
  canWrite: boolean
  // 2026-06-01 (Yuqi /clients/[id] critique — IA part 2): controlled
  // open state lifted to the parent so multiple affordances can
  // trigger the same panel — the inline `<ClientNotesStrip>` Edit
  // affordance, the empty-state "Add notes" button in the header
  // actions cluster, and (future) a keyboard shortcut. This file
  // no longer ships its own SheetTrigger; the workspace renders
  // the trigger(s) and threads state down.
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useLingui()
  const queryClient = useQueryClient()
  // Draft mirrors `client.notes` while the sheet is open so the
  // textarea is controlled. Reset to source on open so a previously
  // abandoned edit doesn't reappear after a remote update.
  const [draft, setDraft] = useState<string>(client.notes ?? '')

  useEffect(() => {
    if (open) setDraft(client.notes ?? '')
  }, [open, client.notes])

  const updateNotesMutation = useMutation(
    orpc.clients.updateNotes.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: orpc.clients.get.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.audit.key() })
        toast.success(t`Notes saved`)
        onOpenChange(false)
      },
      onError: (err) => {
        toast.error(t`Couldn't save notes`, {
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )

  const sourceNotes = client.notes ?? ''
  const trimmedDraft = draft.trim()
  const normalizedDraft = trimmedDraft.length > 0 ? trimmedDraft : null
  const normalizedSource = sourceNotes.length > 0 ? sourceNotes : null
  const dirty = normalizedDraft !== normalizedSource
  const isPending = updateNotesMutation.isPending

  function handleSave() {
    if (!dirty || isPending) return
    updateNotesMutation.mutate({ id: client.id, notes: normalizedDraft })
  }

  function handleCancel() {
    setDraft(client.notes ?? '')
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[420px] sm:w-[520px]">
        <SheetHeader>
          <SheetTitle>
            <Trans>Notes — {client.name}</Trans>
          </SheetTitle>
          <SheetDescription>
            <Trans>
              Context the next preparer should read first — preferred call window, sensitivities,
              history. Travels with the client across all surfaces.
            </Trans>
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 px-4 py-2">
          {canWrite ? (
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t`Capture context, sensitivities, or history…`}
              rows={14}
              maxLength={5000}
              className="resize-none text-sm leading-relaxed"
              aria-label={t`Notes for ${client.name}`}
              disabled={isPending}
            />
          ) : sourceNotes.length > 0 ? (
            <div className="rounded-md border border-divider-regular bg-background-default p-4 text-sm whitespace-pre-wrap text-text-secondary">
              {sourceNotes}
            </div>
          ) : (
            <EmptyState
              icon={ScrollTextIcon}
              title={<Trans>No notes yet</Trans>}
              description={
                <Trans>
                  Capture context (preferred call window, sensitivities, history) so the next
                  preparer doesn't start from scratch.
                </Trans>
              }
            />
          )}
          {canWrite ? (
            <p className="mt-2 text-xs text-text-tertiary tabular-nums">
              <Trans>{draft.length} / 5,000 characters</Trans>
            </p>
          ) : null}
        </div>

        <SheetFooter>
          {canWrite ? (
            <>
              <Button variant="ghost" onClick={handleCancel} disabled={isPending}>
                <Trans>Cancel</Trans>
              </Button>
              <Button variant="primary" onClick={handleSave} disabled={!dirty || isPending}>
                {isPending ? <Trans>Saving…</Trans> : <Trans>Save notes</Trans>}
              </Button>
            </>
          ) : (
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              <Trans>Close</Trans>
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
