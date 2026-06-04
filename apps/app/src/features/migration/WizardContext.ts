import { createContext } from 'react'

export interface MigrationWizardContextValue {
  open: boolean
  openWizard: (options?: { resumeBatchId?: string }) => void
  closeWizard: () => void
}

/**
 * Stable context handle for the Migration Copilot wizard.
 *
 * Lives in its own non-component module so React Fast Refresh never
 * re-evaluates `createContext()` mid-session — otherwise a HMR update on
 * `WizardProvider.tsx` (or anything it imports, like `Wizard.tsx`) would
 * mint a brand-new context object and any component that captured the
 * previous identity would read `null` and throw
 * "useMigrationWizard must be used within MigrationWizardProvider".
 */
export const MigrationWizardContext = createContext<MigrationWizardContextValue | null>(null)
