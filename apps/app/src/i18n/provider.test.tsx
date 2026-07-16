import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_LOCALE, type Locale } from '@duedatehq/i18n'

import { bootstrapI18n } from './bootstrap'
import { activateLocale } from './i18n'
import { AppI18nProvider, useLocaleSwitch } from './provider'

const analyticsMocks = vi.hoisted(() => ({
  setSuperProperties: vi.fn(),
}))

vi.mock('@/lib/analytics', () => ({
  setSuperProperties: analyticsMocks.setSuperProperties,
}))

// Vitest doesn't set this by default; without it React 19's act() prints
// noisy warnings even though the test code itself is correct.
declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

type HookValue = { locale: Locale; switchLocale: (next: Locale) => void }

// Render the hook inside the real provider tree and expose the latest value
// via a mutable ref so assertions always see the post-render snapshot.
interface Harness {
  ref: { current: HookValue }
  unmount: () => void
}

function mount(): Harness {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const ref: { current: HookValue } = {
    current: { locale: DEFAULT_LOCALE, switchLocale: () => {} },
  }

  function Probe() {
    ref.current = useLocaleSwitch()
    return null
  }

  act(() => {
    root.render(
      <QueryClientProvider client={client}>
        <AppI18nProvider>
          <Probe />
        </AppI18nProvider>
      </QueryClientProvider>,
    )
  })

  return {
    ref,
    unmount: () => {
      act(() => root.unmount())
      container.remove()
    },
  }
}

describe('AppI18nProvider', () => {
  let harness: Harness | null = null

  beforeEach(() => {
    analyticsMocks.setSuperProperties.mockClear()
    window.localStorage.clear()
    window.history.replaceState(null, '', '/')
    document.documentElement.lang = ''
  })

  afterEach(() => {
    harness?.unmount()
    harness = null
    activateLocale('en')
    vi.restoreAllMocks()
  })

  it('provides the bootstrapped locale to React consumers', () => {
    const resolution = bootstrapI18n()

    harness = mount()
    expect(document.documentElement.lang).toBe('en')
    expect(resolution).toEqual({ locale: 'en', source: 'browser' })
  })

  it('consumes a valid marketing lng query before render', () => {
    window.history.replaceState(null, '', '/?lng=zh-CN')

    const resolution = bootstrapI18n()

    harness = mount()

    expect(resolution).toEqual({ locale: 'zh-CN', source: 'query' })
    expect(harness.ref.current.locale).toBe('zh-CN')
    expect(document.documentElement.lang).toBe('zh-CN')
    expect(window.localStorage.getItem('lng')).toBe('zh-CN')
    expect(window.location.search).toBe('')
  })

  it('reports a persisted locale as the bootstrap source', () => {
    window.localStorage.setItem('lng', 'zh-CN')

    const resolution = bootstrapI18n()

    expect(resolution).toEqual({ locale: 'zh-CN', source: 'storage' })
  })

  it('reports browser detection as the bootstrap source', () => {
    vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('zh-Hans-SG')

    const resolution = bootstrapI18n()

    expect(resolution).toEqual({ locale: 'zh-CN', source: 'browser' })
  })

  it('reports the default source when the browser exposes no language', () => {
    vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('')

    const resolution = bootstrapI18n()

    expect(resolution).toEqual({ locale: 'en', source: 'default' })
  })

  it('switches locale, persists the choice, and updates <html lang>', () => {
    bootstrapI18n()

    harness = mount()

    act(() => harness!.ref.current.switchLocale('zh-CN'))

    expect(harness.ref.current.locale).toBe('zh-CN')
    expect(document.documentElement.lang).toBe('zh-CN')
    expect(window.localStorage.getItem('lng')).toBe('zh-CN')
    expect(analyticsMocks.setSuperProperties).toHaveBeenCalledWith({ app_locale: 'zh-CN' })
  })

  it('is a no-op when switching to the already-active locale', () => {
    bootstrapI18n()

    harness = mount()

    act(() => harness!.ref.current.switchLocale('en'))
    expect(window.localStorage.getItem('lng')).toBeNull()
  })

  it('ignores invalid lng query values', () => {
    window.history.replaceState(null, '', '/?lng=fr-FR')

    bootstrapI18n()

    harness = mount()

    expect(harness.ref.current.locale).toBe('en')
    expect(document.documentElement.lang).toBe('en')
    expect(window.localStorage.getItem('lng')).toBeNull()
    expect(window.location.search).toBe('?lng=fr-FR')
  })
})
