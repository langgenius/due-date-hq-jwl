import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { ClientDetailDrawer } from './ClientDetailDrawer'

interface ClientDrawerContextValue {
  openDrawer: (clientId: string) => void
  closeDrawer: () => void
  clientId: string | null
}

const ClientDrawerContext = createContext<ClientDrawerContextValue | null>(null)

/**
 * `ClientDrawerProvider` — portal-mounts a slim client detail drawer
 * once at the app shell so any descendant can call
 * `useClientDrawer().openDrawer(id)` to peek a client without losing
 * context.
 *
 * Mirrors `ObligationDrawerProvider` / `PulseDrawerProvider` /
 * `EvidenceDrawerProvider`. Before this existed, every "open client"
 * affordance navigated to `/clients/[id]` and dropped the user's
 * queue / dashboard / Pulse context. The drawer is the glance form;
 * the full page at `/clients/[id]` remains the deep-work form.
 *
 * **List-route deference.** When the user is on `/clients` (they
 * came here to dive into ONE client), `openDrawer(id)` navigates to
 * the full page instead of opening the drawer — clicking a row in
 * the browse list should give you room to work. Anywhere else
 * (Obligations queue drawer, Dashboard, Pulse) the drawer is the
 * preferred surface.
 *
 * The drawer body itself lives in `ClientDetailDrawer.tsx`. It
 * fetches its own client + obligation data, so the provider only
 * passes the id + close handler.
 */
export function ClientDrawerProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [localClientId, setLocalClientId] = useState<string | null>(null)

  // The clients list is the one route where "open this client" means
  // "I want the full page." Everywhere else it means "I want a
  // glance without leaving."
  const onClientsListRoute = location.pathname === '/clients'

  const openDrawer = useCallback(
    (clientId: string) => {
      if (onClientsListRoute) {
        void navigate(`/clients/${clientId}`)
        return
      }
      setLocalClientId(clientId)
    },
    [onClientsListRoute, navigate],
  )

  const closeDrawer = useCallback(() => {
    setLocalClientId(null)
  }, [])

  const value = useMemo<ClientDrawerContextValue>(
    () => ({
      openDrawer,
      closeDrawer,
      clientId: localClientId,
    }),
    [openDrawer, closeDrawer, localClientId],
  )

  return (
    <ClientDrawerContext.Provider value={value}>
      {children}
      <ClientDetailDrawer clientId={localClientId} onClose={closeDrawer} />
    </ClientDrawerContext.Provider>
  )
}

export function useClientDrawer(): ClientDrawerContextValue {
  const ctx = useContext(ClientDrawerContext)
  if (!ctx) {
    throw new Error('useClientDrawer must be used within ClientDrawerProvider')
  }
  return ctx
}
