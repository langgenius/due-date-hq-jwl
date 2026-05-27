import { createSerializer, parseAsStringLiteral, type inferParserType } from 'nuqs'
import { SUPPORTED_LOCALES } from '@duedatehq/i18n'

const LOCALE_QUERY_KEY = 'lng'

const localeQueryParser = parseAsStringLiteral(SUPPORTED_LOCALES)

const localeQueryParsers = {
  [LOCALE_QUERY_KEY]: localeQueryParser,
} as const

const serializeLocaleQuery = createSerializer(localeQueryParsers)

type LocaleQuery = inferParserType<typeof localeQueryParsers>
type LocaleQueryValue = NonNullable<LocaleQuery[typeof LOCALE_QUERY_KEY]>

export function localeFromSearchParams(
  searchParams: Pick<URLSearchParams, 'get'>,
): LocaleQueryValue | null {
  const value = searchParams.get(LOCALE_QUERY_KEY)
  return value ? localeQueryParser.parse(value) : null
}

export function localeFromSearch(search: string): LocaleQueryValue | null {
  return localeFromSearchParams(new URLSearchParams(search))
}

export function removeLocaleFromPath(path: string): string {
  const hashIndex = path.indexOf('#')
  const pathAndSearch = hashIndex === -1 ? path : path.slice(0, hashIndex)
  const hash = hashIndex === -1 ? '' : path.slice(hashIndex)

  return `${serializeLocaleQuery(pathAndSearch, { [LOCALE_QUERY_KEY]: null })}${hash}`
}
