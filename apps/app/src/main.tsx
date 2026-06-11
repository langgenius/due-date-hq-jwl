import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'motion/react'
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

const rootEl = document.getElementById('root')
if (!rootEl) {
  throw new Error('Root element #root not found')
}
const appRoot = rootEl

void startApp()

async function startApp() {
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
          {/* reducedMotion="user" — every motion/react component in the app
              respects prefers-reduced-motion from this ONE config (the CSS
              side is killed globally in preset.css). Never hand-roll
              per-component useReducedMotion guards. */}
          <MotionConfig reducedMotion="user">
            <TooltipProvider>
              <RouterProvider router={router} />
              <Toaster />
              <AppDevtools />
            </TooltipProvider>
          </MotionConfig>
        </QueryClientProvider>
      </AppI18nProvider>
    </StrictMode>,
  )
}

// PWA / Service Worker / Web Push intentionally omitted for Phase 0
// (docs/dev-file/00 §7 · /05 §8).
