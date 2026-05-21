import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'

import type { ObligationQueueDetailTab } from '@duedatehq/contracts'

import { paidPlanActive } from '@/features/billing/model'
import { useFirmPermission } from '@/features/permissions/permission-gate'
import { ObligationQueueDetailDrawer } from '@/routes/obligations'

interface ObligationDrawerContextValue {
  openDrawer: (obligationId: string) => void
  closeDrawer: () => void
  obligationId: string | null
}

const ObligationDrawerContext = createContext<ObligationDrawerContextValue | null>(null)

/**
 * `ObligationDrawerProvider` — portal-mounts the obligation detail
 * drawer once at the app shell so any descendant can call
 * `useObligationDrawer().openDrawer(id)` to reveal a side-panel without
 * leaving the current page.
 *
 * Mirrors the `PulseDrawerProvider` / `EvidenceDrawerProvider` pattern
 * (see `apps/app/src/features/pulse/DrawerProvider.tsx`). Before this
 * existed, `/clients/[id]` had to call `navigate('/obligations?id=...&drawer=obligation')`
 * to open an obligation — a full route change that stranded the user
 * on `/obligations` after closing. Now closing returns to whatever
 * page they were on.
 *
 * **Queue-route deference.** When the user is already on `/obligations`,
 * `openDrawer(id)` writes URL state (`?id=X&drawer=obligation`) so the
 * route's own queue + drawer pair stays in sync (active row highlight,
 * J/K row cycling, etc.) and the provider's overlay does NOT mount.
 * Elsewhere, the provider mounts its own modal-style drawer in a
 * Sheet, so callers get a uniform `openDrawer(id)` API regardless of
 * where they're invoking from.
 *
 * **Limited context outside the queue.** When mounted via the provider
 * (i.e. NOT on /obligations), the drawer doesn't have access to the
 * route's `blockerCandidates` list — the K-1 blocked-by picker shows
 * no in-queue candidates. The user can still navigate to /obligations
 * to use the full picker. The `onNeedsInput` penalty-input handler
 * is similarly a no-op outside the queue context; the user can open
 * the obligation directly on /obligations to access the penalty
 * dialog.
 */
export function ObligationDrawerProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const permission = useFirmPermission()
  const practiceAiEnabled = paidPlanActive(permission.firm)
  const [localObligationId, setLocalObligationId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ObligationQueueDetailTab>('readiness')

  // The queue route owns its own URL-driven drawer mount; defer to it
  // there. Anywhere else, the provider's modal drawer is the canonical
  // mount.
  const isQueueRoute = location.pathname === '/obligations'

  const openDrawer = useCallback(
    (obligationId: string) => {
      if (isQueueRoute) {
        // Drive the queue's URL state directly so its own drawer +
        // active-row highlight + J/K hotkeys stay coherent.
        const params = new URLSearchParams({
          id: obligationId,
          drawer: 'obligation',
        })
        void navigate(`/obligations?${params.toString()}`)
        return
      }
      setActiveTab('readiness')
      setLocalObligationId(obligationId)
    },
    [isQueueRoute, navigate],
  )

  const closeDrawer = useCallback(() => {
    setLocalObligationId(null)
  }, [])

  const value = useMemo<ObligationDrawerContextValue>(
    () => ({
      openDrawer,
      closeDrawer,
      obligationId: localObligationId,
    }),
    [openDrawer, closeDrawer, localObligationId],
  )

  return (
    <ObligationDrawerContext.Provider value={value}>
      {children}
      {!isQueueRoute ? (
        <ObligationQueueDetailDrawer
          obligationId={localObligationId}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onClose={closeDrawer}
          onNeedsInput={() => {
            // Penalty-input dialog is route-local; not wired outside
            // the queue. Users can deep-link to the queue for that.
          }}
          practiceAiEnabled={practiceAiEnabled}
          blockerCandidates={[]}
        />
      ) : null}
    </ObligationDrawerContext.Provider>
  )
}

export function useObligationDrawer(): ObligationDrawerContextValue {
  const ctx = useContext(ObligationDrawerContext)
  if (!ctx) {
    throw new Error('useObligationDrawer must be used within ObligationDrawerProvider')
  }
  return ctx
}
