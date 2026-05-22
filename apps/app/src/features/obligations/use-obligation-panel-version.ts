import { useCallback } from 'react'
import { parseAsStringLiteral, useQueryState } from 'nuqs'

// V2 is opt-in. Default = the existing panel (`v1`). The toggle button
// in either panel flips this. URL-backed so a link can advertise the
// comparison ("here's the new shape: /obligations?id=...&panel=v2").
const PANEL_VERSIONS = ['v1', 'v2'] as const
export type ObligationPanelVersion = (typeof PANEL_VERSIONS)[number]
const versionParser = parseAsStringLiteral(PANEL_VERSIONS).withDefault('v1')

export function useObligationPanelVersion(): {
  version: ObligationPanelVersion
  setVersion: (next: ObligationPanelVersion) => void
} {
  const [version, setVersion] = useQueryState('panel', versionParser)
  const set = useCallback(
    (next: ObligationPanelVersion) => {
      // `null` strips the param when toggling back to default — keeps
      // shared links clean.
      void setVersion(next === 'v1' ? null : next)
    },
    [setVersion],
  )
  return { version, setVersion: set }
}
