export interface LocaleHrefPair {
  enHref: string
  zhHref: string
}

function normalizePublicPath(pathname: string): string {
  let path = pathname

  if (path.endsWith('/index.html')) {
    path = path.slice(0, -'/index.html'.length)
  } else if (path === '/index.html') {
    path = '/'
  } else if (path.endsWith('.html')) {
    path = path.slice(0, -'.html'.length)
  }

  return path || '/'
}

/** Sections that ship English-only (no /zh-CN mirror is built). Linking or
 *  hreflang-ing to their /zh-CN twin produces crawlable 404s — GSC logged 9 of
 *  them (2026-07-28) before this list existed. Keep in sync with src/pages. */
const EN_ONLY_PREFIXES = ['/irs-disaster-relief', '/widget']

/** Whether a locale-free public path has a built /zh-CN mirror. */
export function hasZhMirror(localeFreePath: string): boolean {
  return !EN_ONLY_PREFIXES.some((p) => localeFreePath === p || localeFreePath.startsWith(`${p}/`))
}

export function buildLocaleHrefPair(pathname: string): LocaleHrefPair {
  const publicPath = normalizePublicPath(pathname)
  const localeFreePath = publicPath.replace(/^\/zh-CN(?=\/|$)/, '') || '/'

  return {
    enHref: localeFreePath,
    // EN-only sections have no zh twin — send the switcher to the zh home
    // instead of a 404.
    zhHref:
      localeFreePath === '/' || !hasZhMirror(localeFreePath) ? '/zh-CN' : `/zh-CN${localeFreePath}`,
  }
}
