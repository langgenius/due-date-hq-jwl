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
 * Mirrors `ObligationDrawerProvider` / `AlertDrawerProvider` /
 * `EvidenceDrawerProvider`. Before this existed, every "open client"
 * affordance navigated to `/clients/[id]` and dropped the user's
 * queue / dashboard / Alerts context. The drawer is the glance form;
 * the full page at `/clients/[id]` remains the deep-work form.
 *
 * **List-route deference.** When the user is on `/clients` (they
 * came here to dive into ONE client), `openDrawer(id)` navigates to
 * the full page instead of opening the drawer — clicking a row in
 * the browse list should give you room to work. Anywhere else
 * (Obligations queue drawer, Dashboard, Alerts) the drawer is the
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

  // IMPORTANT: do NOT mount `<ClientDetailDrawer>` here as a sibling
  // of `{children}`. The drawer's body uses `useObligationDrawer()`
  // (through `ClientSummaryStrip`), and the obligations provider is
  // nested INSIDE this provider per `apps/app/src/routes/_layout.tsx`.
  // Mounting the drawer at this level puts it OUTSIDE the obligations
  // provider — the hook throws "must be used within
  // ObligationDrawerProvider" the moment the drawer first opens.
  //
  // Instead, render `<ClientDrawerMount />` somewhere inside both
  // providers (the layout already does this). It consumes this
  // context via `useClientDrawer()` and renders the actual sheet.
  return <ClientDrawerContext.Provider value={value}>{children}</ClientDrawerContext.Provider>
}

/**
 * Mount point for the client detail sheet. Render this somewhere
 * inside both `<ClientDrawerProvider>` AND `<ObligationDrawerProvider>`
 * (typically the app shell tree). The drawer reads its open state
 * from `useClientDrawer()` so callers anywhere in the app can drive
 * it without prop-drilling.
 */
export function ClientDrawerMount() {
  const { clientId, closeDrawer } = useClientDrawer()
  return <ClientDetailDrawer clientId={clientId} onClose={closeDrawer} />
}

export function useClientDrawer(): ClientDrawerContextValue {
  const ctx = useContext(ClientDrawerContext)
  if (!ctx) {
    throw new Error('useClientDrawer must be used within ClientDrawerProvider')
  }
  return ctx
}
