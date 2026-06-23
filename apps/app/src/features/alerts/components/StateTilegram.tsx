import { useLingui } from '@lingui/react/macro'

import { cn } from '@duedatehq/ui/lib/utils'
import {
  US_JURISDICTION_TILES as JURISDICTION_TILES,
  US_TILE_GRID_COLS as GRID_COLS,
  US_TILE_GRID_ROWS as GRID_ROWS,
  US_TILE_CELL_SIZE as CELL_SIZE,
  US_TILE_CELL_GAP as CELL_GAP,
} from '@/components/primitives/us-jurisdiction-tiles'

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
            aria-label={count === 1 ? t`${code}: 1 alert` : t`${code}: ${count} alerts`}
            disabled={!hasCount && !active}
            className={cn(
              'group/tile absolute inline-flex cursor-pointer flex-col items-center justify-center gap-0 rounded-lg border transition-[background-color,border-color,opacity]',
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
                'text-xs font-semibold leading-none tabular-nums',
                active ? 'text-text-accent' : hasCount ? 'text-text-primary' : 'text-text-tertiary',
              )}
            >
              {code}
            </span>
            {hasCount ? (
              <span
                className={cn(
                  'mt-0.5 text-micro leading-none tabular-nums',
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
