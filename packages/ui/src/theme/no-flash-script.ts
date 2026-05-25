import {
  THEME_ATTRIBUTE,
  THEME_COLOR_DARK,
  THEME_COLOR_LIGHT,
  THEME_DARK_CLASS,
  THEME_STORAGE_KEY,
} from '@duedatehq/ui/theme'

const THEME_INIT_SCRIPT = `(() => {
  const storageKey = ${JSON.stringify(THEME_STORAGE_KEY)}
  const darkClass = ${JSON.stringify(THEME_DARK_CLASS)}
  const themeAttribute = ${JSON.stringify(`data-${THEME_ATTRIBUTE}`)}
  const lightThemeColor = ${JSON.stringify(THEME_COLOR_LIGHT)}
  const darkThemeColor = ${JSON.stringify(THEME_COLOR_DARK)}
  const root = document.documentElement
  let preference = 'light'

  try {
    const stored = localStorage.getItem(storageKey)

    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      preference = stored
    }
  } catch {}

  const prefersDark =
    preference === 'system' &&
    typeof matchMedia === 'function' &&
    matchMedia('(prefers-color-scheme: dark)').matches
  const resolvedTheme = preference === 'dark' || prefersDark ? 'dark' : 'light'
  const isDark = resolvedTheme === 'dark'

  root.classList.toggle(darkClass, isDark)
  root.setAttribute(themeAttribute, resolvedTheme)
  root.style.colorScheme = resolvedTheme

  const meta = document.querySelector('meta[name="theme-color"]')

  if (meta) {
    meta.setAttribute('content', isDark ? darkThemeColor : lightThemeColor)
  }
})()`

export { THEME_INIT_SCRIPT }
