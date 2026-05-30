import { createContext } from 'react'

export interface AlertDrawerContextValue {
  open: boolean
  alertId: string | null
  openDrawer: (alertId: string) => void
  closeDrawer: () => void
}

// Stable identity across Fast Refresh — see migration/WizardContext.ts pattern.
export const AlertDrawerContext = createContext<AlertDrawerContextValue | null>(null)
