import { activateLocale } from './i18n'
import { consumeLocaleHandoff, detectLocaleResolution, type LocaleResolution } from './locales'

export function bootstrapI18n(): LocaleResolution {
  const handoffLocale = consumeLocaleHandoff()
  const resolution = handoffLocale
    ? ({ locale: handoffLocale, source: 'query' } as const)
    : detectLocaleResolution()
  activateLocale(resolution.locale, { persist: false })
  return resolution
}
