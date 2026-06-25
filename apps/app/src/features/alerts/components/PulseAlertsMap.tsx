import { Trans, useLingui } from '@lingui/react/macro'
import { useMemo } from 'react'

import type { PulseAlertPublic } from '@duedatehq/contracts'
import { cn } from '@duedatehq/ui/lib/utils'
import {
  US_JURISDICTION_TILES,
  US_TILE_CELL_GAP,
  US_TILE_CELL_SIZE,
  US_TILE_GRID_COLS,
  US_TILE_GRID_ROWS,
} from '@/components/primitives/us-jurisdiction-tiles'

// Pencil RMS9y `/alerts — option 1` introduces a map view of the
// alerts list, where each US jurisdiction is represented as a tile
// sized + toned by the count of alerts currently scoped to it. Per
// Pencil the map sits in a split body with the alerts list on the
// right (~458px) and the map on the left (~982px).
//
// This is a stylized state-grid map, NOT a real geographic map. A
// real Mapbox / Leaflet integration is a much bigger lift —
// library decision, GeoJSON, projection choice, hit-testing — and
// would push the bundle by ~150KB. For the demo + the
// at-a-glance "where are the alerts coming from" read, a tile-grid
// laid out as the "Periodic Table of US States" answers the same
// question with zero new dependencies and crisp keyboard-/screen-
// reader-friendly hit targets.
//
// Tile geometry is shared with /rules/library's RuleCoverageMap via
// us-jurisdiction-tiles.ts, so the two surfaces can never drift
// geographically. Heat encoding (alert pressure vs review pressure)
// and click behavior differ per surface.
//
// Coordinates are the canonical NPR / Bloomberg state grid. AK, HI,
// and FED live in the bottom-left corner per the USPS/NPR tilegram
// convention. FED (federal-scoped alerts) renders as an inline tile
// in that row.

// Tile background tone based on alert count: empty stays neutral;
// low-count is a faint accent tint; high-count is a saturated
// accent. Threshold is intentionally coarse — the eye picks up
// "hot vs. warm vs. cold" much better than per-state gradient.
function toneForCount(count: number): string {
  if (count === 0) return 'bg-background-section text-text-tertiary border-divider-subtle'
  if (count === 1) return 'bg-state-accent-hover-alt text-text-accent border-state-accent-border'
  if (count <= 3) return 'bg-state-accent-hover text-text-accent border-state-accent-active-alt'
  if (count <= 6) return 'bg-state-warning-hover text-text-warning border-state-warning-hover-alt'
  return 'bg-state-destructive-hover text-text-destructive border-state-destructive-border'
}

// Human-readable label for FED — every other code maps to its abbreviation
// by convention; FED gets an expanded label in aria / title only.
const JURISDICTION_DISPLAY: Record<string, string> = {
  FED: 'Federal',
}

function PulseAlertsMap({
  alerts,
  selectedJurisdiction,
  onSelect,
}: {
  alerts: readonly PulseAlertPublic[]
  selectedJurisdiction: string | null
  onSelect: (jurisdiction: string | null) => void
}) {
  const { t } = useLingui()

  // Count alerts per jurisdiction once per render.
  const countsByJurisdiction = useMemo(() => {
    const map = new Map<string, number>()
    for (const alert of alerts) {
      map.set(alert.jurisdiction, (map.get(alert.jurisdiction) ?? 0) + 1)
    }
    return map
  }, [alerts])

  // Derive the SVG-container size from the shared grid constants, matching
  // RuleCoverageMap exactly so the two tilegrams are pixel-identical.
  const cellSpan = US_TILE_CELL_SIZE + US_TILE_CELL_GAP
  const width = US_TILE_GRID_COLS * cellSpan
  const height = US_TILE_GRID_ROWS * cellSpan

  return (
    <div className="flex flex-col gap-3">
      {/* Legend row */}
      <div className="flex items-center justify-end">
        <MapLegend />
      </div>

      {/* State + territory grid — shared geometry with RuleCoverageMap */}
      <div className="overflow-x-auto">
        <div
          role="group"
          aria-label={t`US jurisdiction alert map`}
          className="relative mx-auto overflow-visible"
          style={{ width, height }}
        >
          {Object.entries(US_JURISDICTION_TILES).map(([code, [col, row]]) => {
            const count = countsByJurisdiction.get(code) ?? 0
            const isSelected = selectedJurisdiction === code
            const displayLabel = JURISDICTION_DISPLAY[code] ?? code
            const ariaLabel =
              count === 1 ? t`${displayLabel}: 1 alert` : t`${displayLabel}: ${count} alerts`
            const titleLabel =
              count === 1 ? t`${displayLabel} · 1 alert` : t`${displayLabel} · ${count} alerts`

            return (
              <button
                key={code}
                type="button"
                onClick={() => onSelect(isSelected ? null : code)}
                aria-label={ariaLabel}
                aria-pressed={isSelected}
                title={titleLabel}
                className={cn(
                  'absolute inline-flex cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border text-xs font-semibold leading-none transition-colors',
                  'outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:ring-offset-1',
                  isSelected
                    ? 'border-state-accent-active-alt bg-state-accent-hover ring-2 ring-state-accent-active-alt'
                    : toneForCount(count),
                )}
                style={{
                  left: col * cellSpan,
                  top: row * cellSpan,
                  width: US_TILE_CELL_SIZE,
                  height: US_TILE_CELL_SIZE,
                }}
              >
                <span>{code}</span>
                {count > 0 ? (
                  <span className="text-caption-xs font-medium tabular-nums">{count}</span>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function MapLegend() {
  return (
    <ul className="flex items-center gap-2 text-xs text-text-tertiary">
      <li className="inline-flex items-center gap-1">
        <span className="inline-block size-3 rounded-sm border border-divider-subtle bg-background-section" />
        <Trans>0</Trans>
      </li>
      <li className="inline-flex items-center gap-1">
        <span className="inline-block size-3 rounded-sm border border-state-accent-border bg-state-accent-hover-alt" />
        <Trans>1</Trans>
      </li>
      <li className="inline-flex items-center gap-1">
        <span className="inline-block size-3 rounded-sm border border-state-accent-active-alt bg-state-accent-hover" />
        <Trans>2-3</Trans>
      </li>
      <li className="inline-flex items-center gap-1">
        <span className="inline-block size-3 rounded-sm border border-state-warning-hover-alt bg-state-warning-hover" />
        <Trans>4-6</Trans>
      </li>
      <li className="inline-flex items-center gap-1">
        <span className="inline-block size-3 rounded-sm border border-state-destructive-border bg-state-destructive-hover" />
        <Trans>7+</Trans>
      </li>
    </ul>
  )
}

export { PulseAlertsMap }
