import { useLocation } from 'react-router'

// Sidebar IA v2 feature flag (`?nav=v2`). Restructures the primary
// navigation into Operations / Coverage / Practice groups per the
// design mockup pinned 2026-05-19. Radar disappears from the sidebar
// — it now lives on the dashboard's NEEDS ATTENTION surface. When v2
// becomes default-on this hook collapses to `() => true` and the
// legacy useNavItems branch can be deleted.

const FLAG_PARAM = 'nav'
const FLAG_VALUE = 'v2'

function useNavV2(): boolean {
  const { search } = useLocation()
  return new URLSearchParams(search).get(FLAG_PARAM) === FLAG_VALUE
}

export { useNavV2 }
