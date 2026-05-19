import { useLocation } from 'react-router'

// Obligation lifecycle v2 feature flag.
//
// Driven by the `?lifecycle=v2` URL search param so two browser tabs
// can preview old + new side by side without a rebuild. When the
// migration completes and the 6-state model becomes default-on, this
// hook collapses to `() => true` and callers are inlined.
//
// Reads the search param via React Router's `useLocation`, which
// re-renders on both `popstate` (browser back/forward) and
// programmatic `history.pushState` (React Router link clicks).
// The previous `useSyncExternalStore` + `popstate` subscription
// missed `pushState` events, so the flag silently stuck on its
// initial value across in-app navigations.
//
// See docs/Design/obligation-lifecycle-design-brief.md.

const FLAG_PARAM = 'lifecycle'
const FLAG_VALUE = 'v2'

function useLifecycleV2(): boolean {
  const { search } = useLocation()
  return new URLSearchParams(search).get(FLAG_PARAM) === FLAG_VALUE
}

export { useLifecycleV2 }
