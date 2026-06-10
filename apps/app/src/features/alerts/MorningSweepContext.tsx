import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

/**
 * `MorningSweepContext` — shared on/off state for the "My morning sweep"
 * saved view on /rules/pulse.
 *
 * 2026-06-04 round 38 (Yuqi feedback item 10 — "My morning sweep can be
 * beside Sources, Alert history button"): the button used to live in the
 * filter pill row inside `AlertsListPage`, alongside Severity / Change
 * types / etc. Yuqi flagged that a SAVED VIEW (a preset combination of
 * filters) is page-level navigation rather than a single filter facet —
 * it belongs in the page-header actions cluster (next to Sources / Alert
 * history), not in the filter row.
 *
 * The complication: the toggle's "active" state has to drive the alert
 * list's filter logic, but the button needs to render in the route shell
 * (`rules.pulse.tsx`) — one level ABOVE `AlertsListPage` in the React
 * tree. Local `useState` inside the page can't reach the shell's actions
 * cluster.
 *
 * This context lives in the route component (provider in
 * `rules.pulse.tsx`), exposes `{ active, toggle }`, and is consumed by
 * BOTH:
 *   • The shell's `<MorningSweepButton />` (renders the outline Button
 *     in the actions cluster).
 *   • `AlertsListPage` (reads `active` to override `timeRangeFilter` +
 *     `statusFilter` with the preset combo of "Last 24 hours" + "Needs
 *     Action").
 *
 * When inactive (the default), the page uses normal filter state. When
 * active, the preset overrides take effect and the underlying filters
 * are visually disabled (or reflect the preset values, depending on the
 * presentation choice — see `AlertsListPage` for the wiring).
 *
 * The provider treats absence (no provider mounted) as a no-op for
 * AlertsListPage's standalone / embedded-without-shell renders — the
 * hook returns `null` and the page falls back to its local filter state
 * untouched.
 */
/**
 * 2026-06-04 round 52 (Yuqi "can you click it and it inserts a side
 * panel or a panel before the alert list about the digest"): context
 * expanded with `digestOpen` + `toggleDigest`. The trigger button in
 * the page-header actions cluster now opens the inline digest panel
 * (instead of a modal Dialog) and `AlertsListPage` reads `digestOpen`
 * to render the briefing card above the alerts list. `active` /
 * `toggle` for the filter-override still live alongside so the
 * panel's "Show me just these alerts" CTA can keep applying the
 * preset.
 */
export type MorningSweepValue = {
  active: boolean
  toggle: () => void
  // Explicit off-switch for the sweep filter override — "Show me" only ever
  // turns it on, and the list page needs exits (chip, Reset, time-filter
  // takeover) that never accidentally re-enable it.
  deactivate: () => void
  digestOpen: boolean
  toggleDigest: () => void
  closeDigest: () => void
}

const MorningSweepContext = createContext<MorningSweepValue | null>(null)

export function MorningSweepProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false)
  const [digestOpen, setDigestOpen] = useState(false)
  const value = useMemo<MorningSweepValue>(
    () => ({
      active,
      toggle: () => setActive((prev) => !prev),
      deactivate: () => setActive(false),
      digestOpen,
      toggleDigest: () => setDigestOpen((prev) => !prev),
      closeDigest: () => setDigestOpen(false),
    }),
    [active, digestOpen],
  )
  return <MorningSweepContext.Provider value={value}>{children}</MorningSweepContext.Provider>
}

/**
 * Read the morning-sweep state. Returns `null` when no provider is
 * mounted (e.g. standalone preview renders) — callers should treat
 * `null` as "feature not available, use local state".
 */
export function useMorningSweep(): MorningSweepValue | null {
  return useContext(MorningSweepContext)
}
