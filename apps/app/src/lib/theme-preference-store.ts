import {
  THEME_STORAGE_KEY,
  applyThemePreference,
  cacheStoredThemePreference,
  clearStoredThemePreferenceCache,
  isThemePreference,
  readStoredThemePreference,
  switchThemePreference as applyAndPersistTheme,
  type ThemePreference,
} from '@duedatehq/ui/theme'

const THEME_PREFERENCE_CHANGE_EVENT = 'duedatehq-theme-preference-change'
const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)'

function getStoredThemePreference(): ThemePreference {
  try {
    return readStoredThemePreference(window.localStorage)
  } catch {
    return 'light'
  }
}

function getServerThemePreference(): ThemePreference {
  return 'light'
}

function syncFromStoredThemePreference(onStoreChange: () => void): void {
  clearStoredThemePreferenceCache(window.localStorage)
  applyThemePreference(getStoredThemePreference())
  onStoreChange()
}

function syncFromCurrentTabThemePreference(onStoreChange: () => void): void {
  applyThemePreference(getStoredThemePreference())
  onStoreChange()
}

function syncFromSystemThemePreference(onStoreChange: () => void): void {
  if (getStoredThemePreference() === 'system') {
    applyThemePreference('system')
    onStoreChange()
  }
}

function subscribeToThemePreference(onStoreChange: () => void): () => void {
  const media = window.matchMedia(DARK_SCHEME_QUERY)

  function handleMediaChange() {
    syncFromSystemThemePreference(onStoreChange)
  }

  function handleStorageChange(event: StorageEvent) {
    if (event.key !== THEME_STORAGE_KEY) return
    syncFromStoredThemePreference(onStoreChange)
  }

  function handleCurrentTabChange() {
    syncFromCurrentTabThemePreference(onStoreChange)
  }

  media.addEventListener('change', handleMediaChange)
  window.addEventListener('storage', handleStorageChange)
  window.addEventListener(THEME_PREFERENCE_CHANGE_EVENT, handleCurrentTabChange)

  return () => {
    media.removeEventListener('change', handleMediaChange)
    window.removeEventListener('storage', handleStorageChange)
    window.removeEventListener(THEME_PREFERENCE_CHANGE_EVENT, handleCurrentTabChange)
  }
}

function switchThemePreference(next: ThemePreference): void {
  if (!isThemePreference(next)) return
  applyAndPersistTheme(next)
  cacheStoredThemePreference(window.localStorage, next)
  window.dispatchEvent(new Event(THEME_PREFERENCE_CHANGE_EVENT))
}

export {
  THEME_PREFERENCE_CHANGE_EVENT,
  getServerThemePreference,
  getStoredThemePreference,
  subscribeToThemePreference,
  switchThemePreference,
}
