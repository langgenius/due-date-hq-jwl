import { redirect, type LoaderFunctionArgs } from 'react-router'

// Legacy entry — the old Rules Console has been split into a sub-route per
// former tab. Redirect bare `/rules` to Coverage, and preserve in-flight
// `?tab=…` links (e.g. dashboard banner deep-links from before this refactor)
// by mapping them onto the new sub-route paths.
const LEGACY_TAB_TO_PATH: Record<string, string> = {
  coverage: '/rules/coverage',
  sources: '/rules/sources',
  library: '/rules/library',
  pulse: '/rules/pulse',
  temporary: '/rules/temporary',
  preview: '/rules/preview',
}

export function rulesIndexLoader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const tab = url.searchParams.get('tab')
  const target = (tab && LEGACY_TAB_TO_PATH[tab]) ?? '/rules/coverage'

  // Preserve any other query params (e.g. `sourceReview=1`, `alert=…`) and the
  // hash anchor so deep-links keep working after the redirect.
  url.searchParams.delete('tab')
  throw redirect(`${target}${url.search}${url.hash}`)
}
