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

export function buildLocaleHrefPair(pathname: string): LocaleHrefPair {
  const publicPath = normalizePublicPath(pathname)
  const localeFreePath = publicPath.replace(/^\/zh-CN(?=\/|$)/, '') || '/'

  return {
    enHref: localeFreePath,
    zhHref: localeFreePath === '/' ? '/zh-CN' : `/zh-CN${localeFreePath}`,
  }
}
