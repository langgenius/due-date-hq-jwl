import { useLingui } from '@lingui/react/macro'

import { cn } from '@duedatehq/ui/lib/utils'

/**
 * StateTilegram — clickable jurisdiction filter map for `/alerts`.
 *
 * A tilegram-style US map. Each state sits at its approximate
 * geographic position on a grid. States with active alerts are
 * color-coded by count; states without alerts dim out. Clicking a state
 * toggles its filter.
 *
 * Why a tilegram (not a true geographic SVG):
 *   - The geographic projection's value is "I see my client's
 *     state in its real place." A tilegram delivers ~90% of that
 *     intuition (states cluster regionally) at ~5% the asset
 *     weight — no TopoJSON, no Mapbox, no projection math.
 *   - StateBadge motifs already exist for every state; the
 *     tilegram is just a layout primitive over them. Adopting a
 *     true SVG map would require parallel art for each state.
 *   - Future work can swap the layout to a geographic SVG with
 *     the same prop signature — `<StateTilegram counts={...}
 *     activeState={...} onSelect={...} />` is the contract.
 *   - Federal-scoped alerts use jurisdiction `FED`; they share the
 *     same tile treatment and sit beside HI because they do not belong
 *     on a physical state tile.
 */

// 13-column × 8-row tilegram layout. Each entry: [col, row].
// Origin (0,0) is top-left. Roughly mirrors the continental US
// geographic shape; AK + HI pinned to the bottom-left corner per
// USPS/NPR tilegram convention. FED is intentionally adjacent to HI:
// not geographic, but visually part of the same compact filter grid.
//
// Sources cross-referenced: NPR's tilegrams (Pitch Interactive),
// Wikipedia's "Cartogram of the United States" tile layout.
const JURISDICTION_TILES: Record<string, [number, number]> = {
  // Row 0 — Pacific Northwest / New England
  WA: [1, 0],
  ME: [11, 0],
  // Row 1
  OR: [1, 1],
  ID: [2, 1],
  MT: [3, 1],
  ND: [4, 1],
  MN: [5, 1],
  IL: [6, 1],
  WI: [6, 1.5], // close to IL, slightly above
  MI: [7, 1],
  // NY: [8, 1],
  VT: [10, 1],
  NH: [11, 1],
  // Row 2 — Mountain / Midwest band
  NV: [2, 2],
  WY: [3, 2],
  SD: [4, 2],
  IA: [5, 2],
  IN: [6, 2],
  OH: [7, 2],
  PA: [8, 2],
  NJ: [9, 2],
  MA: [10, 2],
  RI: [11, 2],
  NY: [8, 1.5], // upper-right
  // Row 3 — California / Plains / Mid-Atlantic
  CA: [1, 3],
  UT: [2, 3],
  CO: [3, 3],
  NE: [4, 3],
  MO: [5, 3],
  KY: [6, 3],
  WV: [7, 3],
  VA: [8, 3],
  MD: [9, 3],
  DE: [10, 3],
  CT: [11, 3],
  // Row 4 — South-West / South
  AZ: [2, 4],
  NM: [3, 4],
  KS: [4, 4],
  AR: [5, 4],
  TN: [6, 4],
  NC: [7, 4],
  SC: [8, 4],
  // Row 5 — Deep South
  OK: [4, 5],
  LA: [5, 5],
  MS: [6, 5],
  AL: [7, 5],
  GA: [8, 5],
  // Row 6 — Texas / Florida
  TX: [4, 6],
  FL: [9, 6],
  // Row 7 — Alaska / Hawaii
  AK: [0, 7],
  HI: [1, 7],
  FED: [2, 7],
}

const GRID_COLS = 13
const GRID_ROWS = 8
const CELL_SIZE = 36 // px — comfortable click target
const CELL_GAP = 2 // px — light separation

interface StateTilegramProps {
  /** Counts keyed by jurisdiction code. Missing states render dim. */
  counts: Map<string, number>
  /** Currently-selected jurisdiction code, or null when no filter is active. */
  activeState: string | null
  /** Toggle handler — called with the clicked jurisdiction code. */
  onSelect: (stateCode: string) => void
  className?: string
}

export function StateTilegram({ counts, activeState, onSelect, className }: StateTilegramProps) {
  const { t } = useLingui()
  const cellSpan = CELL_SIZE + CELL_GAP
  const width = GRID_COLS * cellSpan
  const height = GRID_ROWS * cellSpan
  return (
    <div
      role="group"
      aria-label={t`Filter by state`}
      className={cn('relative overflow-visible', className)}
      style={{ width, height }}
    >
      {Object.entries(JURISDICTION_TILES).map(([code, [col, row]]) => {
        const count = counts.get(code) ?? 0
        const active = activeState === code
        const hasCount = count > 0
        const left = col * cellSpan
        const top = row * cellSpan
        return (
          <button
            key={code}
            type="button"
            onClick={() => onSelect(code)}
            aria-pressed={active}
            aria-label={t`${code}: ${count} ${count === 1 ? 'alert' : 'alerts'}`}
            disabled={!hasCount && !active}
            className={cn(
              'group/tile absolute inline-flex cursor-pointer flex-col items-center justify-center gap-0 rounded-lg border transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:ring-offset-1',
              active
                ? 'border-state-accent-solid bg-state-accent-hover'
                : hasCount
                  ? 'border-divider-regular bg-background-default hover:border-state-accent-solid hover:bg-state-accent-hover/40'
                  : 'cursor-not-allowed border-transparent bg-background-soft opacity-40',
            )}
            style={{ left, top, width: CELL_SIZE, height: CELL_SIZE }}
          >
            {/* Code-led tile (no SVG StateBadge): code on the leading
                row, count beneath when there are alerts. The tile-border
                + bg already provides the state-grid identity. */}
            <span
              className={cn(
                'text-caption font-semibold leading-none tabular-nums',
                active ? 'text-text-accent' : hasCount ? 'text-text-primary' : 'text-text-tertiary',
              )}
            >
              {code}
            </span>
            {hasCount ? (
              <span
                className={cn(
                  'mt-0.5 text-[9px] leading-none tabular-nums',
                  active ? 'text-text-accent' : 'text-text-secondary',
                )}
              >
                {count}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
