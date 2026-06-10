import { useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'

import { AlertDrawerContext, type AlertDrawerContextValue } from './DrawerContext'
import { AlertDetailDrawer } from './AlertDetailDrawer'

interface AlertDrawerProviderProps {
  children: ReactNode
}

/**
 * Mounts the Alert detail drawer state once at the app shell so any
 * descendant can imperatively `openDrawer(id)`.
 *
 * Mirrors the obligation-drawer pattern. Two route categories:
 *
 * 1. **Workspaces** (`/alerts`, `/alerts/history`) —
 *    these own a panel mount inline in their layout. The provider
 *    just holds state; the route reads `alertId` from context and
 *    renders `<AlertDetailDrawer mode="panel" />` in its own
 *    column.
 * 2. **Pickers** (dashboard NeedsAttention card, anywhere else) —
 *    `openDrawer(id)` navigates to `/alerts?alert=<id>` so
 *    the alert opens in the canonical workspace.
 *
 * The floating Sheet rendering at the bottom is the off-route
 * legacy fallback for any caller mid-migration; on
 * `routeOwnsPanel` routes the provider does NOT mount the Sheet
 * (the route's inline panel is the only drawer surface).
 */
export function AlertDrawerProvider({ children }: AlertDrawerProviderProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const isAlertRoute = location.pathname === '/alerts' || location.pathname === '/alerts/history'
  const urlAlertId = isAlertRoute ? searchParams.get('alert') : null
  const [localAlertId, setLocalAlertId] = useState<string | null>(null)
  const alertId = urlAlertId ?? localAlertId
  const routeOwnsPanel = isAlertRoute

  const openDrawer = useCallback(
    (id: string) => {
      if (routeOwnsPanel) {
        // On /alerts or /alerts/history — drive the URL
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
      // Off /alerts — navigate to the canonical workspace
      // with the alert pre-opened. No more local-state Sheet
      // overlay on other pages.
      void navigate(`/alerts?alert=${encodeURIComponent(id)}`)
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

  const value = useMemo<AlertDrawerContextValue>(
    () => ({ open: alertId !== null, alertId, openDrawer, closeDrawer }),
    [alertId, openDrawer, closeDrawer],
  )

  return (
    <AlertDrawerContext.Provider value={value}>
      {children}
      {/* Off-route fallback: only render the floating Sheet when
          the current route doesn't own its own panel mount. On
          /alerts[/history] the route renders
          <AlertDetailDrawer mode="panel" /> inline next to the
          alerts list. */}
      {!routeOwnsPanel ? <AlertDetailDrawer alertId={alertId} onClose={closeDrawer} /> : null}
    </AlertDrawerContext.Provider>
  )
}

export function useAlertDrawer(): AlertDrawerContextValue {
  const ctx = useContext(AlertDrawerContext)
  if (!ctx) {
    throw new Error('useAlertDrawer must be used within AlertDrawerProvider')
  }
  return ctx
}
