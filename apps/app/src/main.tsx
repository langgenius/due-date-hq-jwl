import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@duedatehq/ui/components/ui/sonner'
import { TooltipProvider } from '@duedatehq/ui/components/ui/tooltip'
import { bootstrapI18n } from '@/i18n/bootstrap'
import { AppI18nProvider } from '@/i18n/provider'
import { createAppRouter } from './router'
import './styles/globals.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, refetchOnWindowFocus: false },
  },
})

async function installDevMocks(): Promise<void> {
  if (!import.meta.env.DEV) return
  if (typeof window === 'undefined') return
  if (new URLSearchParams(window.location.search).get('mockPulse') !== '1') return

  const { installMockPulse } = await import('@/features/alerts/__dev__/mock-alerts')
  installMockPulse(queryClient)
}

const rootEl = document.getElementById('root')
if (!rootEl) {
  throw new Error('Root element #root not found')
}
const appRoot = rootEl

void startApp()

async function startApp() {
  await installDevMocks()

  bootstrapI18n()
  const router = createAppRouter()

  const AgentationDevtools = import.meta.env.DEV
    ? lazy(async () => {
        const { Agentation } = await import('agentation')

        return { default: Agentation }
      })
    : null

  function AppDevtools() {
    if (!AgentationDevtools) return null

    return (
      <Suspense fallback={null}>
        <AgentationDevtools />
      </Suspense>
    )
  }

  createRoot(appRoot).render(
    <StrictMode>
      <AppI18nProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <RouterProvider router={router} />
            <Toaster />
            <AppDevtools />
          </TooltipProvider>
        </QueryClientProvider>
      </AppI18nProvider>
    </StrictMode>,
  )
}

// PWA / Service Worker / Web Push intentionally omitted for Phase 0
// (docs/dev-file/00 §7 · /05 §8).
