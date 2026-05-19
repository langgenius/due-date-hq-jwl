import { useLocation } from 'react-router'

// Dashboard v2 feature flag — driven by `?dashboard=v2` URL param so
// the new "Needs attention" surface can be previewed side by side
// with the current dashboard without a rebuild. When the redesign
// becomes default-on, this hook collapses to `() => true`.
//
// Reads the search param via React Router's `useLocation`, which
// re-renders on both `popstate` (browser back/forward) and
// programmatic `history.pushState` (React Router link clicks).
// The previous `useSyncExternalStore` + `popstate` subscription
// missed `pushState` events, so the flag silently stuck on its
// initial value across in-app navigations.
//
// See apps/app/src/features/dashboard/needs-attention-section.tsx
// and the design mockup from 2026-05-19.

const FLAG_PARAM = 'dashboard'
const FLAG_VALUE = 'v2'

function useDashboardV2(): boolean {
  // Preview-integration: v2 is the default-on surface on this branch
  // so reviewers don't need to remember the URL flag. URL param still
  // overrides to `false` for explicit fallback comparison
  // (`?dashboard=v1` or anything that isn't `v2`).
  const { search } = useLocation()
  const explicit = new URLSearchParams(search).get(FLAG_PARAM)
  if (explicit === null) return true
  return explicit === FLAG_VALUE
}

export { useDashboardV2 }
