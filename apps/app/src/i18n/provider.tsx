import { useCallback, useSyncExternalStore, type ReactNode } from 'react'
import { I18nProvider } from '@lingui/react'
import { useQueryClient } from '@tanstack/react-query'
import { DEFAULT_LOCALE, type Locale } from '@duedatehq/i18n'

import { setSuperProperties } from '@/lib/analytics'
import { activateLocale, currentLocale, i18n } from './i18n'

interface AppI18nProviderProps {
  children: ReactNode
}

export function AppI18nProvider({ children }: AppI18nProviderProps) {
  return <I18nProvider i18n={i18n}>{children}</I18nProvider>
}

// Concurrent-safe subscription: `useSyncExternalStore` guarantees every consumer
// reads the same locale within a render pass, avoiding tearing between Lingui's
// own change notifications and React's commit cycle.
const subscribeLocale = (onStoreChange: () => void): (() => void) => {
  return i18n.on('change', onStoreChange)
}
const getSnapshot = (): Locale => currentLocale()
const getServerSnapshot = (): Locale => DEFAULT_LOCALE

export function useLocaleSwitch(): {
  locale: Locale
  switchLocale: (next: Locale) => void
} {
  const locale = useSyncExternalStore(subscribeLocale, getSnapshot, getServerSnapshot)
  const queryClient = useQueryClient()

  const switchLocale = useCallback(
    (next: Locale) => {
      if (next === locale) return
      activateLocale(next, { persist: true })
      setSuperProperties({ app_locale: next })
      // Drop any server responses that embed human-readable locale-dependent
      // text so follow-up renders refetch in the newly active language.
      void queryClient.invalidateQueries()
    },
    [locale, queryClient],
  )

  return { locale, switchLocale }
}
