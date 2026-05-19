import { useSyncExternalStore } from 'react'

// Obligation lifecycle v2 feature flag.
//
// Driven by the `?lifecycle=v2` URL search param so two browser tabs
// can preview old + new side by side without a rebuild. When the
// migration completes and the 6-state model becomes default-on, this
// hook collapses to `() => true` and callers are inlined.
//
// See docs/Design/obligation-lifecycle-design-brief.md.

const FLAG_PARAM = 'lifecycle'
const FLAG_VALUE = 'v2'

function read(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get(FLAG_PARAM) === FLAG_VALUE
}

function subscribe(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined
  window.addEventListener('popstate', callback)
  window.addEventListener('pushstate', callback)
  return () => {
    window.removeEventListener('popstate', callback)
    window.removeEventListener('pushstate', callback)
  }
}

function useLifecycleV2(): boolean {
  return useSyncExternalStore(subscribe, read, () => false)
}

export { useLifecycleV2 }
