import { useEffect } from 'react'
import { useBlocker } from 'react-router'
import { Trans } from '@lingui/react/macro'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@duedatehq/ui/components/ui/alert-dialog'

/**
 * Dirty-form navigation guard (UX audit 2026-07-02: editing a settings form
 * then clicking a sidebar link silently discarded the edits).
 *
 * Blocks in-app navigation while `dirty` is true — the router pauses on a
 * blocked transition and `<UnsavedChangesGuardDialog>` renders the
 * "Discard changes? / Keep editing" confirm. Hard navigation (refresh, tab
 * close) goes through the browser's native `beforeunload` prompt instead;
 * custom copy isn't rendered there by design (browsers ignore it).
 *
 * Requires a data router (`createBrowserRouter`) — which this app uses.
 * Only wire this into forms with an explicit Save button; autosave surfaces
 * are never "dirty" in the discard sense.
 */
export function useUnsavedChangesGuard(dirty: boolean) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty &&
      (currentLocation.pathname !== nextLocation.pathname ||
        currentLocation.search !== nextLocation.search),
  )

  // If the form stops being dirty while a transition is paused (e.g. a save
  // landed in the background), release the blocked navigation.
  useEffect(() => {
    if (blocker.state === 'blocked' && !dirty) blocker.reset()
  }, [blocker, dirty])

  // Hard navigation (reload / close tab / external link): the native
  // beforeunload prompt is the only interception browsers allow.
  useEffect(() => {
    if (!dirty) return undefined
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      // Chrome requires returnValue to be set for the prompt to show.
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [dirty])

  return blocker
}

export function UnsavedChangesGuardDialog({
  blocker,
}: {
  blocker: ReturnType<typeof useUnsavedChangesGuard>
}) {
  return (
    <AlertDialog
      open={blocker.state === 'blocked'}
      onOpenChange={(open) => {
        // Esc / outside click = "Keep editing": cancel the navigation.
        if (!open && blocker.state === 'blocked') blocker.reset()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            <Trans>Discard changes?</Trans>
          </AlertDialogTitle>
          <AlertDialogDescription>
            <Trans>
              You have unsaved changes on this page. If you leave now, they'll be lost.
            </Trans>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => {
              if (blocker.state === 'blocked') blocker.reset()
            }}
          >
            <Trans>Keep editing</Trans>
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive-primary"
            onClick={() => {
              if (blocker.state === 'blocked') blocker.proceed()
            }}
          >
            <Trans>Discard changes</Trans>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
