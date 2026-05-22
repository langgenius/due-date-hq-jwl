const THEME_PREFERENCES = ['light', 'dark', 'system'] as const

type ThemePreference = (typeof THEME_PREFERENCES)[number]
type ResolvedTheme = Exclude<ThemePreference, 'system'>

const THEME_STORAGE_KEY = 'duedatehq.theme'
const THEME_ATTRIBUTE = 'theme'
const THEME_DARK_CLASS = 'dark'
const THEME_COLOR_LIGHT = '#0A2540'
const THEME_COLOR_DARK = '#1D1D20'
const DISABLE_TRANSITIONS_STYLE = `*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}`
const storedThemePreferenceCache = new WeakMap<object, ThemePreference>()

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system'
}

function resolveThemePreference(preference: ThemePreference, prefersDark: boolean): ResolvedTheme {
  if (preference === 'system') {
    return prefersDark ? 'dark' : 'light'
  }

  return preference
}

function readStoredThemePreference(storage: Pick<Storage, 'getItem'>): ThemePreference {
  const cached = storedThemePreferenceCache.get(storage)

  if (cached) {
    return cached
  }

  const stored = storage.getItem(THEME_STORAGE_KEY)

  if (isThemePreference(stored)) {
    storedThemePreferenceCache.set(storage, stored)
    return stored
  }

  storedThemePreferenceCache.set(storage, 'light')
  return 'light'
}

function clearStoredThemePreferenceCache(storage: Pick<Storage, 'getItem'>): void {
  storedThemePreferenceCache.delete(storage)
}

function cacheStoredThemePreference(storage: object, preference: ThemePreference): void {
  storedThemePreferenceCache.set(storage, preference)
}

function themeColorFor(resolvedTheme: ResolvedTheme): string {
  return resolvedTheme === 'dark' ? THEME_COLOR_DARK : THEME_COLOR_LIGHT
}

function updateThemeColor(
  documentLike: Pick<Document, 'querySelector'>,
  resolvedTheme: ResolvedTheme,
): void {
  const meta = documentLike.querySelector('meta[name="theme-color"]')

  if (meta) {
    meta.setAttribute('content', themeColorFor(resolvedTheme))
  }
}

function applyResolvedTheme(
  root: Pick<HTMLElement, 'classList' | 'dataset' | 'style'>,
  resolvedTheme: ResolvedTheme,
): void {
  root.classList.toggle(THEME_DARK_CLASS, resolvedTheme === 'dark')
  root.dataset[THEME_ATTRIBUTE] = resolvedTheme
  root.style.colorScheme = resolvedTheme
}

function disableThemeTransitions(nonce?: string): () => void {
  const style = document.createElement('style')

  if (nonce) {
    style.setAttribute('nonce', nonce)
  }

  style.appendChild(document.createTextNode(DISABLE_TRANSITIONS_STYLE))
  document.head.appendChild(style)

  return () => {
    void window.getComputedStyle(document.body).getPropertyValue('opacity')

    setTimeout(() => {
      style.remove()
    }, 1)
  }
}

interface SwitchThemePreferenceOptions {
  /** Override storage. Defaults to `window.localStorage`. */
  storage?: Pick<Storage, 'setItem'>
  /** Override `prefers-color-scheme: dark` query result. Defaults to `matchMedia(...)`. */
  prefersDark?: boolean
}

interface ApplyThemePreferenceOptions {
  /** Override `prefers-color-scheme: dark` query result. Defaults to `matchMedia(...)`. */
  prefersDark?: boolean
}

function applyThemePreference(
  preference: ThemePreference,
  options?: ApplyThemePreferenceOptions,
): ResolvedTheme {
  const prefersDark =
    options?.prefersDark ?? window.matchMedia('(prefers-color-scheme: dark)').matches
  const resolvedTheme = resolveThemePreference(preference, prefersDark)
  const enableTransitions = disableThemeTransitions()

  applyResolvedTheme(document.documentElement, resolvedTheme)
  updateThemeColor(document, resolvedTheme)
  enableTransitions()

  return resolvedTheme
}

// Single entrypoint both apps use to switch theme at runtime. Encapsulates the
// ordered side effects so the SaaS shell and the Astro marketing footer can
// stay in lock-step (no drift in transition handling, attribute writes, or
// storage key). The no-flash `<head>` script in `THEME_INIT_SCRIPT` covers the
// initial paint; this function only handles user-driven changes.
function switchThemePreference(
  preference: ThemePreference,
  options?: SwitchThemePreferenceOptions,
): ResolvedTheme {
  const resolvedTheme = applyThemePreference(preference, options)
  const storage = options?.storage ?? window.localStorage
  try {
    storage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    // localStorage may be unavailable (private mode, security policy). Theme
    // is still applied for the current session — just won't persist.
  }
  cacheStoredThemePreference(storage, preference)

  return resolvedTheme
}

export {
  THEME_ATTRIBUTE,
  THEME_COLOR_DARK,
  THEME_COLOR_LIGHT,
  THEME_DARK_CLASS,
  THEME_PREFERENCES,
  THEME_STORAGE_KEY,
  applyResolvedTheme,
  applyThemePreference,
  cacheStoredThemePreference,
  clearStoredThemePreferenceCache,
  disableThemeTransitions,
  isThemePreference,
  readStoredThemePreference,
  resolveThemePreference,
  switchThemePreference,
  themeColorFor,
  updateThemeColor,
  type ApplyThemePreferenceOptions,
  type ResolvedTheme,
  type SwitchThemePreferenceOptions,
  type ThemePreference,
}
