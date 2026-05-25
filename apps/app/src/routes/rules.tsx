import { redirect, type LoaderFunctionArgs } from 'react-router'

// Legacy entry — the old Rules Console (a single tabbed page) has been split
// into multiple destinations:
//   - Coverage / Sources / Rule library → merged into one `/rules/library`
//     page with section anchors
//   - Pulse changes → its own direct entry `/rules/pulse` (sidebar-promoted)
//   - Temporary rules → unlisted but reachable at `/rules/temporary`
//   - Deadline preview → unlisted but reachable at `/rules/preview`
//
// Bare `/rules` lands on the merged Library page (the canonical hub).
// `?tab=...` deep-links from before the refactor (Pulse banner, dashboard
// notes, external bookmarks) are preserved by mapping them to the new
// equivalent. The three merged-tab values resolve to the same Library URL
// with the matching section anchor.
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
  const mapped = tab ? LEGACY_TAB_TO_PATH[tab] : undefined
  const target = mapped ?? '/rules/library'

  // Preserve any other query params (e.g. `alert=…`).
  // Hash: a mapped legacy tab carries its own anchor; otherwise pass any
  // explicit hash the caller provided.
  url.searchParams.delete('tab')
  const [targetPath, mappedHash] = target.split('#')
  const hash = mappedHash ? `#${mappedHash}` : url.hash
  throw redirect(`${targetPath}${url.search}${hash}`)
}
