import { useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useLocation, useSearchParams } from 'react-router'

import { PulseDrawerContext, type PulseDrawerContextValue } from './DrawerContext'
import { PulseDetailDrawer } from './PulseDetailDrawer'

interface PulseDrawerProviderProps {
  children: ReactNode
}

// Mounts the Pulse Detail drawer once at the app shell so any descendant can
// imperatively open it. Mirrors `MigrationWizardProvider` for shape/consistency.
export function PulseDrawerProvider({ children }: PulseDrawerProviderProps) {
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const urlAlertId = location.pathname === '/rules/pulse' ? searchParams.get('alert') : null
  const [localAlertId, setLocalAlertId] = useState<string | null>(null)
  const alertId = urlAlertId ?? localAlertId

  const openDrawer = useCallback((id: string) => setLocalAlertId(id), [])
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
      <PulseDetailDrawer alertId={alertId} onClose={closeDrawer} />
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
