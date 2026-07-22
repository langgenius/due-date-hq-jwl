import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'

import type { ObligationQueueDetailTab } from '@duedatehq/contracts'

import { deadlineDetailHref, isDeadlineQueuePath } from './deadline-detail-url'

interface ObligationDrawerContextValue {
  openDrawer: (obligationId: string) => void
  closeDrawer: () => void
  obligationId: string | null
  // Active tab is lifted to the context so routes that mount the
  // panel themselves (the queue, client detail) read and drive the
  // same tab state regardless of where the drawer was opened.
  activeTab: ObligationQueueDetailTab
  setActiveTab: (tab: ObligationQueueDetailTab) => void
}

const ObligationDrawerContext = createContext<ObligationDrawerContextValue | null>(null)

/**
 * `ObligationDrawerProvider` — shared state holder for the obligation
 * detail panel. Provides `useObligationDrawer()` to any descendant so
 * they can `openDrawer(id)` from anywhere in the app.
 *
 * **The panel is always rendered in-route, never as a floating Sheet.**
 * Two route categories exist:
 *
 * 1. **Workspaces** (`/deadlines`, `/clients/...`) — these own a
 *    panel mount inline in their layout. `openDrawer(id)` sets local
 *    state; the route reads `obligationId` + `activeTab` from this
 *    context and renders `<ObligationQueueDetailDrawer mode="panel" />`
 *    in its own column.
 * 2. **Pickers** (dashboard, anywhere else) — these surface
 *    obligations to triage but aren't the place to act on them.
 *    `openDrawer(id)` navigates to `/deadlines/<short-ref>`
 *    so the obligation opens in the canonical queue workspace with
 *    the right panel showing.
 *
 * **Limited context outside the queue.** When the panel renders on
 * `/clients/[id]`, the K-1 blocked-by picker has no
 * `blockerCandidates` and the `onNeedsInput` penalty dialog is a
 * no-op (the dialog lives on the queue route). Users hitting those
 * features can navigate to `/deadlines` via the panel's own UI.
 */
export function ObligationDrawerProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [localObligationId, setLocalObligationId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ObligationQueueDetailTab>('readiness')

  // Routes that own their own in-layout obligation panel defer to
  // it instead of letting the provider mount a Sheet. Each such
  // route reads `obligationId` + `activeTab` from this context and
  // renders `<ObligationQueueDetailDrawer mode="panel" ... />` in
  // its own layout column.
  //
  // Routes that are *workspaces for obligations* (the queue, a
  // client's filing plan) own the panel inline. Routes that are
  // *pickers* (the dashboard — surface what
  // to act on, then send the user to the workspace) navigate to
  // `/deadlines/<short-ref>` instead. The destination for obligation
  // viewing is always `/deadlines` with the right panel showing;
  // the queue is the canonical workspace.
  const isQueueRoute = isDeadlineQueuePath(location.pathname)
  const isClientDetailRoute = location.pathname.startsWith('/clients/')
  const routeOwnsPanel = isQueueRoute || isClientDetailRoute

  // On client detail the open obligation lives in the URL
  // (`?obligation=<id>`) instead of local state, so the panel is
  // deep-linkable AND browser Back closes the panel and returns to
  // client detail rather than exiting to /clients (ux-flow-audit
  // 2026-07-02 S3, QA P1-3). Off client detail the param is ignored.
  const urlObligationId = isClientDetailRoute ? searchParams.get('obligation') : null
  const obligationId = urlObligationId ?? localObligationId

  const openDrawer = useCallback(
    (nextObligationId: string) => {
      if (isQueueRoute) {
        // Drive the queue's URL state directly so its own drawer +
        // active-row highlight + J/K hotkeys stay coherent.
        void navigate(
          deadlineDetailHref({ obligationId: nextObligationId, search: location.search }),
          {
            state: { obligationId: nextObligationId },
          },
        )
        return
      }
      if (routeOwnsPanel) {
        // Client detail mounts its own
        // `<ObligationQueueDetailDrawer mode="panel" />`. Drive the
        // `?obligation=` URL param — the panel reads `obligationId`
        // from context (derived from the URL here).
        //
        // History semantics (mirrors alerts DrawerProvider): OPENING
        // (no obligation currently open) pushes a history entry so
        // browser Back closes the panel and keeps the client page;
        // SWITCHING row-to-row keeps `replace` so hopping between
        // deadlines doesn't spam history.
        setActiveTab('readiness')
        setSearchParams(
          (current) => {
            const next = new URLSearchParams(current)
            next.set('obligation', nextObligationId)
            return next
          },
          { replace: urlObligationId !== null },
        )
        return
      }
      // Route doesn't own a panel mount. Navigate to the canonical
      // surface so the obligation always renders in a route layout,
      // never as a floating Sheet.
      // `from` = the picker the user launched from (2026-07-22 critique:
      // "进出不对称" — arriving from /today and closing onto the full
      // /deadlines list lost the user's place). The detail route's close
      // path returns here instead of the bare list.
      void navigate(deadlineDetailHref({ obligationId: nextObligationId }), {
        state: {
          obligationId: nextObligationId,
          from: location.pathname + location.search,
        },
      })
    },
    [
      isQueueRoute,
      location.pathname,
      location.search,
      navigate,
      routeOwnsPanel,
      setSearchParams,
      urlObligationId,
    ],
  )

  const closeDrawer = useCallback(() => {
    setLocalObligationId(null)
    if (urlObligationId) {
      // Close keeps `replace` — ✕ / Esc / click-away dismissals don't
      // add history entries; the pushed "open" entry simply becomes
      // the closed page.
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current)
          next.delete('obligation')
          return next
        },
        { replace: true },
      )
    }
  }, [setSearchParams, urlObligationId])

  const value = useMemo<ObligationDrawerContextValue>(
    () => ({
      openDrawer,
      closeDrawer,
      obligationId,
      activeTab,
      setActiveTab,
    }),
    [openDrawer, closeDrawer, obligationId, activeTab],
  )

  // No Sheet fallback. Every consumer either renders its own panel
  // inline (queue, client detail, dashboard) or — for off-route
  // openers — gets navigated to `/deadlines`. The provider is now
  // a pure state holder + navigator. Removing the Sheet kills the
  // last "obligation appears as a modal overlay" code path.
  return (
    <ObligationDrawerContext.Provider value={value}>{children}</ObligationDrawerContext.Provider>
  )
}

export function useObligationDrawer(): ObligationDrawerContextValue {
  const ctx = useContext(ObligationDrawerContext)
  if (!ctx) {
    throw new Error('useObligationDrawer must be used within ObligationDrawerProvider')
  }
  return ctx
}
