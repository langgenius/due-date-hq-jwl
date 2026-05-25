import { useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'

import { PulseDrawerContext, type PulseDrawerContextValue } from './DrawerContext'
import { PulseDetailDrawer } from './PulseDetailDrawer'

interface PulseDrawerProviderProps {
  children: ReactNode
}

/**
 * Mounts the Pulse Detail drawer state once at the app shell so any
 * descendant can imperatively `openDrawer(id)`.
 *
 * 2026-05-25 (Yuqi /rules/pulse #9 — drawer → page panel):
 * mirrors the obligation-drawer pattern. Two route categories:
 *
 * 1. **Workspaces** (`/rules/pulse`, `/rules/pulse/history`) —
 *    these own a panel mount inline in their layout. The provider
 *    just holds state; the route reads `alertId` from context and
 *    renders `<PulseDetailDrawer mode="panel" />` in its own
 *    column.
 * 2. **Pickers** (dashboard NeedsAttention card, anywhere else) —
 *    `openDrawer(id)` navigates to `/rules/pulse?alert=<id>` so
 *    the alert opens in the canonical workspace.
 *
 * The floating Sheet rendering at the bottom is the off-route
 * legacy fallback for any caller mid-migration; on
 * `routeOwnsPanel` routes the provider does NOT mount the Sheet
 * (the route's inline panel is the only drawer surface).
 */
export function PulseDrawerProvider({ children }: PulseDrawerProviderProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const isPulseRoute =
    location.pathname === '/rules/pulse' || location.pathname === '/rules/pulse/history'
  const urlAlertId = isPulseRoute ? searchParams.get('alert') : null
  const [localAlertId, setLocalAlertId] = useState<string | null>(null)
  const alertId = urlAlertId ?? localAlertId
  const routeOwnsPanel = isPulseRoute

  const openDrawer = useCallback(
    (id: string) => {
      if (routeOwnsPanel) {
        // On /rules/pulse or /rules/pulse/history — drive the URL
        // param so the in-route panel picks it up and so the
        // alert is deep-linkable.
        setSearchParams(
          (current) => {
            const next = new URLSearchParams(current)
            next.set('alert', id)
            return next
          },
          { replace: true },
        )
        return
      }
      // Off /rules/pulse — navigate to the canonical workspace
      // with the alert pre-opened. No more local-state Sheet
      // overlay on other pages.
      void navigate(`/rules/pulse?alert=${encodeURIComponent(id)}`)
    },
    [navigate, routeOwnsPanel, setSearchParams],
  )
  const closeDrawer = useCallback(() => {
    setLocalAlertId(null)
    if (urlAlertId) {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current)
          next.delete('alert')
          return next
        },
        { replace: true },
      )
    }
  }, [setSearchParams, urlAlertId])

  const value = useMemo<PulseDrawerContextValue>(
    () => ({ open: alertId !== null, alertId, openDrawer, closeDrawer }),
    [alertId, openDrawer, closeDrawer],
  )

  return (
    <PulseDrawerContext.Provider value={value}>
      {children}
      {/* Off-route fallback: only render the floating Sheet when
          the current route doesn't own its own panel mount. On
          /rules/pulse[/history] the route renders
          <PulseDetailDrawer mode="panel" /> inline next to the
          alerts list. */}
      {!routeOwnsPanel ? <PulseDetailDrawer alertId={alertId} onClose={closeDrawer} /> : null}
    </PulseDrawerContext.Provider>
  )
}

export function usePulseDrawer(): PulseDrawerContextValue {
  const ctx = useContext(PulseDrawerContext)
  if (!ctx) {
    throw new Error('usePulseDrawer must be used within PulseDrawerProvider')
  }
  return ctx
}
