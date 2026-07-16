import {
  DEFAULT_LOCALE,
  INTL_LOCALE,
  LOCALE_LABELS,
  SUPPORTED_LOCALES,
  isLocale,
  localeFromLanguageSignal,
  type Locale,
} from '@duedatehq/i18n'
import { localeFromSearch, localeFromSearchParams, removeLocaleFromPath } from './query'

const STORAGE_KEY = 'lng'

export type LocaleSource = 'query' | 'storage' | 'browser' | 'default'

export interface LocaleResolution {
  locale: Locale
  source: LocaleSource
}

export { DEFAULT_LOCALE, INTL_LOCALE, LOCALE_LABELS, SUPPORTED_LOCALES, isLocale, type Locale }

function detectLocaleHandoff(): Locale | null {
  if (typeof window === 'undefined') return null

  try {
    return localeFromSearch(window.location.search)
  } catch {
    return null
  }
}

export function consumeLocaleHandoff(): Locale | null {
  const locale = detectLocaleHandoff()
  if (!locale) return null

  persistLocale(locale)

  try {
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`
    const next = removeLocaleFromPath(current)
    window.history.replaceState(window.history.state, '', next)
  } catch {
    // URL cleanup is best-effort; the persisted locale is the durable handoff.
  }

  return locale
}

export function persistLocaleHandoffFromUrl(url: URL): Locale | null {
  const locale = localeFromSearchParams(url.searchParams)
  if (!locale) return null

  persistLocale(locale)
  return locale
}

// Priority: marketing handoff query → explicit user choice in localStorage →
// navigator.language → default.
export function detectLocaleResolution(): LocaleResolution {
  if (typeof window === 'undefined') return { locale: DEFAULT_LOCALE, source: 'default' }

  const queryLocale = detectLocaleHandoff()
  if (queryLocale) return { locale: queryLocale, source: 'query' }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (isLocale(stored)) return { locale: stored, source: 'storage' }
  } catch {
    // localStorage may be blocked in private mode; fall through to navigator.
  }

  const language = window.navigator?.language
  const detected = localeFromLanguageSignal(language)
  if (detected) return { locale: detected, source: 'browser' }
  if (language) return { locale: DEFAULT_LOCALE, source: 'browser' }
  return { locale: DEFAULT_LOCALE, source: 'default' }
}

export function detectLocale(): Locale {
  return detectLocaleResolution().locale
}

export function persistLocale(locale: Locale): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // Ignore write failures; session-only preference is acceptable.
  }
}
