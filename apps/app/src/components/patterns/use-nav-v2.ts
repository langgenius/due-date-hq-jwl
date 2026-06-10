import { useLocation } from 'react-router'

// Sidebar IA v2 feature flag (`?nav=v2`). Restructures the primary
// navigation into Operations / Coverage / Practice groups. Alerts sits
// as a top-level primary item (the dashboard's NEEDS ATTENTION surface
// mirrors it). When v2
// becomes default-on this hook collapses to `() => true` and the
// legacy useNavItems branch can be deleted.

const FLAG_PARAM = 'nav'
const FLAG_VALUE = 'v2'

function useNavV2(): boolean {
  // Preview-integration: default-on, URL param still overrides for
  // explicit fallback (`?nav=v1` etc).
  const { search } = useLocation()
  const explicit = new URLSearchParams(search).get(FLAG_PARAM)
  if (explicit === null) return true
  return explicit === FLAG_VALUE
}

export { useNavV2 }
