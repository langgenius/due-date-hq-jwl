import { Trans, useLingui } from '@lingui/react/macro'
import { useMemo } from 'react'

import type { PulseAlertPublic } from '@duedatehq/contracts'
import { cn } from '@duedatehq/ui/lib/utils'

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
// Coordinates are inspired by the canonical NPR / Bloomberg state
// grids. AK and HI live in the bottom-left corner (geographically
// awkward but conventional).

type StateGridCell = {
  code: string
  name: string
  row: number
  col: number
}

const US_STATE_GRID: StateGridCell[] = [
  { code: 'AK', name: 'Alaska', row: 0, col: 0 },
  { code: 'ME', name: 'Maine', row: 0, col: 10 },
  { code: 'VT', name: 'Vermont', row: 1, col: 9 },
  { code: 'NH', name: 'New Hampshire', row: 1, col: 10 },
  { code: 'WA', name: 'Washington', row: 2, col: 1 },
  { code: 'ID', name: 'Idaho', row: 2, col: 2 },
  { code: 'MT', name: 'Montana', row: 2, col: 3 },
  { code: 'ND', name: 'North Dakota', row: 2, col: 4 },
  { code: 'MN', name: 'Minnesota', row: 2, col: 5 },
  { code: 'WI', name: 'Wisconsin', row: 2, col: 6 },
  { code: 'MI', name: 'Michigan', row: 2, col: 7 },
  { code: 'NY', name: 'New York', row: 2, col: 9 },
  { code: 'MA', name: 'Massachusetts', row: 2, col: 10 },
  { code: 'OR', name: 'Oregon', row: 3, col: 1 },
  { code: 'NV', name: 'Nevada', row: 3, col: 2 },
  { code: 'WY', name: 'Wyoming', row: 3, col: 3 },
  { code: 'SD', name: 'South Dakota', row: 3, col: 4 },
  { code: 'IA', name: 'Iowa', row: 3, col: 5 },
  { code: 'IL', name: 'Illinois', row: 3, col: 6 },
  { code: 'IN', name: 'Indiana', row: 3, col: 7 },
  { code: 'OH', name: 'Ohio', row: 3, col: 8 },
  { code: 'PA', name: 'Pennsylvania', row: 3, col: 9 },
  { code: 'NJ', name: 'New Jersey', row: 3, col: 10 },
  { code: 'CT', name: 'Connecticut', row: 3, col: 11 },
  { code: 'RI', name: 'Rhode Island', row: 3, col: 12 },
  { code: 'CA', name: 'California', row: 4, col: 1 },
  { code: 'UT', name: 'Utah', row: 4, col: 2 },
  { code: 'CO', name: 'Colorado', row: 4, col: 3 },
  { code: 'NE', name: 'Nebraska', row: 4, col: 4 },
  { code: 'MO', name: 'Missouri', row: 4, col: 5 },
  { code: 'KY', name: 'Kentucky', row: 4, col: 6 },
  { code: 'WV', name: 'West Virginia', row: 4, col: 7 },
  { code: 'VA', name: 'Virginia', row: 4, col: 8 },
  { code: 'MD', name: 'Maryland', row: 4, col: 9 },
  { code: 'DE', name: 'Delaware', row: 4, col: 10 },
  { code: 'AZ', name: 'Arizona', row: 5, col: 2 },
  { code: 'NM', name: 'New Mexico', row: 5, col: 3 },
  { code: 'KS', name: 'Kansas', row: 5, col: 4 },
  { code: 'AR', name: 'Arkansas', row: 5, col: 5 },
  { code: 'TN', name: 'Tennessee', row: 5, col: 6 },
  { code: 'NC', name: 'North Carolina', row: 5, col: 7 },
  { code: 'SC', name: 'South Carolina', row: 5, col: 8 },
  { code: 'DC', name: 'District of Columbia', row: 5, col: 9 },
  { code: 'HI', name: 'Hawaii', row: 6, col: 0 },
  { code: 'OK', name: 'Oklahoma', row: 6, col: 4 },
  { code: 'LA', name: 'Louisiana', row: 6, col: 5 },
  { code: 'MS', name: 'Mississippi', row: 6, col: 6 },
  { code: 'AL', name: 'Alabama', row: 6, col: 7 },
  { code: 'GA', name: 'Georgia', row: 6, col: 8 },
  { code: 'TX', name: 'Texas', row: 7, col: 4 },
  { code: 'FL', name: 'Florida', row: 7, col: 8 },
]

const MAX_ROW = 8
const MAX_COL = 13

// Tile background tone based on alert count: empty stays neutral;
// low-count is a faint accent tint; high-count is a saturated
// accent. Threshold is intentionally coarse — the eye picks up
// "hot vs. warm vs. cold" much better than per-state gradient.
function toneForCount(count: number): string {
  if (count === 0) return 'bg-background-section text-text-tertiary border-divider-subtle'
  if (count === 1) return 'bg-state-accent-hover-alt text-text-accent border-state-accent-border'
  if (count <= 3) return 'bg-state-accent-hover text-text-accent border-state-accent-active-alt'
  if (count <= 6) return 'bg-state-warning-hover text-text-warning border-state-warning-border'
  return 'bg-state-destructive-hover text-text-destructive border-state-destructive-border'
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
  // Count alerts per jurisdiction once per render.
  const { t } = useLingui()
  const countsByJurisdiction = useMemo(() => {
    const map = new Map<string, number>()
    for (const alert of alerts) {
      map.set(alert.jurisdiction, (map.get(alert.jurisdiction) ?? 0) + 1)
    }
    return map
  }, [alerts])
  // Federal-scoped alerts get a dedicated tile above the state grid
  // — they don't belong on any single state square.
  const fedCount = countsByJurisdiction.get('FED') ?? 0
  return (
    <div className="flex flex-col gap-3">
      {/* FED tile + legend */}
      <div className="flex items-center justify-between gap-3">
        {/* Federal tile — `rounded-lg` to match the state-grid tiles
            below, so the two jurisdiction selectors read as one
            primitive. */}
        <button
          type="button"
          onClick={() => onSelect(selectedJurisdiction === 'FED' ? null : 'FED')}
          aria-pressed={selectedJurisdiction === 'FED'}
          className={cn(
            'inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold tracking-tight outline-none transition-colors',
            'focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
            selectedJurisdiction === 'FED'
              ? 'border-state-accent-active-alt bg-state-accent-hover ring-2 ring-state-accent-active-alt'
              : toneForCount(fedCount),
          )}
        >
          <span>Federal</span>
          <span className="rounded-full bg-background-default px-1.5 py-0.5 text-xs font-medium tabular-nums">
            {fedCount}
          </span>
        </button>
        <MapLegend />
      </div>

      {/* State grid */}
      <div
        className="grid w-full gap-1.5"
        style={{
          gridTemplateColumns: `repeat(${MAX_COL}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${MAX_ROW}, minmax(40px, 1fr))`,
        }}
        role="group"
        aria-label="US state alert map"
      >
        {US_STATE_GRID.map((cell) => {
          const count = countsByJurisdiction.get(cell.code) ?? 0
          const isSelected = selectedJurisdiction === cell.code
          return (
            <button
              key={cell.code}
              type="button"
              onClick={() => onSelect(isSelected ? null : cell.code)}
              aria-label={count === 1 ? t`${cell.name}: 1 alert` : t`${cell.name}: ${count} alerts`}
              aria-pressed={isSelected}
              title={count === 1 ? t`${cell.name} · 1 alert` : t`${cell.name} · ${count} alerts`}
              style={{
                gridRowStart: cell.row + 1,
                gridColumnStart: cell.col + 1,
              }}
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border text-xs font-semibold leading-none transition-colors',
                'outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
                isSelected
                  ? 'border-state-accent-active-alt bg-state-accent-hover ring-2 ring-state-accent-active-alt'
                  : toneForCount(count),
              )}
            >
              <span>{cell.code}</span>
              {count > 0 ? (
                <span className="text-caption-xs font-medium tabular-nums">{count}</span>
              ) : null}
            </button>
          )
        })}
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
        <span className="inline-block size-3 rounded-sm border border-state-warning-border bg-state-warning-hover" />
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
